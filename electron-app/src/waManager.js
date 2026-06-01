const { EventEmitter } = require('events');
const path = require('path');
const fs = require('fs');
const pino = require('pino');

const logger = pino({ level: 'silent' });
const RECONNECT_DELAYS = [3000, 5000, 10000, 30000];

// Baileys é ES Module — carrega via import() dinâmico
const _baileysPromise = import('@whiskeysockets/baileys');

async function loadBaileys() {
  const m = await _baileysPromise;
  return {
    makeWASocket: m.default,
    useMultiFileAuthState: m.useMultiFileAuthState,
    DisconnectReason: m.DisconnectReason,
    fetchLatestBaileysVersion: m.fetchLatestBaileysVersion,
  };
}

class WAManager extends EventEmitter {
  constructor(userDataPath) {
    super();
    this.userDataPath = userDataPath;
    this._sessions = new Map(); // accountId → { socket, phone }
  }

  _sessionPath(accountId) {
    return path.join(this.userDataPath, 'wa-sessions-v2', accountId);
  }

  // Compatibilidade com main.js que itera waManager.clients
  get clients() {
    const map = new Map();
    for (const [id, s] of this._sessions) {
      map.set(id, { info: s.phone ? { wid: { user: s.phone } } : null });
    }
    return map;
  }

  async connect(accountId) {
    const existing = this._sessions.get(accountId);
    if (existing) {
      if (existing.phone) {
        console.log(`[WA] ${accountId}: já conectado — reemitindo ready`);
        this.emit('ready', { accountId, phone: existing.phone });
        return;
      }
      // Socket travado sem conexão — destrói e recria
      console.log(`[WA] ${accountId}: socket travado — reiniciando`);
      this._sessions.delete(accountId);
      try { existing.socket?.end(undefined); } catch {}
    }

    await this._createSocket(accountId, 0);
  }

  async _createSocket(accountId, reconnectAttempt) {
    const sessionPath = this._sessionPath(accountId);
    fs.mkdirSync(sessionPath, { recursive: true });

    const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = await loadBaileys();

    let version;
    try {
      const result = await fetchLatestBaileysVersion();
      version = result.version;
      console.log(`[WA] ${accountId}: versão WA: ${version.join('.')}`);
    } catch {
      version = [2, 3000, 1015901307];
      console.warn(`[WA] ${accountId}: usando versão fallback`);
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    // Configuração mínima e confiável — sem opções que possam causar incompatibilidade
    const socket = makeWASocket({
      version,
      auth: state,
      logger,
      browser: ['Clica Aí', 'Desktop', '1.0.0'],
      connectTimeoutMs: 60_000,
      keepAliveIntervalMs: 15_000,
      syncFullHistory: false,
    });

    this._sessions.set(accountId, { socket, phone: null });

    socket.ev.on('connection.update', async (update) => {
      // Ignora evento se este socket foi substituído por um novo
      const current = this._sessions.get(accountId);
      if (current && current.socket !== socket) return;

      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log(`[WA] ${accountId}: QR gerado`);
        this.emit('qr', { accountId, qr });
      }

      if (connection === 'open') {
        const rawId = socket.user?.id ?? '';
        const phone = rawId.split(':')[0].split('@')[0] || null;
        console.log(`[WA] ${accountId}: conectado — ${phone}`);
        this._sessions.set(accountId, { socket, phone });
        this.emit('ready', { accountId, phone });
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const loggedOut = statusCode === DisconnectReason.loggedOut;
        console.log(`[WA] ${accountId}: desconectado código=${statusCode} logout=${loggedOut}`);

        this._sessions.delete(accountId);

        if (loggedOut) {
          try { fs.rmSync(sessionPath, { recursive: true, force: true }); } catch {}
          this.emit('disconnected', { accountId, code: 'LOGGED_OUT' });
        } else {
          const delay = RECONNECT_DELAYS[Math.min(reconnectAttempt, RECONNECT_DELAYS.length - 1)];
          console.log(`[WA] ${accountId}: reconectando em ${delay}ms`);
          setTimeout(() => {
            if (!this._sessions.has(accountId)) {
              this._createSocket(accountId, reconnectAttempt + 1).catch(console.error);
            }
          }, delay);
        }
      }
    });

    socket.ev.on('creds.update', saveCreds);

    socket.ev.on('messages.upsert', ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const msg of messages) {
        if (msg.key.fromMe) continue;
        const jid = msg.key.remoteJid ?? '';
        if (jid.endsWith('@g.us') || jid.endsWith('@broadcast')) continue;
        const from = jid.split('@')[0];
        const text =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          msg.message?.imageMessage?.caption ||
          msg.message?.videoMessage?.caption ||
          null;
        if (from && text) {
          this.emit('message', { accountId, from, text, isSync: false });
        }
      }
    });
  }

  async disconnect(accountId) {
    const session = this._sessions.get(accountId);
    this._sessions.delete(accountId);
    if (session?.socket) {
      try { session.socket.end(undefined); } catch {}
    }
  }

  async disconnectAll() {
    await Promise.all([...this._sessions.keys()].map((id) => this.disconnect(id)));
  }

  status(accountId) {
    const s = this._sessions.get(accountId);
    if (!s) return 'disconnected';
    return s.phone ? 'connected' : 'connecting';
  }

  async sendText(accountId, phone, text) {
    const session = this._sessions.get(accountId);
    if (!session?.phone) throw new Error('Conta não conectada');
    const jid = `${String(phone).replace(/\D/g, '')}@s.whatsapp.net`;
    const result = await session.socket.sendMessage(jid, { text });
    return result?.key?.id ?? null;
  }

  async sendMedia(accountId, phone, mediaUrl, mediaType, fileName, caption = '') {
    const session = this._sessions.get(accountId);
    if (!session?.phone) throw new Error('Conta não conectada');
    const jid = `${String(phone).replace(/\D/g, '')}@s.whatsapp.net`;

    const resp = await fetch(mediaUrl);
    if (!resp.ok) throw new Error(`Falha ao baixar mídia: HTTP ${resp.status}`);
    const buffer = Buffer.from(await resp.arrayBuffer());

    const mtype = (mediaType || '').toLowerCase();
    let content;
    if (mtype.startsWith('image')) {
      content = { image: buffer, caption };
    } else if (mtype.startsWith('video')) {
      content = { video: buffer, caption };
    } else if (mtype.startsWith('audio')) {
      content = { audio: buffer, ptt: false };
    } else {
      content = { document: buffer, fileName: fileName || 'arquivo', caption, mimetype: mediaType || 'application/octet-stream' };
    }

    const result = await session.socket.sendMessage(jid, content);
    return result?.key?.id ?? null;
  }
}

module.exports = WAManager;
