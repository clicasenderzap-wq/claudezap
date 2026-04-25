const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EmailCampaign = sequelize.define('EmailCampaign', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  subject: { type: DataTypes.STRING, allowNull: false },
  from_name: { type: DataTypes.STRING, allowNull: true },
  html_body: { type: DataTypes.TEXT, allowNull: false },
  status: {
    type: DataTypes.ENUM('draft', 'scheduled', 'running', 'completed', 'failed'),
    defaultValue: 'draft',
  },
  scheduled_for: { type: DataTypes.DATE, allowNull: true },
  total_contacts: { type: DataTypes.INTEGER, defaultValue: 0 },
  sent_count:     { type: DataTypes.INTEGER, defaultValue: 0 },
  failed_count:   { type: DataTypes.INTEGER, defaultValue: 0 },
  open_count:     { type: DataTypes.INTEGER, defaultValue: 0 },
  delay_ms:       { type: DataTypes.INTEGER, defaultValue: 1000 },
  tag_filter:     { type: DataTypes.STRING, allowNull: true },
}, { tableName: 'email_campaigns', underscored: true });

module.exports = EmailCampaign;
