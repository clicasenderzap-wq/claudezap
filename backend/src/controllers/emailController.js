const { Op } = require('sequelize');
const { EmailCampaign, EmailMessage, Contact } = require('../models');
const { enqueueEmail } = require('../services/emailQueueService');

// ── Campaigns ─────────────────────────────────────────────────────────────────

async function listCampaigns(req, res, next) {
  try {
    const campaigns = await EmailCampaign.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']],
    });
    res.json(campaigns);
  } catch (e) { next(e); }
}

async function getCampaign(req, res, next) {
  try {
    const campaign = await EmailCampaign.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
    res.json(campaign);
  } catch (e) { next(e); }
}

async function createCampaign(req, res, next) {
  try {
    const { name, subject, from_name, html_body, delay_ms } = req.body;
    if (!name || !subject || !html_body) return res.status(400).json({ error: 'name, subject e html_body são obrigatórios' });
    const campaign = await EmailCampaign.create({
      user_id: req.user.id, name, subject, from_name, html_body,
      delay_ms: delay_ms ?? 1000,
    });
    res.status(201).json(campaign);
  } catch (e) { next(e); }
}

async function updateCampaign(req, res, next) {
  try {
    const campaign = await EmailCampaign.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
    if (campaign.status !== 'draft') return res.status(400).json({ error: 'Só campanhas em rascunho podem ser editadas' });
    const { name, subject, from_name, html_body, delay_ms } = req.body;
    await campaign.update({ name, subject, from_name, html_body, delay_ms });
    res.json(campaign);
  } catch (e) { next(e); }
}

async function deleteCampaign(req, res, next) {
  try {
    const campaign = await EmailCampaign.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
    if (campaign.status === 'running') return res.status(400).json({ error: 'Não é possível excluir campanha em andamento' });
    await EmailMessage.destroy({ where: { campaign_id: campaign.id } });
    await campaign.destroy();
    res.json({ ok: true });
  } catch (e) { next(e); }
}

async function sendCampaign(req, res, next) {
  try {
    const campaign = await EmailCampaign.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
    if (!['draft', 'scheduled'].includes(campaign.status)) {
      return res.status(400).json({ error: 'Campanha já foi enviada ou está em andamento' });
    }

    const { scheduled_for, tag_filter, manual_emails, contact_ids, recipient_source = 'all' } = req.body;

    // Build contact list from database (skipped when mode is manual-only)
    const recipients = []; // { to_email, to_name, contact_id }
    if (recipient_source !== 'manual') {
      const where = { user_id: req.user.id, email_opt_out: false, email: { [Op.and]: [{ [Op.not]: null }, { [Op.ne]: '' }] } };
      if (recipient_source === 'tag' && tag_filter) {
        where.tags = { [Op.contains]: [tag_filter] };
      } else if (recipient_source === 'contacts' && Array.isArray(contact_ids) && contact_ids.length > 0) {
        where.id = { [Op.in]: contact_ids };
      }
      const contacts = await Contact.findAll({ where, attributes: ['id', 'name', 'email'] });
      for (const c of contacts) recipients.push({ to_email: c.email, to_name: c.name, contact_id: c.id });
    }

    // Add manual emails (dedup against contacts already in list)
    if (Array.isArray(manual_emails) && manual_emails.length > 0) {
      const existingEmails = new Set(recipients.map((r) => r.to_email.toLowerCase()));
      for (const email of manual_emails) {
        const normalized = email.trim().toLowerCase();
        if (normalized && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) && !existingEmails.has(normalized)) {
          recipients.push({ to_email: normalized, to_name: null, contact_id: null });
          existingEmails.add(normalized);
        }
      }
    }

    if (recipients.length === 0) return res.status(400).json({ error: 'Nenhum destinatário com email válido encontrado' });

    const scheduledAt = scheduled_for ? new Date(scheduled_for) : null;
    const startOffset = scheduledAt ? Math.max(0, scheduledAt.getTime() - Date.now()) : 0;

    await campaign.update({
      status: scheduledAt ? 'scheduled' : 'running',
      scheduled_for: scheduledAt,
      total_contacts: recipients.length,
      sent_count: 0,
      failed_count: 0,
      open_count: 0,
      tag_filter: tag_filter || null,
    });

    // Create EmailMessage records and enqueue
    for (let i = 0; i < recipients.length; i++) {
      const r = recipients[i];
      const msg = await EmailMessage.create({
        campaign_id: campaign.id,
        user_id: req.user.id,
        contact_id: r.contact_id,
        to_email: r.to_email,
        to_name: r.to_name,
        status: 'queued',
      });
      const delayMs = startOffset + i * (campaign.delay_ms ?? 1000);
      const jobId = await enqueueEmail(msg.id, delayMs);
      await msg.update({ queue_job_id: String(jobId) });
    }

    res.json({ ok: true, total: recipients.length });
  } catch (e) { next(e); }
}

