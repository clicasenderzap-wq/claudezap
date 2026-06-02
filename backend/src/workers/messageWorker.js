const boss = require('../config/pgboss');
const { Message, Campaign, Contact } = require('../models');
const { Op } = require('sequelize');
const whatsapp = require('../services/whatsappService');

const QUEUE = 'messages';

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

async function processMessage(job) {
  const { messageId, userId, accountId, phone } = job.data;

  // Em pg-boss: job.retryCount = tentativas já feitas, job.retryLimit = máx retries
  const retryLimit = job.retryLimit ?? 7;
  const isLastAttempt = job.retryCount >= retryLimit;

  const message = await Message.findByPk(messageId);
  if (!message) throw new Error(`Message ${messageId} not found`);

  if (message.status === 'sent' || message.status === 'delivered') {
    console.log(`[Worker] msg ${messageId} já enviada (status=${message.status}) — job duplicado ignorado`);
    return;
  }

  const { isGloballyBlocked } = require('../services/optoutService');
  if (await isGloballyBlocked(userId, phone)) {
    await message.update({ status: 'failed', error_message: 'Número na lista negra permanente (enviou SAIR)' });
    await handleCampaignFailure(message);
    console.log(`[Worker] msg ${messageId} bloqueada — ${phone} está na lista negra`);
    return;
  }

  const isConnected = (id) => whatsapp.getStatus(id) === 'connected';
  const { WhatsappAccount } = require('../models');
  const allAccounts = await WhatsappAccount.findAll({ where: { user_id: userId }, attributes: ['id', 'status'] });

  let primaryId = accountId;
  if (!primaryId || !isConnected(primaryId)) {
    const c = allAccounts.find((a) => isConnected(a.id)) || allAccounts.find((a) => a.status === 'connected');
    if (c) primaryId = c.id;
  }

  if (!primaryId) {
    const statusSummary = allAccounts.map((a) => `${a.id.slice(0,8)}:${a.status}:ws=${isConnected(a.id)}`).join(', ');
    console.warn(`[Worker] msg ${messageId} — sem conta conectada. Contas: [${statusSummary}]`);
    if (isLastAttempt) {
      await message.update({ status: 'failed', error_message: 'Nenhuma conta WhatsApp conectada' });
      await handleCampaignFailure(message);
    }
    throw new Error('Nenhuma conta WhatsApp conectada');
  }

  console.log(`[Worker] msg ${messageId} → conta ${primaryId.slice(0,8)} (tentativa ${job.retryCount + 1}/${retryLimit + 1})`);

  let waId;
  let usedAccountId = primaryId;
  let lastErr;

  try {
    waId = await trySend(primaryId, message, phone);
  } catch (err) {
    lastErr = err;
    if (isConnErr(err.message)) {
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
  console.log(`[Worker] ✓ msg ${messageId} → ${phone}`);
}

async function start() {
  try {
    console.log('[Worker] iniciando pg-boss...');
    await boss.start();
    console.log('[Worker] pg-boss started — registrando handler...');
  } catch (e) {
    console.error('[Worker] FALHA ao iniciar pg-boss:', e.message, e.stack);
    throw e;
  }

  await boss.work(QUEUE, { teamSize: 5, teamConcurrency: 1 }, async (job) => {
    console.log(`[Worker] job recebido: ${job.id} msg=${job.data?.messageId}`);
    try {
      await processMessage(job);
    } catch (err) {
      const retryLimit = job.retryLimit ?? 7;
      const made = job.retryCount + 1;
      const { messageId, phone } = job.data ?? {};
      if (made > retryLimit) {
        console.error(`[Worker] ✗ msg ${messageId} → ${phone} | FALHOU após ${made} tentativas: ${err.message}`);
      } else {
        console.warn(`[Worker] ↺ msg ${messageId} → ${phone} | tentativa ${made}/${retryLimit + 1}: ${err.message}`);
      }
      throw err;
    }
  });
  console.log('[Worker] message worker started (pg-boss) ✓');
}

start().catch((e) => console.error('[Worker] ERRO FATAL ao iniciar:', e.message));

module.exports = { start };
