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

// Ritmo mínimo por número: mesmo com campanhas simultâneas no mesmo chip, nunca dois envios colados
const _lastSendAt = new Map(); // accountId → timestamp do último envio
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Evita envio duplicado se dois disparos da mesma mensagem coincidirem
const _inFlight = new Set();

// Per-account restriction tracker (resets on server restart — intencionalmente em memória)
// Quando uma conta acumula falhas consecutivas, ela é marcada como restrita e vai para o fim
// da fila de tentativas. Após 30min sem falhas, a restrição é removida.
const _accountStats = new Map(); // accountId -> { consecutiveFails, lastFailAt }
const RESTRICTION_THRESHOLD = 5;
const RESTRICTION_LIFT_MS = 30 * 60 * 1000;
const DEFER_MS = 3 * 60 * 1000;

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

// App fechado, chip reconectando ou sem resposta: a mensagem não falhou, só precisa esperar
function isTransientError(err) {
  return /desktop não conectado|conta não conectada|não respondeu/i.test(err?.message || '');
}

// Problema do número de destino, não do chip — não conta como sinal de restrição
function isContactError(err) {
  return /não está registrado/i.test(err?.message || '');
}

function scheduler() {
  return require('../services/campaignScheduler');
}

async function finishIfDone(campaignId) {
  const remaining = await Message.count({
    where: { campaign_id: campaignId, status: { [Op.in]: ['queued', 'pending'] } },
  }).catch(() => 1);
  if (remaining > 0) return false;
  await Campaign.update(
    { status: 'completed' },
    { where: { id: campaignId, status: ['running', 'scheduled'] } }
  ).catch(() => {});
  scheduler().clearNotice(campaignId);
  return true;
}

async function pauseCampaign(campaignId, notice) {
  const [updated] = await Campaign.update(
    { status: 'paused' },
    { where: { id: campaignId, status: ['running', 'scheduled'] } }
  ).catch(() => [0]);
  if (!updated) return;
  const queued = await Message.findAll({ where: { campaign_id: campaignId, status: 'queued' }, attributes: ['id'] });
  scheduler().cancelMessages(queued);
  scheduler().setNotice(campaignId, notice);
  console.warn(`[Worker] campanha ${campaignId} pausada automaticamente — ${notice}`);
}

async function handleCampaignSuccess(message) {
  if (!message.campaign_id) return;
  await Campaign.increment('sent_count', { where: { id: message.campaign_id } }).catch(() => {});
  await Contact.update(
    { last_campaign_sent_at: new Date() },
    { where: { id: message.contact_id } }
  ).catch(() => {});
  scheduler().clearNotice(message.campaign_id);
  if (await finishIfDone(message.campaign_id)) return;

  // Auto-detect chip restriction: check every 50 sends (less aggressive) and only
  // after at least 100 messages sent — early sends have no delivery receipts yet because
  // WhatsApp delivery confirmations are asynchronous and can take minutes/hours.
  try {
    const campaign = await Campaign.findByPk(message.campaign_id, { attributes: ['id', 'sent_count', 'status'] });
    if (campaign && campaign.status === 'running' && campaign.sent_count >= 100 && campaign.sent_count % 50 === 0) {
      const deliveredCount = await Message.count({ where: { campaign_id: campaign.id, status: 'delivered' } });
      if (deliveredCount === 0) {
        await pauseCampaign(
          campaign.id,
          `Pausada automaticamente: ${campaign.sent_count} mensagens enviadas e nenhuma entrega confirmada pelo WhatsApp — o chip pode estar restrito. Verifique o número antes de retomar.`
        );
      }
    }
  } catch (e) {
    console.error('[Worker] erro na verificação de restrição:', e.message);
  }
}

async function handleCampaignFailure(message) {
  if (!message.campaign_id) return;
  await Campaign.increment('failed_count', { where: { id: message.campaign_id } }).catch(() => {});
  await finishIfDone(message.campaign_id);
}

// Grava o estado final da mensagem e descarta qualquer disparo que ainda esteja agendado para ela
async function finalize(message, fields) {
  await message.update(fields);
  require('../services/queueService').cancelJob(message.id);
}

