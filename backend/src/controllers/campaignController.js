const { Campaign, Message, Contact, WhatsappAccount } = require('../models');
const { Op } = require('sequelize');
const scheduler = require('../services/campaignScheduler');

const EDITABLE_STATUSES = ['running', 'paused', 'scheduled'];

function applyTemplate(template, contact) {
  return template
    .replace(/\{\{nome\}\}/gi, contact.name)
    .replace(/\{\{name\}\}/gi, contact.name)
    .replace(/\{\{telefone\}\}/gi, contact.phone)
    .replace(/\{\{phone\}\}/gi, contact.phone);
}

function isConnected(accountId) {
  return require('../services/whatsappService').getStatus(accountId) === 'connected';
}

async function list(req, res) {
  const { page = 1, limit = 20, status } = req.query;
  await scheduler.completeFinishedCampaigns({ userId: req.user.id })
    .catch((e) => console.error('[list] conclusão de campanhas:', e.message));
  const where = { user_id: req.user.id };
  if (status) where.status = status;

  const { count, rows } = await Campaign.findAndCountAll({
    where,
    order: [['created_at', 'DESC']],
    limit: Number(limit),
    offset: (Number(page) - 1) * Number(limit),
  });

  res.json({ total: count, page: Number(page), data: rows });
}

// Nova campanha com os mesmos parâmetros da original (intervalo, rodízio e lotes)
async function createFollowUpCampaign(userId, original, contacts, nameSuffix) {
  const allAccounts = await WhatsappAccount.findAll({ where: { user_id: userId } });
  const connectedAccounts = allAccounts.filter((a) => isConnected(a.id));
  const originalAccountIds = original.account_ids || [];
  let accountsToUse = connectedAccounts.filter((a) => originalAccountIds.includes(a.id));
  if (!accountsToUse.length) accountsToUse = connectedAccounts;
  if (!accountsToUse.length) return { error: 'Nenhuma conta WhatsApp conectada' };

  const rotateEvery = Math.max(1, original.rotate_every || 1);
  const batchSize = original.batch_mode && original.batch_size > 0 ? original.batch_size : null;

  const campaign = await Campaign.create({
    user_id: userId,
    name: `${original.name} (${nameSuffix})`,
    message_template: original.message_template,
    status: 'running',
    total_contacts: contacts.length,
    delay_ms: original.delay_ms,
    rotate_every: rotateEvery,
    account_ids: accountsToUse.map((a) => a.id),
    batch_mode: Boolean(batchSize),
    batch_size: original.batch_size,
    batch_interval_hours: original.batch_interval_hours,
  });

  await Message.bulkCreate(
    contacts.map((c, i) => ({
      user_id: userId,
      contact_id: c.id,
      campaign_id: campaign.id,
      account_id: accountsToUse[Math.floor(i / rotateEvery) % accountsToUse.length].id,
      content: applyTemplate(original.message_template, c) + '\n\nPara sair desta lista, responda: SAIR',
      status: 'queued',
      batch_index: batchSize ? Math.floor(i / batchSize) : null,
    }))
  );

  await scheduler.rescheduleCampaign(campaign.id);
  return { campaign, queued: contacts.length };
}

async function resend(req, res) {
  try {
    const original = await Campaign.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!original) return res.status(404).json({ error: 'Campanha não encontrada' });

    // Busca os contatos únicos da campanha original (via mensagens)
    const originalMessages = await Message.findAll({
      where: { campaign_id: original.id },
      attributes: ['contact_id'],
      group: ['contact_id'],
    });
    const contactIds = originalMessages.map((m) => m.contact_id).filter(Boolean);
    if (!contactIds.length) return res.status(400).json({ error: 'Campanha original não tem contatos' });

    const contacts = await Contact.findAll({
      where: { id: { [Op.in]: contactIds }, user_id: req.user.id, opt_out: false },
    });
    if (!contacts.length) return res.status(400).json({ error: 'Nenhum contato ativo encontrado' });

    const result = await createFollowUpCampaign(req.user.id, original, contacts, 'Reenvio');
    if (result.error) return res.status(400).json({ error: result.error });
    res.status(201).json(result);
  } catch (err) {
    console.error('[resend]', err.message);
    res.status(500).json({ error: 'Erro ao reenviar campanha' });
  }
}

