const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const store = require('./store');
const WAManager = require('./waManager');
const WSClient = require('./wsClient');

const API_URL = 'https://claudezap-api.onrender.com';

let mainWindow = null;
let tray = null;
let waManager = null;
let wsClient = null;
let accounts = []; // local cache of account list from server

// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  createWindow();
  createTray();
  setupUpdater();

  // If already logged in, connect immediately
  if (store.getToken()) {
    initConnection();
  }
});

app.on('window-all-closed', (e) => {
  // Don't quit when window is closed — stay in tray
  e.preventDefault();
});

app.on('before-quit', async () => {
  if (waManager) await waManager.disconnectAll().catch(() => {});
  if (wsClient) wsClient.destroy();
});

// ── Main window ────────────────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 640,
    resizable: false,
    title: 'Clica Aí',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Minimize to tray instead of closing
  mainWindow.on('close', (e) => {
    e.preventDefault();
    mainWindow.hide();
  });
}

// ── System tray ───────────────────────────────────────────────────────────────

function createTray() {
  const iconPath = path.join(__dirname, '..', 'assets', 'tray.png');
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
  tray.setToolTip('Clica Aí');
  updateTrayMenu();

  tray.on('double-click', () => {
    mainWindow?.show();
  });
}

function updateTrayMenu() {
  const connected = accounts.filter((a) => a.status === 'connected').length;
  const menu = Menu.buildFromTemplate([
    { label: `Clica Aí`, enabled: false },
    { label: `${connected}/${accounts.length} conta(s) conectada(s)`, enabled: false },
    { type: 'separator' },
    { label: 'Abrir', click: () => mainWindow?.show() },
    { type: 'separator' },
    { label: 'Sair', click: () => { app.exit(0); } },
  ]);
  tray.setContextMenu(menu);
}

// ── Auto-updater ──────────────────────────────────────────────────────────────

function setupUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    console.log('[Updater] nova versão disponível:', info.version);
    mainWindow?.webContents.send('update:available', { version: info.version });
  });

  autoUpdater.on('update-downloaded', () => {
    console.log('[Updater] atualização baixada — aguardando instalação');
    mainWindow?.webContents.send('update:ready');
    // Show native dialog asking to install
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Atualização disponível',
      message: 'Uma nova versão do Clica Aí foi baixada.',
      detail: 'Deseja instalar agora? O app será reiniciado.',
      buttons: ['Instalar agora', 'Mais tarde'],
      defaultId: 0,
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall(false, true);
    });
  });

  autoUpdater.on('error', (e) => {
    console.error('[Updater] erro:', e.message);
  });

  // Check on startup (delay 5s to not slow down first render)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 5000);

  // Check every 4 hours
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 4 * 60 * 60 * 1000);
}

// ── Backend connection ────────────────────────────────────────────────────────

