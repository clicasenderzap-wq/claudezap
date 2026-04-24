/**
 * WhatsApp service — routes commands to either:
 *   1. The Electron desktop app (preferred, via WebSocket)
 *   2. The wa-gateway on Fly.io (fallback)
 *
 * Both paths emit the same events so that the rest of the codebase is unchanged.
 */
const { EventEmitter } = require('events');

const GW_URL = (process.env.WA_GATEWAY_URL || '').replace(/\/$/, '');
const GW_SECRET = process.env.GATEWAY_SECRET || '';

// ── Fly.io gateway HTTP helper ────────────────────────────────────────────────

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

// ── Main service ──────────────────────────────────────────────────────────────

class WhatsAppService extends EventEmitter {
  constructor() {
    super();
    this._pendingQR = new Map();
    this._connected = new Set();  // tracks connected accountIds (both desktop and gateway)
  }

  // Called by webhooks route (Fly.io gateway events)
  handleWebhook(payload) {
    const { type, accountId } = payload;
    switch (type) {
      case 'qr':
        this._pendingQR.set(accountId, payload.qr);
        this.emit('qr', { accountId, qr: payload.qr });
        break;
      case 'ready':
        this._pendingQR.delete(accountId);
        this._connected.add(accountId);
        this.emit('ready', { accountId, phone: payload.phone });
        break;
      case 'disconnected':
        this._pendingQR.delete(accountId);
        this._connected.delete(accountId);
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
    }
  }

  // Called by desktopService events (Electron app events)
  _bindDesktopEvents() {
    const desktop = require('./desktopService');
    desktop.on('qr', ({ accountId, qr }) => {
      this._pendingQR.set(accountId, qr);
      this.emit('qr', { accountId, qr });
    });
    desktop.on('ready', ({ accountId, phone }) => {
      this._pendingQR.delete(accountId);
      this._connected.add(accountId);
      this.emit('ready', { accountId, phone });
    });
    desktop.on('disconnected', ({ accountId, code }) => {
      this._pendingQR.delete(accountId);
      this._connected.delete(accountId);
      this.emit('disconnected', { accountId, code });
    });
    desktop.on('message.received', (data) => {
      this.emit('message.received', data);
    });
  }

  _desktop() {
    return require('./desktopService');
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  async connect(accountId) {
    if (this._desktop().isAccountConnected(accountId)) return;
    await this._desktop().connect(accountId);
  }

  async requestPairingCode(accountId, phone) {
    throw new Error('Pairing code não suportado no app desktop — use QR Code');
  }

  async sendText(accountId, phone, text) {
    return this._desktop().sendText(accountId, phone, text);
  }

  async sendMedia(accountId, phone, mediaUrl, mediaType, fileName, caption = '') {
    return this._desktop().sendMedia(accountId, phone, mediaUrl, mediaType, fileName, caption);
  }

  async disconnect(accountId) {
    await this._desktop().disconnect(accountId);
  }

  getStatus(accountId) {
    if (this._desktop().isAccountConnected(accountId)) return 'connected';
    return this._connected.has(accountId) ? 'connected' : 'connecting';
  }

  getPendingQR(accountId) {
    return this._pendingQR.get(accountId) || null;
  }

  getConnectionSummary() {
    return { connected: this._connected.size, connecting: 0, disconnected: 0 };
  }
}

const instance = new WhatsAppService();
// Bind desktop events after module is fully loaded (avoids circular dep at require-time)
setImmediate(() => instance._bindDesktopEvents());

module.exports = instance;