async function messages(req, res) {
  await scheduler.completeFinishedCampaigns({ userId: req.user.id, campaignId: req.params.id })
    .catch((e) => console.error('[messages] conclusão de campanha:', e.message));
  const campaign = await Campaign.findOne({
    where: { id: req.params.id, user_id: req.user.id },
  });
  if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });

  const msgs = await Message.findAll({
    where: { campaign_id: campaign.id },
    include: [{ model: Contact, attributes: ['name', 'phone'] }],
    order: [['created_at', 'ASC']],
  });
  await scheduler.ensureBatchIndexes(campaign, msgs).catch((e) => console.error('[messages] batch_index:', e.message));

  // Recalcula contadores ao vivo a partir das mensagens
  const stats = msgs.reduce((acc, m) => {
    acc[m.status] = (acc[m.status] || 0) + 1;
    return acc;
  }, {});

  const sentTotal = (stats.sent || 0) + (stats.delivered || 0);
  const failedTotal = stats.failed || 0;

  // Sincroniza contadores do Campaign com a realidade (evita divergência entre modal e lista)
  Campaign.update(
    { sent_count: sentTotal, failed_count: failedTotal },
    { where: { id: campaign.id } }
  ).catch(() => {});

  const { getRestrictedAccounts } = require('../workers/messageWorker');
  const campaignAccountIds = campaign.account_ids || [];
  const restricted = getRestrictedAccounts()
    .map((r) => r.accountId)
    .filter((id) => campaignAccountIds.includes(id));

  res.json({
    campaign,
    stats: {
      total: msgs.length,
      sent: stats.sent || 0,
      delivered: stats.delivered || 0,
      failed: failedTotal,
      queued: stats.queued || 0,
      pending: stats.pending || 0,
    },
    messages: msgs,
    batches: scheduler.summarizeBatches(campaign, msgs),
    accounts: scheduler.summarizeAccounts(msgs),
    restricted_account_ids: restricted,
    notice: scheduler.getNotice(campaign.id),
  });
}

// Resumo leve (sem a lista de mensagens) — usado pelo aviso de campanha concluída
async function summary(req, res) {
  const campaign = await Campaign.findOne({
    where: { id: req.params.id, user_id: req.user.id },
    attributes: ['id', 'name', 'status', 'total_contacts', 'createdAt', 'updatedAt'],
  });
  if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });

  const { fn, col } = require('sequelize');
  const rows = await Message.findAll({
    where: { campaign_id: campaign.id },
    attributes: [
      'status',
      [fn('COUNT', col('id')), 'count'],
      [fn('MIN', col('sent_at')), 'first_sent'],
      [fn('MAX', col('sent_at')), 'last_sent'],
    ],
    group: ['status'],
    raw: true,
  });

  const stats = { total: 0, sent: 0, delivered: 0, failed: 0, queued: 0 };
  let startedAt = null;
  let finishedAt = null;
  for (const r of rows) {
    const n = Number(r.count) || 0;
    stats.total += n;
    if (r.status in stats) stats[r.status] += n;
    if (r.first_sent && (!startedAt || new Date(r.first_sent) < startedAt)) startedAt = new Date(r.first_sent);
    if (r.last_sent && (!finishedAt || new Date(r.last_sent) > finishedAt)) finishedAt = new Date(r.last_sent);
  }
  res.json({ campaign, stats, started_at: startedAt, finished_at: finishedAt });
}

async function pause(req, res) {
  try {
    const campaign = await Campaign.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
    if (campaign.status === 'paused') {
      return res.json({ paused: true, cancelled: 0, remaining: 0, already_paused: true });
    }
    if (!['running', 'scheduled', 'completed', 'failed'].includes(campaign.status)) {
      return res.status(400).json({ error: `Campanha não pode ser pausada no status atual: ${campaign.status}` });
    }

    const pendingMessages = await Message.findAll({
      where: { campaign_id: campaign.id, status: 'queued' },
      attributes: ['id'],
    });
    scheduler.cancelMessages(pendingMessages);

    await campaign.update({ status: 'paused' });
    scheduler.clearNotice(campaign.id);
    res.json({ paused: true, cancelled: pendingMessages.length, remaining: pendingMessages.length });
  } catch (err) {
    console.error('[pause]', err.message);
    res.status(500).json({ error: 'Erro ao pausar campanha' });
  }
}

