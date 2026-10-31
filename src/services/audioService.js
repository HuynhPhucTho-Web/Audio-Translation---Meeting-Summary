/**
 * AudioService handles Web Audio API, Microphone Capture, AnalyserNode for Waveform,
 * DynamicsCompressor for room acoustic normalization (Offline Meetings),
 * DisplayMedia Screen/Tab Audio Capture (Online Meetings: Google Meet / Zoom / Teams),
 * and converts recordings into standard 16-bit PCM WAV (.wav) and WebM (.webm).
 */

class AudioService {
  constructor() {
    this.mediaStream = null;
    this.displayStream = null;
    this.combinedStream = null;
    this.audioContext = null;
    this.analyser = null;
    this.compressor = null;
    this.mediaRecorder = null;
    this.animationFrameId = null;
    this.onAudioChunkCallback = null;
    this.onVolumeCallback = null;
    this.isRecording = false;
    this.isPaused = false;
    this.recordedChunks = [];
    this.audioUrl = null;
    this.wavUrl = null;
    this.wavBlob = null;
    this.sourceType = 'mic'; // 'mic' | 'system_and_mic'
  }

  /**
   * Request microphone (and optionally system/tab audio) and initialize audio pipeline
   * @param {Object} options
   * @param {Function} options.onAudioChunk - called with chunk data
   * @param {Function} options.onVolumeChange - called with (normalizedVolume, bars)
   * @param {string} options.deviceId - microphone device ID
   * @param {string} options.sourceType - 'mic' (offline meeting) or 'system_and_mic' (online meeting: Meet/Zoom)
   */
  async startRecording({
    onAudioChunk,
    onVolumeChange,
    deviceId = 'default',
    sourceType = 'mic',
  }) {
    try {
      this.recordedChunks = [];
      this.onAudioChunkCallback = onAudioChunk;
      this.onVolumeCallback = onVolumeChange;
      this.sourceType = sourceType;

      // Revoke previous URLs if any
      if (this.audioUrl) {
        URL.revokeObjectURL(this.audioUrl);
        this.audioUrl = null;
      }
      if (this.wavUrl) {
        URL.revokeObjectURL(this.wavUrl);
        this.wavUrl = null;
      }
      this.wavBlob = null;

      // 1. Microphone constraints with acoustic enhancements
      const micConstraints = {
        audio: {
          deviceId: deviceId !== 'default' ? { exact: deviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 44100,
        },
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(micConstraints);

      // Create Web Audio Context
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx({ sampleRate: 44100 });

      // Create room acoustic compressor (DynamicsCompressor)
      // Normalizes voice levels so far-away speakers in offline meetings are amplified
      this.compressor = this.audioContext.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-24, this.audioContext.currentTime);
      this.compressor.knee.setValueAtTime(30, this.audioContext.currentTime);
      this.compressor.ratio.setValueAtTime(12, this.audioContext.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.audioContext.currentTime);
      this.compressor.release.setValueAtTime(0.25, this.audioContext.currentTime);

      let recordStream = this.mediaStream;

      // 2. If online meeting mode: Capture tab/system audio (Google Meet, Zoom, MS Teams)
      if (sourceType === 'system_and_mic' && navigator.mediaDevices.getDisplayMedia) {
        try {
          this.displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
            },
          });

          // Mix mic + system audio into single stream via Web Audio API
          const destination = this.audioContext.createMediaStreamDestination();
          const micSource = this.audioContext.createMediaStreamSource(this.mediaStream);
          micSource.connect(this.compressor);
          this.compressor.connect(destination);

          const displayAudioTracks = this.displayStream.getAudioTracks();
          if (displayAudioTracks.length > 0) {
            const displayAudioStream = new MediaStream(displayAudioTracks);
            const displaySource = this.audioContext.createMediaStreamSource(displayAudioStream);
            displaySource.connect(destination);
          }

          this.combinedStream = destination.stream;
          recordStream = this.combinedStream;
        } catch (displayErr) {
          console.warn('[AudioService] Could not capture tab/system audio, falling back to mic:', displayErr);
          this.sourceType = 'mic';
        }
      }

      // 3. Connect to Analyser for Waveform visualization
      const finalSource = this.audioContext.createMediaStreamSource(recordStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64; // 32 frequency bins
      this.analyser.smoothingTimeConstant = 0.8;
      finalSource.connect(this.analyser);

      // Start dynamic volume / frequency analysis loop
      this._startVisualizerLoop();

      // 4. Configure MediaRecorder
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
      }

