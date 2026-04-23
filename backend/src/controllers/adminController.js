const { User, WhatsappAccount, AuditLog } = require('../models');
const { Op } = require('sequelize');
const emailSvc = require('../services/emailService');

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
    live_status: whatsapp.getStatus(a.id),
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

module.exports = { listUsers, getUser, updateUser, approveUser, rejectUser, getStats, listWhatsappAccounts, disconnectWhatsappAccount };
