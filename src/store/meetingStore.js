import { create } from 'zustand';
import { getTranslation } from '../i18n/translations';

// Pre-load saved meetings from localStorage
const getSavedMeetingsFromStorage = () => {
  try {
    const data = localStorage.getItem('ai_meeting_history');
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load meetings history:', e);
    return [];
  }
};

const defaultSettings = {
  apiKey: '',
  groqApiKey: '',
  geminiApiKey: '',
  aiProvider: 'groq', // 'groq' | 'gemini' | 'openai'
  endpoint: '/api',
  modelChat: 'gpt-4o-mini',
  modelSTT: 'whisper-1',
  autoTTS: false,
  audioDeviceId: 'default',
};

const getStoredSettings = () => {
  try {
    const data = localStorage.getItem('ai_meeting_settings');
    return data ? { ...defaultSettings, ...JSON.parse(data) } : defaultSettings;
  } catch (e) {
    return defaultSettings;
  }
};

/**
 * Groups sentence-by-sentence transcript items into larger continuous paragraph blocks per speaker
 */
export function groupTranscriptIntoParagraphs(items = []) {
  if (!items || items.length === 0) return [];
  const paragraphs = [];
  let current = null;

  for (const item of items) {
    if (!current) {
      current = {
        ...item,
        originalSentences: [item.originalText],
        subItems: [item],
        startTimestamp: item.timestamp,
        endTimestamp: item.timestamp,
      };
      continue;
    }

    // Merge consecutive sentences from the same speaker
    if (item.speaker === current.speaker) {
      current.originalText = `${current.originalText}\n${item.originalText}`.trim();
      current.originalSentences.push(item.originalText);
      current.subItems.push(item);
      current.endTimestamp = item.timestamp;

      // Merge translations with newlines so each sentence has its own line
      const mergedTranslations = { ...current.translations };
      Object.entries(item.translations || {}).forEach(([lang, trans]) => {
        if (trans && trans.trim()) {
          mergedTranslations[lang] = mergedTranslations[lang]
            ? `${mergedTranslations[lang]}\n${trans.trim()}`
            : trans.trim();
        }
      });
      current.translations = mergedTranslations;
    } else {
      paragraphs.push(current);
      current = {
        ...item,
        originalSentences: [item.originalText],
        subItems: [item],
        startTimestamp: item.timestamp,
        endTimestamp: item.timestamp,
      };
    }
  }

  if (current) {
    paragraphs.push(current);
  }

  return paragraphs;
}

