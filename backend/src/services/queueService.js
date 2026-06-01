const boss = require('../config/pgboss');

const QUEUE = 'messages';

// pg-boss usa segundos para startAfter; BullMQ usava ms — converter aqui
function msToSec(ms) {
  return Math.max(0, Math.ceil(ms / 1000));
}

async function enqueueMessage(messageId, userId, phone, content, delayMs = 0) {
  const id = await boss.send(QUEUE, { messageId, userId, phone, content }, {
    startAfter: msToSec(delayMs),
    retryLimit: 2,
    retryDelay: 5,
    retryBackoff: true,
  });
  return id;
}

async function enqueueBulk(messages, baseDelayMs = 3000, startOffset = 0) {
  const jobs = messages.map((msg, index) => ({
    name: QUEUE,
    data: msg,
    options: {
      startAfter: msToSec(startOffset + index * baseDelayMs),
      retryLimit: 7,
      retryDelay: 30,
      retryBackoff: true,
    },
  }));
  await boss.insert(jobs);
  // Retorna objetos simulados com id para compatibilidade com o controller
  return jobs.map((_, i) => ({ id: String(i) }));
}

async function enqueueBatched(messages, baseDelayMs = 3000, batchSize = 50, batchIntervalMs = 28800000, startOffset = 0) {
  const jobs = messages.map((msg, i) => {
    const batchIndex = Math.floor(i / batchSize);
    const posInBatch = i % batchSize;
    return {
      name: QUEUE,
      data: msg,
      options: {
        startAfter: msToSec(startOffset + batchIndex * batchIntervalMs + posInBatch * baseDelayMs),
        retryLimit: 7,
        retryDelay: 30,
        retryBackoff: true,
      },
    };
  });
  await boss.insert(jobs);
  return jobs.map((_, i) => ({ id: String(i) }));
}

async function enqueueScheduled(messageId, userId, accountId, phone, content, scheduledFor) {
  const id = await boss.send(QUEUE,
    { messageId, userId, accountId, phone, content },
    {
      startAfter: new Date(scheduledFor),
      retryLimit: 9,
      retryDelay: 300,
      retryBackoff: true,
    }
  );
  return id;
}

async function cancelJob(jobId) {
  try {
    await boss.cancel(QUEUE, String(jobId));
  } catch { /* job pode já ter rodado */ }
}

module.exports = { enqueueMessage, enqueueBulk, enqueueBatched, enqueueScheduled, cancelJob };
