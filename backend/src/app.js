require('dotenv').config();

// Impede que rejeições de Promise não capturadas derrubem o processo no Node.js v15+
process.on('unhandledRejection', (err) => {
  console.error('[UnhandledRejection]', err?.message || err);
});

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { sequelize } = require('./models');
const routes = require('./routes');

const app = express();

// Necessário no Render (e qualquer proxy reverso) para o rate-limit funcionar corretamente
app.set('trust proxy', 1);

app.use(helmet());

// CORS: em produção aceita apenas origens listadas em CORS_ORIGIN (vírgula-separadas).
// Sem CORS_ORIGIN definido (dev local) aceita tudo.
const _allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
  : null;

app.use(cors({
  origin: (origin, callback) => {
    if (!_allowedOrigins) return callback(null, true);
    if (!origin || _allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('CORS: origem não permitida'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
}));
app.use(express.json({ limit: '1mb' }));

app.use('/api', rateLimit({
  windowMs: 60_000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições, tente novamente em breve.' },
}));

app.use('/api', routes);

app.get('/', (req, res) => res.json({ status: 'ok' }));

app.get('/health', (req, res) => {
  try {
    const whatsapp = require('./services/whatsappService');
    res.json({ status: 'ok', timestamp: new Date(), whatsapp: whatsapp.getConnectionSummary() });
  } catch {
    res.json({ status: 'ok', timestamp: new Date() });
  }
});

app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Erro interno' });
});

const PORT = process.env.PORT || 3000;

// Abre a porta primeiro — o Render exige isso antes de qualquer outra coisa
const server = app.listen(PORT, () => {
  console.log(`[Server] rodando na porta ${PORT}`);
});

// Attach desktop WebSocket server (Electron app connections)
const { setupDesktopWS } = require('./routes/desktop');
setupDesktopWS(server);

// Conecta ao banco, sincroniza modelos e inicia serviços em background
(async () => {
  // ── Fase 1: banco de dados ─────────────────────────────────────────────────
  try {
    await sequelize.authenticate();
    console.log('[DB] Conexão estabelecida');

    // Migrações idempotentes ANTES do sync — garante colunas e tipos críticos
    const preSyncMigrations = [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS session_token VARCHAR(64)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS session_token_desktop VARCHAR(64)`,
      `ALTER TABLE messages ADD COLUMN IF NOT EXISTS to_phone VARCHAR(255)`,
      `ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_url TEXT`,
      `ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_type VARCHAR(255)`,
      `ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_filename VARCHAR(255)`,
      `ALTER TABLE messages ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ`,
      `ALTER TABLE messages ADD COLUMN IF NOT EXISTS queue_job_id VARCHAR(255)`,
      `ALTER TABLE messages ADD COLUMN IF NOT EXISTS account_id UUID`,
      `ALTER TABLE messages ALTER COLUMN contact_id DROP NOT NULL`,
      `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS email VARCHAR(255)`,
      `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS email_opt_out BOOLEAN NOT NULL DEFAULT FALSE`,
      // Cria o tipo ENUM do GlobalOptout apenas se não existir — evita falha no sync
      `DO $$ BEGIN CREATE TYPE "enum_global_optouts_source" AS ENUM ('reply','manual'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    ];
    for (const sql of preSyncMigrations) {
      try { await sequelize.query(sql); } catch (e) { console.error('[DB] Migration falhou:', sql.slice(0, 80), '|', e.message); }
    }
    console.log('[DB] Migrações críticas verificadas');

    // sync com alter — falha NÃO é fatal: tabelas já existem de deploys anteriores
    try {
      await sequelize.sync({ alter: true });
      console.log('[DB] Modelos sincronizados');
    } catch (syncErr) {
      console.error('[DB] sync({ alter: true }) falhou (não bloqueia o worker):', syncErr.message);
    }

    // Admin nunca conta como plano pago
    try {
      const { User } = require('./models');
      const adminEmail = 'clicasenderzap@gmail.com';
      const [updated] = await User.update(
        { plan: 'admin', status: 'active' },
        { where: { email: adminEmail, plan: { [require('sequelize').Op.ne]: 'admin' } } }
      );
      if (updated) console.log(`[Startup] plano admin aplicado em ${adminEmail}`);
    } catch (e) {
      console.error('[Startup] admin update:', e.message);
    }
  } catch (err) {
    console.error('[Startup] falha ao conectar ao banco:', err.message);
    // Continua mesmo assim — worker pode processar jobs quando o banco voltar
  }

  // ── Fase 2: serviços — SEMPRE iniciam, independente de falha no banco ──────
  try {
    require('./workers/messageWorker');
    console.log('[Worker] iniciado');
  } catch (e) { console.error('[Worker] falha ao iniciar:', e.message); }

  try {
    require('./workers/emailWorker');
    console.log('[EmailWorker] iniciado');
  } catch (e) { console.error('[EmailWorker] falha ao iniciar:', e.message); }

  try {
    require('./services/warmupService').start();
    console.log('[Warmup] iniciado');
  } catch (e) { console.error('[Warmup] falha ao iniciar:', e.message); }

  // Reconecta contas WhatsApp que estavam conectadas antes do restart
  try {
    const whatsapp = require('./services/whatsappService');
    const { WhatsappAccount } = require('./models');
    const accounts = await WhatsappAccount.findAll({ where: { status: 'connected' } });
    let delay = 0;
    for (const account of accounts) {
      setTimeout(() => {
        console.log(`[WA] Reconectando: ${account.label}`);
        whatsapp.connect(account.id).catch((e) => console.error(`[WA] Falha ao reconectar ${account.id}:`, e.message));
      }, delay);
      delay += 3000;
    }
  } catch (e) { console.error('[WA] falha ao reconectar contas:', e.message); }
})();

module.exports = app;
