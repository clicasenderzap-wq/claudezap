const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const { EventEmitter } = require('events');
const path = require('path');
const fs = require('fs');

const CHROME_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--no-first-run',
  '--no-zygote',
  '--disable-gpu',
  '--disable-extensions',
  '--disable-background-networking',
  '--mute-audio',
  '--disable-blink-features=AutomationControlled',
];

function findChrome() {
  const candidates = [];

  // 1. Bundled via extraResources (production build)
  if (process.resourcesPath) {
    candidates.push(path.join(process.resourcesPath, 'chrome', 'chrome.exe'));
  }

  // 2. Puppeteer's managed cache (development / puppeteer default)
  try {
    const puppeteer = require('puppeteer');
    const exe = puppeteer.executablePath();
    if (exe) candidates.push(exe);
  } catch {}

  // 3. System Chrome (fallback)
  candidates.push(
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
  );

  for (const p of candidates) {
    if (p && fs.existsSync(p)) {
      console.log('[WA] Chrome encontrado:', p);
      return p;
    }
  }
  console.warn('[WA] Chrome não encontrado — puppeteer usará padrão');
  return null;
}

class WAManager extends EventEmitter {
  constructor(userDataPath) {
    super();
    this.userDataPath = userDataPath;
    this.clients = new Map(); // accountId → client
    this._chromeBin = findChrome(userDataPath);
  }

  _sessionPath(accountId) {
    return path.join(this.userDataPath, 'wa-sessions');
  }

  async connect(accountId) {
    if (this.clients.has(accountId)) {
      const existing = this.clients.get(accountId);
      if (existing.info) {
        console.log(`[WA] ${accountId}: já conectado — reemitindo ready`);
        this.emit('ready', { accountId, phone: existing.info?.wid?.user ?? null });
        return;
      }
      console.log(`[WA] ${accountId}: inicialização em andamento`);
      return;
    }

    const puppeteerOpts = {
      headless: 'new',
      args: CHROME_ARGS,
      ignoreDefaultArgs: ['--enable-automation'],
    };
    if (this._chromeBin) puppeteerOpts.executablePath = this._chromeBin;

    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: accountId,
        dataPath: this._sessionPath(accountId),
      }),
      authTimeoutMs: 600_000, // 10 minutes — generous to allow long syncs
      puppeteer: puppeteerOpts,
    });

    this.clients.set(accountId, client);

    client.on('qr', (qr) => {
      console.log(`[WA] ${accountId}: QR gerado`);
      this.emit('qr', { accountId, qr });
    });

    client.on('authenticated', () => {
      console.log(`[WA] ${accountId}: QR escaneado — sincronizando...`);
    });

    client.on('ready', () => {
      const phone = client.info?.wid?.user ?? null;
      console.log(`[WA] ${accountId}: conectado — ${phone}`);
      this.emit('ready', { accountId, phone });
    });

    client.on('auth_failure', (msg) => {
      console.error(`[WA] ${accountId}: falha de autenticação — ${msg}`);
      this.clients.delete(accountId);
      this.emit('disconnected', { accountId, code: 'AUTH_FAILURE' });
    });

    client.on('disconnected', (reason) => {
      console.log(`[WA] ${accountId}: desconectado — ${reason}`);
      this.clients.delete(accountId);
      this.emit('disconnected', { accountId, code: reason });
    });

    client.on('message', (msg) => {
      if (msg.fromMe) return;
      if (msg.from.includes('@g.us')) return;
      const from = msg.from.replace('@c.us', '');
      if (from && msg.body) {
        this.emit('message', { accountId, from, text: msg.body, isSync: false });
      }
    });

    console.log(`[WA] ${accountId}: iniciando Chrome...`);
    client.initialize().catch((e) => {
      console.error(`[WA] ${accountId}: erro ao inicializar:`, e.message);
      this.clients.delete(accountId);
      this.emit('disconnected', { accountId, code: 'INIT_ERROR' });
    });
  }

  async disconnect(accountId) {
    const client = this.clients.get(accountId);
    this.clients.delete(accountId);
    if (client) {
      try { await client.destroy(); } catch {}
    }
  }

  async disconnectAll() {
    const ids = [...this.clients.keys()];
    await Promise.all(ids.map((id) => this.disconnect(id)));
  }

  _isContextError(e) {
    return (
      e.message?.includes('getChat') ||
      e.message?.includes('Execution context') ||
      e.message?.includes('Target closed') ||
      e.message?.includes('Session closed')
    );
  }

  async _trySend(accountId, fn, timeoutMs = 25_000) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        // Race the send against a timeout so a hung Chrome doesn't block forever
        return await Promise.race([
          fn(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout ao enviar mensagem')), timeoutMs)
          ),
        ]);
      } catch (e) {
        const isContext = this._isContextError(e);
        const isNoLid = e.message?.includes('No LID for user');
        if ((isContext || isNoLid) && attempt < 3) {
          const waitMs = isNoLid ? 2000 : 4000;
          console.warn(`[WA] ${accountId}: ${isNoLid ? 'No LID for user' : 'contexto perdido'}, aguardando ${waitMs / 1000}s (tentativa ${attempt}/3)...`);
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }
        if (isContext) {
          console.error(`[WA] ${accountId}: contexto perdido após retry`);
          this.clients.delete(accountId);
          this.emit('disconnected', { accountId, code: 'CONTEXT_LOST' });
        }
        throw e;
      }
    }
  }

  async sendText(accountId, phone, text) {
    const client = this.clients.get(accountId);
    if (!client?.info) throw new Error('Conta não conectada');
    const chatId = `${String(phone).replace(/\D/g, '')}@c.us`;
    return this._trySend(accountId, () =>
      client.sendMessage(chatId, text).then((m) => m.id._serialized)
    );
  }

  async sendMedia(accountId, phone, mediaUrl, mediaType, fileName, caption = '') {
    const client = this.clients.get(accountId);
    if (!client?.info) throw new Error('Conta não conectada');
    const chatId = `${String(phone).replace(/\D/g, '')}@c.us`;
    return this._trySend(accountId, async () => {
      const media = await MessageMedia.fromUrl(mediaUrl, { unsafeMime: true });
      if (fileName) media.filename = fileName;
      const msg = await client.sendMessage(chatId, media, { caption });
      return msg.id._serialized;
    });
  }

  status(accountId) {
    const c = this.clients.get(accountId);
    if (!c) return 'disconnected';
    return c.info ? 'connected' : 'connecting';
  }

  getAllStatuses() {
    const result = {};
    for (const [id, client] of this.clients) {
      result[id] = client.info ? 'connected' : 'connecting';
    }
    return result;
  }
}

module.exports = WAManager;
