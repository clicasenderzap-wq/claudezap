const { Worker } = require('bullmq');
const { connection } = require('../config/redis');
const { Message } = require('../models');
const whatsapp = require('../services/whatsappService');

const worker = new Worker(
  'messages',
  async (job) => {
    const { messageId, userId, accountId, phone, content } = job.data;

    const message = await Message.findByPk(messageId);
    if (!message) throw new Error(`Message ${messageId} not found`);

    // accountId from job takes priority; fall back to first connected account for the user
    let senderId = accountId;
    if (!senderId || whatsapp.getStatus(senderId) !== 'connected') {
      const { WhatsappAccount } = require('../models');
      const accounts = await WhatsappAccount.findAll({ where: { user_id: userId } });
      const connected = accounts.find((a) => whatsapp.getStatus(a.id) === 'connected');
      if (connected) senderId = connected.id;
    }

    if (!senderId || whatsapp.getStatus(senderId) !== 'connected') {
      await message.update({ status: 'failed', error_message: 'Nenhuma conta WhatsApp conectada' });
      throw new Error('Nenhuma conta WhatsApp conectada');
    }

    try {
      const waId = await whatsapp.sendText(senderId, phone, content);
      await message.update({ status: 'sent', wa_message_id: waId, sent_at: new Date(), account_id: senderId });
    } catch (err) {
      await message.update({ status: 'failed', error_message: err.message });
      throw err;
    }
  },
  {
    connection,
    concurrency: 1,
    limiter: {
      max: Number(process.env.MSG_RATE_LIMIT_PER_MIN) || 20,
      duration: 60_000,
    },
  }
);

worker.on('completed', (job) => {
  console.log(`[Worker] job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[Worker] job ${job?.id} failed:`, err.message);
});

console.log('[Worker] message worker started');
module.exports = worker;
