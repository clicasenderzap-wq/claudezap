require('dotenv').config();

process.on('unhandledRejection', (e) => console.error('[UnhandledRejection]', e?.message || e));

const express = require('express');
const wa = require('./waService');

const app = express();
app.use(express.json({ limit: '2mb' }));

const SECRET = process.env.GATEWAY_SECRET;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

// Startup validation
if (!WEBHOOK_URL) console.warn('[Gateway] ATENÇÃO: WEBHOOK_URL não definida — eventos QR/ready/disconnected NÃO chegarão ao backend!');
else console.log('[Gateway] WEBHOOK_URL:', WEBHOOK_URL);
if (!SECRET) console.warn('[Gateway] ATENÇÃO: GATEWAY_SECRET não definido — gateway sem autenticação!');
console.log('[Gateway] REDIS_URL:', process.env.REDIS_URL ? process.env.REDIS_URL.slice(0, 30) + '...' : 'NÃO DEFINIDA');

// Auth middleware
app.use((req, res, next) => {
  if (req.path === '/health') return next();
  if (SECRET && req.headers['x-gateway-secret'] !== SECRET)
    return res.status(401).json({ error: 'Unauthorized' });
  next();
});

// ── Webhook dispatcher ────────────────────────────────────────────────────
async function fireWebhook(payload) {
  if (!WEBHOOK_URL) return;
  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(SECRET ? { 'x-gateway-secret': SECRET } : {}),
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error('[Webhook] falha ao enviar:', e.message);
  }
}

wa.on('qr', (data) => fireWebhook({ type: 'qr', ...data }));
wa.on('ready', (data) => fireWebhook({ type: 'ready', ...data }));
wa.on('disconnected', (data) => fireWebhook({ type: 'disconnected', ...data }));
wa.on('message', (data) => fireWebhook({ type: 'message', ...data }));
wa.on('message.update', (data) => fireWebhook({ type: 'message.update', ...data }));

// ── Routes ────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  const summary = { connected: 0, connecting: 0, disconnected: 0 };
  // wa doesn't expose sockets directly but we can keep it simple
  res.json({ status: 'ok', timestamp: new Date() });
});

// Connect / start session (generates QR event via webhook)
app.post('/sessions/:id/connect', async (req, res) => {
  try {
    await wa.connect(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Request pairing code (returns code directly)
app.post('/sessions/:id/pairing-code', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'phone obrigatório' });
  try {
    const code = await wa.requestPairingCode(req.params.id, phone);
    res.json({ code });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get status
app.get('/sessions/:id/status', (req, res) => {
  res.json({ status: wa.status(req.params.id) });
});

// Send text
app.post('/sessions/:id/send/text', async (req, res) => {
  const { phone, text } = req.body;
  if (!phone || !text) return res.status(400).json({ error: 'phone e text obrigatórios' });
  try {
    const id = await wa.sendText(req.params.id, phone, text);
    res.json({ id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Send media
app.post('/sessions/:id/send/media', async (req, res) => {
  const { phone, mediaUrl, mediaType, fileName, caption } = req.body;
  if (!phone || !mediaUrl) return res.status(400).json({ error: 'phone e mediaUrl obrigatórios' });
  try {
    const id = await wa.sendMedia(req.params.id, phone, mediaUrl, mediaType, fileName, caption);
    res.json({ id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Disconnect
app.delete('/sessions/:id', async (req, res) => {
  try {
    await wa.disconnect(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Startup ───────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`[Gateway] rodando na porta ${PORT}`));

// Reconecta contas com sessão salva no Redis
(async () => {
  const { WhatsappAccount } = (() => {
    // Gateway não tem acesso ao DB — recebe lista via env ou ignora (API gerencia isso)
    return { WhatsappAccount: null };
  })();
  console.log('[Gateway] pronto para receber conexões');
})();
