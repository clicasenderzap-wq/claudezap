const { validationResult } = require('express-validator');
const { Message, Contact, Campaign } = require('../models');
const { enqueueMessage, enqueueBulk, enqueueBatched, enqueueScheduled, cancelJob } = require('../services/queueService');
const { Op } = require('sequelize');
const { getLimit } = require('../middleware/planGuard');

function applyTemplate(template, contact) {
  return template
    .replace(/\{\{nome\}\}/gi, contact.name)
    .replace(/\{\{name\}\}/gi, contact.name)
    .replace(/\{\{telefone\}\}/gi, contact.phone)
    .replace(/\{\{phone\}\}/gi, contact.phone);
}

async function sendSingle(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  try {
    const { contact_id, content, media_url, media_type, media_filename } = req.body;
    const contact = await Contact.findOne({ where: { id: contact_id, user_id: req.user.id } });
    if (!contact) return res.status(404).json({ error: 'Contato não encontrado' });
    if (contact.opt_out) return res.status(400).json({ error: 'Contato optou por não receber mensagens' });

    const msg = await Message.create({
      user_id: req.user.id,
      contact_id: contact.id,
      content: applyTemplate(content, contact),
      status: 'queued',
      ...(media_url && { media_url, media_type, media_filename }),
    });

    await enqueueMessage(msg.id, req.user.id, contact.phone, msg.content);
    res.status(201).json(msg);
  } catch (err) {
    console.error('[sendSingle]', err.message);
    res.status(500).json({ error: 'Erro ao enfileirar mensagem. Tente novamente.' });
  }
}

async function sendCampaign(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  try {
    const {
      name, message_template, contact_ids, tags, delay_ms = 3000, account_ids = [],
      include_optout = true, rotate_every = 1, scheduled_for,
      exclude_contacted = false,
      batch_mode = false, batch_size = 50, batch_interval_hours = 8,
      media_url, media_type, media_filename,
    } = req.body;
    const optoutText = include_optout ? '\n\nPara sair desta lista, responda: SAIR' : '';
    const rotateEvery = Math.max(1, Number(rotate_every));

    let contacts;
    if (Array.isArray(tags) && tags.length) {
      const normalizedTags = tags.map((t) => String(t).trim().toUpperCase());
      const baseWhere = { user_id: req.user.id, opt_out: false };
      if (exclude_contacted) baseWhere.last_campaign_sent_at = null;
      const allContacts = await Contact.findAll({ where: baseWhere });
      contacts = allContacts.filter((c) =>
        (c.tags || []).some((t) => normalizedTags.includes(String(t).trim().toUpperCase()))
      );
    } else {
      const baseWhere = { id: contact_ids, user_id: req.user.id, opt_out: false };
      if (exclude_contacted) baseWhere.last_campaign_sent_at = null;
      contacts = await Contact.findAll({ where: baseWhere });
    }

    if (!contacts.length) return res.status(400).json({ error: 'Nenhum contato válido selecionado' });

    const dailyLimit = getLimit(req.user.plan, 'daily_messages');
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const sentToday = await Message.count({ where: { user_id: req.user.id, created_at: { [Op.gte]: startOfDay } } });
    if (sentToday + contacts.length > dailyLimit) {
      return res.status(403).json({
        error: `Limite diário do plano ${req.user.plan === 'pro' ? 'Pro' : 'Starter'} atingido (${dailyLimit} mensagens/dia). Saldo restante hoje: ${Math.max(0, dailyLimit - sentToday)}.`,
      });
    }

    const { WhatsappAccount } = require('../models');
    const whatsapp = require('../services/whatsappService');
    let selectedAccounts = [];
    if (account_ids.length) {
      selectedAccounts = await WhatsappAccount.findAll({
        where: { id: account_ids, user_id: req.user.id },
      });
    } else {
      selectedAccounts = await WhatsappAccount.findAll({ where: { user_id: req.user.id } });
    }
    const connectedAccounts = selectedAccounts.filter(
      (a) => whatsapp.getStatus(a.id) === 'connected' || a.status === 'connected'
    );
    if (!connectedAccounts.length) return res.status(400).json({ error: 'Nenhuma conta WhatsApp conectada selecionada' });

    const startOffset = scheduled_for ? Math.max(0, new Date(scheduled_for).getTime() - Date.now()) : 0;
    const campaignStatus = startOffset > 0 ? 'scheduled' : 'running';

    const batchSz = Math.max(1, Number(batch_size));
    const batchIntervalMs = (Number(batch_interval_hours) || 8) * 3_600_000;

    const campaign = await Campaign.create({
      user_id: req.user.id,
      name,
      message_template,
      status: campaignStatus,
      scheduled_for: scheduled_for ? new Date(scheduled_for) : null,
      total_contacts: contacts.length,
      delay_ms,
      rotate_every: rotateEvery,
      account_ids: connectedAccounts.map((a) => a.id),
      batch_mode: Boolean(batch_mode),
      batch_size: batchSz,
      batch_interval_hours: Number(batch_interval_hours),
    });

    const messages = await Message.bulkCreate(
      contacts.map((c, i) => ({
        user_id: req.user.id,
        contact_id: c.id,
        campaign_id: campaign.id,
        account_id: connectedAccounts[Math.floor(i / rotateEvery) % connectedAccounts.length].id,
        content: applyTemplate(message_template, c) + optoutText,
        status: 'queued',
        ...(media_url && { media_url, media_type, media_filename }),
      }))
    );

    const jobs = messages.map((m, i) => ({
      messageId: m.id,
      userId: req.user.id,
      accountId: connectedAccounts[Math.floor(i / rotateEvery) % connectedAccounts.length].id,
      phone: contacts[i].phone,
      content: m.content,
    }));

    let queuedJobs;
    if (batch_mode) {
      queuedJobs = await enqueueBatched(jobs, delay_ms, batchSz, batchIntervalMs, startOffset);
    } else {
      queuedJobs = await enqueueBulk(jobs, delay_ms, startOffset);
    }
    // Store BullMQ job IDs so pause/resume can cancel or re-enqueue specific jobs
    if (queuedJobs?.length) {
      await Promise.all(messages.map((m, i) =>
        queuedJobs[i]?.id ? m.update({ queue_job_id: String(queuedJobs[i].id) }) : null
      ));
    }
    res.status(201).json({ campaign, queued: messages.length });
  } catch (err) {
    console.error('[sendCampaign]', err.message);
    res.status(500).json({ error: 'Erro ao criar campanha. Tente novamente.' });
  }
}

