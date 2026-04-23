const {
  default: makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers,
} = require('@whiskeysockets/baileys');
const { EventEmitter } = require('events');
const { useRedisAuthState, deleteSession, hasSession } = require('./waSessionStore');

const noop = () => {};
const silentLogger = {
  level: 'silent',
  trace: noop, debug: noop, info: noop,
  warn: noop, error: noop, fatal: noop,
  child: () => silentLogger,
};

// Backoff delays (ms): 5s, 10s, 30s, 60s, 2min, 5min, 5min, ...
const RECONNECT_DELAYS = [5_000, 10_000, 30_000, 60_000, 120_000, 300_000];
const MAX_RECONNECT_ATTEMPTS = 12;

// Codes that indicate permanent failure — don't reconnect, clear session
const PERMANENT_FAILURES = new Set([
  DisconnectReason.loggedOut,   // 401 — user logged out from phone
  DisconnectReason.forbidden,   // 403 — account banned
]);

// Codes that need a clean session before retrying
const BAD_SESSION_CODES = new Set([
  DisconnectReason.badSession,        // 500
  DisconnectReason.restartRequired,   // 515
]);

class WhatsAppService extends EventEmitter {
  constructor() {
    super();
    this.sockets = new Map();
    this.reconnectAttempts = new Map();
  }

  async connect(accountId) {
    if (this.sockets.has(accountId)) return;

    let authState;
    try {
      authState = await useRedisAuthState(accountId);
    } catch (err) {
      console.error(`[WA] ${accountId}: erro ao carregar sessão do Redis:`, err.message);
      return;
    }

    const { state, saveCreds } = authState;

    let version;
    try {
      ({ version } = await fetchLatestBaileysVersion());
    } catch {
      version = [2, 3000, 1015901307]; // known stable fallback
    }

    const sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, silentLogger),
      },
      browser: Browsers.ubuntu('Chrome'),
      syncFullHistory: false,
      connectTimeoutMs: 60_000,
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
        this.reconnectAttempts.delete(accountId);
        const phone = sock.user?.id?.split(':')[0] ?? null;
        console.log(`[WA] ${accountId}: conectado — número ${phone}`);
        this.emit('ready', { accountId, phone });
      }

      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;
        this.sockets.delete(accountId);
        this.emit('disconnected', { accountId, code });

        if (PERMANENT_FAILURES.has(code)) {
          console.log(`[WA] ${accountId}: desconexão permanente (código ${code}) — removendo sessão`);
          await deleteSession(accountId).catch(() => {});
          return;
        }

        if (BAD_SESSION_CODES.has(code)) {
          console.log(`[WA] ${accountId}: sessão inválida (código ${code}) — limpando para reconexão limpa`);
          await deleteSession(accountId).catch(() => {});
          this.reconnectAttempts.delete(accountId);
        }

        // Só reconecta automaticamente se há sessão salva no Redis
        // (sem sessão = conta nova, aguarda QR scan manual)
        const sessionSaved = await hasSession(accountId).catch(() => false);
        if (!sessionSaved) {
          console.log(`[WA] ${accountId}: sem sessão no Redis — aguardando QR scan manual`);
          return;
        }

        const attempts = this.reconnectAttempts.get(accountId) || 0;
        if (attempts >= MAX_RECONNECT_ATTEMPTS) {
          console.error(`[WA] ${accountId}: máximo de tentativas de reconexão atingido — desistindo`);
          return;
        }

        const delay = RECONNECT_DELAYS[Math.min(attempts, RECONNECT_DELAYS.length - 1)];
        this.reconnectAttempts.set(accountId, attempts + 1);
        console.log(`[WA] ${accountId}: reconectando em ${delay / 1000}s (tentativa ${attempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
        setTimeout(() => this.connect(accountId), delay);
      }
    });

    sock.ev.on('messages.upsert', ({ messages: msgs, type }) => {
      if (type !== 'notify' && type !== 'append') return;
      const isSync = type === 'append';
      for (const msg of msgs) {
        if (msg.key.fromMe) continue;
        const remoteJid = msg.key.remoteJid ?? '';
        if (remoteJid.includes('@g.us')) continue;
        const from = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '');
        const text = msg.message?.conversation
          || msg.message?.extendedTextMessage?.text
          || msg.message?.imageMessage?.caption
          || msg.message?.videoMessage?.caption
          || '';
        if (from && text) this.emit('message.received', { accountId, from, text, isSync });
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

  async sendMedia(accountId, phone, mediaUrl, mediaType, fileName, caption = '') {
    const sock = this.sockets.get(accountId);
    if (!sock) throw new Error('WhatsApp não conectado');

    const jid = this._toJid(phone);
    const response = await fetch(mediaUrl);
    if (!response.ok) throw new Error(`Falha ao baixar arquivo de mídia: ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());

    if (mediaType.startsWith('image/')) {
      const result = await sock.sendMessage(jid, { image: buffer, caption });
      return result.key.id;
    }
    if (mediaType.startsWith('video/')) {
      const result = await sock.sendMessage(jid, { video: buffer, caption });
      return result.key.id;
    }
    if (mediaType.startsWith('audio/')) {
      const result = await sock.sendMessage(jid, { audio: buffer, mimetype: mediaType, ptt: false });
      return result.key.id;
    }
    const result = await sock.sendMessage(jid, { document: buffer, mimetype: mediaType, fileName: fileName || 'arquivo' });
    return result.key.id;
  }

  async disconnect(accountId) {
    const sock = this.sockets.get(accountId);
    if (sock) {
      try { await sock.logout(); } catch {}
      this.sockets.delete(accountId);
    }
    this.reconnectAttempts.delete(accountId);
    await deleteSession(accountId).catch(() => {});
  }

  getStatus(accountId) {
    const sock = this.sockets.get(accountId);
    if (!sock) return 'disconnected';
    return sock.user ? 'connected' : 'connecting';
  }

  getConnectionSummary() {
    let connected = 0;
    let connecting = 0;
    for (const sock of this.sockets.values()) {
      if (sock.user) connected++;
      else connecting++;
    }
    return { connected, connecting, disconnected: 0 };
  }

  _toJid(phone) {
    const digits = String(phone).replace(/\D/g, '');
    return digits.includes('@') ? digits : `${digits}@s.whatsapp.net`;
  }
}

module.exports = new WhatsAppService();
