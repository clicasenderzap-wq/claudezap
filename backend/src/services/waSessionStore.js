const { initAuthCreds, BufferJSON, proto } = require('@whiskeysockets/baileys');
const sequelize = require('../config/database');

// Garante que a tabela existe (roda na primeira inicialização)
async function ensureTable() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS wa_sessions (
      account_id TEXT NOT NULL,
      key_name   TEXT NOT NULL,
      value      TEXT NOT NULL,
      PRIMARY KEY (account_id, key_name)
    )
  `);
}

const _tableReady = ensureTable().catch((e) =>
  console.error('[waSessionStore] falha ao criar tabela wa_sessions:', e.message)
);

async function dbGet(accountId, key) {
  await _tableReady;
  const rows = await sequelize.query(
    'SELECT value FROM wa_sessions WHERE account_id = $1 AND key_name = $2',
    { bind: [accountId, key], type: sequelize.QueryTypes.SELECT }
  );
  const row = rows[0];
  return row ? row.value : null;
}

async function dbSet(accountId, key, value) {
  await _tableReady;
  await sequelize.query(
    `INSERT INTO wa_sessions (account_id, key_name, value)
     VALUES ($1, $2, $3)
     ON CONFLICT (account_id, key_name) DO UPDATE SET value = EXCLUDED.value`,
    { bind: [accountId, key, value] }
  );
}

async function dbDel(accountId, key) {
  await _tableReady;
  await sequelize.query(
    'DELETE FROM wa_sessions WHERE account_id = $1 AND key_name = $2',
    { bind: [accountId, key] }
  );
}

function fixKey(str) {
  return str.replace(/\//g, '__').replace(/:/g, '-');
}

async function useRedisAuthState(accountId) {
  const read = async (key) => {
    const raw = await dbGet(accountId, key);
    if (!raw) return null;
    try { return JSON.parse(raw, BufferJSON.reviver); } catch { return null; }
  };

  const write = async (key, value) => {
    await dbSet(accountId, key, JSON.stringify(value, BufferJSON.replacer));
  };

  const remove = async (key) => {
    await dbDel(accountId, key);
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
  await _tableReady;
  await sequelize.query(
    'DELETE FROM wa_sessions WHERE account_id = $1',
    { bind: [accountId] }
  );
}

async function hasSession(accountId) {
  await _tableReady;
  const rows = await sequelize.query(
    'SELECT 1 AS exists FROM wa_sessions WHERE account_id = $1 AND key_name = $2 LIMIT 1',
    { bind: [accountId, 'creds'], type: sequelize.QueryTypes.SELECT }
  );
  return rows.length > 0;
}

module.exports = { useRedisAuthState, deleteSession, hasSession };
