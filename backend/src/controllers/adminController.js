const { sequelize, User, WhatsappAccount, AuditLog, SystemSetting } = require('../models');
const { Op, fn, col } = require('sequelize');
const emailSvc = require('../services/emailService');

const PAYING_PLANS = ['starter', 'pro'];
const DEFAULT_PRICES = {
  starter: { price: '67.90', label: 'Starter' },
  pro: { price: '117.90', label: 'Pro' },
};

async function listUsers(req, res) {
  const { page = 1, limit = 30, search = '', status, plan } = req.query;
  const where = {};
  if (search) where.email = { [Op.iLike]: `%${search}%` };
  if (status) where.status = status;
  if (plan) where.plan = plan;

  const { count, rows } = await User.findAndCountAll({
    where,
    attributes: { exclude: ['password_hash', 'email_verification_token'] },
    order: [['created_at', 'DESC']],
    limit: Number(limit),
    offset: (Number(page) - 1) * Number(limit),
  });

  const userIds = rows.map((u) => u.id);
  const accountCounts = await WhatsappAccount.findAll({
    where: { user_id: userIds },
    attributes: ['user_id', [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']],
    group: ['user_id'],
    raw: true,
  });
  const accountMap = Object.fromEntries(accountCounts.map((a) => [a.user_id, Number(a.count)]));
  const data = rows.map((u) => ({ ...u.toJSON(), whatsapp_count: accountMap[u.id] || 0 }));

  res.json({ total: count, page: Number(page), data });
}

async function getUser(req, res) {
  const user = await User.findByPk(req.params.id, {
    attributes: { exclude: ['password_hash', 'email_verification_token'] },
  });
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  res.json(user);
}

async function updateUser(req, res) {
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  const { plan, status, role, whatsapp_support, trial_ends_at } = req.body;
  await user.update({
    ...(plan !== undefined && { plan }),
    ...(status !== undefined && { status }),
    ...(role !== undefined && { role }),
    ...(whatsapp_support !== undefined && { whatsapp_support }),
    ...(trial_ends_at !== undefined && { trial_ends_at }),
  });

  const { password_hash, email_verification_token, ...safe } = user.toJSON();
  res.json(safe);
}

async function approveUser(req, res) {
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  if (user.status !== 'pending') return res.status(400).json({ error: 'Usuário não está pendente' });

  const trial_ends_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await user.update({ status: 'trial', trial_ends_at });

  emailSvc.sendApprovalEmail(user).catch(() => {});

  await AuditLog.create({
    user_id: req.user.id,
    action: 'admin_approve_user',
    ip: req.ip,
    metadata: { target_user_id: user.id, target_email: user.email },
  });

  res.json({ message: 'Conta aprovada com sucesso', user: { id: user.id, status: 'trial' } });
}

async function rejectUser(req, res) {
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  await user.update({ status: 'inactive' });

  emailSvc.sendRejectionEmail(user).catch(() => {});

  await AuditLog.create({
    user_id: req.user.id,
    action: 'admin_reject_user',
    ip: req.ip,
    metadata: { target_user_id: user.id, target_email: user.email },
  });

  res.json({ message: 'Conta rejeitada' });
}

async function getStats(req, res) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [total, active, trial, inactive, pending, trialExpired, newThisMonth] = await Promise.all([
    User.count(),
    User.count({ where: { status: 'active' } }),
    User.count({ where: { status: 'trial', trial_ends_at: { [Op.gte]: now } } }),
    User.count({ where: { status: 'inactive' } }),
    User.count({ where: { status: 'pending' } }),
    User.count({ where: { status: 'trial', trial_ends_at: { [Op.lt]: now } } }),
    User.count({ where: { created_at: { [Op.gte]: startOfMonth } } }),
  ]);

  const byPlan = await User.findAll({
    attributes: ['plan', [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']],
    group: ['plan'],
    raw: true,
  });

  res.json({
    total, active, trial, inactive, pending,
    trial_expired: trialExpired,
    new_this_month: newThisMonth,
    by_plan: Object.fromEntries(byPlan.map((r) => [r.plan, Number(r.count)])),
  });
}

async function listWhatsappAccounts(req, res) {
  const whatsapp = require('../services/whatsappService');
  const accounts = await WhatsappAccount.findAll({
    include: [{ model: User, attributes: ['email', 'name'] }],
    order: [['status', 'ASC'], ['created_at', 'DESC']],
  });
  const data = accounts.map((a) => ({
    ...a.toJSON(),
    live_status: a.status,
  }));
  res.json(data);
}

async function disconnectWhatsappAccount(req, res) {
  const whatsapp = require('../services/whatsappService');
  const account = await WhatsappAccount.findByPk(req.params.id);
  if (!account) return res.status(404).json({ error: 'Conta não encontrada' });
  await whatsapp.disconnect(account.id);
  await account.update({ status: 'disconnected' });
  res.json({ message: 'Conta desconectada' });
}

async function removeWhatsappAccount(req, res) {
  const whatsapp = require('../services/whatsappService');
  const account = await WhatsappAccount.findByPk(req.params.id);
  if (!account) return res.status(404).json({ error: 'Conta não encontrada' });
  await whatsapp.disconnect(account.id);
  await account.destroy();
  res.status(204).send();
}

async function getPlanPrices(req, res) {
  const setting = await SystemSetting.findOne({ where: { key: 'plan_prices' } });
  res.json(setting ? JSON.parse(setting.value) : DEFAULT_PRICES);
}

async function updatePlanPrices(req, res) {
  const { starter, pro } = req.body;
  if (!starter?.price || !pro?.price) {
    return res.status(400).json({ error: 'Preços inválidos — informe starter.price e pro.price' });
  }
  const prices = {
    starter: { price: String(parseFloat(starter.price).toFixed(2)), label: 'Starter' },
    pro: { price: String(parseFloat(pro.price).toFixed(2)), label: 'Pro' },
  };
  const existing = await SystemSetting.findOne({ where: { key: 'plan_prices' } });
  if (existing) {
    await existing.update({ value: JSON.stringify(prices) });
  } else {
    await SystemSetting.create({ key: 'plan_prices', value: JSON.stringify(prices) });
  }
  res.json(prices);
}

async function getRevenue(req, res) {
  const { period = 'month' } = req.query;
  const now = new Date();
  let startDate;
  switch (period) {
    case 'month':   startDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
    case 'quarter': startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1); break;
    case 'year':    startDate = new Date(now.getFullYear(), 0, 1); break;
    default:        startDate = null;
  }

  const priceSetting = await SystemSetting.findOne({ where: { key: 'plan_prices' } });
  const prices = priceSetting ? JSON.parse(priceSetting.value) : DEFAULT_PRICES;

  // MRR from current active paying users
  const activeByPlan = await User.findAll({
    where: { status: 'active', plan: { [Op.in]: PAYING_PLANS } },
    attributes: ['plan', [fn('COUNT', col('id')), 'count']],
    group: ['plan'],
    raw: true,
  });

  let mrr = 0;
  const revenueByPlan = {};
  for (const { plan, count } of activeByPlan) {
    const price = parseFloat(prices[plan]?.price || 0);
    const planRevenue = price * Number(count);
    mrr += planRevenue;
    revenueByPlan[plan] = {
      count: Number(count),
      price: prices[plan]?.price || '0',
      revenue: planRevenue.toFixed(2),
    };
  }

  // New signups per month for last 6 months
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const rawMonthly = await User.findAll({
    where: { created_at: { [Op.gte]: sixMonthsAgo } },
    attributes: [
      [fn('date_trunc', 'month', col('created_at')), 'month'],
      [fn('COUNT', col('id')), 'count'],
    ],
    group: [fn('date_trunc', 'month', col('created_at'))],
    order: [[fn('date_trunc', 'month', col('created_at')), 'ASC']],
    raw: true,
  });

  // Build full 6-month array with zeros for missing months
  const monthlySignups = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
    const isoMonth = d.toISOString().slice(0, 7);
    const found = rawMonthly.find((r) => r.month && String(r.month).startsWith(isoMonth));
    monthlySignups.push({ month: label, count: found ? Number(found.count) : 0 });
  }

  const newInPeriod = startDate
    ? await User.count({ where: { created_at: { [Op.gte]: startDate } } })
    : await User.count();

  res.json({
    period,
    mrr: mrr.toFixed(2),
    new_users_period: newInPeriod,
    revenue_by_plan: revenueByPlan,
    monthly_signups: monthlySignups,
    prices,
  });
}

module.exports = { listUsers, getUser, updateUser, approveUser, rejectUser, getStats, listWhatsappAccounts, disconnectWhatsappAccount, removeWhatsappAccount, getPlanPrices, updatePlanPrices, getRevenue };
