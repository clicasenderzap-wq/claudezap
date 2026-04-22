const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const { User, AuditLog } = require('../models');
const emailSvc = require('../services/emailService');

function signToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function safeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    whatsapp: user.whatsapp,
    plan: user.plan,
    status: user.status,
    role: user.role,
    trial_ends_at: user.trial_ends_at,
    email_verified: user.email_verified,
  };
}

async function audit(userId, action, req, metadata = {}) {
  try {
    await AuditLog.create({ user_id: userId, action, ip: req.ip, metadata });
  } catch { /* non-blocking */ }
}

async function register(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  const { name, email, password, whatsapp, accepted_terms } = req.body;

  if (!accepted_terms) {
    return res.status(422).json({ error: 'É obrigatório aceitar os Termos de Uso.' });
  }

  if (name.trim().split(/\s+/).length < 2) {
    return res.status(422).json({ error: 'Informe seu nome completo (nome e sobrenome).' });
  }

  try {
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email já cadastrado' });

    const password_hash = await User.hashPassword(password);
    const verification_token = crypto.randomBytes(32).toString('hex');

    const user = await User.create({
      name: name.trim(),
      email,
      password_hash,
      whatsapp: whatsapp ? whatsapp.replace(/\D/g, '') : null,
      plan: 'starter',
      status: 'pending',
      email_verified: false,
      email_verification_token: verification_token,
      accepted_terms_at: new Date(),
      terms_ip: req.ip,
    });

    emailSvc.sendVerificationEmail(user, verification_token).catch(() => {});
    emailSvc.sendAdminNewUserNotification(user).catch(() => {});

    await audit(user.id, 'register', req, { email });

    res.status(201).json({
      message: 'Cadastro recebido! Verifique seu email para confirmar a conta.',
    });
  } catch (err) {
    console.error('[Register]', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
}

async function verifyEmail(req, res) {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token inválido' });

  const user = await User.findOne({ where: { email_verification_token: token } });
  if (!user) return res.status(400).json({ error: 'Token inválido ou expirado' });

  await user.update({ email_verified: true, email_verification_token: null });
  await audit(user.id, 'email_verified', req);

  res.json({ message: 'Email confirmado! Sua conta está em análise. Você receberá um email assim que o acesso for liberado.' });
}

async function login(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  const { email, password } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

    const valid = await user.verifyPassword(password);
    if (!valid) {
      await audit(user.id, 'login_failed', req, { reason: 'wrong_password' });
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // null = legado (pré-verificação), passa; false = aguardando verificação
    if (user.email_verified === false) {
      return res.status(403).json({
        error: 'Confirme seu email antes de fazer login. Verifique sua caixa de entrada.',
        code: 'EMAIL_UNVERIFIED',
      });
    }

    if (user.status === 'pending') {
      return res.status(403).json({
        error: 'Sua conta está em análise. Você receberá um email quando o acesso for liberado.',
        code: 'PENDING_APPROVAL',
      });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({
        error: 'Conta inativa. Entre em contato com o suporte.',
        code: 'INACTIVE',
      });
    }

    await audit(user.id, 'login', req);
    const token = signToken(user.id);
    res.json({ token, user: safeUser(user) });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
}

async function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { register, verifyEmail, login, me };