async function trySend(accountId, message, destPhone) {
  if (message.media_url) {
    return whatsapp.sendMedia(accountId, destPhone, message.media_url, message.media_type, message.media_filename, message.content);
  }
  return whatsapp.sendText(accountId, destPhone, message.content);
}

async function processJob(job) {
  if (_inFlight.has(job.messageId)) return;
  _inFlight.add(job.messageId);
  try {
    await sendOne(job);
  } finally {
    _inFlight.delete(job.messageId);
  }
}

async function sendOne({ messageId, accountId: jobAccountId, phone }) {
  const message = await Message.findByPk(messageId);
  if (!message) {
    console.warn(`[Worker] msg ${messageId} não encontrada`);
    return;
  }
  if (message.status !== 'queued' && message.status !== 'pending') {
    console.log(`[Worker] msg ${messageId} com status ${message.status} — ignorando`);
    return;
  }
  const ownerId = message.user_id;

  // Nunca envia antes do horário planejado: um disparo adiantado é só reposicionado
  const plannedAt = message.scheduled_for ? new Date(message.scheduled_for).getTime() : 0;
  if (plannedAt - Date.now() > 5000) {
    require('../services/queueService').enqueueAt(message.id, ownerId, plannedAt);
    return;
  }

  let campaign = null;
  if (message.campaign_id) {
    campaign = await Campaign.findByPk(message.campaign_id, { attributes: ['id', 'status', 'account_ids', 'delay_ms'] });
    if (!campaign || !scheduler().ACTIVE_STATUSES.includes(campaign.status)) {
      console.log(`[Worker] msg ${messageId} ignorada — campanha ${campaign?.status ?? 'removida'}`);
      return;
    }
    if (campaign.status === 'scheduled') {
      await Campaign.update({ status: 'running' }, { where: { id: campaign.id, status: 'scheduled' } }).catch(() => {});
    }
  }

  // Resolve telefone
  let destPhone = phone || message.to_phone;
  if (!destPhone && message.contact_id) {
    const contact = await Contact.findByPk(message.contact_id, { attributes: ['phone'] });
    destPhone = contact?.phone ?? null;
  }
  if (!destPhone) {
    await finalize(message, { status: 'failed', error_message: 'Número de destino não encontrado' });
    await handleCampaignFailure(message);
    return;
  }

  // Blocklist
  const { isGloballyBlocked } = require('../services/optoutService');
  if (await isGloballyBlocked(ownerId, destPhone)) {
    await finalize(message, { status: 'failed', error_message: 'Número na lista negra permanente (enviou SAIR)' });
    await handleCampaignFailure(message);
    console.log(`[Worker] msg ${messageId} bloqueada — ${destPhone} está na lista negra`);
    return;
  }

  // Números que podem enviar: os escolhidos para a campanha (nunca um chip fora dela),
  // começando pelo número atribuído à mensagem; os marcados como restritos vão por último
  const campaignAccountIds = Array.isArray(campaign?.account_ids) && campaign.account_ids.length ? campaign.account_ids : null;
  const preferred = message.account_id || jobAccountId;
  const allAccounts = await WhatsappAccount.findAll({ where: { user_id: ownerId }, attributes: ['id'] });
  const connected = allAccounts
    .map((a) => a.id)
    .filter((id) => !campaignAccountIds || campaignAccountIds.includes(id))
    .filter((id) => whatsapp.getStatus(id) === 'connected')
    .sort((a, b) => (b === preferred) - (a === preferred));
  const attempts = [...connected.filter((id) => !isAccountRestricted(id)), ...connected.filter((id) => isAccountRestricted(id))];

  const desktopService = require('../services/desktopService');

  if (!attempts.length) {
    const appOnline = desktopService.isUserConnected(ownerId);
    if (campaign) {
      console.warn(`[Worker] campanha ${campaign.id} aguardando — ${appOnline ? 'nenhum número da campanha conectado' : 'app offline'}`);
      await scheduler().deferCampaign(
        campaign.id,
        DEFER_MS,
        appOnline
          ? 'Envio aguardando: nenhum número desta campanha está conectado. Conecte o chip ou adicione outro número à campanha.'
          : 'Envio aguardando: o app Clica Aí está fechado ou sem internet. As mensagens continuam na fila e saem quando ele voltar.'
      );
      return;
    }
    if (!appOnline) {
      console.warn(`[Worker] msg ${messageId} — app offline, nova tentativa em 3min`);
      require('../services/queueService').enqueueMessage(messageId, ownerId, destPhone, message.content, DEFER_MS);
      return;
    }
    await finalize(message, { status: 'failed', error_message: 'Nenhuma conta WhatsApp conectada' });
    return;
  }

  console.log(`[Worker] enviando msg ${messageId} → ${destPhone}`);

  let waId = null;
  let usedAccountId = null;
  let lastErr = null;
  let transientOnly = true;

  for (const accId of attempts) {
    try {
      const outcome = await withAccountLock(accId, async () => {
        if (campaign) {
          const minGap = Math.max(2000, Math.round((campaign.delay_ms || 5000) * 0.7));
          const wait = (_lastSendAt.get(accId) || 0) + minGap - Date.now();
          if (wait > 0) await sleep(Math.min(wait, minGap));
          // Reconfirma após a espera: a campanha pode ter sido pausada nesse meio tempo
          const [freshMsg, freshCampaign] = await Promise.all([
            Message.findByPk(message.id, { attributes: ['status'] }),
            Campaign.findByPk(campaign.id, { attributes: ['status'] }),
          ]);
          if (!freshMsg || freshMsg.status !== 'queued') return 'skip';
          if (!freshCampaign || !scheduler().ACTIVE_STATUSES.includes(freshCampaign.status)) return 'skip';
        }
        _lastSendAt.set(accId, Date.now());
        waId = await trySend(accId, message, destPhone);
        return 'sent';
      });
      if (outcome === 'skip') return;
      usedAccountId = accId;
      lastErr = null;
      markAccountSuccess(accId);
      break;
    } catch (err) {
      lastErr = err;
      console.warn(`[Worker] msg ${messageId} falhou via ${accId.slice(0, 8)}: ${err.message}`);
      if (isTransientError(err)) continue;
      transientOnly = false;
      if (isContactError(err)) break;
      markAccountFail(accId);
    }
  }

  if (lastErr) {
    if (transientOnly && campaign) {
      await scheduler().deferCampaign(
        campaign.id,
        DEFER_MS,
        'Envio aguardando: os números da campanha não responderam (app fechado, sem internet ou chip reconectando). Nova tentativa automática em 3 minutos.'
      );
      return;
    }
    if (transientOnly && !desktopService.isUserConnected(ownerId)) {
      console.warn(`[Worker] msg ${messageId} — app offline, nova tentativa em 3min`);
      require('../services/queueService').enqueueMessage(messageId, ownerId, destPhone, message.content, DEFER_MS);
      return;
    }
    console.error(`[Worker] ✗ msg ${messageId} → ${destPhone}: ${lastErr.message}`);
    await finalize(message, { status: 'failed', error_message: lastErr.message });
    await handleCampaignFailure(message);
    if (campaign && !isContactError(lastErr) && attempts.every((id) => isAccountRestricted(id))) {
      await pauseCampaign(
        campaign.id,
        'Pausada automaticamente: todos os números conectados da campanha falharam 5 vezes seguidas (possível restrição do WhatsApp). Remova o número restrito ou adicione outro e clique em Retomar.'
      );
    }
    return;
  }

  await finalize(message, { status: 'sent', wa_message_id: waId, sent_at: new Date(), account_id: usedAccountId });
  await handleCampaignSuccess(message);
  console.log(`[Worker] ✓ msg ${messageId} → ${destPhone} via ${usedAccountId.slice(0, 8)}`);
}

console.log('[Worker] message worker carregado (setTimeout queue)');
module.exports = { processJob, getRestrictedAccounts, isAccountRestricted };
