const { initAuthCreds, BufferJSON, proto } = require('@whiskeysockets/baileys');
const { redis } = require('../config/redis');

const NS = 'wa:session';

// Mirrors Baileys' fixFileName: replace chars that aren't safe in Redis keys
function fixKey(str) {
  return str.replace(/\//g, '__').replace(/:/g, '-');
}

async function useRedisAuthState(accountId) {
  const prefix = `${NS}:${accountId}`;

  const read = async (key) => {
    const raw = await redis.get(`${prefix}:${key}`);
    if (!raw) return null;
    try { return JSON.parse(raw, BufferJSON.reviver); } catch { return null; }
  };

  const write = async (key, value) => {
    await redis.set(`${prefix}:${key}`, JSON.stringify(value, BufferJSON.replacer));
  };

  const remove = async (key) => {
    await redis.del(`${prefix}:${key}`);
  };

  const creds = (await read('creds')) || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          await Promise.all(
            ids.map(async (id) => {
              const k = fixKey(`${type}-${id}`);
              let value = await read(k);
              if (type === 'app-state-sync-key' && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
            })
          );
          return data;
        },
        set: async (data) => {
          const tasks = [];
          for (const category of Object.keys(data)) {
            for (const id of Object.keys(data[category])) {
              const k = fixKey(`${category}-${id}`);
              const value = data[category][id];
              tasks.push(value ? write(k, value) : remove(k));
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: () => write('creds', creds),
  };
}

async function deleteSession(accountId) {
  const prefix = `${NS}:${accountId}`;
  let cursor = '0';
  do {
    const [next, keys] = await redis.scan(cursor, 'MATCH', `${prefix}:*`, 'COUNT', 200);
    cursor = next;
    if (keys.length > 0) await redis.del(...keys);
  } while (cursor !== '0');
}

async function hasSession(accountId) {
  const key = `${NS}:${accountId}:creds`;
  return (await redis.exists(key)) > 0;
}

module.exports = { useRedisAuthState, deleteSession, hasSession };
