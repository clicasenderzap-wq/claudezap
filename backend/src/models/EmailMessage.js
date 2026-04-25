const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EmailMessage = sequelize.define('EmailMessage', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  campaign_id: { type: DataTypes.UUID, allowNull: false },
  user_id:     { type: DataTypes.UUID, allowNull: false },
  contact_id:  { type: DataTypes.UUID, allowNull: true },
  to_email:    { type: DataTypes.STRING, allowNull: false },
  to_name:     { type: DataTypes.STRING, allowNull: true },
  status: {
    type: DataTypes.ENUM('queued', 'sent', 'failed', 'opened', 'bounced'),
    defaultValue: 'queued',
  },
  sent_at:            { type: DataTypes.DATE, allowNull: true },
  opened_at:          { type: DataTypes.DATE, allowNull: true },
  resend_message_id:  { type: DataTypes.STRING, allowNull: true },
  error_message:      { type: DataTypes.TEXT, allowNull: true },
  unsubscribe_token:  { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, unique: true },
  queue_job_id:       { type: DataTypes.STRING, allowNull: true },
}, { tableName: 'email_messages', underscored: true });

module.exports = EmailMessage;