      const options = mimeType ? { mimeType } : {};
      this.mediaRecorder = new MediaRecorder(recordStream, options);

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

      return { success: true, sourceType: this.sourceType };
    } catch (error) {
      console.error('Microphone or AudioContext initialization failed:', error);
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
   * Stop recording, process audio into standard 16-bit PCM WAV and WebM,
   * and return both URLs for playback and download.
   */
  stopRecording() {
    this.isRecording = false;
    this.isPaused = false;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    return new Promise((resolve) => {
      const finalize = async () => {
        let blob = null;
        let url = null;
        let wavBlob = null;
        let wavUrl = null;

        if (this.recordedChunks.length > 0) {
          const mimeType = (this.mediaRecorder && this.mediaRecorder.mimeType) || 'audio/webm';
          blob = new Blob(this.recordedChunks, { type: mimeType });
          url = URL.createObjectURL(blob);
          this.audioUrl = url;

          // Convert to standard 16-bit PCM WAV
          try {
            wavBlob = await this._convertBlobToWav(blob);
            if (wavBlob) {
              wavUrl = URL.createObjectURL(wavBlob);
              this.wavUrl = wavUrl;
              this.wavBlob = wavBlob;
            }
          } catch (wavErr) {
            console.warn('[AudioService] Failed to encode WAV, using webm only:', wavErr);
          }
        }

        // Clean up tracks
        if (this.mediaStream) {
          this.mediaStream.getTracks().forEach((track) => track.stop());
          this.mediaStream = null;
        }
        if (this.displayStream) {
          this.displayStream.getTracks().forEach((track) => track.stop());
          this.displayStream = null;
        }
        if (this.combinedStream) {
          this.combinedStream.getTracks().forEach((track) => track.stop());
          this.combinedStream = null;
        }

        if (this.audioContext && this.audioContext.state !== 'closed') {
          try {
            await this.audioContext.close();
          } catch (e) {}
          this.audioContext = null;
        }

        resolve({
          blob,
          url: wavUrl || url, // Prefer WAV for accurate scrubbing & duration
          webmBlob: blob,
          webmUrl: url,
          wavBlob,
          wavUrl,
        });
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

  /**
   * Converts any browser-supported audio Blob (WebM, Opus, MP4) into standard 16-bit PCM WAV
   */
  async _convertBlobToWav(blob) {
    const arrayBuffer = await blob.arrayBuffer();
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const decodeCtx = new AudioCtx({ sampleRate: 44100 });

    try {
      const audioBuffer = await decodeCtx.decodeAudioData(arrayBuffer);
      const wavBuffer = this.audioBufferToWav(audioBuffer);
      return new Blob([wavBuffer], { type: 'audio/wav' });
    } finally {
      if (decodeCtx.state !== 'closed') {
        try {
          await decodeCtx.close();
        } catch (e) {}
      }
    }
  }

  /**
   * Encodes an AudioBuffer into a standard RIFF/WAVE ArrayBuffer (16-bit PCM)
   */
  audioBufferToWav(audioBuffer) {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const numSamples = audioBuffer.length;
    const byteRate = sampleRate * numChannels * 2;
    const blockAlign = numChannels * 2;
    const dataSize = numSamples * numChannels * 2;
    const totalBufferSize = 44 + dataSize;

    const buffer = new ArrayBuffer(totalBufferSize);
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    this._writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true); // File size - 8
    this._writeString(view, 8, 'WAVE');

    // "fmt " sub-chunk
    this._writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);          // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true);           // AudioFormat (1 for PCM)
    view.setUint16(22, numChannels, true); // Number of channels
    view.setUint32(24, sampleRate, true);  // Sample rate
    view.setUint32(28, byteRate, true);    // Byte rate
    view.setUint16(32, blockAlign, true);  // Block align
    view.setUint16(34, 16, true);          // Bits per sample (16-bit)

    // "data" sub-chunk
    this._writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);    // Subchunk2Size

    // Write interleaved 16-bit signed PCM samples
    const channels = [];
    for (let i = 0; i < numChannels; i++) {
      channels.push(audioBuffer.getChannelData(i));
    }

    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        let sample = channels[ch][i];
        // Clamp to [-1.0, 1.0]
        sample = Math.max(-1, Math.min(1, sample));
        // Scale to 16-bit signed integer
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, Math.floor(intSample), true);
        offset += 2;
      }
    }

    return buffer;
  }

  _writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
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
