const QRCode = require('qrcode');
const whatsapp = require('../services/whatsappService');
const { WhatsappAccount, IncomingMessage, Contact } = require('../models');
const optout = require('../services/optoutService');
const bot = require('../services/botService');

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

whatsapp.on('message.received', async ({ accountId, from, text, isSync }) => {
  const account = await WhatsappAccount.findByPk(accountId).catch(() => null);
  if (!account) return;

  const isOptout = await optout.handleIncoming(account.user_id, from, text).catch(() => false);
  if (isOptout) {
    console.log(`[Optout] via conta ${account.label}: ${from} saiu da lista`);
  }

  // Salva mensagem recebida para a caixa de entrada
  try {
    const digits = String(from).replace(/\D/g, '');
    const variants = [digits, digits.startsWith('55') ? digits.slice(2) : `55${digits}`];
    const contact = await Contact.findOne({
      where: { user_id: account.user_id, phone: variants },
    }).catch(() => null);

    await IncomingMessage.create({
      account_id: accountId,
      user_id: account.user_id,
      from_phone: from,
      from_name: contact?.name || null,
      text,
      is_optout: isOptout,
    });
  } catch { /* não deve parar o fluxo */ }

  if (isOptout) return;

  // Mensagens sincronizadas (perdidas durante desconexão) não ativam o bot
  if (isSync) return;

  bot.handleMessage(accountId, from, text).catch((e) =>
    console.error('[Bot] erro ao processar mensagem:', e.message)
  );
});

whatsapp.on('disconnected', async ({ accountId }) => {
  pendingQR.delete(accountId); // stale QR must not be shown after disconnect
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
  const data = accounts.map((a) => a.toJSON());
  res.json(data);
}

async function create(req, res) {
  const { getLimit } = require('../middleware/planGuard');
  const { WhatsappAccount: WA } = require('../models');
  const count = await WA.count({ where: { user_id: req.user.id } });
  const max = getLimit(req.user.plan, 'whatsapp_accounts');
  if (count >= max) {
    return res.status(403).json({ error: `Limite do seu plano atingido (${max} números). Faça upgrade para continuar.` });
  }

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

  if (account.status === 'connected') return res.json({ status: 'connected' });

  await whatsapp.connect(account.id);
  await account.update({ status: 'connecting' });

  const qr = await new Promise((resolve) => {
    const cached = whatsapp.getPendingQR(account.id);
    if (cached) return resolve(cached);
    const onQR = ({ accountId: aid, qr: q }) => {
      if (aid !== account.id) return;
      whatsapp.off('qr', onQR);
      clearTimeout(timer);
      resolve(q);
    };
    const timer = setTimeout(() => { whatsapp.off('qr', onQR); resolve(null); }, 30_000);
    whatsapp.on('qr', onQR);
  });

  if (!qr) return res.status(202).json({ status: 'connecting', message: 'Aguardando QR code...' });

  const qrImage = await QRCode.toDataURL(qr);
  res.json({ status: 'qr', qr: qrImage });
}

async function requestPairingCode(req, res) {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Informe o número de telefone da conta WhatsApp (com DDD e código do país)' });

  const account = await WhatsappAccount.findOne({ where: { id: req.params.id, user_id: req.user.id } });
  if (!account) return res.status(404).json({ error: 'Conta não encontrada' });

  if (account.status === 'connected') return res.json({ status: 'connected' });

  await account.update({ status: 'connecting' });
  const code = await whatsapp.requestPairingCode(account.id, phone);
  res.json({ code });
}

async function remove(req, res) {
  const account = await WhatsappAccount.findOne({ where: { id: req.params.id, user_id: req.user.id } });
  if (!account) return res.status(404).json({ error: 'Conta não encontrada' });
  await whatsapp.disconnect(account.id);
  await account.destroy();
  res.status(204).send();
}

async function inbox(req, res) {
  const { page = 1, limit = 50, account_id, only_optout } = req.query;
  const where = { user_id: req.user.id };
  if (account_id) where.account_id = account_id;
  if (only_optout === 'true') where.is_optout = true;

  const { count, rows } = await IncomingMessage.findAndCountAll({
    where,
    order: [['created_at', 'DESC']],
    limit: Number(limit),
    offset: (Number(page) - 1) * Number(limit),
    include: [{ model: WhatsappAccount, attributes: ['label', 'phone'], as: 'account' }],
  });

  res.json({ total: count, page: Number(page), data: rows });
}

module.exports = { list, create, updateLabel, getQR, requestPairingCode, remove, inbox };
