const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  whatsapp: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  role: {
    type: DataTypes.ENUM('user', 'admin'),
    defaultValue: 'user',
  },
  plan: {
    type: DataTypes.ENUM('starter', 'pro', 'starter_cortesia', 'pro_cortesia'),
    defaultValue: 'starter',
  },
  status: {
    type: DataTypes.ENUM('pending', 'trial', 'active', 'inactive'),
    defaultValue: 'pending',
  },
  trial_ends_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  whatsapp_support: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  accepted_terms_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  terms_ip: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // null = legacy user (pre-verification feature), false = unverified, true = verified
  email_verified: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: null,
  },
  email_verification_token: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  login_failed_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  login_locked_until: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  // Tracks the active Electron app session for single-device enforcement
  desktop_device_id: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'users',
  underscored: true,
});

User.prototype.verifyPassword = function (password) {
  return bcrypt.compare(password, this.password_hash);
};

User.hashPassword = (password) => bcrypt.hash(password, 10);

module.exports = User;
