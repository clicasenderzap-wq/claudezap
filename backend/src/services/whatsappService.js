const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} = require('@whiskeysockets/baileys');
const path = require('path');
const fs = require('fs');
const { EventEmitter } = require('events');

class WhatsAppService extends EventEmitter {
  constructor() {
    super();
    this.sockets = new Map();
    this.sessionDir = process.env.WA_SESSION_DIR || path.join(__dirname, '../../wa_sessions');
    if (!fs.existsSync(this.sessionDir)) fs.mkdirSync(this.sessionDir, { recursive: true });
  }

  async connect(userId) {
    if (this.sockets.has(userId)) return;

    const sessionPath = path.join(this.sessionDir, userId);
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, console),
      },
      printQRInTerminal: false,
      logger: { level: 'silent', child: () => ({ level: 'silent', trace: () => {}, debug: () => {}, info: () => {}, warn: () => {}, error: () => {}, fatal: () => {} }) },
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.emit('qr', { userId, qr });
      }

      if (connection === 'open') {
        this.emit('ready', { userId });
      }

      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = code !== DisconnectReason.loggedOut;
        this.sockets.delete(userId);
        this.emit('disconnected', { userId, code });
        if (shouldReconnect) {
          setTimeout(() => this.connect(userId), 5000);
        }
      }
    });

    sock.ev.on('messages.update', (updates) => {
      this.emit('message.update', { userId, updates });
    });

    this.sockets.set(userId, sock);
  }

  async sendText(userId, phone, text) {
    const sock = this.sockets.get(userId);
    if (!sock) throw new Error('WhatsApp não conectado');

    const jid = this._toJid(phone);
    const result = await sock.sendMessage(jid, { text });
    return result.key.id;
  }

  async disconnect(userId) {
    const sock = this.sockets.get(userId);
    if (sock) {
      await sock.logout();
      this.sockets.delete(userId);
    }
  }

  getStatus(userId) {
    const sock = this.sockets.get(userId);
    if (!sock) return 'disconnected';
    return sock.user ? 'connected' : 'connecting';
  }

  _toJid(phone) {
    const digits = String(phone).replace(/\D/g, '');
    return digits.includes('@') ? digits : `${digits}@s.whatsapp.net`;
  }
}

module.exports = new WhatsAppService();
