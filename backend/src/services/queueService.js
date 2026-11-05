// Fila simples baseada em setTimeout — sem dependências externas.
// Cada mensagem tem no máximo UM disparo agendado: reagendar substitui o anterior,
// então nunca sobra um job "fantasma" disparando fora do horário.
// Jobs sobrevivem a restarts porque o DB guarda status='queued' + scheduled_for.

const _pending = new Map(); // messageId → handle do setTimeout

// setTimeout estoura acima de ~24,8 dias e dispara na hora — delays maiores são encadeados
const MAX_TIMEOUT_MS = 2_000_000_000;

// Variação aleatória de ±30% para não criar padrão previsível de envio
function jitter(baseMs) {
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

function _arm(key, jobData, fireAt) {
  const delay = Math.max(0, fireAt - Date.now());
  const handle = setTimeout(() => {
    if (fireAt - Date.now() > 1000) return _arm(key, jobData, fireAt);
    _pending.delete(key);
    _fire(jobData);
  }, Math.min(delay, MAX_TIMEOUT_MS));
  _pending.set(key, handle);
}

function cancelJob(jobId) {
  const key = String(jobId);
  const handle = _pending.get(key);
  if (handle) {
    clearTimeout(handle);
    _pending.delete(key);
  }
  return Promise.resolve();
}

function _schedule(jobData, delayMs) {
  const key = String(jobData.messageId);
  cancelJob(key);
  if (delayMs <= 0) {
    _fire(jobData);
    return key;
  }
  _arm(key, jobData, Date.now() + delayMs);
  return key;
}

async function enqueueMessage(messageId, userId, phone, content, delayMs = 0) {
  return _schedule({ messageId, userId, accountId: null, phone, content }, delayMs);
}

// Agenda pelo horário absoluto — usado pelo agendador de campanhas
function enqueueAt(messageId, userId, fireAt) {
  return _schedule({ messageId, userId, accountId: null, phone: null }, new Date(fireAt).getTime() - Date.now());
}

async function enqueueScheduled(messageId, userId, accountId, phone, content, scheduledFor) {
  const delay = Math.max(0, new Date(scheduledFor).getTime() - Date.now());
  return _schedule({ messageId, userId, accountId, phone, content }, delay);
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

module.exports = { enqueueMessage, enqueueAt, enqueueScheduled, cancelJob, jitter, messageQueue };
