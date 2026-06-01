const { EventEmitter } = require('events');

/**
 * Manages WebSocket connections from the Electron desktop app.
 * One connection per user (single-session enforced here).
 * Routes send commands to the connected app and forwards events back.
 */
class DesktopService extends EventEmitter {
  constructor() {
    super();
    this._sessions = new Map();      // userId  → { ws, deviceId }
    this._accountToUser = new Map(); // accountId → userId
  }

  // ── Session management ─────────────────────────────────────────────────────

  register(userId, deviceId, ws) {
    const existing = this._sessions.get(userId);
    if (existing && existing.ws.readyState === 1 /* OPEN */) {
      try {
        existing.ws.send(JSON.stringify({
          type: 'session_kicked',
          reason: 'Você entrou em outro dispositivo. Esta sessão foi encerrada.',
        }));
        existing.ws.close(1000);
      } catch {}
    }

    this._sessions.set(userId, { ws, deviceId });
    console.log(`[Desktop] conectado userId=${userId} device=${deviceId}`);

    // After reconnection, ask Electron to reconnect all accounts so we get fresh 'ready' events.
    // Includes 'connecting' accounts: if the WA client was already ready in Electron but the
    // WebSocket dropped before the 'ready' event reached the backend (event silently lost),
    // sending 'connect' again causes Electron to re-emit 'ready' (waManager checks client.info).
    setImmediate(async () => {
      try {
        await this.pushAccountList(userId);
        const { WhatsappAccount } = require('../models');
        const { Op } = require('sequelize');
        const accounts = await WhatsappAccount.findAll({
          where: { user_id: userId, status: { [Op.in]: ['connected', 'connecting'] } },
          attributes: ['id'],
        });
        for (const acc of accounts) {
          await this._sendToUser(userId, { type: 'connect', accountId: acc.id }).catch(() => {});
        }
      } catch {}
    });

    ws.on('close', () => {
      const current = this._sessions.get(userId);
      if (current && current.deviceId === deviceId) {
        this._sessions.delete(userId);
        const affectedAccounts = [];
        for (const [accId, uid] of this._accountToUser) {
          if (uid === userId) {
            affectedAccounts.push(accId);
            this._accountToUser.delete(accId);
          }
        }
        // NOTE: we intentionally do NOT emit 'disconnected' here because the Electron app
        // may reconnect within seconds (network hiccup, deploy restart). Emitting here
        // would set DB status to 'disconnected', and if Electron doesn't resend 'ready'
        // events the DB stays wrong and all sends fail.
        // DB status is only updated when WhatsApp itself disconnects (type:'disconnected' from Electron).
        console.log(`[Desktop] WebSocket fechado userId=${userId} contas limpas da memória: ${affectedAccounts.length}`);
      }
    });
  }

  kickUser(userId, reason = 'Sessão encerrada.') {
    const session = this._sessions.get(userId);
    if (session && session.ws.readyState === 1) {
      try {
        session.ws.send(JSON.stringify({ type: 'session_kicked', reason }));
        session.ws.close(1000);
      } catch {}
    }
  }

  isUserConnected(userId) {
    const s = this._sessions.get(userId);
    return s != null && s.ws.readyState === 1;
  }

  isAccountConnected(accountId) {
    const userId = this._accountToUser.get(accountId);
    return userId != null && this.isUserConnected(userId);
  }

  // ── Sending commands ────────────────────────────────────────────────────────

