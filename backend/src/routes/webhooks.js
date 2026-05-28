const router = require('express').Router();
const whatsapp = require('../services/whatsappService');

const SECRET = process.env.GATEWAY_SECRET || '';

// Receives events from wa-gateway (Fly.io) and re-emits them locally
router.post('/wa', (req, res) => {
  if (SECRET && req.headers['x-gateway-secret'] !== SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    whatsapp.handleWebhook(req.body);
  } catch (e) {
    console.error('[Webhook] erro ao processar evento:', e.message);
  }
  res.status(204).send();
});

// Called by the gateway on startup — reconnects all accounts that were connected
router.post('/wa/gateway-restart', async (req, res) => {
  if (SECRET && req.headers['x-gateway-secret'] !== SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.status(204).send();
  try {
    const { WhatsappAccount } = require('../models');
    const accounts = await WhatsappAccount.findAll({ where: { status: 'connected' } });
    console.log(`[Gateway] reiniciou — reconectando ${accounts.length} conta(s)`);
    let delay = 0;
    for (const account of accounts) {
      setTimeout(() => {
        whatsapp.connect(account.id).catch((e) =>
          console.error(`[Gateway] falha ao reconectar ${account.id}:`, e.message)
        );
      }, delay);
      delay += 3000;
    }
  } catch (e) {
    console.error('[Gateway] erro ao reconectar contas:', e.message);
  }
});

// Receives bounce/complaint events from Resend
router.post('/resend', async (req, res) => {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (secret && req.headers['x-resend-secret'] !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { type, data } = req.body || {};
    if (type === 'email.bounced' || type === 'email.complained') {
      const { email_id, to } = data || {};
      const { EmailMessage, EmailCampaign, Contact } = require('../models');
      let msg = null;
      if (email_id) {
        msg = await EmailMessage.findOne({ where: { resend_message_id: email_id } });
      }
      if (!msg && Array.isArray(to) && to[0]) {
        msg = await EmailMessage.findOne({
          where: { to_email: to[0], status: 'sent' },
          order: [['sent_at', 'DESC']],
        });
      }
      if (msg) {
        const wasDelivered = ['sent', 'opened'].includes(msg.status);
        await msg.update({ status: 'bounced' });
        if (wasDelivered) {
          await EmailCampaign.decrement('sent_count', { where: { id: msg.campaign_id } });
        }
        await EmailCampaign.increment('failed_count', { where: { id: msg.campaign_id } });
        if (msg.contact_id && type === 'email.bounced') {
          await Contact.update({ email_opt_out: true }, { where: { id: msg.contact_id } });
        }
        console.log(`[Webhook Resend] ${type} para ${to?.[0]} — mensagem ${msg.id} marcada como bounced`);
      }
    }
  } catch (e) {
    console.error('[Webhook Resend] erro:', e.message);
  }
  res.status(200).json({ ok: true });
});

module.exports = router;
