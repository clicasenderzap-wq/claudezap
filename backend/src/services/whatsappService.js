const { EventEmitter } = require('events');

class WhatsAppService extends EventEmitter {
  constructor() {
    super();
    this._pendingQR = new Map();
    this._connected = new Set();
  }

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

  async connect(accountId) {
    if (this._desktop().isAccountConnected(accountId)) return;
    await this._desktop().connect(accountId);
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
setImmediate(() => instance._bindDesktopEvents());

module.exports = instance;
