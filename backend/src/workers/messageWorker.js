const { Message, Campaign, Contact, WhatsappAccount } = require('../models');
const { Op } = require('sequelize');
const whatsapp = require('../services/whatsappService');

// Per-account send serializer
const _accountQueues = new Map();

function withAccountLock(accountId, fn) {
  const prev = _accountQueues.get(accountId) || Promise.resolve();
  const current = prev.then(() => fn(), () => fn());
  _accountQueues.set(accountId, current.catch(() => {}));
  return current;
}

const isConnErr = (msg) => /conectad|connected|desktop|session/i.test(msg || '');

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

async function processJob({ messageId, userId, accountId: preferredAccountId, phone }) {
  const message = await Message.findByPk(messageId);
  if (!message) {
    console.warn(`[Worker] msg ${messageId} não encontrada`);
    return;
  }

  // Idempotência
  if (message.status === 'sent' || message.status === 'delivered') {
    console.log(`[Worker] msg ${messageId} já enviada — ignorando`);
    return;
  }

  // Resolve telefone se não vier no job
  let destPhone = phone;
  if (!destPhone) {
    if (message.to_phone) {
      destPhone = message.to_phone;
    } else if (message.contact_id) {
      const contact = await Contact.findByPk(message.contact_id, { attributes: ['phone'] });
      destPhone = contact?.phone ?? null;
    }
  }
  if (!destPhone) {
    await message.update({ status: 'failed', error_message: 'Número de destino não encontrado' });
    await handleCampaignFailure(message);
    return;
  }

  // Blocklist
  const { isGloballyBlocked } = require('../services/optoutService');
  if (await isGloballyBlocked(userId, destPhone)) {
    await message.update({ status: 'failed', error_message: 'Número na lista negra permanente (enviou SAIR)' });
    await handleCampaignFailure(message);
    console.log(`[Worker] msg ${messageId} bloqueada — ${destPhone} está na lista negra`);
    return;
  }

  // Resolve conta WhatsApp conectada
  const isConnected = (id) => whatsapp.getStatus(id) === 'connected';
  const allAccounts = await WhatsappAccount.findAll({ where: { user_id: userId }, attributes: ['id', 'status'] });

  let accountId = preferredAccountId;
  if (!accountId || !isConnected(accountId)) {
    const c = allAccounts.find((a) => isConnected(a.id)) || allAccounts.find((a) => a.status === 'connected');
    if (c) accountId = c.id;
  }

  if (!accountId) {
    console.warn(`[Worker] msg ${messageId} — sem conta WhatsApp conectada`);
    await message.update({ status: 'failed', error_message: 'Nenhuma conta WhatsApp conectada' });
    await handleCampaignFailure(message);
    return;
  }

  console.log(`[Worker] enviando msg ${messageId} → ${destPhone} via ${accountId.slice(0, 8)}`);

  let waId;
  let usedAccountId = accountId;
  let lastErr;

  try {
    await withAccountLock(accountId, async () => {
      if (message.media_url) {
        waId = await whatsapp.sendMedia(accountId, destPhone, message.media_url, message.media_type, message.media_filename, message.content);
      } else {
        waId = await whatsapp.sendText(accountId, destPhone, message.content);
      }
    });
  } catch (err) {
    lastErr = err;
    if (isConnErr(err.message)) {
      const fallbacks = allAccounts.filter((a) => a.id !== accountId && (isConnected(a.id) || a.status === 'connected'));
      for (const fb of fallbacks) {
        try {
          await withAccountLock(fb.id, async () => {
            if (message.media_url) {
              waId = await whatsapp.sendMedia(fb.id, destPhone, message.media_url, message.media_type, message.media_filename, message.content);
            } else {
              waId = await whatsapp.sendText(fb.id, destPhone, message.content);
            }
          });
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
    console.error(`[Worker] ✗ msg ${messageId} → ${destPhone}: ${lastErr.message}`);
    await message.update({ status: 'failed', error_message: lastErr.message });
    await handleCampaignFailure(message);
    return;
  }

  await message.update({ status: 'sent', wa_message_id: waId, sent_at: new Date(), account_id: usedAccountId });
  await handleCampaignSuccess(message);
  console.log(`[Worker] ✓ msg ${messageId} → ${destPhone}`);
}

console.log('[Worker] message worker carregado (setTimeout queue)');
module.exports = { processJob };
