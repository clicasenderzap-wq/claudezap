const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Contact = sequelize.define('Contact', {
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
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  opt_out: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  tags: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  consent_source: {
    type: DataTypes.STRING,
    allowNull: true,
    // 'manual' | 'imported' | 'optin_form' | 'existing_relationship' | 'other'
  },
  consented_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  last_campaign_sent_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'contacts',
  underscored: true,
  indexes: [
    { unique: true, fields: ['user_id', 'phone'] },
  ],
});

module.exports = Contact;
