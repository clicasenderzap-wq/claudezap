const Store = require('electron-store');
const { randomUUID } = require('crypto');

const store = new Store({
  name: 'claudezap-config',
  defaults: {
    deviceId: randomUUID(),
    token: null,
    userEmail: null,
    userName: null,
  },
});

// deviceId is permanent — generated once and never changes
function getDeviceId() {
  return store.get('deviceId');
}

function getToken() {
  return store.get('token');
}

function setToken(token) {
  store.set('token', token);
}

function clearToken() {
  store.delete('token');
  store.delete('userEmail');
  store.delete('userName');
}

function setUserInfo(email, name) {
  store.set('userEmail', email);
  store.set('userName', name);
}

function getUserInfo() {
  return { email: store.get('userEmail'), name: store.get('userName') };
}

function setSavedCredentials(email, encryptedBase64) {
  store.set('savedEmail', email);
  store.set('savedPasswordEnc', encryptedBase64);
}

function getSavedEmail() { return store.get('savedEmail', null); }
function getSavedPasswordEncrypted() { return store.get('savedPasswordEnc', null); }

function clearSavedCredentials() {
  store.delete('savedEmail');
  store.delete('savedPasswordEnc');
}

module.exports = {
  getDeviceId, getToken, setToken, clearToken, setUserInfo, getUserInfo,
  setSavedCredentials, getSavedEmail, getSavedPasswordEncrypted, clearSavedCredentials,
};
