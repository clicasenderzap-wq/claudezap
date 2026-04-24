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

module.exports = router;
