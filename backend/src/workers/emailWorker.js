const boss = require('../config/pgboss');
const { EmailMessage, EmailCampaign, Contact } = require('../models');
const { sendCampaignEmail } = require('../services/emailService');

const QUEUE = 'emails';
const API_URL = process.env.API_URL || 'https://claudezap-api.onrender.com';

function buildHtml(rawHtml, vars, unsubscribeToken, trackingId) {
  const unsubUrl = `${API_URL}/api/email/unsub/${unsubscribeToken}`;
  const pixelUrl = `${API_URL}/api/email/open/${trackingId}`;

  let html = rawHtml
    .replace(/\{\{name\}\}/gi, vars.name || '')
    .replace(/\{\{email\}\}/gi, vars.email || '')
    .replace(/\{\{unsubscribe_url\}\}/gi, unsubUrl);

  const footer = `
    <img src="${pixelUrl}" width="1" height="1" alt="" style="display:none" />
    <p style="font-family:sans-serif;font-size:11px;color:#9ca3af;text-align:center;margin-top:24px">
      Você recebeu este email porque está na lista de contatos.<br>
      <a href="${unsubUrl}" style="color:#9ca3af">Cancelar inscrição</a>
    </p>`;

  return html.includes('</body>')
    ? html.replace('</body>', `${footer}</body>`)
    : html + footer;
}

async function processEmail(job) {
  const { emailMessageId } = job.data;
  const retryLimit = job.retryLimit ?? 2;
  const isLastAttempt = job.retryCount >= retryLimit;

  const msg = await EmailMessage.findByPk(emailMessageId);
  if (!msg) throw new Error(`EmailMessage ${emailMessageId} não encontrado`);

  const campaign = await EmailCampaign.findByPk(msg.campaign_id);
  if (!campaign) throw new Error('Campanha não encontrada');

  try {
    const contact = msg.contact_id
      ? await Contact.findByPk(msg.contact_id, { attributes: ['name', 'email'] })
      : null;

    const html = buildHtml(
      campaign.html_body,
      { name: msg.to_name || contact?.name || '', email: msg.to_email },
      msg.unsubscribe_token,
      msg.id
    );

    const resendId = await sendCampaignEmail({
      fromName: campaign.from_name || null,
      to: msg.to_email,
      subject: campaign.subject,
      html,
      replyTo: campaign.reply_to || null,
    });

    await msg.update({ status: 'sent', sent_at: new Date(), resend_message_id: resendId });
    await EmailCampaign.increment('sent_count', { where: { id: campaign.id } });

    const fresh = await EmailCampaign.findByPk(campaign.id, { attributes: ['total_contacts', 'sent_count', 'failed_count'] });
    if (fresh && fresh.sent_count + fresh.failed_count >= fresh.total_contacts) {
      await EmailCampaign.update({ status: 'completed' }, { where: { id: campaign.id } });
    }

    console.log(`[EmailWorker] ✓ msg ${emailMessageId} → ${msg.to_email}`);
  } catch (err) {
    if (isLastAttempt) {
      await msg.update({ status: 'failed', error_message: err.message });
      await EmailCampaign.increment('failed_count', { where: { id: campaign.id } });

      const fresh = await EmailCampaign.findByPk(campaign.id, { attributes: ['total_contacts', 'sent_count', 'failed_count'] });
      if (fresh && fresh.sent_count + fresh.failed_count >= fresh.total_contacts) {
        await EmailCampaign.update({ status: 'completed' }, { where: { id: campaign.id } });
      }
    }
    throw err;
  }
}

async function start() {
  await boss.start();
  await boss.work(QUEUE, { teamSize: 3, teamConcurrency: 1 }, async (job) => {
    try {
      await processEmail(job);
    } catch (err) {
      const retryLimit = job.retryLimit ?? 2;
      const made = job.retryCount + 1;
      if (made > retryLimit) {
        console.error(`[EmailWorker] ✗ job ${job.id} falhou definitivamente: ${err.message}`);
      } else {
        console.log(`[EmailWorker] ↺ job ${job.id} tentativa ${made}/${retryLimit + 1}: ${err.message}`);
      }
      throw err;
    }
  });
  console.log('[EmailWorker] iniciado (pg-boss)');
}

start().catch((e) => console.error('[EmailWorker] falha ao iniciar:', e.message));

module.exports = { start };
