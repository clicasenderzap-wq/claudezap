const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BotConversation = sequelize.define('BotConversation', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  account_id: { type: DataTypes.UUID, allowNull: false },
  contact_phone: { type: DataTypes.STRING, allowNull: false },
  contact_name: { type: DataTypes.STRING, allowNull: true },
  messages: { type: DataTypes.JSON, defaultValue: [] },
  status: { type: DataTypes.ENUM('active', 'escalated', 'closed'), defaultValue: 'active' },
  last_message_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'bot_conversations',
  underscored: true,
  indexes: [{ fields: ['account_id', 'contact_phone'] }],
});

module.exports = BotConversation;
