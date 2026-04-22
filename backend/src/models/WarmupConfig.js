const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WarmupConfig = sequelize.define('WarmupConfig', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false, unique: true },
  enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
  messages_per_day: { type: DataTypes.INTEGER, defaultValue: 20 },
  start_hour: { type: DataTypes.INTEGER, defaultValue: 8 },
  end_hour: { type: DataTypes.INTEGER, defaultValue: 22 },
  account_ids: { type: DataTypes.JSON, defaultValue: [] },
}, { tableName: 'warmup_configs', underscored: true });

module.exports = WarmupConfig;
