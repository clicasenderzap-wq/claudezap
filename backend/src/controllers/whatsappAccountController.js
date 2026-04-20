const QRCode = require('qrcode');
const whatsapp = require('../services/whatsappService');
const { WhatsappAccount } = require('../models');
const optout = require('../services/optoutService');

const pendingQR = new Map();

whatsapp.on('qr', ({ accountId, qr }) => {
  pendingQR.set(accountId, qr);
});

whatsapp.on('ready', async ({ accountId, phone }) => {
  pendingQR.delete(accountId);
  await WhatsappAccount.update(
    { status: 'connected', phone: phone || null },
    { where: { id: accountId } }
  ).catch(() => {});
});

whatsapp.on('message.received', async ({ accountId, from, text }) => {
  const account = await WhatsappAccount.findByPk(accountId).catch(() => null);
  if (!account) return;
  const removed = await optout.handleIncoming(account.user_id, from, text).catch(() => false);
  if (removed) console.log(`[Optout] via conta ${account.label}: ${from} saiu da lista`);
});

whatsapp.on('disconnected', async ({ accountId }) => {
  await WhatsappAccount.update(
    { status: 'disconnected' },
    { where: { id: accountId } }
  ).catch(() => {});
});

async function list(req, res) {
  const accounts = await WhatsappAccount.findAll({
    where: { user_id: req.user.id },
    order: [['created_at', 'ASC']],
  });
  // Sincroniza status em memória
  const data = accounts.map((a) => ({
    ...a.toJSON(),
    status: whatsapp.getStatus(a.id) === 'connected' ? 'connected'
          : whatsapp.getStatus(a.id) === 'connecting' ? 'connecting'
          : 'disconnected',
  }));
  res.json(data);
}

async function create(req, res) {
  const { label = 'Novo número' } = req.body;
  const account = await WhatsappAccount.create({
    user_id: req.user.id,
    label,
    status: 'connecting',
  });
  res.status(201).json(account);
}

async function updateLabel(req, res) {
  const account = await WhatsappAccount.findOne({ where: { id: req.params.id, user_id: req.user.id } });
  if (!account) return res.status(404).json({ error: 'Conta não encontrada' });
  await account.update({ label: req.body.label });
  res.json(account);
}

async function getQR(req, res) {
  const account = await WhatsappAccount.findOne({ where: { id: req.params.id, user_id: req.user.id } });
  if (!account) return res.status(404).json({ error: 'Conta não encontrada' });

  if (whatsapp.getStatus(account.id) === 'connected') {
    return res.json({ status: 'connected' });
  }

  await whatsapp.connect(account.id);
  await account.update({ status: 'connecting' });

  const qr = await new Promise((resolve) => {
    if (pendingQR.has(account.id)) return resolve(pendingQR.get(account.id));
    const timeout = setTimeout(() => resolve(null), 15_000);
    whatsapp.once('qr', ({ accountId, qr: q }) => {
      if (accountId === account.id) { clearTimeout(timeout); resolve(q); }
    });
  });

  if (!qr) return res.status(202).json({ status: 'connecting', message: 'Aguardando QR code...' });

  const qrImage = await QRCode.toDataURL(qr);
  res.json({ status: 'qr', qr: qrImage });
}

async function remove(req, res) {
  const account = await WhatsappAccount.findOne({ where: { id: req.params.id, user_id: req.user.id } });
  if (!account) return res.status(404).json({ error: 'Conta não encontrada' });
  await whatsapp.disconnect(account.id);
  await account.destroy();
  res.status(204).send();
}

module.exports = { list, create, updateLabel, getQR, remove };
