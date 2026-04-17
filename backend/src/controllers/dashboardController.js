const { Op, fn, col, literal } = require('sequelize');
const { Message, Contact, Campaign } = require('../models');

async function stats(req, res) {
  const userId = req.user.id;
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [totalContacts, totalMessages, byStatus, recentCampaigns] = await Promise.all([
    Contact.count({ where: { user_id: userId } }),
    Message.count({ where: { user_id: userId, created_at: { [Op.gte]: since } } }),
    Message.findAll({
      where: { user_id: userId, created_at: { [Op.gte]: since } },
      attributes: ['status', [fn('COUNT', col('id')), 'count']],
      group: ['status'],
      raw: true,
    }),
    Campaign.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit: 5,
    }),
  ]);

  const statusMap = Object.fromEntries(byStatus.map((r) => [r.status, Number(r.count)]));
  const sent = statusMap.sent || 0;
  const total = totalMessages || 1;
  const successRate = ((sent / total) * 100).toFixed(1);

  res.json({
    contacts: totalContacts,
    messages_last_30d: totalMessages,
    success_rate: `${successRate}%`,
    by_status: statusMap,
    recent_campaigns: recentCampaigns,
  });
}

module.exports = { stats };
