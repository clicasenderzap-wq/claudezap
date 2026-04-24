const { Client, LocalAuth } = require('whatsapp-web.js');
const { EventEmitter } = require('events');
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
];

function findChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
  ].filter(Boolean);
  for (const p of candidates) {
    if (fs.existsSync(p)) { console.log('[Browser] Chrome encontrado em:', p); return p; }
  }
  throw new Error('Chrome/Chromium não encontrado. Verifique a instalação no Dockerfile.');
}

const CHROME_BIN = findChrome();

class WAService extends EventEmitter {
  constructor() {
    super();
    this.clients = new Map();
  }

  async connect(accountId) {
    if (this.clients.has(accountId)) {
      console.log(`[WA] ${accountId}: sessão já em andamento`);
      return;
    }

    const client = new Client({
      authStrategy: new LocalAuth({ clientId: accountId }),
      puppeteer: {
        executablePath: CHROME_BIN,
        headless: true,
        args: CHROME_ARGS,
      },
    });

    this.clients.set(accountId, client);

    client.on('qr', (qr) => {
      console.log(`[WA] ${accountId}: QR gerado`);
      this.emit('qr', { accountId, qr });
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
    });
  }

  async disconnect(accountId) {
    const client = this.clients.get(accountId);
    this.clients.delete(accountId);
    if (client) {
      try { await client.destroy(); } catch {}
    }
  }

  async sendText(accountId, phone, text) {
    const client = this.clients.get(accountId);
    if (!client) throw new Error('Não conectado');
    const chatId = `${String(phone).replace(/\D/g, '')}@c.us`;
    const msg = await client.sendMessage(chatId, text);
    return msg.id._serialized;
  }

  async sendMedia(accountId, phone, mediaUrl, mediaType, fileName, caption = '') {
    const client = this.clients.get(accountId);
    if (!client) throw new Error('Não conectado');
    const { MessageMedia } = require('whatsapp-web.js');
    const chatId = `${String(phone).replace(/\D/g, '')}@c.us`;
    const media = await MessageMedia.fromUrl(mediaUrl, { unsafeMime: true });
    if (fileName) media.filename = fileName;
    const msg = await client.sendMessage(chatId, media, { caption });
    return msg.id._serialized;
  }

  status(accountId) {
    const c = this.clients.get(accountId);
    if (!c) return 'disconnected';
    return c.info ? 'connected' : 'connecting';
  }
}

module.exports = new WAService();
