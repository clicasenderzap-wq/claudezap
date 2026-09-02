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

// Per-account restriction tracker (resets on server restart — intencionalmente em memória)
// Quando uma conta acumula falhas consecutivas, ela é marcada como restrita e ignorada
// ao escolher a conta para novos envios. Após 30min sem falhas, a restrição é removida.
const _accountStats = new Map(); // accountId -> { consecutiveFails, lastFailAt }
const RESTRICTION_THRESHOLD = 5;
const RESTRICTION_LIFT_MS = 30 * 60 * 1000;

function markAccountFail(accountId) {
  const s = _accountStats.get(accountId) || { consecutiveFails: 0, lastFailAt: 0 };
  s.consecutiveFails++;
  s.lastFailAt = Date.now();
  _accountStats.set(accountId, s);
  if (s.consecutiveFails === RESTRICTION_THRESHOLD) {
    console.warn(`[Worker] conta ${accountId.slice(0, 8)} com ${s.consecutiveFails} falhas consecutivas — marcada como possível restrição`);
  }
}

function markAccountSuccess(accountId) {
  _accountStats.delete(accountId);
}

function isAccountRestricted(accountId) {
  const s = _accountStats.get(accountId);
  if (!s || s.consecutiveFails < RESTRICTION_THRESHOLD) return false;
  if (Date.now() - s.lastFailAt > RESTRICTION_LIFT_MS) {
    _accountStats.delete(accountId);
    return false;
  }
  return true;
}

// Expõe mapa de restrições para o controller de campanhas
function getRestrictedAccounts() {
  const now = Date.now();
  const result = [];
  for (const [id, s] of _accountStats.entries()) {
    if (s.consecutiveFails >= RESTRICTION_THRESHOLD && now - s.lastFailAt <= RESTRICTION_LIFT_MS) {
      result.push({ accountId: id, consecutiveFails: s.consecutiveFails, lastFailAt: s.lastFailAt });
    }
  }
  return result;
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
    return;
  }

  // Auto-detect chip restriction: check every 50 sends (less aggressive) and only
  // after at least 100 messages sent — early sends have no delivery receipts yet because
  // WhatsApp delivery confirmations are asynchronous and can take minutes/hours.
  try {
    const campaign = await Campaign.findByPk(message.campaign_id, {
      attributes: ['id', 'sent_count', 'status', 'created_at'],
    });
    const minSentToCheck = 100;
    if (
      campaign &&
      campaign.status === 'running' &&
      campaign.sent_count >= minSentToCheck &&
      campaign.sent_count % 50 === 0
    ) {
      const deliveredCount = await Message.count({ where: { campaign_id: campaign.id, status: 'delivered' } });
      if (deliveredCount === 0) {
        console.warn(`[Worker] Restrição detectada — campanha ${campaign.id}: ${campaign.sent_count} enviados, 0 entregues. Pausando.`);
        const { cancelJob } = require('../services/queueService');
        const queuedMsgs = await Message.findAll({
          where: { campaign_id: campaign.id, status: 'queued' },
          attributes: ['id', 'queue_job_id'],
        });
        await Promise.all(queuedMsgs.filter((m) => m.queue_job_id).map((m) => cancelJob(m.queue_job_id).catch(() => {})));
        if (queuedMsgs.length) {
          await Message.update(
            { status: 'failed', error_message: `Pausado: chip possivelmente restringido (${campaign.sent_count} enviados, 0 entregas confirmadas pelo WhatsApp)` },
            { where: { campaign_id: campaign.id, status: 'queued' } }
          ).catch(() => {});
        }
        await Campaign.update(
          { status: 'paused' },
          { where: { id: campaign.id, status: 'running' } }
        ).catch(() => {});
      }
    }
  } catch (e) {
    console.error('[Worker] erro na verificação de restrição:', e.message);
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

async function trySend(accountId, message, destPhone) {
  if (message.media_url) {
    return whatsapp.sendMedia(accountId, destPhone, message.media_url, message.media_type, message.media_filename, message.content);
  }
  return whatsapp.sendText(accountId, destPhone, message.content);
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

  // Respeita pausa/conclusão da campanha
  if (message.campaign_id) {
    const campaign = await Campaign.findByPk(message.campaign_id, { attributes: ['status'] });
    if (campaign && (campaign.status === 'paused' || campaign.status === 'completed' || campaign.status === 'cancelled')) {
      console.log(`[Worker] msg ${messageId} ignorada — campanha ${campaign.status}`);
      return;
    }
  }

  // Resolve telefone
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

  // Resolve conta WhatsApp — prefere a conta do job, mas pula restritas
  const isConnected = (id) => whatsapp.getStatus(id) === 'connected';
  const allAccounts = await WhatsappAccount.findAll({ where: { user_id: userId }, attributes: ['id', 'status'] });

  const pickBestAccount = () => {
    // 1. Usa a conta preferida se conectada e não restrita
    if (preferredAccountId && isConnected(preferredAccountId) && !isAccountRestricted(preferredAccountId)) {
      return preferredAccountId;
    }
    // 2. Qualquer conta conectada e não restrita
    const free = allAccounts.find((a) => isConnected(a.id) && !isAccountRestricted(a.id));
    if (free) return free.id;
    // 3. Qualquer conta conectada (mesmo que restrita — melhor do que não enviar)
    const any = allAccounts.find((a) => isConnected(a.id));
    if (any) return any.id;
    return null;
  };

  let accountId = pickBestAccount();

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

  // Tenta a conta escolhida
  try {
    await withAccountLock(accountId, async () => {
      waId = await trySend(accountId, message, destPhone);
    });
    markAccountSuccess(accountId);
  } catch (err) {
    lastErr = err;
    markAccountFail(accountId);

    // Fallback para qualquer outra conta disponível (independente do tipo de erro)
    // Cobre tanto desconexão quanto restrição do WhatsApp
    const fallbacks = allAccounts.filter(
      (a) => a.id !== accountId && (isConnected(a.id) || a.status === 'connected')
    );
    for (const fb of fallbacks) {
      try {
        await withAccountLock(fb.id, async () => {
          waId = await trySend(fb.id, message, destPhone);
        });
        usedAccountId = fb.id;
        markAccountSuccess(fb.id);
        lastErr = null;
        console.log(`[Worker] msg ${messageId} enviada via fallback ${fb.id.slice(0, 8)} após falha na conta principal`);
        break;
      } catch (fbErr) {
        markAccountFail(fb.id);
        lastErr = fbErr;
      }
    }
  }

  if (lastErr) {
    const desktopService = require('../services/desktopService');
    const isDesktopDown = !desktopService.isUserConnected(userId);
    if (isDesktopDown) {
      console.warn(`[Worker] msg ${messageId} — app offline, retry automático em 3min`);
      setTimeout(() => {
        const { enqueueMessage } = require('../services/queueService');
        enqueueMessage(messageId, userId, destPhone, message?.content || '', 0).catch(() => {});
      }, 3 * 60 * 1000);
      return;
    }
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
module.exports = { processJob, getRestrictedAccounts, isAccountRestricted };
