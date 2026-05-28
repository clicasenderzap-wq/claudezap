const { Op, fn, col } = require('sequelize');
const { Message, Contact, Campaign, EmailCampaign, EmailMessage } = require('../models');

async function stats(req, res) {
  const userId = req.user.id;
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalContacts, totalMessages, byStatus, recentCampaigns,
    emailStats30d, emailStatsAllTime, recentEmailCampaigns,
    unsubscribedCount, bouncedCount,
  ] = await Promise.all([
    Contact.count({ where: { user_id: userId } }),
    Message.count({ where: { user_id: userId, created_at: { [Op.gte]: since } } }),
    Message.findAll({
      where: { user_id: userId, created_at: { [Op.gte]: since } },
      attributes: ['status', [fn('COUNT', col('id')), 'count']],
      group: ['status'],
      raw: true,
    }),
    Campaign.findAll({ where: { user_id: userId }, order: [['created_at', 'DESC']], limit: 5 }),
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
      attributes: [
        [fn('COUNT', col('id')), 'total'],
        [fn('SUM', col('sent_count')), 'sent'],
        [fn('SUM', col('open_count')), 'opened'],
        [fn('SUM', col('total_contacts')), 'total_recipients'],
        [fn('SUM', col('failed_count')), 'failed'],
      ],
      raw: true,
    }),
    EmailCampaign.findAll({ where: { user_id: userId }, order: [['created_at', 'DESC']], limit: 5 }),
    Contact.count({ where: { user_id: userId, email_opt_out: true } }),
    EmailMessage.count({ where: { user_id: userId, status: 'bounced' } }),
  ]);

  const statusMap = Object.fromEntries(byStatus.map((r) => [r.status, Number(r.count)]));
  const sent = statusMap.sent || 0;
  const total = totalMessages || 1;
  const successRate = ((sent / total) * 100).toFixed(1);

  const es30 = emailStats30d[0] || {};
  const emailSent30 = Number(es30.sent) || 0;
  const emailOpened30 = Number(es30.opened) || 0;

  const esAll = emailStatsAllTime[0] || {};
  const emailSentAll = Number(esAll.sent) || 0;
  const emailOpenedAll = Number(esAll.opened) || 0;
  const emailOpenRate = emailSentAll > 0 ? ((emailOpenedAll / emailSentAll) * 100).toFixed(1) : '0';

  res.json({
    contacts: totalContacts,
    messages_last_30d: totalMessages,
    success_rate: `${successRate}%`,
    by_status: statusMap,
    recent_campaigns: recentCampaigns,
    email: {
      campaigns_last_30d: Number(es30.total) || 0,
      sent_last_30d: emailSent30,
      opened_last_30d: emailOpened30,
      open_rate_30d: emailSent30 > 0 ? `${((emailOpened30 / emailSent30) * 100).toFixed(1)}%` : '0%',
      campaigns_total: Number(esAll.total) || 0,
      sent_total: emailSentAll,
      opened_total: emailOpenedAll,
      open_rate: `${emailOpenRate}%`,
      unsubscribed: unsubscribedCount,
      bounced: bouncedCount,
      recent_campaigns: recentEmailCampaigns,
    },
  });
}

module.exports = { stats };
