const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WarmupLog = sequelize.define('WarmupLog', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  from_account_id: { type: DataTypes.UUID, allowNull: false },
  to_account_id: { type: DataTypes.UUID, allowNull: false },
  from_label: { type: DataTypes.STRING },
  to_label: { type: DataTypes.STRING },
  message: { type: DataTypes.TEXT },
  sent_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'warmup_logs', underscored: true, updatedAt: false });

module.exports = WarmupLog;
