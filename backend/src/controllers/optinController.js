const { User, Contact } = require('../models');

function normalizePhone(phone) {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

async function getOptinInfo(req, res) {
  try {
    const user = await User.findByPk(req.params.userId, { attributes: ['id', 'name'] });
    if (!user) return res.status(404).json({ error: 'Link inválido ou expirado' });
    res.json({ userName: user.name });
  } catch (e) {
    res.status(500).json({ error: 'Erro interno' });
  }
}

async function submitOptin(req, res) {
  try {
    const { userId } = req.params;
    const { name, phone } = req.body;

    if (!name || !phone) return res.status(400).json({ error: 'Nome e telefone obrigatórios' });

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'Link inválido ou expirado' });

    const normalizedPhone = normalizePhone(phone);
    if (normalizedPhone.length < 12) return res.status(400).json({ error: 'Telefone inválido. Informe DDD + número.' });

    const existing = await Contact.findOne({ where: { user_id: userId, phone: normalizedPhone } });

    if (existing) {
      await existing.update({
        name: name.trim(),
        opt_out: false,
        consent_source: 'optin_form',
        consented_at: new Date(),
      });
    } else {
      await Contact.create({
        user_id: userId,
        name: name.trim(),
        phone: normalizedPhone,
        consent_source: 'optin_form',
        consented_at: new Date(),
        opt_out: false,
      });
    }

    res.json({ success: true });
  } catch (e) {
    console.error('[Optin]', e);
    res.status(500).json({ error: 'Erro ao registrar. Tente novamente.' });
  }
}

module.exports = { getOptinInfo, submitOptin };
