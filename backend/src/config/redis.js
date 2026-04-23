const Redis = require('ioredis');

function buildConnection() {
  if (process.env.REDIS_URL) {
    let url;
    try {
      url = new URL(process.env.REDIS_URL);
    } catch {
      console.error('[Redis] REDIS_URL inválida — use o formato: rediss://default:senha@host:6380');
      console.error('[Redis] Valor recebido:', process.env.REDIS_URL.slice(0, 60) + '...');
      // Fallback para local em vez de crashar o servidor
      return { host: 'localhost', port: 6379, maxRetriesPerRequest: null };
    }
    return {
      host: url.hostname,
      port: Number(url.port),
      password: url.password || undefined,
      tls: url.protocol === 'rediss:' ? {} : undefined,
      maxRetriesPerRequest: null,
    };
  }
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
  };
}

const connection = buildConnection();
const redis = new Redis({
  ...connection,
  retryStrategy: (times) => Math.min(times * 500, 10_000),
});

redis.on('error', (err) => {
  console.error('[Redis] connection error:', err.message);
});

module.exports = { redis, connection };