async function resume(req, res) {
  try {
    const campaign = await Campaign.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
    if (campaign.status !== 'paused') {
      return res.status(400).json({ error: 'Somente campanhas pausadas podem ser retomadas' });
    }

    const campaignAccountIds = campaign.account_ids || [];
    const allAccounts = await WhatsappAccount.findAll({ where: { user_id: req.user.id }, attributes: ['id'] });
    const usable = allAccounts.filter(
      (a) => (!campaignAccountIds.length || campaignAccountIds.includes(a.id)) && isConnected(a.id)
    );
    if (!usable.length) {
      return res.status(400).json({
        error: 'Nenhum número desta campanha está conectado. Conecte o chip ou adicione outro número na tela da campanha.',
      });
    }

    const pendingMessages = await Message.findAll({
      where: { campaign_id: campaign.id, status: { [Op.in]: ['queued', 'failed'] } },
      include: [{ model: Contact, attributes: ['phone', 'opt_out'] }],
    });

    // Descarta mensagens cujo contato foi excluído ou pediu para sair
    const toResend = pendingMessages.filter(
      (msg) => msg.Contact && (msg.status === 'queued' || !msg.Contact.opt_out)
    );

    if (!toResend.length) {
      await campaign.update({ status: 'completed' });
      return res.json({ resumed: false, message: 'Nenhuma mensagem pendente. Campanha marcada como concluída.' });
    }

    // Falhas voltam para a fila; error_message é preservado para auditoria ("Reenviado")
    const failedIds = toResend.filter((m) => m.status === 'failed').map((m) => m.id);
    if (failedIds.length) {
      await Message.update({ status: 'queued' }, { where: { id: failedIds } });
      await Campaign.decrement('failed_count', { by: failedIds.length, where: { id: campaign.id } }).catch(() => {});
    }

    await campaign.update({ status: 'running' });
    scheduler.clearNotice(campaign.id);
    const plan = await scheduler.rescheduleCampaign(campaign.id, { graceMs: 5000 });
    res.json({ resumed: true, queued: toResend.length, retrying_failed: failedIds.length, first_at: plan.firstAt });
  } catch (err) {
    console.error('[resume]', err.message, err.stack);
    res.status(500).json({ error: err.message || 'Erro ao retomar campanha' });
  }
}

async function resendFailed(req, res) {
  try {
    const original = await Campaign.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!original) return res.status(404).json({ error: 'Campanha não encontrada' });

    const failedMessages = await Message.findAll({
      where: { campaign_id: original.id, status: 'failed' },
      include: [{ model: Contact, attributes: ['id', 'name', 'phone', 'opt_out'] }],
    });
    if (!failedMessages.length) {
      return res.status(400).json({ error: 'Nenhuma mensagem com falha nesta campanha' });
    }

    const contacts = failedMessages.map((m) => m.Contact).filter((c) => c && !c.opt_out);
    if (!contacts.length) {
      return res.status(400).json({ error: 'Nenhum contato ativo entre os que falharam' });
    }

    const result = await createFollowUpCampaign(req.user.id, original, contacts, 'Reenvio de falhas');
    if (result.error) return res.status(400).json({ error: result.error });
    res.status(201).json(result);
  } catch (err) {
    console.error('[resendFailed]', err.message);
    res.status(500).json({ error: 'Erro ao reenviar falhas' });
  }
}

