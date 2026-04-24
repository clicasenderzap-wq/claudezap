const Redis = require('ioredis');

function build() {
  if (process.env.REDIS_URL) {
    let url;
    try { url = new URL(process.env.REDIS_URL); } catch {
      console.error('[Redis] REDIS_URL inválida');
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
  return { host: 'localhost', port: 6379, maxRetriesPerRequest: null };
}

const redis = new Redis({ ...build(), retryStrategy: (t) => Math.min(t * 500, 10_000) });
redis.on('error', (e) => console.error('[Redis]', e.message));

module.exports = redis;
