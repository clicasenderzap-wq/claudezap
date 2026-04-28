const { Worker } = require('bullmq');
const { connection } = require('../config/redis');
const { Message, Campaign, Contact } = require('../models');
const { Op } = require('sequelize');
const whatsapp = require('../services/whatsappService');

// Per-account send serializer: at most 1 concurrent send per WhatsApp account.
// Prevents WhatsApp rate-limiting when multiple campaign jobs for the same account
// become active simultaneously. Different accounts still run in parallel (concurrency: 5).
const _accountQueues = new Map(); // accountId → Promise (current chain tail)

function withAccountLock(accountId, fn) {
  const prev = _accountQueues.get(accountId) || Promise.resolve();
  const current = prev.then(() => fn(), () => fn()); // run fn regardless of prev outcome
  _accountQueues.set(accountId, current.catch(() => {})); // chain tail never rejects
  return current; // can reject so BullMQ retries on failure
}

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
      // check in-memory first, then fall back to DB status (handles backend restarts)
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
      // Serialize sends per account — prevents concurrent WhatsApp sends from the same number
      await withAccountLock(senderId, async () => {
        if (message.media_url) {
          waId = await whatsapp.sendMedia(senderId, phone, message.media_url, message.media_type, message.media_filename, content);
        } else {
          waId = await whatsapp.sendText(senderId, phone, content);
        }
      });
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
    concurrency: 5,
    // Higher lockDuration prevents BullMQ from marking a job as "stalled" while it
    // is legitimately waiting for the per-account queue lock (worst case: 4 × 25s = 100s)
    lockDuration: 120_000,
  }
);

worker.on('completed', (job) => {
  const { messageId, phone } = job.data;
  console.log(`[Worker] ✓ job ${job.id} | msg ${messageId} → ${phone}`);
});

worker.on('failed', (job, err) => {
  const maxAttempts = job?.opts?.attempts ?? 3;
  const made = (job?.attemptsMade ?? 0) + 1;
  const { messageId, phone } = job?.data ?? {};
  if (made >= maxAttempts) {
    console.error(`[Worker] ✗ job ${job?.id} | msg ${messageId} → ${phone} | FALHOU DEFINITIVAMENTE após ${made} tentativas: ${err.message}`);
  } else {
    console.warn(`[Worker] ↺ job ${job?.id} | msg ${messageId} → ${phone} | tentativa ${made}/${maxAttempts}: ${err.message}`);
  }
});

worker.on('stalled', (jobId) => {
  console.warn(`[Worker] ⚠ job ${jobId} marcado como stalled — será reprocessado`);
});

console.log('[Worker] message worker started');
module.exports = worker;
