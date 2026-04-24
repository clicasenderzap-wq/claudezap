const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('claudezap', {
  // Auth
  login: (email, password) => ipcRenderer.invoke('auth:login', { email, password }),
  logout: () => ipcRenderer.invoke('auth:logout'),
  getSession: () => ipcRenderer.invoke('auth:getSession'),

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
    ipcRenderer.on('update:available', (_, data) => cb(data));
    return () => ipcRenderer.removeAllListeners('update:available');
  },
  onUpdateReady: (cb) => {
    ipcRenderer.on('update:ready', () => cb());
    return () => ipcRenderer.removeAllListeners('update:ready');
  },
  installUpdate: () => ipcRenderer.invoke('update:install'),
});
