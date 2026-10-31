import React, { useEffect, useRef, useState } from 'react';
import MorphIcon from '../MorphIcon/MorphIcon';
import { useMeetingStore } from '../../store/meetingStore';
import { audioService } from '../../services/audioService';
import { speechService } from '../../services/speechService';
import { realtimeService } from '../../services/realtimeService';
import { summaryService } from '../../services/summaryService';
import { translationService } from '../../services/translationService';
import { getLanguageByCode } from '../../data/languages';
import Waveform from '../Waveform/Waveform';
import './AudioRecorder.css';

const PLAYBACK_RATES = [1.0, 1.25, 1.5, 2.0, 0.75];

export default function AudioRecorder() {
  const {
    t,
    isRecording,
    isPaused,
    recordingTime,
    setRecording,
    setPaused,
    incrementTimer,
    setAudioVolume,
    setWaveformBars,
    setLiveSubtitle,
    addTranscriptMessage,
    transcript,
    resetMeeting,
    targetLanguages,
    primaryTargetLanguage,
    detectedLanguage,
    setDetectedLanguage,
    setAnalysisData,
    setIsAnalyzing,
    saveCurrentMeeting,
    settings,
    recordedAudioUrl,
    recordedAudioBlob,
    recordedWavUrl,
    recordedWavBlob,
    recordingMode,
    setRecordingMode,
    setRecordedAudio,
    clearRecordedAudio,
    spokenInputLanguage,
    showConfirmDialog,
    showAlertDialog,
  } = useMeetingStore();

  const timerRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const fileInputRef = useRef(null);

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playbackCurrentTime, setPlaybackCurrentTime] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [playbackRateIndex, setPlaybackRateIndex] = useState(0);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [isConvertingMp3, setIsConvertingMp3] = useState(false);

  const getFormattedAudioFileName = (ext = 'mp3') => {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `Ghi_Am_Cuoc_Hop_${dd}-${mm}-${yyyy}_${hh}h${min}m${ss}s.${ext}`;
  };

  // Timer interval
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        incrementTimer();
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, isPaused, incrementTimer]);

  // Listen for backend Whisper language detection events
  useEffect(() => {
    const handleBackendLangDetected = (data) => {
      if (data && data.code) {
        const langObj = getLanguageByCode(data.code);
        setDetectedLanguage({
          code: langObj.code,
          name: langObj.name,
          flag: langObj.flag,
          confidence: data.confidence || 98,
        });
      }
    };
    realtimeService.on('language_detected', handleBackendLangDetected);
    return () => {
      realtimeService.off('language_detected', handleBackendLangDetected);
    };
  }, [setDetectedLanguage]);

  // Listen for backend subtitles (e.g. from online meeting attendees or Whisper STT)
  useEffect(() => {
    const handleBackendSubtitle = (data) => {
      if (data && data.originalText && data.originalText.trim()) {
        addTranscriptMessage(data);
      }
    };
    realtimeService.on('subtitle_committed', handleBackendSubtitle);
    return () => {
      realtimeService.off('subtitle_committed', handleBackendSubtitle);
    };
  }, [addTranscriptMessage]);

  const formatTime = (totalSeconds = 0) => {
    if (!Number.isFinite(totalSeconds) || isNaN(totalSeconds) || totalSeconds < 0) {
      return '00:00:00';
    }
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
    clearRecordedAudio();

    // 1. Start Audio Capture & Recording (supports Offline Mic vs Online Tab+Mic)
    const result = await audioService.startRecording({
      deviceId: settings.audioDeviceId,
      sourceType: recordingMode === 'online' ? 'system_and_mic' : 'mic',
      onVolumeChange: (vol, bars) => {
        setAudioVolume(vol);
        setWaveformBars(bars);
      },
      onAudioChunk: (chunk) => {
        // Forward to WebSocket if connected
        realtimeService.sendAudioChunk(chunk, {
          targetLanguages,
          primaryTargetLanguage,
          detectedLanguage,
        });
      },
    });

    if (result.success) {
      setRecording(true);

      // 2. Start Real-time Browser Speech Recognition (zero latency!)
      speechService.start({
        spokenLang: spokenInputLanguage || 'auto',
        targetLang: primaryTargetLanguage || 'vi',
        onLanguageDetected: (detected) => {
          setDetectedLanguage(detected);
        },
        onInterim: (data) => {
          setLiveSubtitle(data);
        },
        onSentence: (sentenceData) => {
          addTranscriptMessage(sentenceData);
          setLiveSubtitle({
            speaker: 'Speaker (Bạn)',
            originalText: '',
            translatedText: '',
            detectedLang: sentenceData.originalLang,
            isSpeaking: false,
          });
        },
      });

      // Try connecting backend WebSocket in parallel
      realtimeService.connect();
    } else {
      showAlertDialog({
        title: 'Không thể truy cập âm thanh',
        message: `Lỗi: ${result.error}.\n• Nếu họp Offline: Vui lòng cấp quyền Microphone trên trình duyệt.\n• Nếu họp Online: Hãy chọn Tab Google Meet / Zoom và đánh dấu tích 'Chia sẻ âm thanh của thẻ'.`,
        type: 'warning',
        confirmText: 'Đã hiểu',
      });
    }
  };

  const handleTogglePause = () => {
    if (isPaused) {
      speechService.resume();
      audioService.resumeRecording();
      setPaused(false);
    } else {
      speechService.pause();
      audioService.pauseRecording();
      setPaused(true);
    }
  };

  const handleStop = async () => {
    setIsProcessingAudio(true);

    // 1. Stop Speech Recognition
    speechService.stop();

    // 2. Stop Audio Recording and get recorded standard WAV & WebM
    const { blob, url, wavBlob, wavUrl } = await audioService.stopRecording();
    if (wavUrl || url) {
      setRecordedAudio({
        url: wavUrl || url,
        blob: wavBlob || blob,
        wavUrl,
        wavBlob,
      });
    }

    setRecording(false);
    setAudioVolume(0);
    setWaveformBars(new Array(24).fill(10));
    setIsProcessingAudio(false);

    // 4. Trigger AI Summary in background
    setIsAnalyzing(true);
    const state = useMeetingStore.getState();
    summaryService
      .generateSummary(
        state.transcript,
        state.primaryTargetLanguage,
        state.settings.apiKey
      )
      .then((summaryResult) => {
        setAnalysisData(summaryResult);
        saveCurrentMeeting();
      });
  };

  const handleRecordButtonClick = () => {
    if (isRecording) {
      handleStop();
    } else {
      handleStart();
    }
  };

  // Audio Playback Controls
  const togglePlayAudio = () => {
    if (!audioPlayerRef.current) return;
    if (isPlayingAudio) {
      audioPlayerRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  const handleCyclePlaybackRate = () => {
    const nextIndex = (playbackRateIndex + 1) % PLAYBACK_RATES.length;
    setPlaybackRateIndex(nextIndex);
    const newRate = PLAYBACK_RATES[nextIndex];
    if (audioPlayerRef.current) {
      audioPlayerRef.current.playbackRate = newRate;
    }
  };

  const handleSkipTime = (deltaSeconds) => {
    if (!audioPlayerRef.current) return;
    const current = audioPlayerRef.current.currentTime || 0;
    const dur = audioPlayerRef.current.duration || recordingTime || 1;
    const target = Math.max(0, Math.min(dur, current + deltaSeconds));
    audioPlayerRef.current.currentTime = target;
    setPlaybackCurrentTime(target);
  };

  const handleTimeUpdate = () => {
    if (audioPlayerRef.current) {
      setPlaybackCurrentTime(audioPlayerRef.current.currentTime || 0);
      const dur = audioPlayerRef.current.duration;
      if (Number.isFinite(dur) && !isNaN(dur) && dur > 0) {
        setPlaybackDuration(dur);
      } else if (recordingTime > 0) {
        setPlaybackDuration(recordingTime);
      }
    }
  };

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.currentTime = newTime;
      setPlaybackCurrentTime(newTime);
    }
  };

  const handleAudioEnded = () => {
    setIsPlayingAudio(false);
    setPlaybackCurrentTime(0);
  };

  // Download Standard MP3 with full Date & Time in filename
  const downloadMp3Audio = async () => {
    const blobToUse = recordedWavBlob || recordedAudioBlob;
    if (!blobToUse) return;

    const fileName = getFormattedAudioFileName('mp3');
    setIsConvertingMp3(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = (reader.result || '').toString().split(',')[1];
          const resp = await fetch('/api/convert-to-mp3', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioBase64: base64,
              mimeType: blobToUse.type || 'audio/wav',
              filename: fileName,
            }),
          });

          if (resp.ok) {
            const mp3Blob = await resp.blob();
            const url = URL.createObjectURL(mp3Blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            return;
          }
        } catch (serverErr) {
          console.warn('[AudioRecorder] MP3 server conversion failed, fallback to WAV:', serverErr);
        } finally {
          setIsConvertingMp3(false);
        }

        // Direct fallback: Download standard WAV if server is unavailable
        const directUrl = recordedWavUrl || recordedAudioUrl;
        if (directUrl) {
          const a = document.createElement('a');
          a.href = directUrl;
          a.download = getFormattedAudioFileName('wav');
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      };
      reader.readAsDataURL(blobToUse);
    } catch (err) {
      console.error(err);
      setIsConvertingMp3(false);
    }
  };

  // Download Standard WAV (16-bit PCM) with full Date & Time in filename
  const downloadWavAudio = () => {
    const targetUrl = recordedWavUrl || recordedAudioUrl;
    if (!targetUrl) return;
    const a = document.createElement('a');
    a.href = targetUrl;
    a.download = getFormattedAudioFileName('wav');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Upload an existing meeting audio file for transcription & summary
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    clearRecordedAudio();
    const objectUrl = URL.createObjectURL(file);
    setRecordedAudio({ url: objectUrl, blob: file });

    setIsProcessingAudio(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = (reader.result || '').toString().split(',')[1];
          if (!base64Data) return;

          const resp = await fetch('/api/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioBase64: base64Data,
              mimeType: file.type || 'audio/webm',
            }),
          });

          if (resp.ok) {
            const result = await resp.json();
            if (result.text && result.text.trim()) {
              const detectedLang = result.language || 'vi';
              const langMeta = getLanguageByCode(detectedLang);
              setDetectedLanguage({
                code: langMeta.code,
                name: langMeta.name,
                flag: langMeta.flag,
                confidence: result.confidence || 98,
              });

              // Translate
              const targetLang = primaryTargetLanguage || 'vi';
              const transResult = await translationService.translateText(
                result.text.trim(),
                detectedLang,
                targetLang
              );

              // Add to transcript
              addTranscriptMessage({
                id: `upload-${Date.now()}`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                speaker: 'Speaker (File ghi âm)',
                originalText: result.text.trim(),
                originalLang: detectedLang,
                translations: {
                  [targetLang]: transResult.translatedText || result.text.trim(),
                },
                category: transResult.category || 'statement',
                confidence: result.confidence || 98,
              });

              // Trigger AI Summary
              setIsAnalyzing(true);
              const summaryResult = await summaryService.generateSummary(
                useMeetingStore.getState().transcript,
                targetLang,
                settings.apiKey
              );
              setAnalysisData(summaryResult);
              saveCurrentMeeting();
            }
          }
        } catch (err) {
          console.warn('[AudioRecorder] File transcription failed:', err);
        } finally {
          setIsProcessingAudio(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setIsProcessingAudio(false);
    }
  };

  return (
    <div className="w-full apple-glass rounded-2xl p-3 sm:px-5 sm:py-3.5 border border-white/10 shadow-xl space-y-3">
      {/* Top Bar: Mode Selector & Upload */}
      <div className="flex flex-col xs:flex-row items-stretch xs:items-center justify-between gap-2 pb-2 border-b border-white/[0.08]">
        {/* Meeting Type Selector (Offline vs Online) */}
        <div className="flex items-center gap-1 p-0.5 rounded-full bg-black/40 border border-white/10 text-xs w-full xs:w-auto">
          <button
            type="button"
            disabled={isRecording}
            onClick={() => setRecordingMode('offline')}
            className={`flex-1 xs:flex-initial flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
              recordingMode === 'offline'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white disabled:opacity-50'
            }`}
            title="Họp trực tiếp tại phòng: Kích hoạt bộ nén âm thanh, thu rõ người ngồi xa"
          >
            <MorphIcon name="mic" size={12} />
            <span>Họp Offline</span>
          </button>

          <button
            type="button"
            disabled={isRecording}
            onClick={() => setRecordingMode('online')}
            className={`flex-1 xs:flex-initial flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
              recordingMode === 'online'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white disabled:opacity-50'
            }`}
            title="Họp trực tuyến: Thu âm thanh từ tab Google Meet / Zoom + Micro của bạn"
          >
            <MorphIcon name="globe" size={12} />
            <span>Họp Online</span>
          </button>
        </div>

        {/* Audio File Upload Pill (Nhập file từ máy tính) */}
        <div className="flex items-center justify-end">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="audio/*,.mp3,.wav,.m4a,.aac,.webm,.ogg"
            className="hidden"
          />
          <button
            type="button"
            disabled={isRecording}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-1.5 px-3 py-1 rounded-full apple-pill hover:bg-white/15 text-[11px] font-medium text-amber-300 hover:text-white transition-all disabled:opacity-40"
            title="Tải lên file âm thanh sẵn có từ máy tính (.mp3, .wav, .m4a) để AI nhận diện và tóm tắt"
          >
            <MorphIcon name="arrow-up" size={12} className="text-amber-400" />
            <span>Tải lên file từ máy</span>
          </button>
        </div>
      </div>

      {/* Center Row: Direct Record Button, Status & Waveform */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left Side: Direct Record Button & Status */}
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex items-center justify-center">
            {isRecording && !isPaused && (
              <span className="absolute -inset-1.5 rounded-full bg-rose-500/30 animate-ping opacity-75" />
            )}

            <button
              type="button"
              onClick={handleRecordButtonClick}
              disabled={isProcessingAudio}
              className={`w-14 h-14 rounded-full border-2 p-1 flex items-center justify-center transition-all duration-200 active:scale-90 shadow-lg ${
                isRecording
                  ? 'border-rose-500/70 apple-record-pulse'
                  : 'border-white/30 hover:border-white/60 hover:scale-105'
              }`}
              title={isRecording ? 'Nhấn để kết thúc và lưu đoạn ghi âm' : 'Nhấn để bắt đầu ghi âm trực tiếp'}
            >
              <div
                className="w-full h-full rounded-full bg-rose-500 hover:bg-rose-600 shadow-rose-500/40 text-white flex items-center justify-center transition-all"
              >
                <MorphIcon
                  name="record"
                  state={isRecording ? 'square' : 'mic'}
                  size={22}
                  color="#ffffff"
                  spring="bouncy"
                />
              </div>
            </button>
          </div>

          {/* Status Label & Timer */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {isRecording
                  ? isPaused
                    ? 'Tạm dừng ghi'
                    : recordingMode === 'online'
                    ? 'Thu âm cuộc họp Online'
                    : 'Thu âm phòng họp Offline'
                  : 'Ghi âm cuộc họp'}
              </span>
              {isRecording && !isPaused && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              )}
            </div>

            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-white">
                {formatTime(recordingTime)}
              </span>
              <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                {isRecording ? t('recorder.clickToStop') : t('recorder.clickToStart')}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Sound Waveform Spectrum */}
        <div className="w-full md:flex-1 flex justify-center px-2 sm:px-6">
          <Waveform isRecording={isRecording} isPaused={isPaused} compact={false} />
        </div>

        {/* Right Side: Quick Action Pills */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-stretch sm:justify-end">
          {isRecording ? (
            <>
              {/* Pause / Resume Button */}
              <button
                type="button"
                onClick={handleTogglePause}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-full apple-pill hover:bg-white/15 text-xs sm:text-sm font-semibold text-white transition-all active:scale-95"
              >
                <MorphIcon
                  name="play-pause"
                  state={isPaused ? 'pause' : 'play'}
                  size={15}
                  color={isPaused ? '#34d399' : '#fbbf24'}
                />
                <span>{isPaused ? t('recorder.resume') : t('recorder.pause')}</span>
              </button>

              {/* Stop Button */}
              <button
                type="button"
                onClick={handleStop}
                disabled={isProcessingAudio}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-rose-500 hover:bg-rose-600 text-xs sm:text-sm font-semibold text-white transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                <MorphIcon name="record" state="square" size={14} color="#ffffff" />
                <span className="truncate">{isProcessingAudio ? 'Đang xuất file...' : t('recorder.stopAndSave')}</span>
              </button>
            </>
          ) : (
            <>
              {transcript.length > 0 && (
                <button
                  type="button"
                  onClick={async () => {
                    const confirmed = await showConfirmDialog({
                      title: 'Xóa phiên ghi âm',
                      message: t('recorder.clearConfirm') || 'Xóa sạch phụ đề để bắt đầu phiên mới?',
                      type: 'danger',
                      confirmText: 'Xóa phiên',
                      cancelText: 'Hủy bỏ',
                    });
                    if (confirmed) {
                      resetMeeting();
                    }
                  }}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full apple-pill hover:bg-rose-500/20 text-xs font-medium text-slate-300 hover:text-rose-300 transition-all active:scale-95"
                  title={t('recorder.clearSession')}
                >
                  <MorphIcon name="trash" size={15} />
                  <span>{t('recorder.clearSession')}</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Lower Row: Modern Apple Audio Player (Responsive 2-tier layout on mobile) */}
      {recordedAudioUrl && !isRecording && (
        <div className="w-full pt-3 border-t border-white/10 flex flex-col gap-2.5 sm:gap-3 animate-fadeIn">
          {/* HTML5 Audio Element */}
          <audio
            ref={audioPlayerRef}
            src={recordedAudioUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleTimeUpdate}
            onEnded={handleAudioEnded}
          />

          {/* Tier 1: Scrub Slider (Full width on all screens for touch accuracy) */}
          <div className="w-full flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400 w-11 text-right shrink-0">
              {formatTime(playbackCurrentTime)}
            </span>
            <input
              type="range"
              min="0"
              max={
                Number.isFinite(playbackDuration) && playbackDuration > 0
                  ? playbackDuration
                  : recordingTime > 0
                  ? recordingTime
                  : 1
              }
              step="0.1"
              value={Math.min(
                playbackCurrentTime,
                Number.isFinite(playbackDuration) && playbackDuration > 0
                  ? playbackDuration
                  : recordingTime > 0
                  ? recordingTime
                  : 1
              )}
              onChange={handleSeek}
              className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <span className="text-[11px] font-mono text-slate-400 w-11 shrink-0">
              {formatTime(
                Number.isFinite(playbackDuration) && playbackDuration > 0
                  ? playbackDuration
                  : recordingTime
              )}
            </span>
          </div>

          {/* Tier 2: Controls & Direct Download Buttons */}
          <div className="w-full flex flex-wrap items-center justify-between gap-2.5">
            {/* Playback Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Play/Pause Button */}
              <button
                type="button"
                onClick={togglePlayAudio}
                className="w-9 h-9 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/30 transition-all active:scale-95 shrink-0"
                title={isPlayingAudio ? t('recorder.pause') : t('recorder.listenBack')}
              >
                <MorphIcon
                  name="play-pause"
                  state={isPlayingAudio ? 'playing' : 'play'}
                  size={16}
                  color="#ffffff"
                />
              </button>

              {/* Skip -5s */}
              <button
                type="button"
                onClick={() => handleSkipTime(-5)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-slate-300 text-[11px] font-mono flex items-center justify-center transition-all shrink-0 active:scale-90"
                title="Lùi lại 5 giây"
              >
                -5s
              </button>

              {/* Skip +5s */}
              <button
                type="button"
                onClick={() => handleSkipTime(5)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-slate-300 text-[11px] font-mono flex items-center justify-center transition-all shrink-0 active:scale-90"
                title="Tua tới 5 giây"
              >
                +5s
              </button>

              {/* Speed Toggle Pill */}
              <button
                type="button"
                onClick={handleCyclePlaybackRate}
                className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-blue-300 text-[11px] font-mono font-bold transition-all shrink-0 active:scale-90"
                title="Đổi tốc độ phát lại (0.75x - 2x)"
              >
                {PLAYBACK_RATES[playbackRateIndex]}x
              </button>
            </div>

            {/* Right: Direct Download Buttons (MP3 & WAV) */}
            <div className="flex items-center gap-2">
              {/* Download Standard MP3 (Primary) */}
              <button
                type="button"
                disabled={isConvertingMp3}
                onClick={downloadMp3Audio}
                className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-all active:scale-95 shadow-md shadow-blue-600/30 disabled:opacity-50"
                title="Tải xuống trực tiếp file âm thanh MP3 chuẩn (tên file chứa đầy đủ ngày giờ, lưu thẳng vào Downloads)"
              >
                <MorphIcon name="download" size={14} className={isConvertingMp3 ? 'animate-bounce text-white' : 'text-white'} />
                <span>{isConvertingMp3 ? 'Đang xuất MP3...' : 'Tải file MP3'}</span>
              </button>

              {/* Download Standard WAV */}
              <button
                type="button"
                onClick={downloadWavAudio}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full apple-pill hover:bg-white/15 text-xs font-medium text-slate-200 hover:text-white transition-all active:scale-95"
                title="Tải xuống file âm thanh chuẩn WAV 16-bit PCM chất lượng gốc (có đầy đủ ngày giờ)"
              >
                <MorphIcon name="download" size={13} className="text-emerald-400" />
                <span>Tải WAV</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
