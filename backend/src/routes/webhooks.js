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

module.exports = router;