async function history(req, res) {
  const { page = 1, limit = 50, status, campaign_id } = req.query;
  const where = { user_id: req.user.id };
  if (status) where.status = status;
  if (campaign_id) where.campaign_id = campaign_id;

  const { count, rows } = await Message.findAndCountAll({
    where,
    include: [{ model: Contact, attributes: ['name', 'phone'] }],
    limit: Number(limit),
    offset: (Number(page) - 1) * Number(limit),
    order: [['created_at', 'DESC']],
  });

  res.json({ total: count, page: Number(page), data: rows });
}

async function scheduleMessage(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  try {
    const { contact_id, content, account_id, scheduled_for, media_url, media_type, media_filename } = req.body;

    const contact = await Contact.findOne({ where: { id: contact_id, user_id: req.user.id } });
    if (!contact) return res.status(404).json({ error: 'Contato não encontrado' });
    if (contact.opt_out) return res.status(400).json({ error: 'Contato optou por não receber mensagens' });

    const scheduledDate = new Date(scheduled_for);
    if (scheduledDate <= new Date()) return res.status(400).json({ error: 'A data de agendamento deve ser no futuro' });

    const { WhatsappAccount } = require('../models');
    const whatsapp = require('../services/whatsappService');

    let account = null;
    if (account_id) {
      account = await WhatsappAccount.findOne({ where: { id: account_id, user_id: req.user.id } });
    }
    if (!account) {
      const all = await WhatsappAccount.findAll({ where: { user_id: req.user.id } });
      account = all.find((a) => whatsapp.getStatus(a.id) === 'connected') || all[0];
    }
    if (!account) return res.status(400).json({ error: 'Nenhuma conta WhatsApp encontrada' });

    const msg = await Message.create({
      user_id: req.user.id,
      contact_id: contact.id,
      account_id: account.id,
      content: applyTemplate(content, contact),
      status: 'queued',
      scheduled_for: scheduledDate,
      ...(media_url && { media_url, media_type, media_filename }),
    });

    const jobId = await enqueueScheduled(msg.id, req.user.id, account.id, contact.phone, msg.content, scheduledDate);
    await msg.update({ queue_job_id: String(jobId) });

    res.status(201).json(msg);
  } catch (err) {
    console.error('[scheduleMessage]', err.message);
    res.status(500).json({ error: 'Erro ao agendar mensagem. Tente novamente.' });
  }
}

async function cancelScheduled(req, res) {
  try {
    const msg = await Message.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!msg) return res.status(404).json({ error: 'Agendamento não encontrado' });
    if (msg.status !== 'queued') return res.status(400).json({ error: 'Apenas mensagens pendentes podem ser canceladas' });
    if (!msg.scheduled_for || new Date(msg.scheduled_for) <= new Date()) {
      return res.status(400).json({ error: 'Mensagem já enviada ou não é um agendamento futuro' });
    }

    if (msg.queue_job_id) await cancelJob(msg.queue_job_id);
    await msg.update({ status: 'failed', error_message: 'Cancelado pelo usuário' });
    res.json({ success: true });
  } catch (err) {
    console.error('[cancelScheduled]', err.message);
    res.status(500).json({ error: 'Erro ao cancelar agendamento' });
  }
}

async function listScheduled(req, res) {
  const { page = 1, limit = 50 } = req.query;
  const where = { user_id: req.user.id, scheduled_for: { [Op.ne]: null } };

  const { count, rows } = await Message.findAndCountAll({
    where,
    include: [{ model: Contact, attributes: ['name', 'phone'] }],
    limit: Number(limit),
    offset: (Number(page) - 1) * Number(limit),
    order: [['scheduled_for', 'ASC']],
  });

  res.json({ total: count, page: Number(page), data: rows });
}

module.exports = { sendSingle, sendCampaign, history, scheduleMessage, cancelScheduled, listScheduled };
