const { Queue } = require('bullmq');
const { connection } = require('../config/redis');

const messageQueue = new Queue('messages', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 200 },
  },
});

async function enqueueMessage(messageId, userId, phone, content, delayMs = 0) {
  return messageQueue.add(
    'send',
    { messageId, userId, phone, content },
    { delay: delayMs }
  );
}

async function enqueueBulk(messages, baseDelayMs = 3000, startOffset = 0) {
  const jobs = messages.map((msg, index) => ({
    name: 'send',
    data: msg,
    opts: { delay: startOffset + index * baseDelayMs },
  }));
  return messageQueue.addBulk(jobs);
}

async function enqueueBatched(messages, baseDelayMs = 3000, batchSize = 50, batchIntervalMs = 28800000, startOffset = 0) {
  const jobs = messages.map((msg, i) => {
    const batchIndex = Math.floor(i / batchSize);
    const posInBatch = i % batchSize;
    return {
      name: 'send',
      data: msg,
      opts: { delay: startOffset + batchIndex * batchIntervalMs + posInBatch * baseDelayMs },
    };
  });
  return messageQueue.addBulk(jobs);
}

async function enqueueScheduled(messageId, userId, accountId, phone, content, scheduledFor) {
  const delay = Math.max(0, new Date(scheduledFor).getTime() - Date.now());
  const job = await messageQueue.add(
    'send',
    { messageId, userId, accountId, phone, content },
    {
      delay,
      // Retry up to 10x with 5-min base backoff (exponential: 5m, 10m, 20m...)
      // giving the desktop app time to reconnect before the message is lost
      attempts: 10,
      backoff: { type: 'exponential', delay: 300_000 },
    }
  );
  return job.id;
}

async function cancelJob(jobId) {
  try {
    const job = await messageQueue.getJob(String(jobId));
    if (job) await job.remove();
  } catch { /* job may have already run */ }
}

module.exports = { messageQueue, enqueueMessage, enqueueBulk, enqueueBatched, enqueueScheduled, cancelJob };
