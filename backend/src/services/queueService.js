// Fila simples baseada em setTimeout — sem dependências externas
// Jobs sobrevivem a restarts porque o DB tem status='queued' e o startup reenfileira

const _pending = new Map(); // jobId → handle do setTimeout
let _counter = 0;

function _genId() {
  return `q${++_counter}_${Date.now()}`;
}

function _fire(jobData) {
  setImmediate(async () => {
    try {
      const { processJob } = require('../workers/messageWorker');
      await processJob(jobData);
    } catch (e) {
      console.error(`[Queue] erro ao processar msg ${jobData.messageId}:`, e.message);
    }
  });
}

function _schedule(jobData, delayMs) {
  const jobId = _genId();
  if (delayMs <= 0) {
    _fire(jobData);
    return jobId;
  }
  const handle = setTimeout(() => {
    _pending.delete(jobId);
    _fire(jobData);
  }, delayMs);
  _pending.set(jobId, handle);
  return jobId;
}

async function enqueueMessage(messageId, userId, phone, content, delayMs = 0) {
  return _schedule({ messageId, userId, accountId: null, phone, content }, delayMs);
}

async function enqueueBulk(messages, baseDelayMs = 3000, startOffset = 0) {
  return messages.map((msg, i) => ({
    id: _schedule(msg, startOffset + i * baseDelayMs),
  }));
}

async function enqueueBatched(messages, baseDelayMs = 3000, batchSize = 50, batchIntervalMs = 28800000, startOffset = 0) {
  return messages.map((msg, i) => {
    const batchIndex = Math.floor(i / batchSize);
    const posInBatch = i % batchSize;
    const delay = startOffset + batchIndex * batchIntervalMs + posInBatch * baseDelayMs;
    return { id: _schedule(msg, delay) };
  });
}

async function enqueueScheduled(messageId, userId, accountId, phone, content, scheduledFor) {
  const delay = Math.max(0, new Date(scheduledFor).getTime() - Date.now());
  return _schedule({ messageId, userId, accountId, phone, content }, delay);
}

function cancelJob(jobId) {
  const handle = _pending.get(String(jobId));
  if (handle) {
    clearTimeout(handle);
    _pending.delete(String(jobId));
  }
  return Promise.resolve();
}

// Compatibilidade com adminController.getQueueStatus (métodos BullMQ não existem mais)
const messageQueue = {
  getWaitingCount: async () => 0,
  getActiveCount: async () => _pending.size,
  getDelayedCount: async () => 0,
  getFailedCount: async () => 0,
  getCompletedCount: async () => 0,
  getActive: async () => [],
  getFailed: async () => [],
};

module.exports = { enqueueMessage, enqueueBulk, enqueueBatched, enqueueScheduled, cancelJob, messageQueue };
