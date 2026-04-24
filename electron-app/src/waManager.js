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

function findChrome(userDataPath) {
  const candidates = [
    // Chromium bundled by Puppeteer inside asar.unpacked
    process.resourcesPath
      ? path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'puppeteer', '.local-chromium')
      : null,
    process.env.CHROME_BIN,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
  ].filter(Boolean);

  // Check puppeteer bundled chromium (look inside .local-chromium for win64)
  if (process.resourcesPath) {
    const baseDir = path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'puppeteer', '.local-chromium');
    if (fs.existsSync(baseDir)) {
      const builds = fs.readdirSync(baseDir);
      for (const build of builds) {
        const exe = path.join(baseDir, build, 'chrome-win', 'chrome.exe');
        if (fs.existsSync(exe)) {
          console.log('[WA] Chromium bundled encontrado:', exe);
          return exe;
        }
      }
    }
  }

  // Also check development path (npm install downloaded it)
  const devChromiumBase = path.join(__dirname, '..', 'node_modules', 'puppeteer', '.local-chromium');
  if (fs.existsSync(devChromiumBase)) {
    const builds = fs.readdirSync(devChromiumBase);
    for (const build of builds) {
      const exe = path.join(devChromiumBase, build, 'chrome-win', 'chrome.exe');
      if (fs.existsSync(exe)) {
        console.log('[WA] Chromium dev encontrado:', exe);
        return exe;
      }
    }
  }

  for (const p of candidates) {
    if (p && fs.existsSync(p)) {
      console.log('[WA] Chrome encontrado:', p);
      return p;
    }
  }
  return null; // will use puppeteer default
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

  async _trySend(accountId, fn) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        return await fn();
      } catch (e) {
        if (this._isContextError(e) && attempt === 1) {
          console.warn(`[WA] ${accountId}: contexto perdido, aguardando 4s...`);
          await new Promise((r) => setTimeout(r, 4000));
          continue;
        }
        if (this._isContextError(e)) {
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
