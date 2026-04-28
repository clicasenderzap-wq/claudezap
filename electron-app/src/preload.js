const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('claudezap', {
  // Auth
  login: (email, password) => ipcRenderer.invoke('auth:login', { email, password }),
  logout: () => ipcRenderer.invoke('auth:logout'),
  getSession: () => ipcRenderer.invoke('auth:getSession'),
  getToken: () => ipcRenderer.invoke('auth:getToken'),

  // Accounts
  getAccounts: () => ipcRenderer.invoke('accounts:get'),
  connectAccount: (accountId) => ipcRenderer.invoke('accounts:connect', accountId),
  disconnectAccount: (accountId) => ipcRenderer.invoke('accounts:disconnect', accountId),

  // Events from main process → renderer
  onAccountsUpdate: (cb) => {
    ipcRenderer.on('accounts:updated', (_, data) => cb(data));
    return () => ipcRenderer.removeAllListeners('accounts:updated');
  },
  onQR: (cb) => {
    ipcRenderer.on('qr', (_, data) => cb(data));
    return () => ipcRenderer.removeAllListeners('qr');
  },
  onConnectionStatus: (cb) => {
    ipcRenderer.on('connection:status', (_, data) => cb(data));
    return () => ipcRenderer.removeAllListeners('connection:status');
  },
  onSessionKicked: (cb) => {
    ipcRenderer.on('session:kicked', (_, data) => cb(data));
    return () => ipcRenderer.removeAllListeners('session:kicked');
  },
  onUpdateAvailable: (cb) => {
    ipcRenderer.on('update:downloading', (_, data) => cb(data));
    return () => ipcRenderer.removeAllListeners('update:downloading');
  },
  onUpdateProgress: (cb) => {
    ipcRenderer.on('update:progress', (_, data) => cb(data));
    return () => ipcRenderer.removeAllListeners('update:progress');
  },
  onUpdateReady: (cb) => {
    ipcRenderer.on('update:ready', () => cb());
    return () => ipcRenderer.removeAllListeners('update:ready');
  },
  installUpdate: () => ipcRenderer.invoke('update:install'),
  getVersion: () => ipcRenderer.invoke('app:version'),
});
