const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} = require('@whiskeysockets/baileys');
const { EventEmitter } = require('events');
const path = require('path');
const fs = require('fs');
const pino = require('pino');

// Logger silencioso — só erros críticos aparecem no console
const logger = pino({ level: 'silent' });

// Delays de reconexão com backoff
const RECONNECT_DELAYS = [3000, 5000, 10000, 30000];

class WAManager extends EventEmitter {
  constructor(userDataPath) {
    super();
    this.userDataPath = userDataPath;
    this._sessions = new Map(); // accountId → { socket, phone, reconnectAttempt }
  }

  _sessionPath(accountId) {
    return path.join(this.userDataPath, 'wa-sessions-v2', accountId);
  }

  // Getter de compatibilidade com main.js que itera waManager.clients
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
        // Já conectado — reemite ready para sincronizar o backend
        console.log(`[WA] ${accountId}: já conectado — reemitindo ready`);
        this.emit('ready', { accountId, phone: existing.phone });
        return;
      }
      // Em processo de conexão — ignora para não criar socket duplicado
      console.log(`[WA] ${accountId}: conexão em andamento`);
      return;
    }

    const sessionPath = this._sessionPath(accountId);
    fs.mkdirSync(sessionPath, { recursive: true });

    let version;
    try {
      const result = await fetchLatestBaileysVersion();
      version = result.version;
      console.log(`[WA] ${accountId}: versão WhatsApp Web: ${version.join('.')}`);
    } catch {
      version = [2, 3000, 1015901307]; // fallback
      console.warn(`[WA] ${accountId}: usando versão fallback do WhatsApp Web`);
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    const socket = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      logger,
      browser: ['Clica Aí', 'Desktop', '1.0.0'],
      connectTimeoutMs: 60_000,
      defaultQueryTimeoutMs: 60_000,
      keepAliveIntervalMs: 15_000,
      syncFullHistory: false,        // Não sincroniza histórico completo — conecta muito mais rápido
      generateHighQualityLinkPreview: false,
      shouldIgnoreJid: (jid) => jid?.endsWith('@broadcast'),
    });

    this._sessions.set(accountId, { socket, phone: null, reconnectAttempt: 0 });

    // ── Eventos de conexão ─────────────────────────────────────────────────────

    socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log(`[WA] ${accountId}: QR gerado`);
        this.emit('qr', { accountId, qr });
      }

      if (connection === 'open') {
        const rawId = socket.user?.id ?? '';
        // id pode ser "5511999999999:0@s.whatsapp.net" ou "5511999999999@s.whatsapp.net"
        const phone = rawId.split(':')[0].split('@')[0] || null;
        console.log(`[WA] ${accountId}: conectado — ${phone}`);
        const prev = this._sessions.get(accountId);
        this._sessions.set(accountId, { socket, phone, reconnectAttempt: 0 });
        this.emit('ready', { accountId, phone });
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const loggedOut = statusCode === DisconnectReason.loggedOut;

        console.log(`[WA] ${accountId}: conexão encerrada — código: ${statusCode} | logout: ${loggedOut}`);

        const prev = this._sessions.get(accountId);
        const attempt = (prev?.reconnectAttempt ?? 0);

        this._sessions.delete(accountId);

        if (loggedOut) {
          // Sessão encerrada pelo WhatsApp — limpa arquivos de sessão
          try { fs.rmSync(sessionPath, { recursive: true, force: true }); } catch {}
          this.emit('disconnected', { accountId, code: 'LOGGED_OUT' });
        } else if (statusCode === DisconnectReason.restartRequired) {
          // WhatsApp pediu restart — reconecta imediatamente
          console.log(`[WA] ${accountId}: restart necessário — reconectando`);
          setTimeout(() => this.connect(accountId).catch(console.error), 1000);
        } else {
          // Queda de rede ou erro temporário — reconecta com backoff
          const delay = RECONNECT_DELAYS[Math.min(attempt, RECONNECT_DELAYS.length - 1)];
          console.log(`[WA] ${accountId}: reconectando em ${delay}ms (tentativa ${attempt + 1})`);
          setTimeout(async () => {
            // Marca tentativa antes de tentar
            if (!this._sessions.has(accountId)) {
              this._sessions.set(accountId, { socket: null, phone: null, reconnectAttempt: attempt + 1 });
              this._sessions.delete(accountId); // limpa antes de connect criar novo
              await this.connect(accountId).catch(console.error);
              // Ajusta contador de tentativas no novo socket
              const newSession = this._sessions.get(accountId);
              if (newSession) newSession.reconnectAttempt = attempt + 1;
            }
          }, delay);
        }
      }
    });

    // ── Salva credenciais sempre que atualizam ─────────────────────────────────

    socket.ev.on('creds.update', saveCreds);

    // ── Mensagens recebidas ────────────────────────────────────────────────────

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
      content = {
        document: buffer,
        fileName: fileName || 'arquivo',
        caption,
        mimetype: mediaType || 'application/octet-stream',
      };
    }

    const result = await session.socket.sendMessage(jid, content);
    return result?.key?.id ?? null;
  }
}

module.exports = WAManager;
