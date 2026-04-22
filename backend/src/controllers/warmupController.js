const { WarmupConfig, WhatsappAccount } = require('../models');
const warmupService = require('../services/warmupService');
const whatsapp = require('../services/whatsappService');

async function getConfig(req, res) {
  let config = await WarmupConfig.findOne({ where: { user_id: req.user.id } });
  if (!config) {
    config = await WarmupConfig.create({ user_id: req.user.id });
  }

  const accounts = await WhatsappAccount.findAll({ where: { user_id: req.user.id } });
  const connected = accounts.filter((a) => whatsapp.getStatus(a.id) === 'connected' && a.phone);
  const stats = await warmupService.getStats(req.user.id);

  res.json({ config, connected_accounts: connected.length, stats });
}

async function updateConfig(req, res) {
  const { enabled, messages_per_day, start_hour, end_hour } = req.body;

  let config = await WarmupConfig.findOne({ where: { user_id: req.user.id } });
  if (!config) config = await WarmupConfig.create({ user_id: req.user.id });

  await config.update({
    ...(enabled !== undefined && { enabled }),
    ...(messages_per_day !== undefined && { messages_per_day: Math.min(200, Math.max(5, Number(messages_per_day))) }),
    ...(start_hour !== undefined && { start_hour: Number(start_hour) }),
    ...(end_hour !== undefined && { end_hour: Number(end_hour) }),
  });

  // Se acabou de ativar, tenta rodar imediatamente
  if (enabled === true) {
    warmupService.runNow(req.user.id).catch(() => {});
  }

  res.json(config);
}

async function getStats(req, res) {
  const stats = await warmupService.getStats(req.user.id);
  res.json(stats);
}

module.exports = { getConfig, updateConfig, getStats };
