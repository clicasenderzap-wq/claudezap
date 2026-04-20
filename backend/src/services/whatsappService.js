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

const noop = () => {};
const silentLogger = {
  level: 'silent',
  trace: noop, debug: noop, info: noop,
  warn: noop, error: noop, fatal: noop,
  child: () => silentLogger,
};

class WhatsAppService extends EventEmitter {
  constructor() {
    super();
    this.sockets = new Map();
    this.sessionDir = process.env.WA_SESSION_DIR || path.join(__dirname, '../../wa_sessions');
    if (!fs.existsSync(this.sessionDir)) fs.mkdirSync(this.sessionDir, { recursive: true });
  }

  async connect(accountId) {
    if (this.sockets.has(accountId)) return;

    const sessionPath = path.join(this.sessionDir, accountId);
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, console),
      },
      printQRInTerminal: false,
      logger: silentLogger,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.emit('qr', { accountId, qr });
      }

      if (connection === 'open') {
        // Captura o número do WhatsApp conectado
        const phone = sock.user?.id?.split(':')[0] ?? null;
        this.emit('ready', { accountId, phone });
      }

      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = code !== DisconnectReason.loggedOut;
        this.sockets.delete(accountId);
        this.emit('disconnected', { accountId, code });
        if (shouldReconnect) {
          setTimeout(() => this.connect(accountId), 5000);
        } else {
          // Sessão inválida — remove arquivos de sessão
          const sessionPath = path.join(this.sessionDir, accountId);
          if (fs.existsSync(sessionPath)) fs.rmSync(sessionPath, { recursive: true });
        }
      }
    });

    sock.ev.on('messages.update', (updates) => {
      this.emit('message.update', { accountId, updates });
    });

    this.sockets.set(accountId, sock);
  }

  async sendText(accountId, phone, text) {
    const sock = this.sockets.get(accountId);
    if (!sock) throw new Error('WhatsApp não conectado');

    const jid = this._toJid(phone);
    const result = await sock.sendMessage(jid, { text });
    return result.key.id;
  }

  async disconnect(accountId) {
    const sock = this.sockets.get(accountId);
    if (sock) {
      try { await sock.logout(); } catch {}
      this.sockets.delete(accountId);
    }
    // Remove session files
    const sessionPath = path.join(this.sessionDir, accountId);
    if (fs.existsSync(sessionPath)) fs.rmSync(sessionPath, { recursive: true });
  }

  getStatus(accountId) {
    const sock = this.sockets.get(accountId);
    if (!sock) return 'disconnected';
    return sock.user ? 'connected' : 'connecting';
  }

  _toJid(phone) {
    const digits = String(phone).replace(/\D/g, '');
    return digits.includes('@') ? digits : `${digits}@s.whatsapp.net`;
  }
}

module.exports = new WhatsAppService();
