const { validationResult } = require('express-validator');
const { Message, Contact, Campaign } = require('../models');
const { enqueueMessage, enqueueBulk } = require('../services/queueService');

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

  const { contact_id, content } = req.body;
  const contact = await Contact.findOne({ where: { id: contact_id, user_id: req.user.id } });
  if (!contact) return res.status(404).json({ error: 'Contato não encontrado' });
  if (contact.opt_out) return res.status(400).json({ error: 'Contato optou por não receber mensagens' });

  const msg = await Message.create({
    user_id: req.user.id,
    contact_id: contact.id,
    content: applyTemplate(content, contact),
    status: 'queued',
  });

  await enqueueMessage(msg.id, req.user.id, contact.phone, msg.content);
  res.status(201).json(msg);
}

async function sendCampaign(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  const { name, message_template, contact_ids, tags, delay_ms = 3000, account_ids = [], include_optout = true, rotate_every = 1 } = req.body;
  const optoutText = include_optout ? '\n\nPara sair desta lista, responda: SAIR' : '';
  const rotateEvery = Math.max(1, Number(rotate_every));

  let contacts;
  if (Array.isArray(tags) && tags.length) {
    const normalizedTags = tags.map((t) => String(t).trim().toUpperCase());
    const allContacts = await Contact.findAll({ where: { user_id: req.user.id, opt_out: false } });
    contacts = allContacts.filter((c) =>
      (c.tags || []).some((t) => normalizedTags.includes(String(t).trim().toUpperCase()))
    );
  } else {
    contacts = await Contact.findAll({
      where: { id: contact_ids, user_id: req.user.id, opt_out: false },
    });
  }

  if (!contacts.length) return res.status(400).json({ error: 'Nenhum contato válido selecionado' });

  // Valida contas selecionadas; se nenhuma, usa todas conectadas do usuário
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
  const connectedAccounts = selectedAccounts.filter((a) => whatsapp.getStatus(a.id) === 'connected');
  if (!connectedAccounts.length) return res.status(400).json({ error: 'Nenhuma conta WhatsApp conectada selecionada' });

  const campaign = await Campaign.create({
    user_id: req.user.id,
    name,
    message_template,
    status: 'running',
    total_contacts: contacts.length,
    delay_ms,
    rotate_every: rotateEvery,
    account_ids: connectedAccounts.map((a) => a.id),
  });

  const messages = await Message.bulkCreate(
    contacts.map((c, i) => ({
      user_id: req.user.id,
      contact_id: c.id,
      campaign_id: campaign.id,
      account_id: connectedAccounts[Math.floor(i / rotateEvery) % connectedAccounts.length].id,
      content: applyTemplate(message_template, c) + optoutText,
      status: 'queued',
    }))
  );

  const jobs = messages.map((m, i) => ({
    messageId: m.id,
    userId: req.user.id,
    accountId: connectedAccounts[Math.floor(i / rotateEvery) % connectedAccounts.length].id,
    phone: contacts[i].phone,
    content: m.content,
  }));

  await enqueueBulk(jobs, delay_ms);
  res.status(201).json({ campaign, queued: messages.length });
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

module.exports = { sendSingle, sendCampaign, history };
