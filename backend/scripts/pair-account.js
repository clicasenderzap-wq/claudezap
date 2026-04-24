/**
 * Emparelha uma conta WhatsApp localmente (IP residencial) e salva
 * a sessão no Redis para que o servidor na Render reconecte automaticamente.
 *
 * Uso:
 *   node scripts/pair-account.js <account-id>
 *   node scripts/pair-account.js <account-id> --code 5511999999999
 *
 * O account-id é o UUID da conta no banco de dados (visível no painel admin).
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const {
  default: makeWASocket,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers,
  initAuthCreds,
  BufferJSON,
  proto,
} = require('@whiskeysockets/baileys');
const Redis = require('ioredis');

// ── Args ────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const accountId = args[0];
const codeIdx = args.indexOf('--code');
const pairingPhone = codeIdx !== -1 ? args[codeIdx + 1] : null;

if (!accountId) {
  console.error('\nUso: node scripts/pair-account.js <account-id> [--code <telefone>]\n');
  console.error('Exemplos:');
  console.error('  node scripts/pair-account.js 3ff74fb6-f405-4dd6-83e4-6a4d5371fcbd');
  console.error('  node scripts/pair-account.js 3ff74fb6-f405-4dd6-83e4-6a4d5371fcbd --code 5511999999999\n');
  process.exit(1);
}

// ── Redis ────────────────────────────────────────────────────────────────────
if (!process.env.REDIS_URL) {
  console.error('\nErro: REDIS_URL não encontrado no .env\n');
  process.exit(1);
}

let url;
try { url = new URL(process.env.REDIS_URL); } catch {
  console.error('\nErro: REDIS_URL inválida\n'); process.exit(1);
}

const redis = new Redis({
  host: url.hostname,
  port: Number(url.port),
  password: url.password || undefined,
  tls: url.protocol === 'rediss:' ? {} : undefined,
  maxRetriesPerRequest: null,
});

redis.on('error', (e) => console.error('[Redis]', e.message));

// ── Session store (mesmo formato do servidor) ─────────────────────────────
const NS = 'wa:session';
const prefix = `${NS}:${accountId}`;

function fixKey(str) { return str.replace(/\//g, '__').replace(/:/g, '-'); }

async function read(key) {
  const raw = await redis.get(`${prefix}:${key}`);
  if (!raw) return null;
  try { return JSON.parse(raw, BufferJSON.reviver); } catch { return null; }
}
async function write(key, value) {
  await redis.set(`${prefix}:${key}`, JSON.stringify(value, BufferJSON.replacer));
}
async function remove(key) { await redis.del(`${prefix}:${key}`); }

async function useRedisAuthState() {
  const creds = (await read('creds')) || initAuthCreds();
  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          await Promise.all(ids.map(async (id) => {
            const k = fixKey(`${type}-${id}`);
            let value = await read(k);
            if (type === 'app-state-sync-key' && value)
              value = proto.Message.AppStateSyncKeyData.fromObject(value);
            data[id] = value;
          }));
          return data;
        },
        set: async (data) => {
          const tasks = [];
          for (const cat of Object.keys(data))
            for (const id of Object.keys(data[cat])) {
              const k = fixKey(`${cat}-${id}`);
              const v = data[cat][id];
              tasks.push(v ? write(k, v) : remove(k));
            }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: () => write('creds', creds),
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────
const noop = () => {};
const silentLogger = { level: 'silent', trace: noop, debug: noop, info: noop, warn: noop, error: noop, fatal: noop, child: () => silentLogger };

async function main() {
  console.log(`\n[Emparelhamento] Conta: ${accountId}`);
  console.log(`[Emparelhamento] Modo: ${pairingPhone ? `código (${pairingPhone})` : 'QR Code'}\n`);

  const { state, saveCreds } = await useRedisAuthState();
  const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1015901307] }));

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, silentLogger),
    },
    browser: Browsers.ubuntu('Chrome'),
    syncFullHistory: false,
    printQRInTerminal: !pairingPhone, // mostra QR no terminal se não for código
    logger: silentLogger,
  });

  sock.ev.on('creds.update', saveCreds);

  if (pairingPhone) {
    const digits = String(pairingPhone).replace(/\D/g, '');
    try {
      const code = await sock.requestPairingCode(digits);
      console.log('┌─────────────────────────────────┐');
      console.log(`│  Código de emparelhamento:       │`);
      console.log(`│                                  │`);
      console.log(`│        ${code.padEnd(24)}│`);
      console.log(`│                                  │`);
      console.log('└─────────────────────────────────┘');
      console.log('\nNo celular: WhatsApp → Dispositivos Vinculados');
      console.log('→ Vincular dispositivo → Vincular com número de telefone\n');
    } catch (e) {
      console.error('[Erro] Não foi possível gerar código:', e.message);
    }
  } else {
    console.log('Escaneie o QR Code acima com o WhatsApp:');
    console.log('Celular → Dispositivos Vinculados → Vincular dispositivo\n');
  }

  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'open') {
      const phone = sock.user?.id?.split(':')[0] ?? 'desconhecido';
      console.log(`\n✓ Conectado! Número: +${phone}`);
      console.log('✓ Sessão salva no Redis.');
      console.log('✓ O servidor na Render vai reconectar automaticamente.\n');
      setTimeout(async () => { await redis.quit(); process.exit(0); }, 1500);
    }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      console.error(`\n✗ Conexão encerrada (código ${code ?? 'desconhecido'})`);
      if (code === 401 || code === 403) {
        console.error('  Conta banida ou deslogada — não é possível emparelhar.');
      }
      await redis.quit();
      process.exit(1);
    }
  });
}

main().catch(async (e) => {
  console.error('[Erro fatal]', e.message);
  await redis.quit();
  process.exit(1);
});
