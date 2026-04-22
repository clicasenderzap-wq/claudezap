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
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
}));
app.use(express.json());

app.use('/api', rateLimit({
  windowMs: 60_000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições, tente novamente em breve.' },
}));

app.use('/api', routes);

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Erro interno' });
});

const PORT = process.env.PORT || 3000;

// Abre a porta primeiro — o Render exige isso antes de qualquer outra coisa
const server = app.listen(PORT, () => {
  console.log(`[Server] rodando na porta ${PORT}`);
});

// Conecta ao banco e inicia o worker em background
(async () => {
  try {
    await sequelize.authenticate();
    console.log('[DB] Conexão estabelecida');

    await sequelize.sync({ alter: true });
    console.log('[DB] Modelos sincronizados');

    require('./workers/messageWorker');
    console.log('[Worker] iniciado');

    require('./services/warmupService').start();
    console.log('[Warmup] iniciado');

    // Reconecta contas WhatsApp salvas no banco ao iniciar
    const whatsapp = require('./services/whatsappService');
    const { WhatsappAccount } = require('./models');
    const accounts = await WhatsappAccount.findAll();
    for (const account of accounts) {
      console.log(`[WA] Reconectando conta: ${account.label} (${account.id})`);
      whatsapp.connect(account.id).catch((e) => console.error(`[WA] Falha ao reconectar ${account.id}:`, e.message));
    }
  } catch (err) {
    console.error('[Startup] falha ao conectar:', err.message);
    // Não encerra o processo — deixa o /health responder para diagnóstico
  }
})();

module.exports = app;
