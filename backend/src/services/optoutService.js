const { Contact } = require('../models');
const { Op } = require('sequelize');

const OPTOUT_KEYWORDS = ['sair', 'stop', 'parar', 'cancelar', 'remover', 'descadastrar', 'nao quero', 'não quero'];

function isOptOutMessage(text) {
  if (!text) return false;
  const normalized = text.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return OPTOUT_KEYWORDS.some((kw) => normalized === kw || normalized.startsWith(kw + ' '));
}

async function handleIncoming(userId, fromPhone, text) {
  if (!isOptOutMessage(text)) return false;

  const digits = String(fromPhone).replace(/\D/g, '');
  // Tenta com e sem DDI 55
  const phones = [digits];
  if (digits.startsWith('55')) phones.push(digits.slice(2));
  else phones.push(`55${digits}`);

  const contact = await Contact.findOne({
    where: { user_id: userId, phone: { [Op.in]: phones } },
  });

  if (contact && !contact.opt_out) {
    await contact.update({ opt_out: true });
    console.log(`[Optout] contato ${contact.name} (${contact.phone}) saiu da lista`);
    return true;
  }
  return false;
}

module.exports = { handleIncoming, isOptOutMessage };
