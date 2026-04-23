const { Op } = require('sequelize');
const { BotConfig, BotConversation, WhatsappAccount } = require('../models');

async function getConfig(req, res) {
  const account = await WhatsappAccount.findOne({ where: { id: req.params.accountId, user_id: req.user.id } });
  if (!account) return res.status(404).json({ error: 'Conta não encontrada' });

  let config = await BotConfig.findOne({ where: { account_id: account.id } });
  if (!config) {
    config = await BotConfig.create({ account_id: account.id });
  }
  res.json(config);
}

async function updateConfig(req, res) {
  const account = await WhatsappAccount.findOne({ where: { id: req.params.accountId, user_id: req.user.id } });
  if (!account) return res.status(404).json({ error: 'Conta não encontrada' });

  let config = await BotConfig.findOne({ where: { account_id: account.id } });
  if (!config) config = await BotConfig.create({ account_id: account.id });

  const {
    enabled, system_prompt, welcome_message, escalation_message,
    max_turns, business_hours_only, start_hour, end_hour,
  } = req.body;

  await config.update({
    ...(enabled !== undefined && { enabled }),
    ...(system_prompt !== undefined && { system_prompt }),
    ...(welcome_message !== undefined && { welcome_message }),
    ...(escalation_message !== undefined && { escalation_message }),
    ...(max_turns !== undefined && { max_turns: Math.max(1, Math.min(50, Number(max_turns))) }),
    ...(business_hours_only !== undefined && { business_hours_only }),
    ...(start_hour !== undefined && { start_hour: Number(start_hour) }),
    ...(end_hour !== undefined && { end_hour: Number(end_hour) }),
  });

  res.json(config);
}

async function getConversations(req, res) {
  const account = await WhatsappAccount.findOne({ where: { id: req.params.accountId, user_id: req.user.id } });
  if (!account) return res.status(404).json({ error: 'Conta não encontrada' });

  const { status } = req.query;
  const where = { account_id: account.id };
  if (status) where.status = status;

  const conversations = await BotConversation.findAll({
    where,
    order: [['last_message_at', 'DESC']],
    limit: 50,
  });
  res.json(conversations);
}

async function closeConversation(req, res) {
  const conv = await BotConversation.findByPk(req.params.id);
  if (!conv) return res.status(404).json({ error: 'Conversa não encontrada' });

  // Verifica que pertence ao usuário
  const account = await WhatsappAccount.findOne({ where: { id: conv.account_id, user_id: req.user.id } });
  if (!account) return res.status(403).json({ error: 'Sem permissão' });

  await conv.update({ status: 'closed' });
  res.json(conv);
}

async function reopenConversation(req, res) {
  const conv = await BotConversation.findByPk(req.params.id);
  if (!conv) return res.status(404).json({ error: 'Conversa não encontrada' });

  const account = await WhatsappAccount.findOne({ where: { id: conv.account_id, user_id: req.user.id } });
  if (!account) return res.status(403).json({ error: 'Sem permissão' });

  await conv.update({ status: 'active' });
  res.json(conv);
}

async function getMonthlyStats(req, res) {
  const accounts = await WhatsappAccount.findAll({ where: { user_id: req.user.id }, attributes: ['id'] });
  const accountIds = accounts.map((a) => a.id);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const count = await BotConversation.count({
    where: { account_id: accountIds, created_at: { [Op.gte]: monthStart } },
  });
  res.json({ conversations_this_month: count, limit: 500 });
}

module.exports = { getConfig, updateConfig, getConversations, closeConversation, reopenConversation, getMonthlyStats };
