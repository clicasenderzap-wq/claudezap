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

// Conecta ao banco e inicia o worker em background
(async () => {
  try {
    await sequelize.authenticate();
    console.log('[DB] Conexão estabelecida');

    await sequelize.sync({ alter: true });
    console.log('[DB] Modelos sincronizados');

    // Ensure email columns exist on contacts (idempotent raw migration)
    try {
      await sequelize.query(`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS email VARCHAR(255)`);
      await sequelize.query(`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS email_opt_out BOOLEAN NOT NULL DEFAULT FALSE`);
      console.log('[DB] Colunas de email em contacts verificadas');
    } catch (e) {
      console.error('[DB] Migração de colunas email:', e.message);
    }

    // Garante que a conta admin nunca conta como plano pago
    const { User } = require('./models');
    const adminEmail = 'clicasenderzap@gmail.com';
    const [updated] = await User.update(
      { plan: 'admin', status: 'active' },
      { where: { email: adminEmail, plan: { [require('sequelize').Op.ne]: 'admin' } } }
    );
    if (updated) console.log(`[Startup] plano admin aplicado em ${adminEmail}`);

    require('./workers/messageWorker');
    console.log('[Worker] iniciado');

    require('./workers/emailWorker');
    console.log('[EmailWorker] iniciado');

    require('./services/warmupService').start();
    console.log('[Warmup] iniciado');

    // Reconecta contas que estavam conectadas antes do restart
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
  } catch (err) {
    console.error('[Startup] falha ao conectar:', err.message);
    // Não encerra o processo — deixa o /health responder para diagnóstico
  }
})();

module.exports = app;
