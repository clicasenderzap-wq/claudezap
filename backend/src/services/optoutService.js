const { Contact } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

const OPTOUT_KEYWORDS = ['sair', 'stop', 'parar', 'cancelar', 'remover', 'descadastrar', 'nao quero', 'não quero'];

function isOptOutMessage(text) {
  if (!text) return false;
  const normalized = text.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return OPTOUT_KEYWORDS.some((kw) => normalized === kw || normalized.startsWith(kw + ' '));
}

async function handleIncoming(userId, fromPhone, text) {
  if (!isOptOutMessage(text)) return false;

  const digits = String(fromPhone).replace(/\D/g, '');
  // Tenta com e sem DDI 55 (cobre números importados com formatos diferentes)
  const variants = new Set([digits]);
  if (digits.startsWith('55')) variants.add(digits.slice(2));
  else variants.add(`55${digits}`);
  // Cobre o caso de DDD + 8 dígitos (sem o 9 adicional brasileiro)
  if (digits.length === 13) variants.add('55' + digits.slice(2, 4) + digits.slice(5));
  if (digits.length === 11) variants.add('55' + digits.slice(0, 2) + '9' + digits.slice(2));

  const phones = [...variants];

  // Usa regexp_replace para comparar apenas dígitos — tolera formatações diferentes no banco
  const contact = await Contact.findOne({
    where: {
      user_id: userId,
      [Op.or]: phones.map((p) =>
        sequelize.where(
          sequelize.fn('regexp_replace', sequelize.col('phone'), '[^0-9]', '', 'g'),
          p
        )
      ),
    },
  });

  if (contact && !contact.opt_out) {
    await contact.update({ opt_out: true });
    console.log(`[Optout] ${contact.name} (${contact.phone}) removido via SAIR`);
    return true;
  }

  if (!contact) {
    // Contato não encontrado: salva a solicitação para não perder o pedido
    console.warn(`[Optout] SAIR de número não encontrado na base: ${fromPhone} (user ${userId})`);
  }

  return false;
}

module.exports = { handleIncoming, isOptOutMessage };
