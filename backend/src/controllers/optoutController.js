const { GlobalOptout, IncomingMessage } = require('../models');
const { canonicalPhone, isOptOutMessage } = require('../services/optoutService');
const { Op } = require('sequelize');

async function list(req, res) {
  const { page = 1, limit = 50, search } = req.query;
  const where = { user_id: req.user.id };
  if (search) where.phone = { [Op.iLike]: `%${search.replace(/\D/g, '')}%` };

  const { count, rows } = await GlobalOptout.findAndCountAll({
    where,
    order: [['created_at', 'DESC']],
    limit: Number(limit),
    offset: (Number(page) - 1) * Number(limit),
  });

  res.json({ total: count, page: Number(page), data: rows });
}

async function add(req, res) {
  const { phone, notes } = req.body;
  if (!phone) return res.status(422).json({ error: 'Informe o número de telefone' });
  const canonical = canonicalPhone(phone);
  const [record, created] = await GlobalOptout.findOrCreate({
    where: { user_id: req.user.id, phone: canonical },
    defaults: { source: 'manual', notes },
  });
  res.status(created ? 201 : 200).json(record);
}

async function remove(req, res) {
  const deleted = await GlobalOptout.destroy({
    where: { id: req.params.id, user_id: req.user.id },
  });
  if (!deleted) return res.status(404).json({ error: 'Não encontrado' });
  res.status(204).send();
}

async function stats(req, res) {
  const total = await GlobalOptout.count({ where: { user_id: req.user.id } });
  const fromReply = await GlobalOptout.count({ where: { user_id: req.user.id, source: 'reply' } });
  res.json({ total, from_reply: fromReply, manual: total - fromReply });
}

async function importHistorical(req, res) {
  // Lê todas as mensagens recebidas do usuário em lotes para não estourar memória
  const BATCH = 500;
  let offset = 0;
  let added = 0;
  let scanned = 0;

  while (true) {
    const rows = await IncomingMessage.findAll({
      where: { user_id: req.user.id },
      attributes: ['from_phone', 'text'],
      limit: BATCH,
      offset,
      order: [['created_at', 'ASC']],
    });

    if (!rows.length) break;
    scanned += rows.length;
    offset += BATCH;

    for (const msg of rows) {
      if (!isOptOutMessage(msg.text)) continue;
      const phone = canonicalPhone(msg.from_phone);
      const [, created] = await GlobalOptout.findOrCreate({
        where: { user_id: req.user.id, phone },
        defaults: { source: 'reply' },
      }).catch(() => [null, false]);
      if (created) added++;
    }
  }

  console.log(`[Optout] import histórico: ${scanned} mensagens varridas, ${added} novos bloqueios`);
  res.json({ scanned, added });
}

module.exports = { list, add, remove, stats, importHistorical };
