const QRCode = require('qrcode');
const whatsapp = require('../services/whatsappService');

const pendingQR = new Map();

whatsapp.on('qr', ({ userId, qr }) => {
  pendingQR.set(userId, qr);
});

whatsapp.on('ready', ({ userId }) => {
  pendingQR.delete(userId);
});

async function getQR(req, res) {
  const userId = req.user.id;

  if (whatsapp.getStatus(userId) === 'connected') {
    return res.json({ status: 'connected' });
  }

  await whatsapp.connect(userId);

  // Wait up to 15s for QR
  const qr = await new Promise((resolve) => {
    if (pendingQR.has(userId)) return resolve(pendingQR.get(userId));
    const timeout = setTimeout(() => resolve(null), 15_000);
    whatsapp.once('qr', ({ userId: id, qr: q }) => {
      if (id === userId) { clearTimeout(timeout); resolve(q); }
    });
  });

  if (!qr) return res.status(202).json({ status: 'connecting', message: 'Aguardando QR code...' });

  const qrImage = await QRCode.toDataURL(qr);
  res.json({ status: 'qr', qr: qrImage });
}

function getStatus(req, res) {
  res.json({ status: whatsapp.getStatus(req.user.id) });
}

async function disconnect(req, res) {
  await whatsapp.disconnect(req.user.id);
  res.json({ message: 'Desconectado' });
}

module.exports = { getQR, getStatus, disconnect };
