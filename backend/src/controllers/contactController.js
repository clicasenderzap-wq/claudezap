const { validationResult } = require('express-validator');
const csv = require('csv-parser');
const XLSX = require('xlsx');
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
  if (!req.file) return res.status(400).json({ error: 'Arquivo obrigatório' });

  const ext = (req.file.originalname || '').split('.').pop().toLowerCase();
  let rawRows = [];

  if (ext === 'xlsx' || ext === 'xls') {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    // Normaliza cabeçalhos para lowercase sem espaços
    rawRows = rawRows.map((r) => {
      const normalized = {};
      for (const key of Object.keys(r)) normalized[key.trim().toLowerCase()] = r[key];
      return normalized;
    });
  } else {
    // CSV — detecta separador automaticamente (vírgula ou ponto-e-vírgula)
    const sample = req.file.buffer.toString('utf8', 0, 512);
    const separator = sample.includes(';') ? ';' : ',';

    await new Promise((resolve, reject) => {
      Readable.from(req.file.buffer)
        .pipe(csv({ separator, mapHeaders: ({ header }) => header.trim().toLowerCase() }))
        .on('data', (row) => rawRows.push(row))
        .on('end', resolve)
        .on('error', reject);
    });
  }

  const results = [];
  const errors = [];

  for (const row of rawRows) {
    const name = String(row.nome || row.name || '').trim();
    const phone = String(row.telefone || row.phone || '').trim();
    if (name && phone) {
      results.push({ user_id: req.user.id, name, phone: normalizePhone(phone), notes: String(row.observacoes || row.notes || '').trim() || null });
    } else {
      errors.push({ row, reason: 'nome/telefone obrigatórios' });
    }
  }

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
  const digits = String(phone).replace(/\D/g, '');
  // Números brasileiros sem DDI: 10 dígitos (DDD+8) ou 11 (DDD+9) → adiciona 55
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

module.exports = { list, create, update, remove, importCSV };