async function getCampaignStats(req, res, next) {
  try {
    const campaign = await EmailCampaign.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
    const messages = await EmailMessage.findAll({
      where: { campaign_id: campaign.id },
      attributes: ['status', 'to_email', 'to_name', 'sent_at', 'opened_at', 'error_message'],
      order: [['created_at', 'ASC']],
    });
    res.json({ campaign, messages });
  } catch (e) { next(e); }
}

// ── Public tracking ──────────────────────────────────────────────────────────

const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'
);

async function trackOpen(req, res) {
  try {
    const msg = await EmailMessage.findByPk(req.params.id);
    if (msg && !msg.opened_at) {
      await msg.update({ status: 'opened', opened_at: new Date() });
      await EmailCampaign.increment('open_count', { where: { id: msg.campaign_id } });
    }
  } catch {}
  res.set('Content-Type', 'image/gif').set('Cache-Control', 'no-store').send(PIXEL);
}

async function unsubscribe(req, res) {
  try {
    const msg = await EmailMessage.findOne({ where: { unsubscribe_token: req.params.token } });
    if (msg) {
      await Contact.update({ email_opt_out: true }, { where: { id: msg.contact_id } });
    }
  } catch {}
  res.set('Content-Type', 'text/html').send(`<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:60px 20px">
    <h2 style="color:#111">Inscrição cancelada</h2>
    <p style="color:#6b7280">Você não receberá mais emails desta lista.</p>
    <p style="margin-top:32px"><a href="https://clicaai.ia.br" style="color:#16a34a">Voltar para o Clica Aí</a></p>
  </body></html>`);
}

async function testCampaign(req, res, next) {
  try {
    const campaign = await EmailCampaign.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
    const { test_email } = req.body;
    if (!test_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(test_email.trim())) {
      return res.status(400).json({ error: 'Email de teste inválido' });
    }
    const { sendCampaignEmail } = require('../services/emailService');
    let html = campaign.html_body
      .replace(/\{\{name\}\}/gi, 'Contato Teste')
      .replace(/\{\{email\}\}/gi, test_email.trim())
      .replace(/\{\{unsubscribe_url\}\}/gi, '#');
    const banner = `<div style="background:#fef3c7;border-bottom:2px solid #f59e0b;padding:12px 20px;text-align:center;font-family:Arial,sans-serif;font-size:13px;color:#92400e;font-weight:700">⚠️ EMAIL DE TESTE — não enviado para contatos reais</div>`;
    html = html.includes('<body') ? html.replace(/(<body[^>]*>)/i, `$1${banner}`) : banner + html;
    await sendCampaignEmail({ fromName: campaign.from_name || null, to: test_email.trim(), subject: `[TESTE] ${campaign.subject}`, html });
    res.json({ ok: true });
  } catch (e) { next(e); }
}

async function duplicateCampaign(req, res, next) {
  try {
    const campaign = await EmailCampaign.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
    const copy = await EmailCampaign.create({
      user_id: req.user.id,
      name: `Cópia de ${campaign.name}`,
      subject: campaign.subject,
      from_name: campaign.from_name,
      html_body: campaign.html_body,
      delay_ms: campaign.delay_ms,
    });
    res.status(201).json(copy);
  } catch (e) { next(e); }
}

