const Redis = require('ioredis');

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
};

const redis = new Redis(connection);

redis.on('error', (err) => {
  console.error('[Redis] connection error:', err.message);
});

module.exports = { redis, connection };
