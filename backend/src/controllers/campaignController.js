const { Campaign, Message, Contact } = require('../models');
const { enqueueBulk } = require('../services/queueService');
const { Op } = require('sequelize');

function applyTemplate(template, contact) {
  return template
    .replace(/\{\{nome\}\}/gi, contact.name)
    .replace(/\{\{name\}\}/gi, contact.name)
    .replace(/\{\{telefone\}\}/gi, contact.phone)
    .replace(/\{\{phone\}\}/gi, contact.phone);
}

async function list(req, res) {
  const { page = 1, limit = 20, status } = req.query;
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

async function resend(req, res) {
  const original = await Campaign.findOne({
    where: { id: req.params.id, user_id: req.user.id },
  });

  if (!original) return res.status(404).json({ error: 'Campanha não encontrada' });

  // Busca os contatos únicos da campanha original (via mensagens)
  const originalMessages = await Message.findAll({
    where: { campaign_id: original.id },
    attributes: ['contact_id'],
    group: ['contact_id'],
  });

  const contactIds = originalMessages.map((m) => m.contact_id);
  if (!contactIds.length) return res.status(400).json({ error: 'Campanha original não tem contatos' });

  const contacts = await Contact.findAll({
    where: { id: { [Op.in]: contactIds }, user_id: req.user.id, opt_out: false },
  });

  if (!contacts.length) return res.status(400).json({ error: 'Nenhum contato ativo encontrado' });

  const whatsapp = require('../services/whatsappService');
  const allAccounts = await Contact.sequelize.models.WhatsappAccount.findAll({ where: { user_id: req.user.id } });
  const connectedAccounts = allAccounts.filter((a) => whatsapp.getStatus(a.id) === 'connected');
  // Usa as mesmas contas da campanha original se ainda conectadas, senão usa as disponíveis
  const originalAccountIds = original.account_ids || [];
  let accountsToUse = connectedAccounts.filter((a) => originalAccountIds.includes(a.id));
  if (!accountsToUse.length) accountsToUse = connectedAccounts;
  if (!accountsToUse.length) return res.status(400).json({ error: 'Nenhuma conta WhatsApp conectada' });

  const rotateEvery = Math.max(1, original.rotate_every || 1);

  const newCampaign = await Campaign.create({
    user_id: req.user.id,
    name: `${original.name} (Reenvio)`,
    message_template: original.message_template,
    status: 'running',
    total_contacts: contacts.length,
    delay_ms: original.delay_ms,
    rotate_every: rotateEvery,
    account_ids: accountsToUse.map((a) => a.id),
  });

  const messages = await Message.bulkCreate(
    contacts.map((c, i) => ({
      user_id: req.user.id,
      contact_id: c.id,
      campaign_id: newCampaign.id,
      account_id: accountsToUse[Math.floor(i / rotateEvery) % accountsToUse.length].id,
      content: applyTemplate(original.message_template, c) + '\n\nPara sair desta lista, responda: SAIR',
      status: 'queued',
    }))
  );

  const jobs = messages.map((m, i) => ({
    messageId: m.id,
    userId: req.user.id,
    accountId: accountsToUse[Math.floor(i / rotateEvery) % accountsToUse.length].id,
    phone: contacts[i].phone,
    content: m.content,
  }));

  const queuedJobs = await enqueueBulk(jobs, original.delay_ms);
  await Promise.all(messages.map((m, i) =>
    queuedJobs[i]?.id ? m.update({ queue_job_id: String(queuedJobs[i].id) }) : null
  ));

  res.status(201).json({ campaign: newCampaign, queued: messages.length });
}

async function messages(req, res) {
  const campaign = await Campaign.findOne({
    where: { id: req.params.id, user_id: req.user.id },
  });
  if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });

  const msgs = await Message.findAll({
    where: { campaign_id: campaign.id },
    include: [{ model: Contact, attributes: ['name', 'phone'] }],
    order: [['created_at', 'ASC']],
  });

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
  });
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

    const { cancelJob } = require('../services/queueService');
    const pendingMessages = await Message.findAll({
      where: { campaign_id: campaign.id, status: 'queued' },
      attributes: ['id', 'queue_job_id'],
    });

    let cancelled = 0;
    for (const msg of pendingMessages) {
      if (msg.queue_job_id) {
        await cancelJob(msg.queue_job_id).catch(() => {});
        cancelled++;
      }
    }

    await campaign.update({ status: 'paused' });
    res.json({ paused: true, cancelled, remaining: pendingMessages.length });
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

    const { WhatsappAccount } = require('../models');
    const whatsapp = require('../services/whatsappService');
    const allAccounts = await WhatsappAccount.findAll({ where: { user_id: req.user.id } });
    const connectedAccounts = allAccounts.filter((a) => whatsapp.getStatus(a.id) === 'connected');
    if (!connectedAccounts.length) {
      return res.status(400).json({ error: 'Nenhuma conta WhatsApp conectada' });
    }

    // Cancel ANY existing BullMQ jobs for this campaign before re-enqueueing.
    // This prevents duplicates when resume is called multiple times or after partial failures.
    const { enqueueBulk, enqueueBatched, cancelJob } = require('../services/queueService');
    const existingQueued = await Message.findAll({
      where: { campaign_id: campaign.id, status: 'queued', queue_job_id: { [Op.ne]: null } },
      attributes: ['id', 'queue_job_id'],
    });
    await Promise.all(existingQueued.map((m) => cancelJob(m.queue_job_id).catch(() => {})));

    // Re-query after cancellation to get accurate pending list
    const pendingMessages = await Message.findAll({
      where: { campaign_id: campaign.id, status: { [Op.in]: ['queued', 'failed'] } },
      include: [{ model: Contact, attributes: ['phone', 'opt_out'] }],
      order: [['created_at', 'ASC']],
    });

    // Discard messages whose Contact was deleted or opted-out
    const toResend = pendingMessages.filter(
      (msg) => msg.Contact && (msg.status === 'queued' || !msg.Contact.opt_out)
    );

    if (!toResend.length) {
      await campaign.update({ status: 'completed' });
      return res.json({ resumed: false, message: 'Nenhuma mensagem pendente. Campanha marcada como concluída.' });
    }

    const jobs = toResend.map((msg) => ({
      messageId: msg.id,
      userId: req.user.id,
      accountId: msg.account_id,
      phone: msg.Contact.phone,
      content: msg.content,
    }));

    let queuedJobs;
    if (campaign.batch_mode && campaign.batch_size > 0) {
      const batchIntervalMs = (Number(campaign.batch_interval_hours) || 8) * 3_600_000;
      queuedJobs = await enqueueBatched(jobs, campaign.delay_ms || 5000, campaign.batch_size, batchIntervalMs, 0);
    } else {
      queuedJobs = await enqueueBulk(jobs, campaign.delay_ms || 5000);
    }
    const failedBeingRetried = toResend.filter((m) => m.status === 'failed').length;

    // Bulk-update status + error_message in one SQL statement (avoids pool exhaustion)
    await Message.update(
      { status: 'queued', error_message: null },
      { where: { id: toResend.map((m) => m.id) } }
    );

    // Update queue_job_ids in chunks of 50 to stay within DB connection limits
    const CHUNK = 50;
    for (let i = 0; i < toResend.length; i += CHUNK) {
      await Promise.all(
        toResend.slice(i, i + CHUNK).map((msg, j) => {
          const jobId = queuedJobs[i + j]?.id;
          return jobId
            ? Message.update({ queue_job_id: String(jobId) }, { where: { id: msg.id } })
            : null;
        }).filter(Boolean)
      );
    }

    // Adjust failed_count to reflect failures now being retried
    if (failedBeingRetried > 0) {
      await Campaign.decrement('failed_count', { by: failedBeingRetried, where: { id: campaign.id } }).catch(() => {});
    }

    await campaign.update({ status: 'running' });
    res.json({ resumed: true, queued: toResend.length, retrying_failed: failedBeingRetried });
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

    const { WhatsappAccount } = require('../models');
    const whatsapp = require('../services/whatsappService');
    const allAccounts = await WhatsappAccount.findAll({ where: { user_id: req.user.id } });
    const connectedAccounts = allAccounts.filter((a) => whatsapp.getStatus(a.id) === 'connected');
    const originalAccountIds = original.account_ids || [];
    let accountsToUse = connectedAccounts.filter((a) => originalAccountIds.includes(a.id));
    if (!accountsToUse.length) accountsToUse = connectedAccounts;
    if (!accountsToUse.length) return res.status(400).json({ error: 'Nenhuma conta WhatsApp conectada' });

    const rotateEvery = Math.max(1, original.rotate_every || 1);
    const { enqueueBulk } = require('../services/queueService');

    const newCampaign = await Campaign.create({
      user_id: req.user.id,
      name: `${original.name} (Reenvio de falhas)`,
      message_template: original.message_template,
      status: 'running',
      total_contacts: contacts.length,
      delay_ms: original.delay_ms,
      rotate_every: rotateEvery,
      account_ids: accountsToUse.map((a) => a.id),
    });

    const newMessages = await Message.bulkCreate(
      contacts.map((c, i) => ({
        user_id: req.user.id,
        contact_id: c.id,
        campaign_id: newCampaign.id,
        account_id: accountsToUse[Math.floor(i / rotateEvery) % accountsToUse.length].id,
        content: applyTemplate(original.message_template, c) + '\n\nPara sair desta lista, responda: SAIR',
        status: 'queued',
      }))
    );

    const jobs = newMessages.map((m, i) => ({
      messageId: m.id,
      userId: req.user.id,
      accountId: accountsToUse[Math.floor(i / rotateEvery) % accountsToUse.length].id,
      phone: contacts[i].phone,
      content: m.content,
    }));

    const queuedJobs = await enqueueBulk(jobs, original.delay_ms);
    await Promise.all(newMessages.map((m, i) =>
      queuedJobs[i]?.id ? m.update({ queue_job_id: String(queuedJobs[i].id) }) : null
    ));

    res.status(201).json({ campaign: newCampaign, queued: newMessages.length });
  } catch (err) {
    console.error('[resendFailed]', err.message);
    res.status(500).json({ error: 'Erro ao reenviar falhas' });
  }
}

async function remove(req, res) {
  const campaign = await Campaign.findOne({
    where: { id: req.params.id, user_id: req.user.id },
  });
  if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
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

    // Se marcando como concluída, cancela jobs que ainda estejam na fila para esta campanha
    if (status === 'completed' || status === 'failed') {
      const { cancelJob } = require('../services/queueService');
      const queued = await Message.findAll({
        where: { campaign_id: campaign.id, status: 'queued' },
        attributes: ['id', 'queue_job_id'],
      });
      await Promise.all(
        queued.filter((m) => m.queue_job_id).map((m) => cancelJob(m.queue_job_id).catch(() => {}))
      );
      if (queued.length) {
        await Message.update(
          { status: 'failed', error_message: 'Cancelado — campanha marcada como concluída manualmente' },
          { where: { campaign_id: campaign.id, status: 'queued' } }
        );
      }
    }

    await campaign.update({ status });
    res.json({ success: true, status });
  } catch (err) {
    console.error('[forceStatus]', err.message);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { list, messages, resend, pause, resume, resendFailed, remove, forceStatus };