async function retryUndelivered(req, res) {
  try {
    const original = await Campaign.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!original) return res.status(404).json({ error: 'Campanha não encontrada' });

    const undeliveredMsgs = await Message.findAll({
      where: { campaign_id: original.id, status: 'sent' },
      include: [{ model: Contact, attributes: ['id', 'phone', 'opt_out'] }],
    });
    if (!undeliveredMsgs.length) {
      return res.status(400).json({ error: 'Nenhuma mensagem com status "enviado sem confirmação" nesta campanha' });
    }

    const toRetry = undeliveredMsgs.filter((m) => !m.Contact?.opt_out);
    if (!toRetry.length) {
      return res.status(400).json({ error: 'Todos os contatos estão na lista de opt-out' });
    }

    const { account_id: overrideAccountId } = req.body;
    const allAccounts = await WhatsappAccount.findAll({ where: { user_id: req.user.id } });
    const connectedAccounts = allAccounts.filter((a) => isConnected(a.id));
    if (!connectedAccounts.length) {
      return res.status(400).json({ error: 'Nenhuma conta WhatsApp conectada' });
    }
    const accountToUse = overrideAccountId
      ? (connectedAccounts.find((a) => a.id === overrideAccountId) ?? connectedAccounts[0])
      : connectedAccounts[0];

    await Message.update(
      {
        status: 'queued',
        account_id: accountToUse.id,
        error_message: 'Envio anterior sem confirmação de entrega do WhatsApp',
      },
      { where: { id: toRetry.map((m) => m.id) } }
    );

    // O worker só usa números da campanha — garante que o chip escolhido faça parte dela
    const ids = original.account_ids || [];
    if (ids.length && !ids.includes(accountToUse.id)) {
      await original.update({ account_ids: [...ids, accountToUse.id] });
    }
    await original.update({ status: 'running' });
    scheduler.clearNotice(original.id);
    await scheduler.rescheduleCampaign(original.id, { graceMs: 3000 });

    res.json({ queued: toRetry.length, account: accountToUse.label });
  } catch (err) {
    console.error('[retryUndelivered]', err.message);
    res.status(500).json({ error: err.message || 'Erro ao reenviar não entregues' });
  }
}

async function remove(req, res) {
  const campaign = await Campaign.findOne({
    where: { id: req.params.id, user_id: req.user.id },
  });
  if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });

  // Para os envios pendentes antes de excluir — senão continuariam saindo sem campanha
  const queued = await Message.findAll({ where: { campaign_id: campaign.id, status: 'queued' }, attributes: ['id'] });
  scheduler.cancelMessages(queued);
  if (queued.length) {
    await Message.update(
      { status: 'failed', error_message: 'Cancelado — campanha excluída' },
      { where: { campaign_id: campaign.id, status: 'queued' } }
    );
  }
  scheduler.clearNotice(campaign.id);
  await campaign.destroy();
  res.status(204).send();
}

// Força o status de uma campanha travada (ex: pausada indefinidamente)
async function forceStatus(req, res) {
  try {
    const { status } = req.body;
    if (!['completed', 'failed', 'paused'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido. Use: completed, failed ou paused' });
    }
    const campaign = await Campaign.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });

    const queued = await Message.findAll({
      where: { campaign_id: campaign.id, status: 'queued' },
      attributes: ['id'],
    });
    scheduler.cancelMessages(queued);

    // Concluída/falhou: o que estava na fila é cancelado de vez
    if ((status === 'completed' || status === 'failed') && queued.length) {
      await Message.update(
        { status: 'failed', error_message: 'Cancelado — campanha marcada como concluída manualmente' },
        { where: { campaign_id: campaign.id, status: 'queued' } }
      );
    }

    await campaign.update({ status });
    scheduler.clearNotice(campaign.id);
    res.json({ success: true, status });
  } catch (err) {
    console.error('[forceStatus]', err.message);
    res.status(500).json({ error: err.message });
  }
}

// Remove um número da campanha (ex: chip restrito) e redistribui as mensagens pendentes
// entre os números restantes, mantendo os horários planejados.
async function removeAccount(req, res) {
  try {
    const { accountId } = req.body;
    if (!accountId) return res.status(400).json({ error: 'accountId é obrigatório' });

    const campaign = await Campaign.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
    if (!EDITABLE_STATUSES.includes(campaign.status)) {
      return res.status(400).json({ error: 'Só é possível alterar os números de campanhas em andamento, agendadas ou pausadas' });
    }

    const current = Array.isArray(campaign.account_ids) ? campaign.account_ids : [];
    if (!current.includes(accountId)) {
      return res.status(400).json({ error: 'Este número não faz parte da campanha' });
    }
    const remaining = current.filter((id) => id !== accountId);
    if (!remaining.length) {
      return res.status(400).json({
        error: 'Este é o único número da campanha. Adicione outro número antes de remover este, ou pause a campanha.',
      });
    }

    await campaign.update({ account_ids: remaining });
    const reassigned = await scheduler.redistributeAccounts(campaign);
    if (scheduler.ACTIVE_STATUSES.includes(campaign.status)) {
      await scheduler.rescheduleCampaign(campaign.id, { graceMs: 5000 });
    }

    console.log(`[Campaign] número ${accountId.slice(0, 8)} removido da campanha ${campaign.id} — ${reassigned} msgs redistribuídas`);
    res.json({ ok: true, reassigned, account_ids: remaining });
  } catch (err) {
    console.error('[removeAccount]', err.message);
    res.status(500).json({ error: err.message });
  }
}