function initConnection() {
  const token = store.getToken();
  if (!token) return;

  const deviceId = store.getDeviceId();

  waManager = new WAManager(app.getPath('userData'));
  wsClient = new WSClient(API_URL, token, deviceId);

  // ── WS events → WAManager commands ─────────────────────────────────────────
  wsClient.on('message', async (msg) => {
    if (!msg.type) return;

    if (msg.type === 'pong') return;

    if (msg.type === 'ping') {
      wsClient.send({ type: 'pong' });
      return;
    }

    if (msg.type === 'account_list') {
      accounts = msg.accounts || [];
      updateTrayMenu();
      mainWindow?.webContents.send('accounts:updated', accounts);
      // Auto-reconnect previously connected accounts
      for (const acc of accounts) {
        if (acc.status === 'connected') {
          console.log(`[App] reconectando conta: ${acc.label}`);
          waManager.connect(acc.id).catch((e) =>
            console.error(`[App] falha ao reconectar ${acc.id}:`, e.message)
          );
        }
      }
      return;
    }

    if (msg.type === 'session_kicked') {
      mainWindow?.webContents.send('session:kicked', { reason: msg.reason });
      mainWindow?.show();
      store.clearToken();
      teardownConnection();
      return;
    }

    // Commands from backend (correlationId = expects a result reply)
    const { correlationId, accountId } = msg;

    const reply = (data) => {
      if (correlationId) wsClient.send({ type: 'result', correlationId, ...data });
    };

    try {
      switch (msg.type) {
        case 'connect':
          await waManager.connect(accountId);
          reply({ ok: true });
          break;

        case 'disconnect':
          await waManager.disconnect(accountId);
          reply({ ok: true });
          break;

        case 'send_text':
          const msgId = await waManager.sendText(accountId, msg.phone, msg.text);
          reply({ ok: true, messageId: msgId });
          break;

        case 'send_media':
          const mediaId = await waManager.sendMedia(accountId, msg.phone, msg.mediaUrl, msg.mediaType, msg.fileName, msg.caption);
          reply({ ok: true, messageId: mediaId });
          break;

        default:
          reply({ error: `Comando desconhecido: ${msg.type}` });
      }
    } catch (e) {
      console.error(`[App] erro ao executar ${msg.type}:`, e.message);
      reply({ error: e.message });
    }
  });

  wsClient.on('connected', () => {
    mainWindow?.webContents.send('connection:status', { connected: true });
  });

  wsClient.on('disconnected', () => {
    mainWindow?.webContents.send('connection:status', { connected: false });
  });

  wsClient.on('kicked', (reason) => {
    mainWindow?.webContents.send('session:kicked', { reason });
    mainWindow?.show();
    store.clearToken();
    teardownConnection();
  });

  // ── WAManager events → backend ───────────────────────────────────────────────

  waManager.on('qr', ({ accountId, qr }) => {
    wsClient.send({ type: 'qr', accountId, qr });
    // Also show QR in the renderer window
    mainWindow?.webContents.send('qr', { accountId, qr });
    // Update local account status
    updateAccountStatus(accountId, 'connecting');
  });

  waManager.on('ready', ({ accountId, phone }) => {
    wsClient.send({ type: 'ready', accountId, phone });
    updateAccountStatus(accountId, 'connected', phone);
  });

  waManager.on('disconnected', ({ accountId, code }) => {
    wsClient.send({ type: 'disconnected', accountId, code });
    updateAccountStatus(accountId, 'disconnected');
  });

  waManager.on('message', ({ accountId, from, text, isSync }) => {
    wsClient.send({ type: 'message', accountId, from, text, isSync });
  });

  wsClient.connect();
}

function updateAccountStatus(accountId, status, phone = undefined) {
  accounts = accounts.map((a) => {
    if (a.id === accountId) return { ...a, status, ...(phone !== undefined ? { phone } : {}) };
    return a;
  });
  updateTrayMenu();
  mainWindow?.webContents.send('accounts:updated', accounts);
}

function teardownConnection() {
  wsClient?.destroy();
  waManager?.disconnectAll().catch(() => {});
  wsClient = null;
  waManager = null;
  accounts = [];
  updateTrayMenu();
  mainWindow?.webContents.send('accounts:updated', []);
}

// ── IPC handlers ──────────────────────────────────────────────────────────────

ipcMain.handle('auth:login', async (_, { email, password }) => {
  try {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error || 'Falha no login' };

    store.setToken(data.token);
    store.setUserInfo(email, data.user?.name || email);
    initConnection();
    return { ok: true, user: data.user };
  } catch (e) {
    return { error: 'Erro de conexão. Verifique sua internet.' };
  }
});

ipcMain.handle('auth:logout', async () => {
  store.clearToken();
  teardownConnection();
  return { ok: true };
});

ipcMain.handle('auth:getSession', () => {
  const token = store.getToken();
  if (!token) return { loggedIn: false };
  const user = store.getUserInfo();
  return { loggedIn: true, user };
});

ipcMain.handle('accounts:get', () => accounts);

ipcMain.handle('accounts:connect', async (_, accountId) => {
  if (!waManager) return { error: 'Não conectado ao servidor' };
  try {
    await waManager.connect(accountId);
    return { ok: true };
  } catch (e) {
    return { error: e.message };
  }
});

ipcMain.handle('accounts:disconnect', async (_, accountId) => {
  if (!waManager) return { error: 'Não conectado ao servidor' };
  try {
    await waManager.disconnect(accountId);
    return { ok: true };
  } catch (e) {
    return { error: e.message };
  }
});

ipcMain.handle('update:install', () => {
  autoUpdater.quitAndInstall(false, true);
});
