require('dotenv').config();

process.on('unhandledRejection', (e) => console.error('[UnhandledRejection]', e?.message || e));

const express = require('express');
const wa = require('./waService');

const app = express();
app.use(express.json({ limit: '2mb' }));

const SECRET = process.env.GATEWAY_SECRET;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

// Startup validation
if (!WEBHOOK_URL) console.warn('[Gateway] ATENÇÃO: WEBHOOK_URL não definida — eventos não chegarão ao backend!');
else console.log('[Gateway] WEBHOOK_URL:', WEBHOOK_URL);
if (!SECRET) console.warn('[Gateway] ATENÇÃO: GATEWAY_SECRET não definido!');

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

// ── Routes ────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

app.post('/sessions/:id/connect', async (req, res) => {
  try {
    await wa.connect(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    console.error(`[Route] connect ${req.params.id}:`, e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get('/sessions/:id/status', (req, res) => {
  res.json({ status: wa.status(req.params.id) });
});

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

app.delete('/sessions/:id', async (req, res) => {
  try {
    await wa.disconnect(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Pairing code not supported in Chrome mode — only QR
app.post('/sessions/:id/pairing-code', (req, res) => {
  res.status(400).json({ error: 'Modo Chrome usa apenas QR Code. Use o botão "Via QR" para conectar.' });
});

// ── Startup ───────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[Gateway] rodando na porta ${PORT}`);
  // Notify backend after a short delay so it can reconnect previously-connected accounts.
  // Delay avoids starting Chrome before the process is fully stable.
  if (WEBHOOK_URL) {
    const restartUrl = WEBHOOK_URL.replace(/\/wa$/, '/wa/gateway-restart');
    setTimeout(() => {
      fetch(restartUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(SECRET ? { 'x-gateway-secret': SECRET } : {}),
        },
        body: JSON.stringify({ type: 'gateway_restart' }),
      }).catch((e) => console.error('[Gateway] falha ao notificar restart:', e.message));
    }, 5000);
  }
});
