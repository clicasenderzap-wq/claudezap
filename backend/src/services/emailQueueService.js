const _pending = new Map();
let _counter = 0;

function _genId() {
  return `eq${++_counter}_${Date.now()}`;
}

function _fire(emailMessageId) {
  setImmediate(async () => {
    try {
      const { processEmailJob } = require('../workers/emailWorker');
      await processEmailJob(emailMessageId);
    } catch (e) {
      console.error(`[EmailQueue] erro ao processar ${emailMessageId}:`, e.message);
    }
  });
}

async function enqueueEmail(emailMessageId, delayMs = 0) {
  const jobId = _genId();
  if (delayMs <= 0) {
    _fire(emailMessageId);
    return jobId;
  }
  const handle = setTimeout(() => {
    _pending.delete(jobId);
    _fire(emailMessageId);
  }, delayMs);
  _pending.set(jobId, handle);
  return jobId;
}

function cancelEmailJob(jobId) {
  const handle = _pending.get(String(jobId));
  if (handle) {
    clearTimeout(handle);
    _pending.delete(String(jobId));
  }
}

module.exports = { enqueueEmail, cancelEmailJob };
