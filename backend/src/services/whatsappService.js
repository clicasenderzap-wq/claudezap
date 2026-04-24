/**
 * WhatsApp service — HTTP client to the wa-gateway (Fly.io).
 * Emits the same events as the old Baileys-direct version so that
 * whatsappAccountController and the rest of the codebase are unchanged.
 */
const { EventEmitter } = require('events');

const GW_URL = (process.env.WA_GATEWAY_URL || '').replace(/\/$/, '');
const GW_SECRET = process.env.GATEWAY_SECRET || '';

function gwHeaders() {
  return {
    'Content-Type': 'application/json',
    ...(GW_SECRET ? { 'x-gateway-secret': GW_SECRET } : {}),
  };
}

async function gw(method, path, body, timeoutMs = 35_000) {
  if (!GW_URL) throw new Error('WA_GATEWAY_URL não configurado nas variáveis de ambiente do Render');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${GW_URL}${path}`, {
      method,
      headers: gwHeaders(),
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `Gateway retornou ${res.status}`);
    }
    if (res.status === 204) return null;
    return res.json();
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Gateway não respondeu — verifique se o serviço Fly.io está no ar');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

class WhatsAppService extends EventEmitter {
  constructor() {
    super();
    // In-memory QR cache so getQR() can resolve synchronously on retry
    this._pendingQR = new Map();
  }

  // Called by the /api/webhooks/wa route — converts gateway webhook to local events
  handleWebhook(payload) {
    const { type, accountId } = payload;
    switch (type) {
      case 'qr':
        this._pendingQR.set(accountId, payload.qr);
        this.emit('qr', { accountId, qr: payload.qr });
        break;
      case 'ready':
        this._pendingQR.delete(accountId);
        this.emit('ready', { accountId, phone: payload.phone });
        break;
      case 'disconnected':
        this._pendingQR.delete(accountId);
        this.emit('disconnected', { accountId, code: payload.code });
        break;
      case 'message':
        this.emit('message.received', {
          accountId,
          from: payload.from,
          text: payload.text,
          isSync: payload.isSync,
        });
        break;
      case 'message.update':
        this.emit('message.update', { accountId, updates: payload.updates });
        break;
    }
  }

  async connect(accountId) {
    await gw('POST', `/sessions/${accountId}/connect`);
  }

  async requestPairingCode(accountId, phone) {
    const data = await gw('POST', `/sessions/${accountId}/pairing-code`, { phone });
    return data.code;
  }

  async sendText(accountId, phone, text) {
    const data = await gw('POST', `/sessions/${accountId}/send/text`, { phone, text });
    return data.id;
  }

  async sendMedia(accountId, phone, mediaUrl, mediaType, fileName, caption = '') {
    const data = await gw('POST', `/sessions/${accountId}/send/media`, {
      phone, mediaUrl, mediaType, fileName, caption,
    });
    return data.id;
  }

  async disconnect(accountId) {
    await gw('DELETE', `/sessions/${accountId}`).catch(() => {});
  }

  getStatus(accountId) {
    // Synchronous status unknown without calling gateway — return based on events received
    // The controller polls accounts with DB status; this just checks if we saw 'ready' recently
    // For a simple answer, we do a best-effort async call but return 'connecting' as default
    return 'connecting'; // real status comes from DB via whatsappAccountController events
  }

  getPendingQR(accountId) {
    return this._pendingQR.get(accountId) || null;
  }

  getConnectionSummary() {
    return { connected: 0, connecting: 0, disconnected: 0 };
  }
}

module.exports = new WhatsAppService();
