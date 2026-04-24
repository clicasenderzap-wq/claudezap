const WebSocket = require('ws');
const { EventEmitter } = require('events');

const RECONNECT_DELAYS = [3000, 5000, 10000, 15000, 30000];

/**
 * Manages the WebSocket connection from the Electron app to the backend.
 * Handles auto-reconnect with exponential backoff.
 * Dispatches incoming commands to WAManager and sends events back.
 */
class WSClient extends EventEmitter {
  constructor(apiUrl, token, deviceId) {
    super();
    this._apiUrl = apiUrl.replace(/^http/, 'ws').replace(/\/$/, '');
    this._token = token;
    this._deviceId = deviceId;
    this._ws = null;
    this._reconnectAttempt = 0;
    this._destroyed = false;
    this._pingInterval = null;
  }

  connect() {
    if (this._destroyed) return;
    const url = `${this._apiUrl}/api/desktop/ws?token=${encodeURIComponent(this._token)}&deviceId=${encodeURIComponent(this._deviceId)}`;
    console.log('[WS] conectando ao backend...');

    try {
      this._ws = new WebSocket(url);
    } catch (e) {
      console.error('[WS] erro ao criar WebSocket:', e.message);
      this._scheduleReconnect();
      return;
    }

    this._ws.on('open', () => {
      console.log('[WS] conectado ao backend');
      this._reconnectAttempt = 0;
      this.emit('connected');
      // Keepalive ping every 25s (server also pings at 30s)
      this._pingInterval = setInterval(() => {
        if (this._ws?.readyState === WebSocket.OPEN) {
          this._ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 25_000);
    });

    this._ws.on('message', (data) => {
      let msg;
      try { msg = JSON.parse(data.toString()); } catch { return; }
      this.emit('message', msg);
    });

    this._ws.on('close', (code, reason) => {
      clearInterval(this._pingInterval);
      const reasonStr = reason?.toString() || '';
      console.log(`[WS] desconectado (${code}) ${reasonStr}`);

      if (reasonStr.includes('session_kicked') || code === 1008) {
        this.emit('kicked', reasonStr);
        return; // don't reconnect
      }

      this.emit('disconnected');
      if (!this._destroyed) this._scheduleReconnect();
    });

    this._ws.on('error', (e) => {
      console.error('[WS] erro:', e.message);
    });
  }

  _scheduleReconnect() {
    const delay = RECONNECT_DELAYS[Math.min(this._reconnectAttempt, RECONNECT_DELAYS.length - 1)];
    this._reconnectAttempt++;
    console.log(`[WS] reconectando em ${delay / 1000}s (tentativa ${this._reconnectAttempt})...`);
    setTimeout(() => this.connect(), delay);
  }

  send(msg) {
    if (this._ws?.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify(msg));
      return true;
    }
    return false;
  }

  destroy() {
    this._destroyed = true;
    clearInterval(this._pingInterval);
    this._ws?.close();
    this._ws = null;
  }

  get isConnected() {
    return this._ws?.readyState === WebSocket.OPEN;
  }
}

module.exports = WSClient;
