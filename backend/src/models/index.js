const sequelize = require('../config/database');
const User = require('./User');
const Contact = require('./Contact');
const Campaign = require('./Campaign');
const Message = require('./Message');

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

module.exports = { sequelize, User, Contact, Campaign, Message };
