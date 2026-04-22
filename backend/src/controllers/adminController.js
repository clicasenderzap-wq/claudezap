const { User, WhatsappAccount, Campaign, Contact, Message } = require('../models');
const { Op } = require('sequelize');

async function listUsers(req, res) {
  const { page = 1, limit = 30, search = '', status, plan } = req.query;
  const where = {};
  if (search) where.email = { [Op.iLike]: `%${search}%` };
  if (status) where.status = status;
  if (plan) where.plan = plan;

  const { count, rows } = await User.findAndCountAll({
    where,
    attributes: { exclude: ['password_hash'] },
    order: [['created_at', 'DESC']],
    limit: Number(limit),
    offset: (Number(page) - 1) * Number(limit),
  });

  // Adiciona contagem de contas WhatsApp por usuário
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
  const user = await User.findByPk(req.params.id, { attributes: { exclude: ['password_hash'] } });
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

  const { password_hash, ...safe } = user.toJSON();
  res.json(safe);
}

async function getStats(req, res) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [total, active, trial, inactive, trialExpired, newThisMonth] = await Promise.all([
    User.count(),
    User.count({ where: { status: 'active' } }),
    User.count({ where: { status: 'trial', trial_ends_at: { [Op.gte]: now } } }),
    User.count({ where: { status: 'inactive' } }),
    User.count({ where: { status: 'trial', trial_ends_at: { [Op.lt]: now } } }),
    User.count({ where: { created_at: { [Op.gte]: startOfMonth } } }),
  ]);

  const byPlan = await User.findAll({
    attributes: ['plan', [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']],
    group: ['plan'],
    raw: true,
  });

  res.json({
    total,
    active,
    trial,
    inactive,
    trial_expired: trialExpired,
    new_this_month: newThisMonth,
    by_plan: Object.fromEntries(byPlan.map((r) => [r.plan, Number(r.count)])),
  });
}

module.exports = { listUsers, getUser, updateUser, getStats };
