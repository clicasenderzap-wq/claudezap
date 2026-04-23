const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const IncomingMessage = sequelize.define('IncomingMessage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  account_id: { type: DataTypes.UUID, allowNull: false },
  user_id: { type: DataTypes.UUID, allowNull: false },
  from_phone: { type: DataTypes.STRING, allowNull: false },
  from_name: { type: DataTypes.STRING, allowNull: true },
  text: { type: DataTypes.TEXT, allowNull: false },
  is_optout: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  tableName: 'incoming_messages',
  underscored: true,
  updatedAt: false,
  indexes: [{ fields: ['user_id', 'created_at'] }, { fields: ['account_id'] }],
});

module.exports = IncomingMessage;
