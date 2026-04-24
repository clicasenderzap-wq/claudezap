const sequelize = require('../config/database');
const User = require('./User');
const AuditLog = require('./AuditLog');
const Contact = require('./Contact');
const Campaign = require('./Campaign');
const Message = require('./Message');
const WhatsappAccount = require('./WhatsappAccount');
const WarmupConfig = require('./WarmupConfig');
const WarmupLog = require('./WarmupLog');
const BotConfig = require('./BotConfig');
const BotConversation = require('./BotConversation');
const IncomingMessage = require('./IncomingMessage');
const SystemSetting = require('./SystemSetting');

// Associations
User.hasMany(Contact, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Contact.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Campaign, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Campaign.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Message, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Message.belongsTo(User, { foreignKey: 'user_id' });

Contact.hasMany(Message, { foreignKey: 'contact_id', onDelete: 'CASCADE' });
Message.belongsTo(Contact, { foreignKey: 'contact_id' });

Campaign.hasMany(Message, { foreignKey: 'campaign_id', onDelete: 'SET NULL' });
Message.belongsTo(Campaign, { foreignKey: 'campaign_id' });

User.hasMany(WhatsappAccount, { foreignKey: 'user_id', onDelete: 'CASCADE' });
WhatsappAccount.belongsTo(User, { foreignKey: 'user_id' });

Message.belongsTo(WhatsappAccount, { foreignKey: 'account_id', as: 'account' });

User.hasOne(WarmupConfig, { foreignKey: 'user_id', onDelete: 'CASCADE' });
WarmupConfig.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(WarmupLog, { foreignKey: 'user_id', onDelete: 'CASCADE' });
WarmupLog.belongsTo(User, { foreignKey: 'user_id' });

WhatsappAccount.hasOne(BotConfig, { foreignKey: 'account_id', onDelete: 'CASCADE' });
BotConfig.belongsTo(WhatsappAccount, { foreignKey: 'account_id' });

WhatsappAccount.hasMany(BotConversation, { foreignKey: 'account_id', onDelete: 'CASCADE' });
BotConversation.belongsTo(WhatsappAccount, { foreignKey: 'account_id' });

WhatsappAccount.hasMany(IncomingMessage, { foreignKey: 'account_id', onDelete: 'CASCADE', as: 'account' });
IncomingMessage.belongsTo(WhatsappAccount, { foreignKey: 'account_id', as: 'account' });

module.exports = { sequelize, User, AuditLog, Contact, Campaign, Message, WhatsappAccount, WarmupConfig, WarmupLog, BotConfig, BotConversation, IncomingMessage, SystemSetting };
