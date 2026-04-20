require('dotenv').config();

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

    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('[DB] Modelos sincronizados');

    require('./workers/messageWorker');
    console.log('[Worker] iniciado');

    // Reconecta sessões WhatsApp salvas automaticamente no startup
    const fs = require('fs');
    const path = require('path');
    const whatsapp = require('./services/whatsappService');
    const sessionDir = process.env.WA_SESSION_DIR || path.join(__dirname, '../wa_sessions');
    if (fs.existsSync(sessionDir)) {
      const sessions = fs.readdirSync(sessionDir).filter((f) => {
        return fs.statSync(path.join(sessionDir, f)).isDirectory();
      });
      for (const userId of sessions) {
        console.log(`[WA] Reconectando sessão: ${userId}`);
        whatsapp.connect(userId).catch((e) => console.error(`[WA] Falha ao reconectar ${userId}:`, e.message));
      }
    }
  } catch (err) {
    console.error('[Startup] falha ao conectar:', err.message);
    // Não encerra o processo — deixa o /health responder para diagnóstico
  }
})();

module.exports = app;
