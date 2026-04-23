const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Clica Aí <noreply@clicaai.ia.br>';
const APP_URL = process.env.APP_URL || 'https://clicaai.ia.br';
const ADMIN_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || 'clicasenderzap@gmail.com';

async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY) {
    console.error('[Email] RESEND_API_KEY não configurado — email NÃO enviado para:', to, '| assunto:', subject);
    return;
  }
  console.log('[Email] Enviando para:', to, '| assunto:', subject, '| from:', FROM_EMAIL);
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('[Email] Erro Resend HTTP', res.status, JSON.stringify(body));
    } else {
      console.log('[Email] Enviado com sucesso. ID:', body.id);
    }
  } catch (e) {
    console.error('[Email] Falha na requisição fetch:', e.message);
  }
}

function baseLayout(content) {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f9fafb;margin:0;padding:32px 16px">
<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb">
  <div style="text-align:center;margin-bottom:24px">
    <span style="font-size:22px;font-weight:900;color:#111">Clica <span style="color:#16a34a">Aí</span></span>
  </div>
  ${content}
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
  <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0">Clica Aí — Plataforma de Automação WhatsApp</p>
</div></body></html>`;
}

async function sendVerificationEmail(user, token) {
  const url = `${APP_URL}/verify-email?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: 'Confirme seu email — Clica Aí',
    html: baseLayout(`
      <h2 style="color:#111;font-size:20px;margin:0 0 8px">Olá, ${user.name.split(' ')[0]}!</h2>
      <p style="color:#374151;margin:0 0 24px">Clique no botão abaixo para confirmar seu email e concluir o cadastro.</p>
      <a href="${url}" style="display:block;text-align:center;background:#16a34a;color:#fff;font-weight:700;padding:14px 24px;border-radius:8px;text-decoration:none;font-size:16px">Confirmar email</a>
      <p style="color:#6b7280;font-size:13px;margin:16px 0 0;text-align:center">Este link expira em 24 horas.</p>
      <p style="color:#9ca3af;font-size:12px;margin:8px 0 0;text-align:center">Se não foi você, ignore este email.</p>
    `),
  });
}

async function sendApprovalEmail(user) {
  await sendEmail({
    to: user.email,
    subject: 'Sua conta foi aprovada! — Clica Aí',
    html: baseLayout(`
      <h2 style="color:#111;font-size:20px;margin:0 0 8px">Conta aprovada!</h2>
      <p style="color:#374151;margin:0 0 16px">Olá, <strong>${user.name.split(' ')[0]}</strong>! Sua conta foi aprovada e você já pode acessar a plataforma.</p>
      <p style="color:#374151;margin:0 0 24px">Você tem <strong>7 dias de teste gratuito</strong> para explorar todos os recursos.</p>
      <a href="${APP_URL}/login" style="display:block;text-align:center;background:#16a34a;color:#fff;font-weight:700;padding:14px 24px;border-radius:8px;text-decoration:none;font-size:16px">Acessar agora</a>
    `),
  });
}

async function sendRejectionEmail(user) {
  await sendEmail({
    to: user.email,
    subject: 'Sobre seu cadastro — Clica Aí',
    html: baseLayout(`
      <h2 style="color:#111;font-size:20px;margin:0 0 8px">Olá, ${user.name.split(' ')[0]}</h2>
      <p style="color:#374151;margin:0 0 16px">Infelizmente não conseguimos aprovar seu cadastro desta vez.</p>
      <p style="color:#374151;margin:0">Se acredita que houve um engano, entre em contato pelo WhatsApp: <strong>${ADMIN_EMAIL}</strong></p>
    `),
  });
}

async function sendAdminNewUserNotification(user) {
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `[Clica Aí] Novo cadastro aguardando aprovação — ${user.name}`,
    html: baseLayout(`
      <h2 style="color:#111;font-size:18px;margin:0 0 16px">Novo cadastro para aprovar</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:6px 0;color:#6b7280;width:100px">Nome</td><td style="padding:6px 0;color:#111;font-weight:600">${user.name}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Email</td><td style="padding:6px 0;color:#111">${user.email}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">WhatsApp</td><td style="padding:6px 0;color:#111">${user.whatsapp || '—'}</td></tr>
      </table>
      <a href="${APP_URL}/admin" style="display:inline-block;margin-top:20px;background:#16a34a;color:#fff;font-weight:700;padding:12px 20px;border-radius:8px;text-decoration:none">Aprovar no painel</a>
    `),
  });
}

module.exports = { sendVerificationEmail, sendApprovalEmail, sendRejectionEmail, sendAdminNewUserNotification };
