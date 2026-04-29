const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const { User, AuditLog } = require('../models');
const emailSvc = require('../services/emailService');

function signToken(userId, sessionToken, source = 'web') {
  // Desktop tokens live longer because users don't log in frequently;
  // session_token_desktop invalidates them on new login anyway.
  const expiresIn = source === 'desktop'
    ? (process.env.JWT_EXPIRES_IN_DESKTOP || '30d')
    : (process.env.JWT_EXPIRES_IN || '7d');
  return jwt.sign(
    { sub: userId, ...(sessionToken && { st: sessionToken, src: source }) },
    process.env.JWT_SECRET,
    { expiresIn }
  );
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
    if (existing) {
      // Se o email ainda não foi verificado, reenvia o link em vez de bloquear
      if (existing.email_verified === false) {
        const new_token = crypto.randomBytes(32).toString('hex');
        await existing.update({ email_verification_token: new_token });
        emailSvc.sendVerificationEmail(existing, new_token).catch((e) =>
          console.error('[Register] Falha ao reenviar verificação:', e.message)
        );
        return res.status(200).json({
          message: 'Cadastro já existe mas o email ainda não foi confirmado. Reenviamos o link de verificação.',
        });
      }
      return res.status(409).json({ error: 'Email já cadastrado' });
    }

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

  const trial_ends_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await user.update({
    email_verified: true,
    email_verification_token: null,
    status: 'trial',
    trial_ends_at,
  });
  await audit(user.id, 'email_verified', req);

  emailSvc.sendApprovalEmail(user).catch((e) => console.error('[VerifyEmail] Falha ao enviar email de boas-vindas:', e.message));

  res.json({ message: 'Email confirmado! Você já pode fazer login e usar a plataforma. Bom proveito!' });
}

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MINUTES = 30;

async function login(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  const { email, password } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

    // Conta bloqueada por tentativas excessivas?
    if (user.login_locked_until && new Date(user.login_locked_until) > new Date()) {
      const minutesLeft = Math.ceil((new Date(user.login_locked_until) - Date.now()) / 60000);
      await audit(user.id, 'login_blocked', req, { reason: 'account_locked', minutes_left: minutesLeft });
      return res.status(429).json({
        error: `Conta bloqueada por tentativas excessivas. Tente novamente em ${minutesLeft} minuto(s).`,
        code: 'ACCOUNT_LOCKED',
      });
    }

    const valid = await user.verifyPassword(password);
    if (!valid) {
      const newCount = (user.login_failed_count || 0) + 1;
      const shouldLock = newCount >= LOGIN_MAX_ATTEMPTS;
      await user.update({
        login_failed_count: shouldLock ? 0 : newCount,
        login_locked_until: shouldLock
          ? new Date(Date.now() + LOGIN_LOCKOUT_MINUTES * 60000)
          : null,
      });
      await audit(user.id, 'login_failed', req, { reason: 'wrong_password', attempt: newCount });
      if (shouldLock) {
        return res.status(429).json({
          error: `Conta bloqueada por ${LOGIN_LOCKOUT_MINUTES} minutos após ${LOGIN_MAX_ATTEMPTS} tentativas incorretas.`,
          code: 'ACCOUNT_LOCKED',
        });
      }
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Login bem-sucedido — gera novo session_token para o tipo de origem (web ou desktop)
    const source = req.body.source === 'desktop' ? 'desktop' : 'web';
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const updateFields = { login_failed_count: 0, login_locked_until: null };
    if (source === 'desktop') {
      updateFields.session_token_desktop = sessionToken;
    } else {
      updateFields.session_token = sessionToken;
    }
    await user.update(updateFields);

    // null = legado (pré-verificação), passa; false = aguardando verificação
    if (user.email_verified === false) {
      return res.status(403).json({
        error: 'Confirme seu email antes de fazer login. Verifique sua caixa de entrada.',
        code: 'EMAIL_UNVERIFIED',
      });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({
        error: 'Conta inativa. Entre em contato com o suporte.',
        code: 'INACTIVE',
      });
    }

    await audit(user.id, 'login', req);
    const token = signToken(user.id, sessionToken, source);
    res.json({ token, user: safeUser(user) });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
}

async function resendVerification(req, res) {
  const { email } = req.body;
  if (!email) return res.status(422).json({ error: 'Email obrigatório' });

  const user = await User.findOne({ where: { email } });
  // Resposta genérica para não vazar se o email existe ou não
  if (!user || user.email_verified !== false) {
    return res.json({ message: 'Se o email existir e não estiver verificado, o link foi reenviado.' });
  }

  const new_token = crypto.randomBytes(32).toString('hex');
  await user.update({ email_verification_token: new_token });
  emailSvc.sendVerificationEmail(user, new_token).catch((e) =>
    console.error('[ResendVerification] Falha:', e.message)
  );

  res.json({ message: 'Link de verificação reenviado! Verifique sua caixa de entrada (e o spam).' });
}

async function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { register, verifyEmail, resendVerification, login, me };
