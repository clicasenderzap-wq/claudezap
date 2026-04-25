const { Queue } = require('bullmq');
const { connection } = require('../config/redis');

const emailQueue = new Queue('emails', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 30_000 },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 200 },
  },
});

async function enqueueEmail(emailMessageId, delayMs = 0) {
  const job = await emailQueue.add('send', { emailMessageId }, { delay: delayMs });
  return job.id;
}

async function cancelEmailJob(jobId) {
  try {
    const job = await emailQueue.getJob(String(jobId));
    if (job) await job.remove();
  } catch {}
}

module.exports = { emailQueue, enqueueEmail, cancelEmailJob };
