const PgBoss = require('pg-boss');

const boss = new PgBoss({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined,
  // Mantém jobs completos por 1 dia, falhos por 7 dias
  archiveCompletedAfterSeconds: 86400,
  deleteAfterSeconds: 604800,
  monitorStateIntervalSeconds: 30,
  // Evita criar muitas conexões extras
  max: 3,
});

boss.on('error', (err) => console.error('[PgBoss] erro:', err.message));

module.exports = boss;