export const useMeetingStore = create((set, get) => ({
  // Entire Website UI Language
  uiLanguage: (typeof window !== 'undefined' && localStorage.getItem('ai_meeting_ui_lang')) || 'vi',
  setUiLanguage: (lang) => {
    try {
      localStorage.setItem('ai_meeting_ui_lang', lang);
    } catch (e) {}
    set({ uiLanguage: lang });
  },
  t: (path) => getTranslation(get().uiLanguage, path),

  // Meeting Status
  isRecording: false,
  isPaused: false,
  recordingTime: 0,
  meetingStartTime: null,
  activeTab: 'live', // 'live' | 'transcript' | 'summary'

  // Language Detection & Translation Settings
  detectedLanguage: {
    code: 'auto',
    name: 'Tự động phát hiện',
    flag: '✨',
    confidence: 100,
  },
  targetLanguages: ['vi'], // default to Vietnamese
  primaryTargetLanguage: 'vi',

  // Live Subtitle Stream
  liveSubtitle: {
    speaker: 'Speaker 1',
    originalText: '',
    translatedText: '',
    detectedLang: 'auto',
    isSpeaking: false,
  },

  // Audio Recording Playback
  recordedAudioUrl: null,
  recordedAudioBlob: null,
  spokenInputLanguage: 'auto', // Default to auto-detect language!

  // Audio Waveform & Level
  audioVolume: 0,
  waveformBars: new Array(24).fill(10),

  // Transcript History & Modes
  transcript: [],
  transcriptMode: 'sentence', // 'sentence' (theo câu) | 'paragraph' (theo đoạn lớn)
  showTranslation: true, // Nút bật/tắt hiển thị bản dịch bên dưới
  searchQuery: '',
  selectedCategoryFilter: 'all',
  selectedSpeakerFilter: 'all',

  setTranscriptMode: (mode) => set({ transcriptMode: mode }),
  setShowTranslation: (show) => set({ showTranslation: show }),
  toggleShowTranslation: () => set((state) => ({ showTranslation: !state.showTranslation })),

  // Meeting Analysis & Summary
  participants: ['Speaker 1', 'Speaker 2'],
  topics: [],
  decisions: [],
  actionItems: [],
  summaryText: '',
  isAnalyzing: false,

  // Settings & Modal
  isSettingsOpen: false,
  settings: getStoredSettings(),

  // Meeting History List
  savedMeetings: getSavedMeetingsFromStorage(),

  // Actions
  setActiveTab: (tab) => set({ activeTab: tab }),

  setIsSettingsOpen: (open) => set({ isSettingsOpen: open }),

  updateSettings: (newSettings) => {
    set((state) => {
      const merged = { ...state.settings, ...newSettings };
      try {
        localStorage.setItem('ai_meeting_settings', JSON.stringify(merged));
      } catch (err) {
        console.error(err);
      }
      return { settings: merged };
    });
  },

  setRecording: (status) => set({
    isRecording: status,
    isPaused: false,
    meetingStartTime: status ? (get().meetingStartTime || new Date().toISOString()) : get().meetingStartTime
  }),

  setPaused: (status) => set({ isPaused: status }),

  incrementTimer: () => set((state) => ({ recordingTime: state.recordingTime + 1 })),

  resetMeeting: () => set({
    isRecording: false,
    isPaused: false,
    recordingTime: 0,
    meetingStartTime: null,
    liveSubtitle: {
      speaker: 'Speaker 1',
      originalText: '',
      translatedText: '',
      detectedLang: 'auto',
      isSpeaking: false,
    },
    detectedLanguage: {
      code: 'auto',
      name: 'Tự động phát hiện',
      flag: '✨',
      confidence: 100,
    },
    audioVolume: 0,
    recordedAudioUrl: null,
    recordedAudioBlob: null,
    transcript: [],
    topics: [],
    decisions: [],
    actionItems: [],
    summaryText: '',
    isAnalyzing: false,
    activeTab: 'live',
  }),

  setRecordedAudio: (url, blob) => set({ recordedAudioUrl: url, recordedAudioBlob: blob }),
  clearRecordedAudio: () => set({ recordedAudioUrl: null, recordedAudioBlob: null }),
  setSpokenInputLanguage: (lang) => set({ spokenInputLanguage: lang }),

  setDetectedLanguage: (lang) => set({ detectedLanguage: lang }),

  setPrimaryTargetLanguage: (code) => {
    set((state) => {
      const existing = state.targetLanguages.filter((l) => l !== code);
      return {
        primaryTargetLanguage: code,
        targetLanguages: [code, ...existing]
      };
    });
  },

  addTargetLanguage: (code) => {
    set((state) => {
      if (state.targetLanguages.includes(code)) return state;
      return { targetLanguages: [...state.targetLanguages, code] };
    });
  },

  removeTargetLanguage: (code) => {
    set((state) => {
      if (state.targetLanguages.length <= 1) return state; // keep at least one
      const updated = state.targetLanguages.filter((l) => l !== code);
      return {
        targetLanguages: updated,
        primaryTargetLanguage: updated[0]
      };
    });
  },

  setLiveSubtitle: (subtitleData) => set((state) => ({
    liveSubtitle: { ...state.liveSubtitle, ...subtitleData }
  })),

  setAudioVolume: (vol) => set({ audioVolume: Math.min(100, Math.max(0, vol)) }),

  setWaveformBars: (bars) => set({ waveformBars: bars }),

  // Add a completed sentence to transcript with smart deduplication
  addTranscriptMessage: (message) => set((state) => {
    const rawText = (message.originalText || '').replace(/\s+/g, ' ').trim();
    if (!rawText || rawText.length < 2) return state;

    const normalize = (s) => (s || '').toLowerCase().replace(/[.,!?;:()"'`~]/g, '').replace(/\s+/g, ' ').trim();
    const normNew = normalize(rawText);

    // Smart deduplication: check against recent transcript items
    if (state.transcript.length > 0) {
      const lastMsg = state.transcript[state.transcript.length - 1];
      const normLast = normalize(lastMsg.originalText);

      // 1. Exact match (ignoring case & punctuation) -> discard duplicate
      if (normNew === normLast) {
        return {
          liveSubtitle: {
            ...state.liveSubtitle,
            originalText: '',
            translatedText: '',
            isSpeaking: false
          }
        };
      }

      // 2. If new message is already fully contained at the end/start of last message -> discard
      if (normLast.endsWith(normNew) || normLast.startsWith(normNew)) {
        return {
          liveSubtitle: {
            ...state.liveSubtitle,
            originalText: '',
            translatedText: '',
            isSpeaking: false
          }
        };
      }

      // 3. If last message was a prefix of the new message (e.g. cut by silence timer, then final speech completed it)
      // Upgrade the existing message instead of creating a duplicated line!
      if (normNew.startsWith(normLast) && normNew.length > normLast.length) {
        const updatedTranscript = [...state.transcript];
        updatedTranscript[updatedTranscript.length - 1] = {
          ...lastMsg,
          originalText: rawText,
          translations: { ...lastMsg.translations, ...(message.translations || {}) },
          category: message.category || lastMsg.category,
        };
        return {
          transcript: updatedTranscript,
          liveSubtitle: {
            ...state.liveSubtitle,
            originalText: '',
            translatedText: '',
            isSpeaking: false
          }
        };
      }
    }

    const newMessage = {
      id: message.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: message.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      speaker: message.speaker || 'Speaker 1',
      originalText: rawText,
      originalLang: message.originalLang || state.detectedLanguage.code,
      translations: message.translations || {},
      category: message.category || 'statement',
      confidence: message.confidence || 95,
    };

    // Auto-discover unique participants
    const updatedParticipants = Array.from(new Set([...state.participants, newMessage.speaker]));

    return {
      transcript: [...state.transcript, newMessage],
      participants: updatedParticipants,
      // Clear live text when committed
      liveSubtitle: {
        ...state.liveSubtitle,
        originalText: '',
        translatedText: '',
        isSpeaking: false
      }
    };
  }),

  setSearchQuery: (query) => set({ searchQuery: query }),
  setCategoryFilter: (cat) => set({ selectedCategoryFilter: cat }),
  setSpeakerFilter: (speaker) => set({ selectedSpeakerFilter: speaker }),

  setAnalysisData: (data) => set({
    topics: data.topics || [],
    decisions: data.decisions || [],
    actionItems: data.actionItems || [],
    summaryText: data.summaryText || '',
    participants: data.participants || get().participants,
    isAnalyzing: false,
  }),

  setIsAnalyzing: (status) => set({ isAnalyzing: status }),

  toggleActionItem: (id) => set((state) => ({
    actionItems: state.actionItems.map((item) =>
      item.id === id ? { ...item, completed: !item.completed } : item
    )
  })),

  // Save current meeting to localStorage
  saveCurrentMeeting: () => {
    const state = get();
    if (state.transcript.length === 0 && !state.summaryText) return;

    const newMeeting = {
      id: `meeting-${Date.now()}`,
      date: new Date().toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }),
      duration: state.recordingTime,
      participants: state.participants,
      transcript: state.transcript,
      topics: state.topics,
      decisions: state.decisions,
      actionItems: state.actionItems,
      summaryText: state.summaryText,
      primaryLang: state.detectedLanguage.name,
      targetLang: state.primaryTargetLanguage,
    };

    const updated = [newMeeting, ...state.savedMeetings];
    set({ savedMeetings: updated });
    try {
      localStorage.setItem('ai_meeting_history', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save to local storage', e);
    }
    return newMeeting;
  },

  deleteMeetingHistory: (id) => {
    set((state) => {
      const updated = state.savedMeetings.filter((m) => m.id !== id);
      try {
        localStorage.setItem('ai_meeting_history', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return { savedMeetings: updated };
    });
  },

  loadMeetingFromHistory: (meeting) => {
    set({
      transcript: meeting.transcript || [],
      participants: meeting.participants || [],
      topics: meeting.topics || [],
      decisions: meeting.decisions || [],
      actionItems: meeting.actionItems || [],
      summaryText: meeting.summaryText || '',
      recordingTime: meeting.duration || 0,
      activeTab: 'summary',
    });
  }
}));
