import React, { useEffect, useRef, useState } from 'react';
import MorphIcon from '../MorphIcon/MorphIcon';
import { useMeetingStore } from '../../store/meetingStore';
import { audioService } from '../../services/audioService';
import { speechService } from '../../services/speechService';
import { realtimeService } from '../../services/realtimeService';
import { summaryService } from '../../services/summaryService';
import { getLanguageByCode } from '../../data/languages';
import Waveform from '../Waveform/Waveform';
import './AudioRecorder.css';

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
    setRecordedAudio,
    clearRecordedAudio,
    spokenInputLanguage,
  } = useMeetingStore();

  const timerRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playbackCurrentTime, setPlaybackCurrentTime] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);

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
          confidence: data.confidence || 98
        });
      }
    };
    realtimeService.on('language_detected', handleBackendLangDetected);
    return () => {
      realtimeService.off('language_detected', handleBackendLangDetected);
    };
  }, [setDetectedLanguage]);

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

    // 1. Start Audio Capture & Recording to Blob
    const result = await audioService.startRecording({
      deviceId: settings.audioDeviceId,
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
      alert(`Không thể truy cập microphone: ${result.error}.\nVui lòng cấp quyền truy cập Microphone trong trình duyệt (biểu tượng ổ khóa/mic trên thanh địa chỉ) để ghi âm trực tiếp!`);
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
    // 1. Stop Speech Recognition
    speechService.stop();

    // 2. Stop Audio Recording and get recorded Blob & URL
    const { blob, url } = await audioService.stopRecording();
    if (url) {
      setRecordedAudio(url, blob);
    }

    setRecording(false);
    setAudioVolume(0);
    setWaveformBars(new Array(24).fill(10));

    // 4. Trigger AI Summary in background
    setIsAnalyzing(true);
    const state = useMeetingStore.getState();
    summaryService.generateSummary(
      state.transcript,
      state.primaryTargetLanguage,
      state.settings.apiKey
    ).then((summaryResult) => {
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

  const downloadAudioFile = () => {
    if (!recordedAudioUrl) return;
    const a = document.createElement('a');
    a.href = recordedAudioUrl;
    a.download = `Meeting_Recording_${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="w-full apple-glass rounded-2xl p-3 sm:px-5 sm:py-3.5 border border-white/10 shadow-xl space-y-3">
      {/* Upper Row: Direct Record Button, Status & Waveform */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left Side: Apple-style Direct Record Button & Status */}
        <div className="flex items-center gap-4 w-full md:w-auto">
          {/* Signature Apple Record Button */}
          <div className="relative flex items-center justify-center">
            {isRecording && !isPaused && (
              <span className="absolute -inset-1.5 rounded-full bg-rose-500/30 animate-ping opacity-75" />
            )}

            <button
              type="button"
              onClick={handleRecordButtonClick}
              className={`w-14 h-14 rounded-full border-2 p-1 flex items-center justify-center transition-all duration-200 active:scale-90 shadow-lg ${
                isRecording
                  ? 'border-rose-500/70 apple-record-pulse'
                  : 'border-white/30 hover:border-white/60 hover:scale-105'
              }`}
              title={isRecording ? 'Nhấn để kết thúc và lưu đoạn ghi âm' : 'Nhấn để bắt đầu ghi âm trực tiếp'}
            >
              <div
                className={`flex items-center justify-center transition-all duration-300 ${
                  isRecording
                    ? 'w-6 h-6 rounded-md bg-rose-500 shadow-rose-500/50'
                    : 'w-full h-full rounded-full bg-rose-500 hover:bg-rose-600 shadow-rose-500/40 text-white'
                }`}
              >
                {!isRecording && <MorphIcon name="mic" size={24} color="#ffffff" />}
              </div>
            </button>
          </div>

          {/* Status Label & Timer */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {isRecording
                  ? (isPaused ? 'Tạm dừng ghi' : 'Đang thu âm trực tiếp')
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
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {isRecording ? (
            <>
              {/* Pause / Resume Button */}
              <button
                type="button"
                onClick={handleTogglePause}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full apple-pill hover:bg-white/15 text-xs sm:text-sm font-semibold text-white transition-all active:scale-95"
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
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-rose-500 hover:bg-rose-600 text-xs sm:text-sm font-semibold text-white transition-all shadow-md active:scale-95"
              >
                <MorphIcon name="record" state="square" size={14} color="#ffffff" />
                <span>{t('recorder.stopAndSave')}</span>
              </button>
            </>
          ) : (
            <>
              {transcript.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(t('recorder.clearConfirm'))) {
                      resetMeeting();
                    }
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-full apple-pill hover:bg-rose-500/20 text-xs font-medium text-slate-300 hover:text-rose-300 transition-all active:scale-95"
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

      {/* Lower Row: Apple Recorded Audio Player (Phát lại đoạn ghi âm) */}
      {recordedAudioUrl && !isRecording && (
        <div className="w-full pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn">
          {/* Hidden HTML5 Audio Element */}
          <audio
            ref={audioPlayerRef}
            src={recordedAudioUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleTimeUpdate}
            onEnded={handleAudioEnded}
          />

          {/* Left: Play/Pause button & Audio Progress Scrub */}
          <div className="flex items-center gap-3 w-full sm:flex-1">
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

            {/* Scrub Slider */}
            <div className="flex-1 flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400 w-14 text-right shrink-0">
                {formatTime(playbackCurrentTime)}
              </span>
              <input
                type="range"
                min="0"
                max={Number.isFinite(playbackDuration) && playbackDuration > 0 ? playbackDuration : (recordingTime > 0 ? recordingTime : 1)}
                step="0.1"
                value={Math.min(playbackCurrentTime, Number.isFinite(playbackDuration) && playbackDuration > 0 ? playbackDuration : (recordingTime > 0 ? recordingTime : 1))}
                onChange={handleSeek}
                className="flex-1 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <span className="text-[11px] font-mono text-slate-400 w-14 shrink-0">
                {formatTime(Number.isFinite(playbackDuration) && playbackDuration > 0 ? playbackDuration : recordingTime)}
              </span>
            </div>
          </div>

          {/* Right: Download Audio & Re-record Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={downloadAudioFile}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full apple-pill hover:bg-white/15 text-xs font-semibold text-slate-200 hover:text-white transition-all active:scale-95"
              title={t('recorder.downloadAudio')}
            >
              <MorphIcon name="download" size={15} className="text-blue-400" />
              <span>{t('recorder.downloadAudio')}</span>
            </button>

            <button
              type="button"
              onClick={() => handleStart()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full apple-pill hover:bg-white/15 text-xs font-semibold text-slate-200 hover:text-white transition-all active:scale-95"
              title={t('recorder.reRecord')}
            >
              <MorphIcon name="rotate-ccw" size={15} className="text-slate-400" />
              <span>{t('recorder.reRecord')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
