const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const desktopService = require('../services/desktopService');

// Cache latest GitHub release version for 5 min
let _latestVersionCache = { value: '0.0.0', at: 0 };
async function getLatestVersion() {
  if (Date.now() - _latestVersionCache.at < 300_000) return _latestVersionCache.value;
  try {
    const res = await fetch('https://api.github.com/repos/clicasenderzap-wq/claudezap/releases/latest', {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'claudezap-backend' },
    });
    if (res.ok) {
      const data = await res.json();
      const version = data.tag_name?.replace(/^v/, '') || '0.0.0';
      _latestVersionCache = { value: version, at: Date.now() };
    } else {
      _latestVersionCache.at = Date.now();
    }
  } catch {
    _latestVersionCache.at = Date.now();
  }
  return _latestVersionCache.value;
}

function semverLt(a, b) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) < (pb[i] || 0)) return true;
    if ((pa[i] || 0) > (pb[i] || 0)) return false;
  }
  return false;
}

/**
 * Attaches the desktop WebSocket server to the HTTP server.
 * Called once from app.js after app.listen().
 *
 * Protocol:
 *   Client connects to:  ws(s)://host/api/desktop/ws?token=JWT&deviceId=UUID
 *   Server sends first:  { type: 'account_list', accounts: [...] }
 *   Then bidirectional command/event messages.
 */
function setupDesktopWS(httpServer) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (!url.pathname.startsWith('/api/desktop/ws')) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', async (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    const deviceId = url.searchParams.get('deviceId') || 'unknown';
    const appVersion = url.searchParams.get('version') || '0.0.0';

    // Buffer messages immediately — before any async ops — so events like 'ready'
    // fired by a fast WhatsApp reconnection are never dropped during the auth window.
    let userId = null;
    const msgQueue = [];
    ws.on('message', (data) => {
      if (userId) desktopService.handleMessage(userId, data);
      else msgQueue.push(data);
    });

    // Version check — block if not on latest release
    const latestVersion = await getLatestVersion();
    if (semverLt(appVersion, latestVersion)) {
      ws.close(1008, `update_required:${latestVersion}`);
      return;
    }

    // Authenticate
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      userId = payload.sub;

      // Reject stale desktop JWTs if a newer desktop login happened
      if (payload.st && payload.src === 'desktop') {
        const { User } = require('../models');
        const user = await User.findByPk(userId, { attributes: ['session_token_desktop'] });
        if (user?.session_token_desktop && user.session_token_desktop !== payload.st) {
          ws.close(1008, 'Sessão inválida. Faça login novamente no app.');
          return;
        }
      }
    } catch {
      ws.close(1008, 'Token inválido');
      return;
    }

    // Check subscription — only active/trial users can connect desktop app
    try {
      const { User } = require('../models');
      const user = await User.findByPk(userId, { attributes: ['id', 'status', 'trial_ends_at'] });
      if (!user) { ws.close(1008, 'Usuário não encontrado'); return; }
      const isActive = user.status === 'active' || user.status === 'trial';
      const trialValid = user.status === 'trial' && user.trial_ends_at && new Date(user.trial_ends_at) > new Date();
      if (!isActive && !trialValid && user.status !== 'active') {
        ws.close(1008, 'Assinatura inativa. Acesse clicaai.ia.br para assinar.');
        return;
      }
    } catch (e) {
      console.error('[Desktop WS] erro ao verificar usuário:', e.message);
    }

    // Register (kicks previous session for same user)
    desktopService.register(userId, deviceId, ws);

    // Flush any messages that arrived during the auth window
    for (const data of msgQueue) desktopService.handleMessage(userId, data);
    msgQueue.length = 0;

    // Heartbeat ping every 30s to keep connection alive through proxies
    const ping = setInterval(() => {
      if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'ping' }));
    }, 30_000);
    ws.on('close', () => clearInterval(ping));

    // Send account list so the app knows which accounts to reconnect
    try {
      await desktopService.pushAccountList(userId);
    } catch (e) {
      console.error('[Desktop WS] erro ao enviar account_list:', e.message);
    }
  });

  console.log('[Desktop] WebSocket server iniciado');
}

module.exports = { setupDesktopWS };
