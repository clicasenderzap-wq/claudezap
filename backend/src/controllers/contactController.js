const { validationResult } = require('express-validator');
const csv = require('csv-parser');
const { Readable } = require('stream');
const { Contact } = require('../models');
const { Op } = require('sequelize');

async function list(req, res) {
  const { search, page = 1, limit = 50 } = req.query;
  const where = { user_id: req.user.id };

  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { phone: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const { count, rows } = await Contact.findAndCountAll({
    where,
    limit: Number(limit),
    offset: (Number(page) - 1) * Number(limit),
    order: [['name', 'ASC']],
  });

  res.json({ total: count, page: Number(page), data: rows });
}

async function create(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  const { name, phone, notes } = req.body;
  try {
    const contact = await Contact.create({ user_id: req.user.id, name, phone: normalizePhone(phone), notes });
    res.status(201).json(contact);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Telefone já cadastrado' });
    }
    res.status(500).json({ error: 'Erro interno' });
  }
}

async function update(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  const contact = await Contact.findOne({ where: { id: req.params.id, user_id: req.user.id } });
  if (!contact) return res.status(404).json({ error: 'Contato não encontrado' });

  const { name, phone, notes, opt_out } = req.body;
  await contact.update({ name, phone: phone ? normalizePhone(phone) : contact.phone, notes, opt_out });
  res.json(contact);
}

async function remove(req, res) {
  const contact = await Contact.findOne({ where: { id: req.params.id, user_id: req.user.id } });
  if (!contact) return res.status(404).json({ error: 'Contato não encontrado' });
  await contact.destroy();
  res.status(204).send();
}

async function importCSV(req, res) {
  if (!req.file) return res.status(400).json({ error: 'Arquivo CSV obrigatório' });

  const results = [];
  const errors = [];

  await new Promise((resolve, reject) => {
    Readable.from(req.file.buffer)
      .pipe(csv({ mapHeaders: ({ header }) => header.trim().toLowerCase() }))
      .on('data', (row) => {
        const name = row.nome || row.name;
        const phone = row.telefone || row.phone;
        if (name && phone) {
          results.push({ user_id: req.user.id, name: name.trim(), phone: normalizePhone(phone), notes: row.observacoes || row.notes || null });
        } else {
          errors.push({ row, reason: 'nome/telefone obrigatórios' });
        }
      })
      .on('end', resolve)
      .on('error', reject);
  });

  let imported = 0;
  for (const row of results) {
    try {
      await Contact.upsert(row, { conflictFields: ['user_id', 'phone'] });
      imported++;
    } catch {
      errors.push({ row, reason: 'erro ao salvar' });
    }
  }

  res.json({ imported, skipped: errors.length, errors });
}

function normalizePhone(phone) {
  return String(phone).replace(/\D/g, '');
}

module.exports = { list, create, update, remove, importCSV };
