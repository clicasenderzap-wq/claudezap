const api = window.claudezap;

// ── Screens ───────────────────────────────────────────────────────────────────

function show(id) {
  document.querySelectorAll('.screen').forEach((s) => (s.style.display = 'none'));
  document.getElementById(id).style.display = 'flex';
}

// ── QR modal ──────────────────────────────────────────────────────────────────

let pendingQRs = {}; // accountId → qrDataUrl

document.getElementById('btn-close-qr').addEventListener('click', () => {
  document.getElementById('qr-modal').style.display = 'none';
});

function showQR(accountId, qrDataUrl) {
  pendingQRs[accountId] = qrDataUrl;
  const container = document.getElementById('qr-container');
  container.innerHTML = '';
  const img = document.createElement('img');
  img.src = qrDataUrl;
  img.style.width = '200px';
  img.style.height = '200px';
  container.appendChild(img);
  document.getElementById('qr-modal').style.display = 'flex';
}

// ── Account list ──────────────────────────────────────────────────────────────

function renderAccounts(accounts) {
  const list = document.getElementById('accounts-list');
  if (!accounts || accounts.length === 0) {
    list.innerHTML = '<div class="empty-state">Nenhuma conta configurada.<br>Acesse a plataforma web para adicionar.</div>';
    return;
  }

  list.innerHTML = '';
  for (const acc of accounts) {
    const card = document.createElement('div');
    card.className = 'account-card';
    card.dataset.id = acc.id;

    const statusText = acc.status === 'connected' ? 'Conectado' :
                       acc.status === 'connecting' ? 'Conectando...' : 'Desconectado';
    const statusClass = `status-${acc.status || 'disconnected'}`;

    const hasQR = pendingQRs[acc.id];
    const actionBtn = acc.status === 'disconnected'
      ? `<button class="account-action" onclick="connectAccount('${acc.id}')">Conectar</button>`
      : acc.status === 'connecting' && hasQR
      ? `<button class="account-action qr-btn" onclick="openQR('${acc.id}')">Ver QR</button>`
      : '';

    card.innerHTML = `
      <div class="account-icon">📱</div>
      <div class="account-info">
        <div class="account-label">${escHtml(acc.label || 'Conta')}</div>
        ${acc.phone ? `<div class="account-phone">+${escHtml(acc.phone)}</div>` : ''}
        <div class="account-status ${statusClass}">${statusText}</div>
      </div>
      ${actionBtn}
    `;
    list.appendChild(card);
  }
}

function escHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function connectAccount(accountId) {
  api.connectAccount(accountId).catch(console.error);
}

function openQR(accountId) {
  if (pendingQRs[accountId]) {
    const container = document.getElementById('qr-container');
    container.innerHTML = '';
    const img = document.createElement('img');
    img.src = pendingQRs[accountId];
    img.style.width = '200px';
    img.style.height = '200px';
    container.appendChild(img);
    document.getElementById('qr-modal').style.display = 'flex';
  }
}

// ── Login ─────────────────────────────────────────────────────────────────────

document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('input-email').value.trim();
  const password = document.getElementById('input-password').value;
  const btn = document.getElementById('btn-login');
  const errEl = document.getElementById('login-error');

  btn.disabled = true;
  btn.textContent = 'Entrando...';
  errEl.style.display = 'none';

  const result = await api.login(email, password);

  btn.disabled = false;
  btn.textContent = 'Entrar';

  if (result.error) {
    errEl.textContent = result.error;
    errEl.style.display = 'block';
    return;
  }

  show('screen-main');
  document.getElementById('user-name').textContent = result.user?.name || email;
});

// ── Logout ───────────────────────────────────────────────────────────────────

document.getElementById('btn-logout').addEventListener('click', async () => {
  await api.logout();
  pendingQRs = {};
  show('screen-login');
  document.getElementById('input-password').value = '';
});

// ── Kicked ───────────────────────────────────────────────────────────────────

document.getElementById('btn-relogin').addEventListener('click', () => {
  show('screen-login');
  document.getElementById('input-password').value = '';
});

// ── Connection status ─────────────────────────────────────────────────────────

function setServerStatus(connected) {
  const dot = document.getElementById('status-dot');
  const label = document.getElementById('status-label');
  dot.className = `dot ${connected ? 'dot-connected' : 'dot-connecting'}`;
  label.textContent = connected ? 'Conectado ao servidor' : 'Reconectando ao servidor...';
}

// ── Update banner ─────────────────────────────────────────────────────────────

document.getElementById('btn-install-update').addEventListener('click', () => {
  api.installUpdate();
});

// ── Event listeners ───────────────────────────────────────────────────────────

api.onAccountsUpdate((accounts) => {
  renderAccounts(accounts);
});

api.onQR(({ accountId, qr }) => {
  pendingQRs[accountId] = qr;
  // Refresh cards to show "Ver QR" button; auto-open modal so user can scan
  api.getAccounts().then((accounts) => {
    renderAccounts(accounts);
    showQR(accountId, qr);
  });
});

api.onConnectionStatus(({ connected }) => {
  setServerStatus(connected);
});

api.onSessionKicked(({ reason }) => {
  document.getElementById('kicked-reason').textContent = reason || 'Sessão encerrada.';
  show('screen-kicked');
});

api.onUpdateAvailable(({ version }) => {
  document.getElementById('update-text').textContent = `Baixando atualização ${version}... 0%`;
  document.getElementById('update-banner').style.display = 'flex';
  document.getElementById('btn-install-update').style.display = 'none';
});

api.onUpdateProgress(({ percent }) => {
  document.getElementById('update-text').textContent = `Baixando atualização... ${percent}%`;
});

api.onUpdateReady(() => {
  // Mandatory dialog is shown by main.js — nothing to do here
});

// Platform buttons
document.getElementById('btn-open-platform').addEventListener('click', async () => {
  const token = await api.getToken().catch(() => null);
  const url = token
    ? `https://clicaai.ia.br/auto-login?t=${encodeURIComponent(token)}`
    : 'https://clicaai.ia.br/login';
  window.open(url);
});

document.getElementById('btn-open-register').addEventListener('click', () => {
  window.open('https://clicaai.ia.br/register');
});

// ── Init ──────────────────────────────────────────────────────────────────────

(async () => {
  const [session, version] = await Promise.all([
    api.getSession(),
    api.getVersion().catch(() => null),
  ]);

  if (version) {
    document.getElementById('app-version').textContent = `v${version}`;
  }

  if (session.loggedIn) {
    show('screen-main');
    document.getElementById('user-name').textContent = session.user?.name || session.user?.email || '';
    const accounts = await api.getAccounts();
    renderAccounts(accounts);
  } else {
    show('screen-login');
  }
})();
