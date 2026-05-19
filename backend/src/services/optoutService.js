const { Contact, GlobalOptout } = require('../models');
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

function normalizeText(text) {
  return text.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

// Returns canonical phone (digits only, with 55 prefix)
function canonicalPhone(rawPhone) {
  const digits = String(rawPhone).replace(/\D/g, '');
  if (digits.startsWith('55')) return digits;
  return `55${digits}`;
}

function isOptOutMessage(text) {
  if (!text) return false;
  const n = normalizeText(text);
  if (SHORT_KEYWORDS.some((kw) => n === kw || n.startsWith(kw + ' '))) return true;
  if (PHRASE_KEYWORDS.some((kw) => n === kw || n.includes(kw))) return true;
  return false;
}

// Checks if a phone is in the permanent blocklist
async function isGloballyBlocked(userId, rawPhone) {
  const phone = canonicalPhone(rawPhone);
  const found = await GlobalOptout.findOne({ where: { user_id: userId, phone } }).catch(() => null);
  return found != null;
}

// Adds a phone to the permanent blocklist
async function addToGlobalOptout(userId, rawPhone, source = 'reply') {
  const phone = canonicalPhone(rawPhone);
  await GlobalOptout.findOrCreate({ where: { user_id: userId, phone }, defaults: { source } }).catch(() => {});
}

async function handleIncoming(userId, fromPhone, text) {
  if (!isOptOutMessage(text)) return false;

  const digits = String(fromPhone).replace(/\D/g, '');
  // Tenta com e sem DDI 55 (cobre números importados com formatos diferentes)
  const variants = new Set([digits]);
  if (digits.startsWith('55')) variants.add(digits.slice(2));
  else variants.add(`55${digits}`);
  if (digits.length === 13) variants.add('55' + digits.slice(2, 4) + digits.slice(5));
  if (digits.length === 11) variants.add('55' + digits.slice(0, 2) + '9' + digits.slice(2));

  const phones = [...variants];

  // 1. Adiciona à lista negra permanente (independente de existir na tabela contacts)
  await addToGlobalOptout(userId, fromPhone, 'reply');
  console.log(`[Optout] ${fromPhone} adicionado à lista negra permanente`);

  // 2. Marca o contato como opt_out se existir
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
    console.log(`[Optout] ${contact.name} (${contact.phone}) marcado como opt_out`);
    return true;
  }

  if (!contact) {
    console.warn(`[Optout] SAIR de ${fromPhone} — número não encontrado nos contatos, mas já na lista negra`);
  }

  return true; // always return true when SAIR detected
}

module.exports = { handleIncoming, isOptOutMessage, isGloballyBlocked, addToGlobalOptout, canonicalPhone };
