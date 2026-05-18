const { Contact } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

// Short keywords: exact match or first word (evita "vou sair de casa" como falso positivo)
const SHORT_KEYWORDS = ['sair', 'stop', 'parar', 'cancelar'];
// Phrase keywords: texto deve conter a frase
const PHRASE_KEYWORDS = [
  'remover', 'descadastrar', 'nao quero', 'nao quero mais',
  'quero sair', 'sair da lista', 'me retire', 'me remova', 'remova me',
  'tirar da lista', 'retirar da lista', 'nao receber mais', 'nao me mande',
  'para de mandar', 'pare de mandar',
];

function normalize(text) {
  return text.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')  // remove acentos
    .replace(/[^\w\s]/g, ' ')                           // remove pontuação (Sair. → sair )
    .replace(/\s+/g, ' ').trim();
}

function isOptOutMessage(text) {
  if (!text) return false;
  const n = normalize(text);
  if (SHORT_KEYWORDS.some((kw) => n === kw || n.startsWith(kw + ' '))) return true;
  if (PHRASE_KEYWORDS.some((kw) => n === kw || n.includes(kw))) return true;
  return false;
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
    console.warn(`[Optout] SAIR de número não encontrado na base: ${fromPhone} (user ${userId})`);
  }

  return false;
}

module.exports = { handleIncoming, isOptOutMessage };
