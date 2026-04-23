const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  contact_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  campaign_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'queued', 'sent', 'delivered', 'failed'),
    defaultValue: 'pending',
  },
  wa_message_id: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  sent_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  account_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  media_url: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  media_type: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  media_filename: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'messages',
  underscored: true,
});

module.exports = Message;