async function cancelCampaign(req, res, next) {
  try {
    const campaign = await EmailCampaign.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
    if (campaign.status !== 'scheduled') return res.status(400).json({ error: 'Apenas campanhas agendadas podem ser canceladas' });
    const { cancelEmailJob } = require('../services/emailQueueService');
    const messages = await EmailMessage.findAll({ where: { campaign_id: campaign.id, status: 'queued' }, attributes: ['id', 'queue_job_id'] });
    await Promise.all(messages.filter((m) => m.queue_job_id).map((m) => cancelEmailJob(m.queue_job_id).catch(() => {})));
    await EmailMessage.destroy({ where: { campaign_id: campaign.id } });
    await campaign.update({ status: 'draft', scheduled_for: null, total_contacts: 0, sent_count: 0, failed_count: 0, open_count: 0 });
    res.json({ ok: true });
  } catch (e) { next(e); }
}

async function listUnsubscribed(req, res, next) {
  try {
    const contacts = await Contact.findAll({
      where: { user_id: req.user.id, email_opt_out: true },
      attributes: ['id', 'name', 'email', 'updated_at'],
      order: [['updated_at', 'DESC']],
    });
    res.json(contacts);
  } catch (e) { next(e); }
}

async function resubscribeContact(req, res, next) {
  try {
    const contact = await Contact.findOne({ where: { id: req.params.contactId, user_id: req.user.id } });
    if (!contact) return res.status(404).json({ error: 'Contato não encontrado' });
    await contact.update({ email_opt_out: false });
    res.json({ ok: true });
  } catch (e) { next(e); }
}

async function resendUnopened(req, res, next) {
  try {
    const campaign = await EmailCampaign.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
    if (campaign.status !== 'completed') return res.status(400).json({ error: 'Apenas campanhas concluídas podem ser reenviadas' });

    const unopened = await EmailMessage.findAll({
      where: { campaign_id: campaign.id, status: 'sent' },
      attributes: ['to_email', 'to_name', 'contact_id'],
    });
    if (unopened.length === 0) return res.status(400).json({ error: 'Todos os destinatários já abriram ou tiveram falha no envio' });

    const newCampaign = await EmailCampaign.create({
      user_id: req.user.id,
      name: `Reenvio: ${campaign.name}`,
      subject: campaign.subject,
      from_name: campaign.from_name,
      html_body: campaign.html_body,
      delay_ms: campaign.delay_ms,
      status: 'running',
      total_contacts: unopened.length,
      sent_count: 0,
      failed_count: 0,
      open_count: 0,
    });

    for (let i = 0; i < unopened.length; i++) {
      const r = unopened[i];
      const msg = await EmailMessage.create({
        campaign_id: newCampaign.id,
        user_id: req.user.id,
        contact_id: r.contact_id,
        to_email: r.to_email,
        to_name: r.to_name,
        status: 'queued',
      });
      const jobId = await enqueueEmail(msg.id, i * (newCampaign.delay_ms ?? 1000));
      await msg.update({ queue_job_id: String(jobId) });
    }

    res.status(201).json({ ok: true, campaign: newCampaign, total: unopened.length });
  } catch (e) { next(e); }
}

async function getRecipientCount(req, res, next) {
  try {
    const { recipient_source = 'all', tag_filter, contact_ids } = req.query;
    if (recipient_source === 'manual') return res.json({ count: null });
    const where = { user_id: req.user.id, email_opt_out: false, email: { [Op.and]: [{ [Op.not]: null }, { [Op.ne]: '' }] } };
    if (recipient_source === 'tag' && tag_filter) {
      where.tags = { [Op.contains]: [tag_filter] };
    } else if (recipient_source === 'contacts' && contact_ids) {
      const ids = Array.isArray(contact_ids) ? contact_ids : String(contact_ids).split(',');
      where.id = { [Op.in]: ids };
    }
    const count = await Contact.count({ where });
    res.json({ count });
  } catch (e) { next(e); }
}

module.exports = { listCampaigns, getCampaign, createCampaign, updateCampaign, deleteCampaign, sendCampaign, getCampaignStats, trackOpen, unsubscribe, testCampaign, duplicateCampaign, cancelCampaign, getRecipientCount, listUnsubscribed, resubscribeContact, resendUnopened };