  async _sendToUser(userId, command, timeoutMs = 30_000) {
    const session = this._sessions.get(userId);
    if (!session || session.ws.readyState !== 1) throw new Error('App desktop não conectado');

    const correlationId = Math.random().toString(36).slice(2) + Date.now();

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.removeAllListeners(`result:${correlationId}`);
        reject(new Error('Conta WhatsApp não respondeu — verifique se o Clica Aí está aberto e a conta está conectada'));
      }, timeoutMs);

      this.once(`result:${correlationId}`, (result) => {
        clearTimeout(timer);
        if (result.error) reject(new Error(result.error));
        else resolve(result);
      });

      try {
        session.ws.send(JSON.stringify({ ...command, correlationId }));
      } catch (e) {
        clearTimeout(timer);
        this.removeAllListeners(`result:${correlationId}`);
        reject(e);
      }
    });
  }

  async _userIdForAccount(accountId) {
    // Check in-memory map first
    let userId = this._accountToUser.get(accountId);
    if (userId) return userId;
    // Fall back to DB lookup (needed for first connect before any events)
    const { WhatsappAccount } = require('../models');
    const account = await WhatsappAccount.findByPk(accountId, { attributes: ['user_id'] });
    return account?.user_id ?? null;
  }

  // ── Public API (mirrors whatsappService interface) ──────────────────────────

  async connect(accountId) {
    const userId = await this._userIdForAccount(accountId);
    if (!userId || !this.isUserConnected(userId)) throw new Error('App desktop não conectado');
    await this._sendToUser(userId, { type: 'connect', accountId });
  }

  async disconnect(accountId) {
    const userId = await this._userIdForAccount(accountId);
    if (!userId || !this.isUserConnected(userId)) return;
    await this._sendToUser(userId, { type: 'disconnect', accountId }).catch(() => {});
    this._accountToUser.delete(accountId);
  }

  async sendText(accountId, phone, text) {
    const userId = await this._userIdForAccount(accountId);
    if (!userId) throw new Error('App desktop não conectado');
    const result = await this._sendToUser(userId, { type: 'send_text', accountId, phone, text });
    return result.messageId;
  }

  async sendMedia(accountId, phone, mediaUrl, mediaType, fileName, caption = '') {
    const userId = await this._userIdForAccount(accountId);
    if (!userId) throw new Error('App desktop não conectado');
    const result = await this._sendToUser(userId, { type: 'send_media', accountId, phone, mediaUrl, mediaType, fileName, caption });
    return result.messageId;
  }

  // ── Incoming messages from Electron app ────────────────────────────────────

  handleMessage(userId, rawData) {
    let msg;
    try { msg = JSON.parse(rawData); } catch { return; }

    const { type, correlationId } = msg;

    if (type === 'result' && correlationId) {
      if (msg.error) {
        console.error(`[Desktop] ERRO do Electron app — correlationId=${correlationId} erro="${msg.error}"`);
      } else {
        console.log(`[Desktop] resultado OK — correlationId=${correlationId}`);
      }
      this.emit(`result:${correlationId}`, msg);
      return;
    }

    if (type === 'pong') return;

    console.log(`[Desktop] evento recebido: type=${type} accountId=${msg.accountId || '-'}`);

    switch (type) {
      case 'qr':
        console.log(`[Desktop] QR recebido para conta ${msg.accountId} — repassando ao frontend`);
        this._accountToUser.set(msg.accountId, userId);
        this.emit('qr', { accountId: msg.accountId, qr: msg.qr });
        break;

      case 'ready':
        console.log(`[Desktop] PRONTO — conta ${msg.accountId} phone=${msg.phone}`);
        this._accountToUser.set(msg.accountId, userId);
        this.emit('ready', { accountId: msg.accountId, phone: msg.phone });
        break;

      case 'disconnected':
        console.log(`[Desktop] desconectado — conta ${msg.accountId} code=${msg.code}`);
        this._accountToUser.delete(msg.accountId);
        this.emit('disconnected', { accountId: msg.accountId, code: msg.code });
        break;

      case 'message':
        this.emit('message.received', {
          accountId: msg.accountId,
          from: msg.from,
          text: msg.text,
          isSync: msg.isSync || false,
        });
        break;

      case 'ping':
        const session = this._sessions.get(userId);
        if (session) session.ws.send(JSON.stringify({ type: 'pong' }));
        break;
    }
  }

  // Returns diagnostic info for the given user
  getDesktopStatus(userId) {
    const session = this._sessions.get(userId);
    const connected = session != null && session.ws.readyState === 1;
    const accounts = [];
    for (const [accId, uid] of this._accountToUser) {
      if (uid === userId) accounts.push(accId);
    }
    return { desktop_connected: connected, active_account_ids: accounts };
  }

  // Send the user's account list so the app knows what to connect
  async pushAccountList(userId) {
    if (!this.isUserConnected(userId)) return;
    const { WhatsappAccount } = require('../models');
    const accounts = await WhatsappAccount.findAll({
      where: { user_id: userId },
      attributes: ['id', 'label', 'status', 'phone'],
    });
    const session = this._sessions.get(userId);
    session.ws.send(JSON.stringify({
      type: 'account_list',
      accounts: accounts.map((a) => ({ id: a.id, label: a.label, status: a.status, phone: a.phone })),
    }));
  }
}

module.exports = new DesktopService();
