const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WhatsappAccount = sequelize.define('WhatsappAccount', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  label: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Número principal',
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('connecting', 'connected', 'disconnected'),
    defaultValue: 'disconnected',
  },
}, {
  tableName: 'whatsapp_accounts',
  underscored: true,
});

module.exports = WhatsappAccount;
