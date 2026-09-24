/**
 * RealtimeService handles WebSocket connection to the Node.js backend.
 * Provides live audio chunk transmission, receives real-time subtitles,
 * language detection, and summary events.
 */
class RealtimeService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.eventListeners = new Map();
  }

  /**
   * Connect to backend WebSocket server
   */
  connect(url = null) {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    // Vite proxies /ws to backend:3001, or fallback to ws://localhost:3001/ws
    const defaultWsUrl = `${protocol}//${host}/ws`;
    const targetUrl = url || defaultWsUrl;

    try {
      this.socket = new WebSocket(targetUrl);
      this.socket.binaryType = 'arraybuffer';

      this.socket.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit('connection_status', { connected: true });
        console.log('[RealtimeService] WebSocket connected to', targetUrl);
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this._handleMessage(message);
        } catch (e) {
          console.error('[RealtimeService] Error parsing message:', e);
        }
      };

      this.socket.onerror = (error) => {
        console.warn('[RealtimeService] WebSocket error:', error);
        this.emit('connection_status', { connected: false, error });
      };

      this.socket.onclose = () => {
        this.isConnected = false;
        this.emit('connection_status', { connected: false });
        console.log('[RealtimeService] WebSocket disconnected');
      };
    } catch (err) {
      console.error('[RealtimeService] Failed to establish WebSocket:', err);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnected = false;
  }

  /**
   * Send audio chunk (Blob or ArrayBuffer) along with current meeting context
   */
  async sendAudioChunk(blob, context = {}) {
    if (!this.isConnected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      const arrayBuffer = await blob.arrayBuffer();

      // Send metadata header first
      const meta = JSON.stringify({
        type: 'audio_chunk_meta',
        targetLanguages: context.targetLanguages || ['vi'],
        primaryTargetLanguage: context.primaryTargetLanguage || 'vi',
        detectedLanguage: context.detectedLanguage?.code || 'auto',
        size: arrayBuffer.byteLength,
        timestamp: Date.now()
      });

      this.socket.send(meta);
      this.socket.send(arrayBuffer);
      return true;
    } catch (e) {
      console.error('[RealtimeService] Error sending audio chunk:', e);
      return false;
    }
  }

  /**
   * Request backend to trigger final AI analysis / summary
   */
  requestSummary(transcript, targetLang = 'vi') {
    if (!this.isConnected || !this.socket) {
      return false;
    }

    this.socket.send(JSON.stringify({
      type: 'generate_summary',
      transcript,
      targetLang
    }));
    return true;
  }

  _handleMessage(message) {
    const { type, data } = message;
    this.emit(type, data);
  }

  on(eventName, callback) {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, []);
    }
    this.eventListeners.get(eventName).push(callback);
  }

  off(eventName, callback) {
    if (!this.eventListeners.has(eventName)) return;
    const callbacks = this.eventListeners.get(eventName).filter((cb) => cb !== callback);
    this.eventListeners.set(eventName, callbacks);
  }

  emit(eventName, data) {
    if (!this.eventListeners.has(eventName)) return;
    this.eventListeners.get(eventName).forEach((cb) => {
      try {
        cb(data);
      } catch (err) {
        console.error(`Error in event listener for ${eventName}:`, err);
      }
    });
  }
}

export const realtimeService = new RealtimeService();
