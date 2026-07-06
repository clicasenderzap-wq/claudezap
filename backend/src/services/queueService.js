// Fila simples baseada em setTimeout — sem dependências externas
// Jobs sobrevivem a restarts porque o DB tem status='queued' e o startup reenfileira

const _pending = new Map(); // jobId → handle do setTimeout
let _counter = 0;

function _genId() {
  return `q${++_counter}_${Date.now()}`;
}

// Variação aleatória de ±30% para não criar padrão previsível de envio
function _jitter(baseMs) {
  if (baseMs <= 0) return 0;
  return Math.round(baseMs * (0.7 + Math.random() * 0.6));
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

// Retorna { id, fireAt } para que sendCampaign possa salvar scheduled_for no banco.
// O fireAt sobrevive a restarts do servidor — no startup, o delay é recalculado
// a partir de scheduled_for em vez de usar delay=0 (que colapsava todos os lotes).
async function enqueueBulk(messages, baseDelayMs = 3000, startOffset = 0) {
  const now = Date.now();
  let accumulated = startOffset;
  return messages.map((msg, i) => {
    if (i > 0) accumulated += _jitter(baseDelayMs);
    return { id: _schedule(msg, accumulated), fireAt: new Date(now + accumulated) };
  });
}

async function enqueueBatched(messages, baseDelayMs = 3000, batchSize = 50, batchIntervalMs = 28800000, startOffset = 0) {
  const now = Date.now();
  let accumulated = startOffset;
  let currentBatch = -1;
  return messages.map((msg, i) => {
    const batchIndex = Math.floor(i / batchSize);
    if (batchIndex !== currentBatch) {
      // Início de lote: reseta para o horário exato do lote (sem jitter no intervalo entre lotes)
      currentBatch = batchIndex;
      accumulated = startOffset + batchIndex * batchIntervalMs;
    } else {
      // Dentro do lote: jitter no delay entre mensagens
      accumulated += _jitter(baseDelayMs);
    }
    return { id: _schedule(msg, accumulated), fireAt: new Date(now + accumulated) };
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
