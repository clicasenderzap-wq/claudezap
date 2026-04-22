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

module.exports = { messageQueue, enqueueMessage, enqueueBulk };
