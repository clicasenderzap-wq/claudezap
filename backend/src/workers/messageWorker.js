const { Worker } = require('bullmq');
const { connection } = require('../config/redis');
const { Message, Campaign, Contact } = require('../models');
const { Op } = require('sequelize');
const whatsapp = require('../services/whatsappService');

const worker = new Worker(
  'messages',
  async (job) => {
    const { messageId, userId, accountId, phone, content } = job.data;

    const message = await Message.findByPk(messageId);
    if (!message) throw new Error(`Message ${messageId} not found`);

    const maxAttempts = job.opts?.attempts ?? 3;
    const isLastAttempt = job.attemptsMade >= maxAttempts - 1;

    // accountId from job takes priority; fall back to first connected account for the user
    let senderId = accountId;
    const isConnected = (id) => whatsapp.getStatus(id) === 'connected';
    if (!senderId || !isConnected(senderId)) {
      const { WhatsappAccount } = require('../models');
      // check in-memory first, then fall back to DB status
      const accounts = await WhatsappAccount.findAll({ where: { user_id: userId } });
      const connected = accounts.find((a) => isConnected(a.id)) || accounts.find((a) => a.status === 'connected');
      if (connected) senderId = connected.id;
    }

    if (!senderId) {
      if (isLastAttempt) {
        await message.update({ status: 'failed', error_message: 'Nenhuma conta WhatsApp conectada' });
      }
      throw new Error('Nenhuma conta WhatsApp conectada');
    }

    try {
      let waId;
      if (message.media_url) {
        waId = await whatsapp.sendMedia(senderId, phone, message.media_url, message.media_type, message.media_filename, content);
      } else {
        waId = await whatsapp.sendText(senderId, phone, content);
      }
      await message.update({ status: 'sent', wa_message_id: waId, sent_at: new Date(), account_id: senderId });
      if (message.campaign_id) {
        await Campaign.increment('sent_count', { where: { id: message.campaign_id } }).catch(() => {});
        await Contact.update(
          { last_campaign_sent_at: new Date() },
          { where: { id: message.contact_id } }
        ).catch(() => {});
        const remaining = await Message.count({
          where: { campaign_id: message.campaign_id, status: { [Op.in]: ['queued', 'pending'] } },
        }).catch(() => 1);
        if (remaining === 0) {
          await Campaign.update(
            { status: 'completed' },
            { where: { id: message.campaign_id, status: 'running' } }
          ).catch(() => {});
        }
      }
    } catch (err) {
      if (isLastAttempt) {
        await message.update({ status: 'failed', error_message: err.message });
        if (message.campaign_id) {
          await Campaign.increment('failed_count', { where: { id: message.campaign_id } }).catch(() => {});
          const remaining = await Message.count({
            where: { campaign_id: message.campaign_id, status: { [Op.in]: ['queued', 'pending'] } },
          }).catch(() => 1);
          if (remaining === 0) {
            await Campaign.update(
              { status: 'completed' },
              { where: { id: message.campaign_id, status: 'running' } }
            ).catch(() => {});
          }
        }
      }
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
  console.log(`[Worker] job ${job.id} concluído`);
});

worker.on('failed', (job, err) => {
  const maxAttempts = job?.opts?.attempts ?? 3;
  const made = (job?.attemptsMade ?? 0) + 1;
  if (made >= maxAttempts) {
    console.error(`[Worker] job ${job?.id} falhou definitivamente após ${made} tentativas: ${err.message}`);
  } else {
    console.log(`[Worker] job ${job?.id} tentativa ${made}/${maxAttempts} falhou, aguardando retry: ${err.message}`);
  }
});

console.log('[Worker] message worker started');
module.exports = worker;
