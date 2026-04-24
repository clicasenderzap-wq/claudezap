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
// restartRequired (515) is a NORMAL Baileys restart after pairing/key update — NOT a bad session
const BAD_SESSION = new Set([DisconnectReason.badSession]);

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
      // Reuse existing temp dir if present (e.g. reconnect after pairing, creds not yet in Redis)
      const existingTemp = this.tempDirs.get(accountId);
      const dir = existingTemp || path.join(os.tmpdir(), `wa_${accountId}`);
      if (!existingTemp) fs.mkdirSync(dir, { recursive: true });
      this.tempDirs.set(accountId, dir);
      authState = await useMultiFileAuthState(dir);
      const hasCreds = fs.existsSync(path.join(dir, 'creds.json'));
      console.log(`[WA] ${accountId}: ${hasCreds ? 'reconectando de /tmp (credenciais salvas)' : 'nova conta — aguardando emparelhamento'}`);
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
        this.emit('disconnected', { accountId, code });

        if (PERMANENT.has(code)) {
          console.log(`[WA] ${accountId}: permanente (${code}) — removendo sessão`);
          await deleteSession(accountId).catch(() => {});
          const dir = this.tempDirs.get(accountId);
          if (dir) { this.tempDirs.delete(accountId); fs.rmSync(dir, { recursive: true, force: true }); }
          return;
        }

        if (BAD_SESSION.has(code)) {
          console.log(`[WA] ${accountId}: sessão corrompida (${code}) — limpando`);
          await deleteSession(accountId).catch(() => {});
          const dir = this.tempDirs.get(accountId);
          if (dir) { this.tempDirs.delete(accountId); fs.rmSync(dir, { recursive: true, force: true }); }
          this.attempts.delete(accountId);
        }

        // Check for valid credentials: temp dir (not yet migrated) OR Redis
        const tempDir = this.tempDirs.get(accountId);
        const hasTempCreds = tempDir && fs.existsSync(path.join(tempDir, 'creds.json'));
        const saved = hasTempCreds || await hasSession(accountId).catch(() => false);

        if (!saved) {
          console.log(`[WA] ${accountId}: sem sessão (código ${code}) — aguardando emparelhamento`);
          return;
        }

        const n = this.attempts.get(accountId) || 0;
        if (n >= MAX_RECONNECT) { console.error(`[WA] ${accountId}: desistindo após ${MAX_RECONNECT} tentativas`); return; }
        const delay = RECONNECT_DELAYS[Math.min(n, RECONNECT_DELAYS.length - 1)];
        this.attempts.set(accountId, n + 1);
        console.log(`[WA] ${accountId}: reconectando em ${delay / 1000}s [código ${code}] (${n + 1}/${MAX_RECONNECT})`);
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
    this.sockets.delete(accountId);
    this.attempts.set(accountId, MAX_RECONNECT); // prevent auto-reconnect of old socket
    if (old) { try { old.ws?.close(); } catch {} }

    const digits = String(phone).replace(/\D/g, '');
    if (!digits) throw new Error('Número inválido');

    // Clear stale /tmp dir so we always start fresh
    const dir = path.join(os.tmpdir(), `wa_${accountId}`);
    fs.rmSync(dir, { recursive: true, force: true });

    const sock = await this._makeSocket(accountId);
    this.sockets.set(accountId, sock);

    // requestPairingCode must be called AFTER WhatsApp sends the QR challenge,
    // which signals the WebSocket is connected and WA is ready to accept pairing.
    return await new Promise((resolve, reject) => {
      const tid = setTimeout(() => {
        sock.ev.off('connection.update', onUpdate);
        reject(new Error('Timeout: WhatsApp não respondeu em 30 segundos — verifique se o Fly.io tem acesso à internet'));
      }, 30_000);

      async function onUpdate({ qr, connection, lastDisconnect }) {
        if (qr) {
          sock.ev.off('connection.update', onUpdate);
          clearTimeout(tid);
          try {
            console.log(`[WA] ${accountId}: QR recebido, solicitando código de emparelhamento...`);
            const code = await sock.requestPairingCode(digits);
            console.log(`[WA] ${accountId}: código gerado: ${code}`);
            resolve(code);
          } catch (e) {
            console.error(`[WA] ${accountId}: erro ao solicitar código:`, e.message);
            reject(e);
          }
        } else if (connection === 'close') {
          sock.ev.off('connection.update', onUpdate);
          clearTimeout(tid);
          reject(new Error(`Conexão fechada antes do QR: ${lastDisconnect?.error?.message || 'razão desconhecida'}`));
        }
      }

      sock.ev.on('connection.update', onUpdate);
    });
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
