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
    sender_email: user.sender_email || null,
    sender_email_verified: user.sender_email_verified || false,
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
    console.error('[Register]', err.message, err.stack);
    res.status(500).json({ error: 'Erro interno: ' + err.message });
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
    const baseFields = { login_failed_count: 0, login_locked_until: null };
    // Try to update session_token; if column doesn't exist yet (pending migration), skip gracefully
    try {
      const updateFields = { ...baseFields };
      if (source === 'desktop') {
        updateFields.session_token_desktop = sessionToken;
      } else {
        updateFields.session_token = sessionToken;
      }
      await user.update(updateFields);
    } catch (colErr) {
      console.error('[Login] session_token update falhou (coluna pode não existir):', colErr.message);
      // Fallback: update only safe fields
      await user.update(baseFields);
    }

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
  } catch (err) {
    console.error('[Login] erro inesperado:', err.message, err.stack);
    res.status(500).json({ error: 'Erro interno: ' + err.message });
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

async function getSenderEmail(req, res) {
  const user = await User.findByPk(req.user.id, {
    attributes: ['sender_email', 'sender_email_verified'],
  });
  res.json({
    sender_email: user.sender_email || null,
    sender_email_verified: user.sender_email_verified || false,
  });
}

async function setSenderEmail(req, res) {
  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(422).json({ error: 'Email inválido' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  await User.update(
    { sender_email: email.toLowerCase().trim(), sender_email_verified: false, sender_email_token: token },
    { where: { id: req.user.id } }
  );

  const user = await User.findByPk(req.user.id, { attributes: ['name', 'email'] });
  emailSvc.sendSenderVerificationEmail(user, email.toLowerCase().trim(), token).catch((e) =>
    console.error('[SetSenderEmail] Falha ao enviar verificação:', e.message)
  );

  res.json({ ok: true, message: 'Email de verificação enviado. Clique no link recebido para confirmar.' });
}

async function verifySenderEmail(req, res) {
  const { token } = req.query;
  if (!token) return res.status(400).send(senderVerificationHtml(false));

  const user = await User.findOne({ where: { sender_email_token: token } });
  if (!user) return res.status(400).send(senderVerificationHtml(false));

  await user.update({ sender_email_verified: true, sender_email_token: null });
  res.send(senderVerificationHtml(true, user.sender_email));
}

function senderVerificationHtml(success, email) {
  const color = success ? '#16a34a' : '#dc2626';
  const title = success ? 'Email de remetente verificado!' : 'Link inválido ou expirado';
  const msg = success
    ? `O email <strong>${email}</strong> foi verificado com sucesso.<br>Você já pode enviar campanhas de email.`
    : 'Este link de verificação é inválido ou já foi utilizado.<br>Acesse a plataforma e solicite um novo link.';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family:sans-serif;background:#f9fafb;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">
<div style="background:#fff;border-radius:12px;padding:40px;max-width:420px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08)">
  <div style="font-size:48px;margin-bottom:16px">${success ? '✅' : '❌'}</div>
  <h1 style="color:${color};font-size:20px;margin:0 0 12px">${title}</h1>
  <p style="color:#374151;font-size:14px;margin:0 0 24px;line-height:1.6">${msg}</p>
  <a href="${process.env.APP_URL || 'https://email.clicaai.ia.br'}/email/configuracoes"
     style="display:inline-block;background:${color};color:#fff;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px">
    ${success ? 'Ir para a plataforma' : 'Voltar à plataforma'}
  </a>
</div></body></html>`;
}

module.exports = { register, verifyEmail, resendVerification, login, me, getSenderEmail, setSenderEmail, verifySenderEmail };
