const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Campaign = sequelize.define('Campaign', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  message_template: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Supports {{name}}, {{phone}} variables',
  },
  status: {
    type: DataTypes.ENUM('draft', 'scheduled', 'running', 'paused', 'completed', 'failed'),
    defaultValue: 'draft',
  },
  scheduled_for: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  total_contacts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  sent_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  failed_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  delay_ms: {
    type: DataTypes.INTEGER,
    defaultValue: 3000,
    comment: 'Delay between messages in milliseconds',
  },
  account_ids: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  rotate_every: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    comment: 'Switch to next account every N messages',
  },
}, {
  tableName: 'campaigns',
  underscored: true,
});

module.exports = Campaign;
