const boss = require('../config/pgboss');

const QUEUE = 'emails';

function msToSec(ms) {
  return Math.max(0, Math.ceil(ms / 1000));
}

async function enqueueEmail(emailMessageId, delayMs = 0) {
  const id = await boss.send(QUEUE, { emailMessageId }, {
    startAfter: msToSec(delayMs),
    retryLimit: 2,
    retryDelay: 30,
    retryBackoff: true,
  });
  return id;
}

async function cancelEmailJob(jobId) {
  try {
    await boss.cancel(QUEUE, String(jobId));
  } catch {}
}

module.exports = { enqueueEmail, cancelEmailJob };
