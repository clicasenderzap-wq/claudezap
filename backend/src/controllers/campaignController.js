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
  const { page = 1, limit = 20 } = req.query;

  const { count, rows } = await Campaign.findAndCountAll({
    where: { user_id: req.user.id },
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

  const newCampaign = await Campaign.create({
    user_id: req.user.id,
    name: `${original.name} (Reenvio)`,
    message_template: original.message_template,
    status: 'running',
    total_contacts: contacts.length,
    delay_ms: original.delay_ms,
    account_ids: accountsToUse.map((a) => a.id),
  });

  const messages = await Message.bulkCreate(
    contacts.map((c, i) => ({
      user_id: req.user.id,
      contact_id: c.id,
      campaign_id: newCampaign.id,
      account_id: accountsToUse[i % accountsToUse.length].id,
      content: applyTemplate(original.message_template, c),
      status: 'queued',
    }))
  );

  const jobs = messages.map((m, i) => ({
    messageId: m.id,
    userId: req.user.id,
    accountId: accountsToUse[i % accountsToUse.length].id,
    phone: contacts[i].phone,
    content: m.content,
  }));

  await enqueueBulk(jobs, original.delay_ms);

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

  res.json(msgs);
}

async function remove(req, res) {
  const campaign = await Campaign.findOne({
    where: { id: req.params.id, user_id: req.user.id },
  });
  if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
  await campaign.destroy();
  res.status(204).send();
}

module.exports = { list, messages, resend, remove };
