const { Worker } = require('bullmq');
const { connection } = require('../config/redis');
const { Message, Campaign, Contact } = require('../models');
const { Op } = require('sequelize');
const whatsapp = require('../services/whatsappService');

// Per-account send serializer: at most 1 concurrent send per WhatsApp account.
const _accountQueues = new Map();

function withAccountLock(accountId, fn) {
  const prev = _accountQueues.get(accountId) || Promise.resolve();
  const current = prev.then(() => fn(), () => fn());
  _accountQueues.set(accountId, current.catch(() => {}));
  return current;
}

const isConnErr = (msg) => /conectad|connected|desktop|session/i.test(msg || '');

async function trySend(accountId, message, phone) {
  let waId;
  await withAccountLock(accountId, async () => {
    if (message.media_url) {
      waId = await whatsapp.sendMedia(accountId, phone, message.media_url, message.media_type, message.media_filename, message.content);
    } else {
      waId = await whatsapp.sendText(accountId, phone, message.content);
    }
  });
  return waId;
}

async function handleCampaignSuccess(message) {
  if (!message.campaign_id) return;
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

async function handleCampaignFailure(message) {
  if (!message.campaign_id) return;
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

const worker = new Worker(
  'messages',
  async (job) => {
    const { messageId, userId, accountId, phone } = job.data;

    const message = await Message.findByPk(messageId);
    if (!message) throw new Error(`Message ${messageId} not found`);

    // Idempotency guard: if already sent/delivered by a duplicate job, skip silently
    if (message.status === 'sent' || message.status === 'delivered') {
      console.log(`[Worker] msg ${messageId} já enviada (status=${message.status}) — job duplicado ignorado`);
      return;
    }

    // Global blocklist check — never send to permanently opted-out numbers
    const { isGloballyBlocked } = require('../services/optoutService');
    if (await isGloballyBlocked(userId, phone)) {
      await message.update({ status: 'failed', error_message: 'Número na lista negra permanente (enviou SAIR)' });
      await handleCampaignFailure(message);
      console.log(`[Worker] msg ${messageId} bloqueada — ${phone} está na lista negra`);
      return;
    }

    const maxAttempts = job.opts?.attempts ?? 3;
    const isLastAttempt = job.attemptsMade >= maxAttempts - 1;

    const isConnected = (id) => whatsapp.getStatus(id) === 'connected';

    // Build ordered list of accounts to try: assigned first, then others
    const { WhatsappAccount } = require('../models');
    const allAccounts = await WhatsappAccount.findAll({ where: { user_id: userId }, attributes: ['id', 'status'] });

    let primaryId = accountId;
    if (!primaryId || !isConnected(primaryId)) {
      const c = allAccounts.find((a) => isConnected(a.id)) || allAccounts.find((a) => a.status === 'connected');
      if (c) primaryId = c.id;
    }

    if (!primaryId) {
      if (isLastAttempt) {
        await message.update({ status: 'failed', error_message: 'Nenhuma conta WhatsApp conectada' });
      }
      throw new Error('Nenhuma conta WhatsApp conectada');
    }

    // Try primary account; on connection error immediately try others (no waiting for BullMQ retry)
    let waId;
    let usedAccountId = primaryId;
    let lastErr;

    try {
      waId = await trySend(primaryId, message, phone);
    } catch (err) {
      lastErr = err;
      if (isConnErr(err.message)) {
        // Try remaining connected accounts before giving up this attempt
        const fallbacks = allAccounts.filter(
          (a) => a.id !== primaryId && (isConnected(a.id) || a.status === 'connected')
        );
        for (const fb of fallbacks) {
          try {
            waId = await trySend(fb.id, message, phone);
            usedAccountId = fb.id;
            lastErr = null;
            break;
          } catch (fbErr) {
            lastErr = fbErr;
          }
        }
      }
    }

    if (lastErr) {
      if (isLastAttempt) {
        await message.update({ status: 'failed', error_message: lastErr.message });
        await handleCampaignFailure(message);
      }
      throw lastErr;
    }

    await message.update({ status: 'sent', wa_message_id: waId, sent_at: new Date(), account_id: usedAccountId });
    await handleCampaignSuccess(message);
  },
  {
    connection,
    concurrency: 5,
    // 5 min lock — prevents stalled jobs when the per-account queue serializes
    // many messages and BullMQ's 120s default expires before the job gets the lock
    lockDuration: 300_000,
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
    console.error(`[Worker] ✗ job ${job?.id} | msg ${messageId} → ${phone} | FALHOU após ${made} tentativas: ${err.message}`);
  } else {
    console.warn(`[Worker] ↺ job ${job?.id} | msg ${messageId} → ${phone} | tentativa ${made}/${maxAttempts}: ${err.message}`);
  }
});

worker.on('stalled', (jobId) => {
  console.warn(`[Worker] ⚠ job ${jobId} marcado como stalled — será reprocessado`);
});

console.log('[Worker] message worker started');
module.exports = worker;
