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
const { useRedisAuthState, deleteSession, hasSession, migrateTempToRedis } = require('./sessionStore');

const noop = () => {};
const silent = { level: 'silent', trace: noop, debug: noop, info: noop, warn: noop, error: noop, fatal: noop, child: () => silent };

const RECONNECT_DELAYS = [5_000, 10_000, 30_000, 60_000, 120_000, 300_000];
const MAX_RECONNECT = 12;
const PERMANENT = new Set([DisconnectReason.loggedOut, DisconnectReason.forbidden]);
const BAD_SESSION = new Set([DisconnectReason.badSession, DisconnectReason.restartRequired]);

class WAService extends EventEmitter {
  constructor() {
    super();
    this.sockets = new Map();
    this.attempts = new Map();
    this.tempDirs = new Map();
  }

  async _makeSocket(accountId) {
    const existing = await hasSession(accountId).catch(() => false);
    let authState;

    if (!existing) {
      const dir = path.join(os.tmpdir(), `wa_${accountId}`);
      fs.mkdirSync(dir, { recursive: true });
      this.tempDirs.set(accountId, dir);
      authState = await useMultiFileAuthState(dir);
      console.log(`[WA] ${accountId}: nova conta — usando /tmp para emparelhamento`);
    } else {
      authState = await useRedisAuthState(accountId);
    }

    const { state, saveCreds } = authState;
    let version;
    try { ({ version } = await fetchLatestBaileysVersion()); }
    catch { version = [2, 3000, 1015901307]; }

    const sock = makeWASocket({
      version,
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, silent) },
      browser: Browsers.ubuntu('Chrome'),
      syncFullHistory: false,
      connectTimeoutMs: 60_000,
      printQRInTerminal: false,
      logger: silent,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
      if (qr) this.emit('qr', { accountId, qr });

      if (connection === 'open') {
        this.attempts.delete(accountId);
        const phone = sock.user?.id?.split(':')[0] ?? null;
        console.log(`[WA] ${accountId}: conectado — ${phone}`);

        const dir = this.tempDirs.get(accountId);
        if (dir) {
          this.tempDirs.delete(accountId);
          migrateTempToRedis(dir, accountId).catch((e) =>
            console.error(`[WA] ${accountId}: erro ao migrar sessão:`, e.message));
        }
        this.emit('ready', { accountId, phone });
      }

      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;
        this.sockets.delete(accountId);
        const dir = this.tempDirs.get(accountId);
        if (dir) { this.tempDirs.delete(accountId); fs.rmSync(dir, { recursive: true, force: true }); }
        this.emit('disconnected', { accountId, code });

        if (PERMANENT.has(code)) {
          console.log(`[WA] ${accountId}: permanente (${code}) — removendo sessão`);
          await deleteSession(accountId).catch(() => {});
          return;
        }
        if (BAD_SESSION.has(code)) {
          await deleteSession(accountId).catch(() => {});
          this.attempts.delete(accountId);
        }

        const saved = await hasSession(accountId).catch(() => false);
        if (!saved) { console.log(`[WA] ${accountId}: sem sessão — aguardando emparelhamento`); return; }

        const n = this.attempts.get(accountId) || 0;
        if (n >= MAX_RECONNECT) { console.error(`[WA] ${accountId}: desistindo após ${MAX_RECONNECT} tentativas`); return; }
        const delay = RECONNECT_DELAYS[Math.min(n, RECONNECT_DELAYS.length - 1)];
        this.attempts.set(accountId, n + 1);
        console.log(`[WA] ${accountId}: reconectando em ${delay / 1000}s (${n + 1}/${MAX_RECONNECT})`);
        setTimeout(() => this.connect(accountId), delay);
      }
    });

    sock.ev.on('messages.upsert', ({ messages: msgs, type }) => {
      if (type !== 'notify' && type !== 'append') return;
      const isSync = type === 'append';
      for (const msg of msgs) {
        if (msg.key.fromMe) continue;
        const jid = msg.key.remoteJid ?? '';
        if (jid.includes('@g.us')) continue;
        const from = jid.replace('@s.whatsapp.net', '').replace('@c.us', '');
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text
          || msg.message?.imageMessage?.caption || msg.message?.videoMessage?.caption || '';
        if (from && text) this.emit('message', { accountId, from, text, isSync });
      }
    });

    sock.ev.on('messages.update', (updates) => this.emit('message.update', { accountId, updates }));

    return sock;
  }

  async connect(accountId) {
    if (this.sockets.has(accountId)) return;
    try {
      const sock = await this._makeSocket(accountId);
      this.sockets.set(accountId, sock);
    } catch (e) {
      console.error(`[WA] ${accountId}: falha ao criar socket:`, e.message);
    }
  }

  async requestPairingCode(accountId, phone) {
    const old = this.sockets.get(accountId);
    if (old) { this.sockets.delete(accountId); try { old.ws?.close(); } catch {} }
    const digits = String(phone).replace(/\D/g, '');
    if (!digits) throw new Error('Número inválido');
    const sock = await this._makeSocket(accountId);
    this.sockets.set(accountId, sock);
    return await sock.requestPairingCode(digits);
  }

  async sendText(accountId, phone, text) {
    const sock = this.sockets.get(accountId);
    if (!sock) throw new Error('Não conectado');
    const jid = `${String(phone).replace(/\D/g, '')}@s.whatsapp.net`;
    const r = await sock.sendMessage(jid, { text });
    return r.key.id;
  }

  async sendMedia(accountId, phone, mediaUrl, mediaType, fileName, caption = '') {
    const sock = this.sockets.get(accountId);
    if (!sock) throw new Error('Não conectado');
    const jid = `${String(phone).replace(/\D/g, '')}@s.whatsapp.net`;
    const res = await fetch(mediaUrl);
    if (!res.ok) throw new Error(`Falha ao baixar mídia: ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    if (mediaType.startsWith('image/')) return (await sock.sendMessage(jid, { image: buffer, caption })).key.id;
    if (mediaType.startsWith('video/')) return (await sock.sendMessage(jid, { video: buffer, caption })).key.id;
    if (mediaType.startsWith('audio/')) return (await sock.sendMessage(jid, { audio: buffer, mimetype: mediaType, ptt: false })).key.id;
    return (await sock.sendMessage(jid, { document: buffer, mimetype: mediaType, fileName: fileName || 'arquivo' })).key.id;
  }

  async disconnect(accountId) {
    await deleteSession(accountId).catch(() => {});
    this.attempts.delete(accountId);
    const sock = this.sockets.get(accountId);
    if (sock) { this.sockets.delete(accountId); try { await sock.logout(); } catch {} }
  }

  status(accountId) {
    const s = this.sockets.get(accountId);
    if (!s) return 'disconnected';
    return s.user ? 'connected' : 'connecting';
  }
}

module.exports = new WAService();
