const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Permanent blocklist — survives contact deletion/re-import.
// A phone number in this table will never receive messages from this user's system.
const GlobalOptout = sequelize.define('GlobalOptout', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  // Stored in canonical format: digits only, with country code (e.g. 5511999999999)
  phone: { type: DataTypes.STRING, allowNull: false },
  source: {
    type: DataTypes.ENUM('reply', 'manual'),
    defaultValue: 'reply',
    comment: 'reply = sent SAIR, manual = added by user',
  },
  notes: { type: DataTypes.STRING, allowNull: true },
}, {
  tableName: 'global_optouts',
  underscored: true,
  indexes: [{ unique: true, fields: ['user_id', 'phone'] }],
});

module.exports = GlobalOptout;