// Adiciona um número à campanha e redistribui as mensagens pendentes incluindo ele
async function addAccount(req, res) {
  try {
    const { accountId } = req.body;
    if (!accountId) return res.status(400).json({ error: 'accountId é obrigatório' });

    const campaign = await Campaign.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
    if (!EDITABLE_STATUSES.includes(campaign.status)) {
      return res.status(400).json({ error: 'Só é possível alterar os números de campanhas em andamento, agendadas ou pausadas' });
    }

    const account = await WhatsappAccount.findOne({ where: { id: accountId, user_id: req.user.id } });
    if (!account) return res.status(404).json({ error: 'Número não encontrado' });

    const current = Array.isArray(campaign.account_ids) ? campaign.account_ids : [];
    if (current.includes(accountId)) {
      return res.status(400).json({ error: 'Este número já está na campanha' });
    }

    const next = [...current, accountId];
    await campaign.update({ account_ids: next });
    const reassigned = await scheduler.redistributeAccounts(campaign);
    if (scheduler.ACTIVE_STATUSES.includes(campaign.status)) {
      await scheduler.rescheduleCampaign(campaign.id, { graceMs: 5000 });
    }

    console.log(`[Campaign] número ${accountId.slice(0, 8)} adicionado à campanha ${campaign.id}`);
    res.json({ ok: true, reassigned, account_ids: next });
  } catch (err) {
    console.error('[addAccount]', err.message);
    res.status(500).json({ error: err.message });
  }
}

// Antecipa o próximo lote da fila: as mensagens dele saem a partir de agora (com o intervalo
// entre mensagens). Os lotes seguintes continuam respeitando o intervalo entre lotes.
async function sendBatchNow(req, res) {
  try {
    const batchIndex = Number(req.body.batchIndex);
    if (!Number.isInteger(batchIndex) || batchIndex < 0) {
      return res.status(400).json({ error: 'Lote inválido' });
    }

    const campaign = await Campaign.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
    if (!campaign.batch_mode) return res.status(400).json({ error: 'Esta campanha não usa lotes' });
    if (!scheduler.ACTIVE_STATUSES.includes(campaign.status)) {
      return res.status(400).json({ error: 'A campanha precisa estar em andamento. Se estiver pausada, clique em Retomar primeiro.' });
    }

    const msgs = await Message.findAll({
      where: { campaign_id: campaign.id },
      attributes: ['id', 'status', 'batch_index', 'scheduled_for', 'createdAt'],
    });
    await scheduler.ensureBatchIndexes(campaign, msgs);
    const queued = msgs.filter((m) => m.status === 'queued');
    if (!queued.length) return res.status(400).json({ error: 'Não há mensagens na fila desta campanha' });

    const firstPending = queued.reduce((min, m) => Math.min(min, m.batch_index ?? 0), Infinity);
    if (batchIndex !== firstPending) {
      return res.status(400).json({ error: `Só dá para antecipar o próximo lote da fila (Lote ${firstPending + 1}).` });
    }

    if (campaign.status === 'scheduled') await campaign.update({ status: 'running' });
    const plan = await scheduler.rescheduleCampaign(campaign.id, { sendNowBatch: batchIndex, graceMs: 3000 });
    const count = queued.filter((m) => (m.batch_index ?? 0) === batchIndex).length;

    console.log(`[Campaign] lote ${batchIndex + 1} da campanha ${campaign.id} antecipado — ${count} msgs`);
    res.json({ ok: true, batch: batchIndex, queued: count, first_at: plan.firstAt });
  } catch (err) {
    console.error('[sendBatchNow]', err.message);
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  list, messages, summary, resend, pause, resume, resendFailed, retryUndelivered, remove, forceStatus,
  removeAccount, addAccount, sendBatchNow,
};
