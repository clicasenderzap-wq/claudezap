const {
  default: makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers,
  useMultiFileAuthState,
} = require('@whiskeysockets/baileys');
const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { useRedisAuthState, deleteSession, hasSession } = require('./waSessionStore');
const { redis } = require('../config/redis');

const noop = () => {};
const silentLogger = {
  level: 'silent',
  trace: noop, debug: noop, info: noop,
  warn: noop, error: noop, fatal: noop,
  child: () => silentLogger,
};

const RECONNECT_DELAYS = [5_000, 10_000, 30_000, 60_000, 120_000, 300_000];
const MAX_RECONNECT_ATTEMPTS = 12;

const PERMANENT_FAILURES = new Set([
  DisconnectReason.loggedOut,
  DisconnectReason.forbidden,
]);

const BAD_SESSION_CODES = new Set([
  DisconnectReason.badSession,
  DisconnectReason.restartRequired,
]);

// Copies /tmp session files into Redis after successful pairing.
// useMultiFileAuthState saves files named exactly like our Redis keys (same fixFileName logic).
async function _migrateTempToRedis(tempDir, accountId) {
  const NS = 'wa:session';
  const files = fs.readdirSync(tempDir).filter((f) => f.endsWith('.json'));
  await Promise.all(files.map(async (file) => {
    const key = file.slice(0, -5); // strip .json
    const content = fs.readFileSync(path.join(tempDir, file), 'utf8');
    await redis.set(`${NS}:${accountId}:${key}`, content);
  }));
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log(`[WA] ${accountId}: sessão migrada de /tmp para Redis (${files.length} chaves)`);
}

class WhatsAppService extends EventEmitter {
  constructor() {
    super();
    this.sockets = new Map();
    this.reconnectAttempts = new Map();
    // tracks which accounts are still in temp-dir pairing mode
    this._tempDirs = new Map();
  }

  async _createSocket(accountId) {
    const hasExisting = await hasSession(accountId).catch(() => false);

    let authState;

    if (!hasExisting) {
      // New account: use real filesystem in /tmp for the pairing handshake.
      // Our Redis store has latency that can corrupt the Signal protocol
      // key exchange during the brief pairing window.
      // After a successful 'open', we migrate everything to Redis.
      const tempDir = path.join(os.tmpdir(), `wa_pair_${accountId}`);
      fs.mkdirSync(tempDir, { recursive: true });
      this._tempDirs.set(accountId, tempDir);
      authState = await useMultiFileAuthState(tempDir);
      console.log(`[WA] ${accountId}: nova conta — usando /tmp para emparelhamento`);
    } else {
      authState = await useRedisAuthState(accountId);
    }

    const { state, saveCreds } = authState;

    let version;
    try {
      ({ version } = await fetchLatestBaileysVersion());
    } catch {
      version = [2, 3000, 1015901307];
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

        // If we used /tmp, migrate the fresh session to Redis now
        const tempDir = this._tempDirs.get(accountId);
        if (tempDir) {
          this._tempDirs.delete(accountId);
          _migrateTempToRedis(tempDir, accountId).catch((e) =>
            console.error(`[WA] ${accountId}: erro ao migrar sessão para Redis:`, e.message)
          );
        }

        this.emit('ready', { accountId, phone });
      }

      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;
        this.sockets.delete(accountId);

        // Clean up any leftover temp dir on failure
        const tempDir = this._tempDirs.get(accountId);
        if (tempDir) {
          this._tempDirs.delete(accountId);
          fs.rmSync(tempDir, { recursive: true, force: true });
        }

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

        const sessionSaved = await hasSession(accountId).catch(() => false);
        if (!sessionSaved) {
          console.log(`[WA] ${accountId}: sem sessão no Redis — aguardando emparelhamento manual`);
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

    return sock;
  }

  _closeSocket(accountId) {
    const sock = this.sockets.get(accountId);
    if (sock) {
      this.sockets.delete(accountId);
      try { sock.ws?.close(); } catch {}
    }
  }

  async connect(accountId) {
    if (this.sockets.has(accountId)) return;
    try {
      const sock = await this._createSocket(accountId);
      this.sockets.set(accountId, sock);
    } catch (err) {
      console.error(`[WA] ${accountId}: falha ao criar socket:`, err.message);
    }
  }

  async requestPairingCode(accountId, phone) {
    this._closeSocket(accountId);
    const digits = String(phone).replace(/\D/g, '');
    if (!digits) throw new Error('Número de telefone inválido');

    const sock = await this._createSocket(accountId);
    this.sockets.set(accountId, sock);

    const code = await sock.requestPairingCode(digits);
    console.log(`[WA] ${accountId}: código de emparelhamento gerado para ${digits}`);
    return code;
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
    await deleteSession(accountId).catch(() => {});
    this.reconnectAttempts.delete(accountId);
    const sock = this.sockets.get(accountId);
    if (sock) {
      this.sockets.delete(accountId);
      try { await sock.logout(); } catch {}
    }
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
