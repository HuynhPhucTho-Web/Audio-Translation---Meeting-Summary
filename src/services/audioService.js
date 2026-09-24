/**
 * AudioService handles Web Audio API, Microphone Capture, AnalyserNode for Waveform,
 * and records complete audio into a Blob for playback.
 */
class AudioService {
  constructor() {
    this.mediaStream = null;
    this.audioContext = null;
    this.analyser = null;
    this.mediaRecorder = null;
    this.animationFrameId = null;
    this.onAudioChunkCallback = null;
    this.onVolumeCallback = null;
    this.isRecording = false;
    this.isPaused = false;
    this.recordedChunks = [];
    this.audioUrl = null;
  }

  /**
   * Request microphone permission and initialize audio pipeline
   */
  async startRecording({ onAudioChunk, onVolumeChange, deviceId = 'default' }) {
    try {
      this.recordedChunks = [];
      this.onAudioChunkCallback = onAudioChunk;
      this.onVolumeCallback = onVolumeChange;

      // Revoke previous URL if any
      if (this.audioUrl) {
        URL.revokeObjectURL(this.audioUrl);
        this.audioUrl = null;
      }

      const constraints = {
        audio: {
          deviceId: deviceId !== 'default' ? { exact: deviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 16000,
        },
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Create Web Audio Context for Waveform visualization
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();
      
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64; // provides 32 frequency bins
      this.analyser.smoothingTimeConstant = 0.8;
      source.connect(this.analyser);

      // Start dynamic volume / frequency analysis loop
      this._startVisualizerLoop();

      // Configure MediaRecorder for sending audio chunks & accumulating full recording
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
      }

      const options = mimeType ? { mimeType } : {};
      this.mediaRecorder = new MediaRecorder(this.mediaStream, options);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
          if (this.onAudioChunkCallback) {
            this.onAudioChunkCallback(event.data);
          }
        }
      };

      // Emit chunk every 1000ms
      this.mediaRecorder.start(1000);
      this.isRecording = true;
      this.isPaused = false;

      return { success: true };
    } catch (error) {
      console.error('Microphone access or AudioContext initialization failed:', error);
      return { success: false, error: error.message || 'Permission denied or microphone unavailable' };
    }
  }

  pauseRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.isPaused = true;
      this.mediaRecorder.pause();
    }
  }

  resumeRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.isPaused = false;
      this.mediaRecorder.resume();
    }
  }

  /**
   * Stop recording and return recorded Audio Blob + Object URL for playback
   */
  stopRecording() {
    this.isRecording = false;
    this.isPaused = false;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    return new Promise((resolve) => {
      const finalize = () => {
        let blob = null;
        let url = null;
        if (this.recordedChunks.length > 0) {
          const mimeType = (this.mediaRecorder && this.mediaRecorder.mimeType) || 'audio/webm';
          blob = new Blob(this.recordedChunks, { type: mimeType });
          url = URL.createObjectURL(blob);
          this.audioUrl = url;
        }

        if (this.mediaStream) {
          this.mediaStream.getTracks().forEach((track) => track.stop());
          this.mediaStream = null;
        }

        if (this.audioContext && this.audioContext.state !== 'closed') {
          this.audioContext.close();
          this.audioContext = null;
        }

        resolve({ blob, url });
      };

      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.onstop = finalize;
        try {
          this.mediaRecorder.stop();
        } catch (e) {
          console.error(e);
          finalize();
        }
      } else {
        finalize();
      }
    });
  }

  _startVisualizerLoop() {
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const update = () => {
      if (!this.isRecording || this.isPaused || !this.analyser) return;

      this.analyser.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const avg = sum / bufferLength;
      const normalizedVolume = Math.round((avg / 255) * 100);

      const bars = [];
      const step = Math.floor(bufferLength / 24) || 1;
      for (let i = 0; i < 24; i++) {
        const val = dataArray[i * step] || 0;
        const height = Math.max(15, Math.min(100, Math.round((val / 255) * 100)));
        bars.push(height);
      }

      if (this.onVolumeCallback) {
        this.onVolumeCallback(normalizedVolume, bars);
      }

      this.animationFrameId = requestAnimationFrame(update);
    };

    update();
  }

  static async getAudioDevices() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return [];
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((d) => d.kind === 'audioinput');
    } catch (err) {
      console.error('Failed to get audio devices', err);
      return [];
    }
  }
}

export const audioService = new AudioService();
