const { Op, fn, col } = require('sequelize');
const { Message, Contact, Campaign, EmailCampaign, EmailMessage } = require('../models');

async function stats(req, res) {
  const userId = req.user.id;
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [totalContacts, totalMessages, byStatus, recentCampaigns, emailStats, recentEmailCampaigns] = await Promise.all([
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
    EmailCampaign.findAll({
      where: { user_id: userId, created_at: { [Op.gte]: since } },
      attributes: [
        [fn('COUNT', col('id')), 'total'],
        [fn('SUM', col('sent_count')), 'sent'],
        [fn('SUM', col('open_count')), 'opened'],
        [fn('SUM', col('total_contacts')), 'total_recipients'],
      ],
      raw: true,
    }),
    EmailCampaign.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit: 5,
    }),
  ]);

  const statusMap = Object.fromEntries(byStatus.map((r) => [r.status, Number(r.count)]));
  const sent = statusMap.sent || 0;
  const total = totalMessages || 1;
  const successRate = ((sent / total) * 100).toFixed(1);

  const es = emailStats[0] || {};
  const emailSent = Number(es.sent) || 0;
  const emailOpened = Number(es.opened) || 0;
  const emailOpenRate = emailSent > 0 ? ((emailOpened / emailSent) * 100).toFixed(1) : '0';

  res.json({
    contacts: totalContacts,
    messages_last_30d: totalMessages,
    success_rate: `${successRate}%`,
    by_status: statusMap,
    recent_campaigns: recentCampaigns,
    email: {
      campaigns_last_30d: Number(es.total) || 0,
      sent_last_30d: emailSent,
      opened_last_30d: emailOpened,
      open_rate: `${emailOpenRate}%`,
      recent_campaigns: recentEmailCampaigns,
    },
  });
}

module.exports = { stats };
