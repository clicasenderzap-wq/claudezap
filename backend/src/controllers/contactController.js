const { validationResult } = require('express-validator');
const csv = require('csv-parser');
const XLSX = require('xlsx');
const { Readable } = require('stream');
const { Contact, sequelize } = require('../models');
const { Op } = require('sequelize');

// Normaliza uma tag: maiúscula, sem espaços extras
function normalizeTag(t) {
  return String(t).trim().toUpperCase();
}

async function list(req, res) {
  const { search, page = 1, limit = 50, tag } = req.query;
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

  // Filtra por tag em memória (JSON array não é filtrável via SQL no Neon de forma portável)
  let data = rows;
  if (tag) {
    const t = normalizeTag(tag);
    data = rows.filter((c) => (c.tags || []).map(normalizeTag).includes(t));
  }

  res.json({ total: tag ? data.length : count, page: Number(page), data });
}

// Retorna todas as tags únicas do usuário
async function listTags(req, res) {
  const contacts = await Contact.findAll({
    where: { user_id: req.user.id },
    attributes: ['tags'],
  });

  const tagSet = new Set();
  for (const c of contacts) {
    for (const t of c.tags || []) {
      if (t) tagSet.add(normalizeTag(t));
    }
  }

  // Retorna tags com contagem de contatos
  const tagList = [...tagSet].sort();
  const counts = {};
  for (const c of contacts) {
    for (const t of c.tags || []) {
      const n = normalizeTag(t);
      counts[n] = (counts[n] || 0) + 1;
    }
  }

  res.json(tagList.map((t) => ({ tag: t, count: counts[t] || 0 })));
}

async function create(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  const { name, phone, notes, tags } = req.body;
  const normalizedTags = Array.isArray(tags) ? tags.map(normalizeTag).filter(Boolean) : [];
  try {
    const contact = await Contact.create({
      user_id: req.user.id,
      name,
      phone: normalizePhone(phone),
      notes,
      tags: normalizedTags,
    });
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

  const { name, phone, notes, opt_out, tags } = req.body;
  const updates = {
    ...(name !== undefined && { name }),
    ...(phone !== undefined && { phone: normalizePhone(phone) }),
    ...(notes !== undefined && { notes }),
    ...(opt_out !== undefined && { opt_out }),
    ...(tags !== undefined && { tags: Array.isArray(tags) ? tags.map(normalizeTag).filter(Boolean) : [] }),
  };
  await contact.update(updates);
  res.json(contact);
}

// Atualização em massa de tags para múltiplos contatos
async function bulkUpdateTags(req, res) {
  const { ids, tags, mode = 'replace' } = req.body;
  // mode: 'replace' substitui todas as tags; 'add' adiciona sem remover as existentes

  if (!Array.isArray(ids) || !ids.length) {
    return res.status(400).json({ error: 'ids obrigatório' });
  }

  const newTags = Array.isArray(tags) ? tags.map(normalizeTag).filter(Boolean) : [];

  const contacts = await Contact.findAll({
    where: { id: ids, user_id: req.user.id },
  });

  for (const contact of contacts) {
    let finalTags;
    if (mode === 'add') {
      const existing = (contact.tags || []).map(normalizeTag);
      finalTags = [...new Set([...existing, ...newTags])];
    } else {
      finalTags = newTags;
    }
    await contact.update({ tags: finalTags });
  }

  res.json({ updated: contacts.length });
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
    rawRows = rawRows.map((r) => {
      const normalized = {};
      for (const key of Object.keys(r)) normalized[key.trim().toLowerCase()] = r[key];
      return normalized;
    });
  } else {
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
    const name  = String(row.nome  || row.name  || '').trim();
    const phone = String(row.telefone || row.phone || '').trim();

    // Lê tag das colunas: tag, tags, tipo, grupo, etiqueta, category
    const rawTag = String(row.tag || row.tags || row.tipo || row.grupo || row.etiqueta || row.category || '').trim();
    const tags = rawTag ? [normalizeTag(rawTag)] : [];

    if (name && phone) {
      results.push({
        user_id: req.user.id,
        name,
        phone: normalizePhone(phone),
        notes: String(row.observacoes || row.notes || '').trim() || null,
        tags,
      });
    } else {
      errors.push({ row, reason: 'nome/telefone obrigatórios' });
    }
  }

  let imported = 0;
  let duplicates = 0;

  for (const row of results) {
    try {
      await Contact.create(row);
      imported++;
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') {
        try {
          const existing = await Contact.findOne({ where: { user_id: row.user_id, phone: row.phone } });
          if (existing) {
            // Merge tags: mantém existentes + adiciona novas
            const merged = [...new Set([...(existing.tags || []), ...row.tags].map(normalizeTag))];
            await existing.update({ name: row.name, notes: row.notes || existing.notes, tags: merged });
          }
          imported++;
          duplicates++;
        } catch {
          errors.push({ phone: row.phone, reason: 'erro ao atualizar duplicado' });
        }
      } else {
        console.error('[Import] erro ao salvar contato:', err.message, row);
        errors.push({ phone: row.phone, reason: err.message });
      }
    }
  }

  res.json({ imported, duplicates, skipped: errors.length, errors });
}

async function bulkDelete(req, res) {
  try {
    const { ids, tag } = req.body;
    const where = { user_id: req.user.id };
    if (tag) {
      const all = await Contact.findAll({ where, attributes: ['id', 'tags'] });
      const normalized = normalizeTag(tag);
      const taggedIds = all
        .filter((c) => (c.tags || []).map(normalizeTag).includes(normalized))
        .map((c) => c.id);
      if (!taggedIds.length) return res.json({ deleted: 0 });
      await Contact.destroy({ where: { id: taggedIds, user_id: req.user.id } });
      return res.json({ deleted: taggedIds.length });
    }
    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ error: 'ids ou tag obrigatório' });
    }
    const count = await Contact.destroy({ where: { ...where, id: ids } });
    res.json({ deleted: count });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao excluir contatos' });
  }
}

function normalizePhone(phone) {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

module.exports = { list, listTags, create, update, bulkUpdateTags, bulkDelete, remove, importCSV };
