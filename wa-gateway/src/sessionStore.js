const { initAuthCreds, BufferJSON, proto } = require('@whiskeysockets/baileys');
const redis = require('./redis');

const NS = 'wa:session';

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
  const remove = async (key) => { await redis.del(`${prefix}:${key}`); };

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
  return (await redis.exists(`${NS}:${accountId}:creds`)) > 0;
}

async function migrateTempToRedis(tempDir, accountId) {
  const fs = require('fs');
  const path = require('path');
  const NS_prefix = `${NS}:${accountId}`;
  const files = fs.readdirSync(tempDir).filter((f) => f.endsWith('.json'));
  await Promise.all(files.map(async (file) => {
    const key = file.slice(0, -5);
    const content = fs.readFileSync(path.join(tempDir, file), 'utf8');
    await redis.set(`${NS_prefix}:${key}`, content);
  }));
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log(`[Session] ${accountId}: ${files.length} chaves migradas de /tmp para Redis`);
}

module.exports = { useRedisAuthState, deleteSession, hasSession, migrateTempToRedis };
