const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BotConfig = sequelize.define('BotConfig', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  account_id: { type: DataTypes.UUID, allowNull: false, unique: true },
  enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
  system_prompt: {
    type: DataTypes.TEXT,
    defaultValue: 'Você é um assistente virtual de atendimento ao cliente. Seja cordial, objetivo e útil. Se não souber responder, informe que irá transferir para um atendente humano.',
  },
  welcome_message: {
    type: DataTypes.TEXT,
    defaultValue: 'Olá! Sou o assistente virtual. Como posso te ajudar hoje?',
  },
  escalation_message: {
    type: DataTypes.TEXT,
    defaultValue: 'Vou te transferir para um de nossos atendentes. Aguarde um momento, por favor.',
  },
  ai_provider: { type: DataTypes.ENUM('anthropic', 'openai'), defaultValue: 'anthropic' },
  ai_api_key: { type: DataTypes.STRING, allowNull: true },
  ai_model: { type: DataTypes.STRING, defaultValue: 'claude-haiku-4-5-20251001' },
  max_turns: { type: DataTypes.INTEGER, defaultValue: 10 },
  business_hours_only: { type: DataTypes.BOOLEAN, defaultValue: false },
  start_hour: { type: DataTypes.INTEGER, defaultValue: 8 },
  end_hour: { type: DataTypes.INTEGER, defaultValue: 22 },
}, { tableName: 'bot_configs', underscored: true });

module.exports = BotConfig;
