const { GlobalOptout } = require('../models');
const { canonicalPhone } = require('../services/optoutService');
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

module.exports = { list, add, remove, stats };
