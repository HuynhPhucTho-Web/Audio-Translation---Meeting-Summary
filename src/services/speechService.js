import { getLanguageByCode } from '../data/languages';

/**
 * SpeechService provides browser-native real-time Speech-To-Text (STT),
 * automatic spoken language detection, and on-the-fly multi-engine translation (Google GTX + Backend fallback).
 */

const LANG_TO_BCP47 = {
  auto: 'vi-VN',
  vi: 'vi-VN',
  en: 'en-US',
  zh: 'zh-CN',
  ja: 'ja-JP',
  ko: 'ko-KR',
  fr: 'fr-FR',
  de: 'de-DE',
  es: 'es-ES',
  it: 'it-IT',
  th: 'th-TH',
  ru: 'ru-RU',
  pt: 'pt-PT',
};

// Heuristic dictionaries for instant interim fallback
const VI_TO_EN_KEYWORDS = {
  'chúng ta': 'we',
  'tôi': 'I',
  'bạn': 'you',
  'cuộc họp': 'meeting',
  'hôm nay': 'today',
  'dự án': 'project',
  'tiến độ': 'progress',
  'thời hạn': 'deadline',
  'thứ sáu': 'Friday',
  'hoàn thành': 'finish',
  'bắt đầu': 'start',
  'lỗi': 'bug/issue',
  'ý kiến': 'opinion/idea',
  'quyết định': 'decision',
  'thống nhất': 'agreed',
  'cần': 'need to',
  'phát triển': 'develop',
  'kiểm tra': 'test/check',
  'báo cáo': 'report',
  'cảm ơn': 'thank you',
  'xin chào': 'hello',
};

const EN_TO_VI_KEYWORDS = {
  'the': '',
  'sun': 'mặt trời',
  'helps': 'giúp',
  'people': 'con người',
  'animals': 'động vật',
  'plants': 'thực vật',
  'live': 'sinh sống',
  'morning': 'buổi sáng',
  'beach': 'bãi biển',
  'we': 'chúng ta',
  'i': 'tôi',
  'you': 'bạn',
  'meeting': 'cuộc họp',
  'today': 'hôm nay',
  'project': 'dự án',
  'progress': 'tiến độ',
  'deadline': 'thời hạn',
  'friday': 'thứ Sáu',
  'finish': 'hoàn thành',
  'complete': 'hoàn thành',
  'start': 'bắt đầu',
  'issue': 'sự cố',
  'bug': 'lỗi',
  'problem': 'vấn đề',
  'decision': 'quyết định',
  'agree': 'đồng ý/thống nhất',
  'need': 'cần',
  'develop': 'phát triển',
  'test': 'kiểm thử',
  'report': 'báo cáo',
  'hello': 'xin chào',
};

const ZH_TO_VI_KEYWORDS = {
  '你好': 'xin chào',
  '谢谢': 'cảm ơn',
  '感谢': 'cảm ơn',
  '我们': 'chúng ta',
  '我': 'tôi',
  '你': 'bạn',
  '会议': 'cuộc họp',
  '今天': 'hôm nay',
  '项目': 'dự án',
  '进度': 'tiến độ',
  '截止': 'hạn chót (deadline)',
  '期限': 'thời hạn',
  '完成': 'hoàn thành',
  '开始': 'bắt đầu',
  '问题': 'vấn đề/sự cố',
  '错误': 'lỗi',
  '决定': 'quyết định',
  '同意': 'đồng ý/thống nhất',
  '需要': 'cần',
  '报告': 'báo cáo',
  '测试': 'kiểm thử',
  '开发': 'phát triển',
  '讨论': 'thảo luận',
  '很好': 'rất tốt',
  '明白': 'đã hiểu',
  '是的': 'vâng/đúng',
  '对': 'đúng',
  '不是': 'không phải',
};

const VI_TO_ZH_KEYWORDS = {
  'chúng ta': '我们',
  'tôi': '我',
  'bạn': '你',
  'cuộc họp': '会议',
  'hôm nay': '今天',
  'dự án': '项目',
  'tiến độ': '进度',
  'thời hạn': '截止时间',
  'hoàn thành': '完成',
  'bắt đầu': '开始',
  'lỗi': '错误/bug',
  'vấn đề': '问题',
  'quyết định': '决定',
  'đồng ý': '同意',
  'thống nhất': '达成一致',
  'cần': '需要',
  'báo cáo': '报告',
  'kiểm tra': '测试/检查',
  'cảm ơn': '谢谢',
  'xin chào': '你好',
};

const ZH_TO_EN_KEYWORDS = {
  '你好': 'hello',
  '谢谢': 'thank you',
  '感谢': 'thank you',
  '我们': 'we',
  '我': 'I',
  '你': 'you',
  '会议': 'meeting',
  '今天': 'today',
  '项目': 'project',
  '进度': 'progress',
  '截止': 'deadline',
  '期限': 'deadline',
  '完成': 'complete/finish',
  '开始': 'start',
  '问题': 'issue/problem',
  '错误': 'bug/error',
  '决定': 'decision',
  '同意': 'agree',
  '需要': 'need to',
  '报告': 'report',
  '测试': 'test',
  '开发': 'develop',
  '讨论': 'discuss',
};

const EN_TO_ZH_KEYWORDS = {
  'hello': '你好',
  'thank you': '谢谢',
  'we': '我们',
  'i': '我',
  'you': '你',
  'meeting': '会议',
  'today': '今天',
  'project': '项目',
  'progress': '进度',
  'deadline': '截止时间',
  'finish': '完成',
  'complete': '完成',
  'start': '开始',
  'issue': '问题',
  'bug': '错误',
  'decision': '决定',
  'agree': '同意',
  'need': '需要',
  'report': '报告',
  'test': '测试',
};

// Fast in-memory LRU-like translation caches
const translationCache = new Map();
const interimPrefixCache = new Map();

class SpeechService {
  constructor() {
    const SpeechRec = typeof window !== 'undefined'
      ? (window.SpeechRecognition || window.webkitSpeechRecognition)
      : null;

    this.SpeechRecognitionClass = SpeechRec;
    this.recognition = null;
    this.isListening = false;
    this.callbacks = {};
    this.currentTargetLang = 'vi';
    this.currentSpokenLang = 'auto';
    this.detectedLangCode = 'vi';
    this.lastDetectedLang = null;
    this.candidateLangCode = null;
    this.candidateLangCount = 0;
    this._silenceTimer = null;
    this.committedByIndex = new Map();
    this.finalSentenceBuffer = '';
    this.lastInterimText = '';
    this.lastInterimTranslation = '';
    this.lastInterimWordCount = 0;
    this.lastEmittedSentence = '';
    this.lastEmittedTime = 0;
  }

  isSupported() {
    return !!this.SpeechRecognitionClass;
  }

  start({
    onInterim,
    onSentence,
    onLanguageDetected,
    targetLang = 'vi',
    spokenLang = 'auto'
  }) {
    if (!this.isSupported()) {
      console.warn('[SpeechService] Browser does not support SpeechRecognition.');
      return false;
    }

    this.callbacks = { onInterim, onSentence, onLanguageDetected };
    this.currentTargetLang = targetLang;
    this.currentSpokenLang = spokenLang;
    this.isListening = true;
    this.candidateLangCode = null;
    this.candidateLangCount = 0;
    this.committedByIndex = new Map();
    this.finalSentenceBuffer = '';
    this.lastInterimText = '';
    this.lastInterimTranslation = '';
    this.lastInterimWordCount = 0;
    this.lastEmittedSentence = '';
    this.lastEmittedTime = 0;
    if (this._silenceTimer) {
      clearTimeout(this._silenceTimer);
      this._silenceTimer = null;
    }

    try {
      if (this.recognition) {
        try {
          this.recognition.abort();
        } catch (e) {}
      }

      this.recognition = new this.SpeechRecognitionClass();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;

      // Set initial recognition dialect
      let bcp = 'vi-VN';
      if (spokenLang !== 'auto') {
        bcp = LANG_TO_BCP47[spokenLang] || 'vi-VN';
      } else {
        bcp = this.lastDetectedLang && LANG_TO_BCP47[this.lastDetectedLang]
          ? LANG_TO_BCP47[this.lastDetectedLang]
          : 'vi-VN';
      }
      this.recognition.lang = bcp;

      this.recognition.onstart = () => {
        console.log('[SpeechService] Speech recognition started, lang:', this.recognition.lang);
      };

      this.recognition.onresult = async (event) => {
        let activeInterimText = '';
        let activeIndex = -1;
        let activeFullText = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          const rawTranscript = (res[0]?.transcript || '').replace(/\s+/g, ' ').trim();
          if (!rawTranscript) continue;

          activeIndex = i;
          activeFullText = rawTranscript;

          const alreadyCommitted = this.committedByIndex.get(i) || '';
          const normCommitted = alreadyCommitted.toLowerCase().replace(/[.,!?;:()"'`~]/g, '').trim();
          const normRaw = rawTranscript.toLowerCase().replace(/[.,!?;:()"'`~]/g, '').trim();

          let uncommitted = '';
          if (normCommitted) {
            if (normRaw === normCommitted) {
              uncommitted = '';
            } else if (normRaw.startsWith(normCommitted)) {
              uncommitted = rawTranscript.slice(alreadyCommitted.length).trim();
            } else if (rawTranscript.length > alreadyCommitted.length) {
              uncommitted = rawTranscript.slice(alreadyCommitted.length).trim();
            } else {
              uncommitted = '';
            }
          } else {
            uncommitted = rawTranscript;
          }

          if (res.isFinal) {
            // When browser engine marks isFinal on this result
            if (uncommitted && uncommitted.length >= 2) {
              await this._emitCompletedSentence(uncommitted);
            }
            this.committedByIndex.set(i, rawTranscript);
          } else {
            activeInterimText = uncommitted;
          }
        }

        // Cancel previous silence timer on every new speech event
        if (this._silenceTimer) {
          clearTimeout(this._silenceTimer);
          this._silenceTimer = null;
        }

        // 1. Immediate sentence break on terminal punctuation (. ! ? ; \n)
        if (activeInterimText && activeIndex >= 0) {
          const sentenceDelimiters = /(?<=[.!?])\s+|(?<=[;:])\s+/;
          if (sentenceDelimiters.test(activeInterimText)) {
            const parts = activeInterimText.split(sentenceDelimiters).filter(Boolean);
            if (parts.length > 1) {
              const toCommit = parts.slice(0, -1);
              for (const sentence of toCommit) {
                if (sentence.trim()) {
                  await this._emitCompletedSentence(sentence.trim());
                }
              }
              const remaining = parts[parts.length - 1].trim();
              const newCommittedLength = activeFullText.length - remaining.length;
              this.committedByIndex.set(activeIndex, activeFullText.slice(0, newCommittedLength).trim());
              activeInterimText = remaining;
            }
          }

          // 2. High-speed Silence Timer: Cut sentence and break into new line immediately on short pause (400ms - 550ms)
          if (activeInterimText.trim()) {
            const trimmed = activeInterimText.trim();
            const words = trimmed.split(/\s+/);

            // If utterance ends with natural sentence-closing marker in Vietnamese/English/Chinese, cut even faster (420ms)!
            const hasEndingMarker = /(nhé|ạ|rồi|nha|nhỉ|chưa|hả|vậy|thế|xong|thôi|luôn|ngay|ok|okay|yes|done|thanks|please|right|[.!?])$/i.test(trimmed);
            const silenceMs = hasEndingMarker ? 420 : (words.length >= 3 ? 500 : 600);

            const captureIndex = activeIndex;
            const captureFullText = activeFullText;
            const captureSentence = trimmed;

            this._silenceTimer = setTimeout(async () => {
              if (!this.isListening) return;
              if (captureSentence && captureSentence.length >= 2) {
                // Cut and break to new line right away!
                await this._emitCompletedSentence(captureSentence);
                this.committedByIndex.set(captureIndex, captureFullText);

                // Clear live interim subtitle immediately so next sentence starts fresh
                if (this.callbacks.onInterim) {
                  this.callbacks.onInterim({
                    speaker: 'Speaker (Bạn)',
                    originalText: '',
                    translatedText: '',
                    detectedLang: this.detectedLangCode,
                    isSpeaking: false,
                  });
                }
              }
            }, silenceMs);
          }
        }

        // Real-time language detection & stabilization (>= 2-3 consecutive detections before switching)
        if (activeInterimText) {
          const detected = this._detectLanguage(activeInterimText);
          if (detected) {
            if (detected.code !== this.detectedLangCode) {
              if (this.candidateLangCode === detected.code) {
                this.candidateLangCount += 1;
              } else {
                this.candidateLangCode = detected.code;
                this.candidateLangCount = 1;
              }

              // Only switch language when detected consecutively >= 3 times (prevents accidental restart on loanwords)
              if (this.candidateLangCount >= 3) {
                const prevLang = this.detectedLangCode;
                this.detectedLangCode = detected.code;
                this.lastDetectedLang = detected.code;
                this.candidateLangCode = null;
                this.candidateLangCount = 0;

                if (this.callbacks.onLanguageDetected) {
                  this.callbacks.onLanguageDetected(detected);
                }

                // If in 'auto' mode and user language stably shifted, update recognition dialect and restart seamlessly
                if (this.currentSpokenLang === 'auto' && this.recognition && prevLang !== detected.code) {
                  const targetBcp47 = LANG_TO_BCP47[detected.code] || 'vi-VN';
                  if (this.recognition.lang !== targetBcp47) {
                    this.recognition.lang = targetBcp47;
                    try {
                      // Trigger clean stop; onend will immediately restart with new language dialect
                      this.recognition.stop();
                    } catch (e) {}
                  }
                }
              }
            } else {
              this.candidateLangCode = null;
              this.candidateLangCount = 0;
            }
          }

          let targetLanguage = this.currentTargetLang || 'vi';
          if (targetLanguage === this.detectedLangCode) {
            targetLanguage = this.detectedLangCode === 'vi' ? 'en' : 'vi';
          }

          if (this.callbacks.onInterim) {
            // Cache theo prefix & word delta: chỉ dịch lại khi text tăng thêm >= 2 từ hoặc có dấu ngắt câu
            const interimWords = activeInterimText.trim().split(/\s+/).filter(Boolean);
            let quickTranslation = this.lastInterimTranslation || '';

            const wordDiff = Math.abs(interimWords.length - this.lastInterimWordCount);
            const isNewUtterance = !this.lastInterimText || !activeInterimText.startsWith(this.lastInterimText.slice(0, 10));

            if (isNewUtterance || wordDiff >= 2 || interimWords.length <= 2 || /[.!?]$/.test(activeInterimText)) {
              quickTranslation = this._quickTranslateWithPrefix(activeInterimText, this.detectedLangCode, targetLanguage);
              this.lastInterimText = activeInterimText;
              this.lastInterimTranslation = quickTranslation;
              this.lastInterimWordCount = interimWords.length;
            }

            this.callbacks.onInterim({
              speaker: 'Speaker (Bạn)',
              originalText: activeInterimText,
              translatedText: quickTranslation,
              detectedLang: this.detectedLangCode,
              isSpeaking: true,
            });
          }
        }
      };

      this.recognition.onerror = (event) => {
        if (event.error !== 'no-speech') {
          console.warn('[SpeechService] Recognition error:', event.error);
        }
      };

      this.recognition.onend = () => {
        // Immediate restart without intermediate processing to minimize audio gap
        if (this.isListening) {
          try {
            this.recognition.start();
          } catch (e) {
            setTimeout(() => {
              if (this.isListening && this.recognition) {
                try { this.recognition.start(); } catch (err) {}
              }
            }, 10);
          }
        }
      };

      this.recognition.start();
      return true;
    } catch (err) {
      console.error('[SpeechService] Failed to start recognition:', err);
      return false;
    }
  }

  stop() {
    this.isListening = false;
    if (this._silenceTimer) {
      clearTimeout(this._silenceTimer);
      this._silenceTimer = null;
    }
    if (this.committedByIndex) {
      this.committedByIndex.clear();
    }
    this.flushPendingSentence(true);
    if (this._interimTimeout) {
      clearTimeout(this._interimTimeout);
      this._interimTimeout = null;
    }
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        console.error(e);
      }
      this.recognition = null;
    }
  }

  pause() {
    this.isListening = false;
    if (this._silenceTimer) {
      clearTimeout(this._silenceTimer);
      this._silenceTimer = null;
    }
    this.flushPendingSentence(true);
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        console.error(e);
      }
    }
  }

  resume() {
    if (!this.isSupported()) {
      return false;
    }

    this.isListening = true;
    const callbacks = { ...this.callbacks };
    if (this.recognition) {
      try {
        this.recognition.start();
      } catch (e) {
        // Recognition already running or just restarted.
      }
      return true;
    }

    return this.start({
      ...callbacks,
      targetLang: this.currentTargetLang,
      spokenLang: this.currentSpokenLang,
    });
  }

  setSpokenLanguage(lang) {
    this.currentSpokenLang = lang;
    const targetBcp47 = lang === 'auto'
      ? (this.lastDetectedLang && LANG_TO_BCP47[this.lastDetectedLang] ? LANG_TO_BCP47[this.lastDetectedLang] : 'vi-VN')
      : (LANG_TO_BCP47[lang] || 'vi-VN');

    if (this.isListening) {
      const prevCallbacks = { ...this.callbacks };
      const currentTarget = this.currentTargetLang;
      this.stop();
      this.start({
        ...prevCallbacks,
        spokenLang: lang,
        targetLang: currentTarget,
      });
    }
  }

  setTargetLanguage(lang) {
    this.currentTargetLang = lang;
  }

  _splitCompletedSentences(text) {
    const normalized = (text || '').replace(/\s+/g, ' ').trim();
    if (!normalized) return [];

    const candidateSegments = normalized
      .split(/(?<=[.!?])\s+|(?<=[;:])\s+|(?<=,)\s+/)
      .map((segment) => segment.trim())
      .filter(Boolean);

    if (candidateSegments.length > 1) {
      const completeSegments = candidateSegments.slice(0, -1);
      this.finalSentenceBuffer = candidateSegments[candidateSegments.length - 1];
      return completeSegments;
    }

    if (normalized.length > 120) {
      const words = normalized.split(/\s+/);
      const maxWordsPerChunk = 12;
      const chunkCount = Math.ceil(words.length / maxWordsPerChunk);
      const chunks = [];

      for (let i = 0; i < chunkCount; i += 1) {
        const chunk = words.slice(i * maxWordsPerChunk, (i + 1) * maxWordsPerChunk).join(' ');
        if (chunk) chunks.push(chunk);
      }

      if (chunks.length > 1) {
        this.finalSentenceBuffer = chunks[chunks.length - 1];
        return chunks.slice(0, -1);
      }
    }

    this.finalSentenceBuffer = normalized;
    return [];
  }

  async _emitCompletedSentence(sentence) {
    const cleanSentence = (sentence || '').replace(/\s+/g, ' ').trim();
    if (!cleanSentence || cleanSentence.length < 2) return;

    // Deduplication check: ignore if identical or contained in recently emitted sentence within 4 seconds
    const normClean = cleanSentence.toLowerCase().replace(/[.,!?;:()"'`~]/g, '').trim();
    const now = Date.now();
    if (this.lastEmittedSentence && (now - this.lastEmittedTime < 4000)) {
      const normLast = this.lastEmittedSentence.toLowerCase().replace(/[.,!?;:()"'`~]/g, '').trim();
      if (normClean === normLast || normLast.endsWith(normClean) || normLast.startsWith(normClean)) {
        return;
      }
    }
    this.lastEmittedSentence = cleanSentence;
    this.lastEmittedTime = now;

    const detected = this._detectLanguage(cleanSentence) || { code: this.detectedLangCode, confidence: 98 };
    const category = this._classifyIntent(cleanSentence);
    const sourceForTranslation = this.currentSpokenLang === 'auto' ? 'auto' : detected.code;
    const targetLanguage = this.currentTargetLang || 'vi';
    const fullTranslation = await this._translateSentence(cleanSentence, sourceForTranslation, targetLanguage);

    if (!this.callbacks.onSentence) return;
    this.callbacks.onSentence({
      id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      speaker: 'Speaker (Bạn)',
      originalText: cleanSentence,
      originalLang: detected.code,
      translations: {
        [targetLanguage]: fullTranslation
      },
      category,
      confidence: detected.confidence || 98,
    });
  }

  flushPendingSentence(force = false) {
    const pendingText = (this.finalSentenceBuffer || '').replace(/\s+/g, ' ').trim();
    if (!pendingText) return;

    if (force || /[.!?]$/.test(pendingText)) {
      this._emitCompletedSentence(pendingText);
      this.finalSentenceBuffer = '';
      return;
    }

    if (pendingText.length > 45) {
      const words = pendingText.split(/\s+/);
      const splitAt = Math.max(6, Math.min(words.length, Math.ceil(words.length / 2)));
      const firstChunk = words.slice(0, splitAt).join(' ');
      const secondChunk = words.slice(splitAt).join(' ');

      if (firstChunk && secondChunk) {
        this._emitCompletedSentence(firstChunk);
        this.finalSentenceBuffer = secondChunk;
        return;
      }
    }

    this._emitCompletedSentence(pendingText);
    this.finalSentenceBuffer = '';
  }

  /**
   * Automatic Language Detection Engine (Supports Vietnamese, Chinese, English, Japanese, Korean, French, German, Spanish, Russian, Thai)
   */
  _detectLanguage(text) {
    if (!text || text.trim().length === 0) return null;
    const lower = text.toLowerCase();
    
    // 1. Chinese Hanzi (Simplified & Traditional)
    if (/[\u4e00-\u9fa5\u3400-\u4dbf]/.test(text)) {
      return { code: 'zh', name: 'Tiếng Trung (中文)', flag: '🇨🇳', confidence: 99 };
    }

    // 2. Japanese Hiragana / Katakana
    if (/[\u3040-\u30ff]/.test(text)) {
      return { code: 'ja', name: '日本語', flag: '🇯🇵', confidence: 99 };
    }

    // 3. Korean Hangul
    if (/[\uac00-\ud7af\u1100-\u11ff]/.test(text)) {
      return { code: 'ko', name: '한국어', flag: '🇰🇷', confidence: 99 };
    }

    // 4. Russian Cyrillic
    if (/[\u0400-\u04ff]/.test(text)) {
      return { code: 'ru', name: 'Русский', flag: '🇷🇺', confidence: 99 };
    }

    // 5. Thai script
    if (/[\u0e00-\u0e7f]/.test(text)) {
      return { code: 'th', name: 'ไทย', flag: '🇹🇭', confidence: 99 };
    }

    // 6. Vietnamese specific diacritics
    const viDiacriticsRegex = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
    if (viDiacriticsRegex.test(lower)) {
      return { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳', confidence: 99 };
    }

    // 7. Common Vietnamese words without accents
    const viWords = ['hom nay', 'chung ta', 'cuoc hop', 'tien do', 'hoan thanh', 'bao cao', 'ke hoach', 'du an', 'lam gi', 'khong', 'chua', 'duoc', 'anh', 'em', 'xin chao', 'cam on', 'nguoi', 'mat troi', 'ban', 'thoi gian', 'phien dich'];
    const hasViWord = viWords.some((w) => lower.includes(w));
    if (hasViWord) {
      return { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳', confidence: 96 };
    }

    // 8. French specific markers
    if (/[çœæ]|(\b(bonjour|merci|s'il vous plaît|oui|non|nous|vous|avec|dans|pour|est|sont|les|des)\b)/i.test(lower)) {
      return { code: 'fr', name: 'Français', flag: '🇫🇷', confidence: 95 };
    }

    // 9. German specific markers
    if (/[äöüß]|(\b(guten|morgen|danke|bitte|und|nicht|wir|sie|ist|sind|mit|für)\b)/i.test(lower)) {
      return { code: 'de', name: 'Deutsch', flag: '🇩🇪', confidence: 95 };
    }

    // 10. Spanish specific markers
    if (/[ñ¿¡]|(\b(hola|gracias|buenos|dias|por favor|nosotros|ustedes|con|para|los|las)\b)/i.test(lower)) {
      return { code: 'es', name: 'Español', flag: '🇪🇸', confidence: 95 };
    }

    // 11. English detection
    const enWords = [
      'the', 'we', 'and', 'project', 'deadline', 'hello', 'meeting', 'issue', 'complete',
      'today', 'schedule', 'finish', 'launch', 'api', 'backend', 'frontend', 'team',
      'discuss', 'good', 'morning', 'afternoon', 'agree', 'plan', 'task', 'release',
      'sun', 'earth', 'world', 'people', 'cold', 'dark', 'life', 'beach', 'water', 'helps',
      'animals', 'plants', 'without', 'would', 'there', 'live', 'rises', 'over', 'yes', 'no',
      'how', 'are', 'you', 'what', 'is', 'your', 'name', 'can', 'see'
    ];
    const words = lower.split(/\s+/);
    const matchCount = enWords.filter((w) => words.includes(w)).length;
    if (matchCount > 0 || (words.length >= 2 && /^[a-zA-Z0-9\s.,!?'"-]+$/.test(text))) {
      const confidence = Math.min(99, 90 + matchCount * 2);
      return { code: 'en', name: 'English', flag: '🇬🇧', confidence };
    }

    return null;
  }

  _classifyIntent(text) {
    const lower = text.toLowerCase();
    if (lower.includes('?') || lower.startsWith('có thể') || lower.startsWith('tại sao') || lower.startsWith('can we') || lower.startsWith('could') || lower.includes('吗') || lower.includes('什么')) {
      return 'question';
    }
    if (lower.includes('lỗi') || lower.includes('bug') || lower.includes('issue') || lower.includes('chậm') || lower.includes('problem') || lower.includes('问题') || lower.includes('错误')) {
      return 'problem';
    }
    if (lower.includes('thống nhất') || lower.includes('quyết định') || lower.includes('agree') || lower.includes('decide') || lower.includes('同意') || lower.includes('决定')) {
      return 'decision';
    }
    if (lower.includes('tôi sẽ') || lower.includes('i will') || lower.includes('hoàn thành') || lower.includes('kiểm thử') || lower.includes('action') || lower.includes('我会') || lower.includes('完成')) {
      return 'action';
    }
    if (lower.includes('deadline') || lower.includes('hạn') || lower.includes('thứ sáu') || lower.includes('ngày') || lower.includes('friday') || lower.includes('截止') || lower.includes('期限')) {
      return 'deadline';
    }
    if (lower.includes('nên') || lower.includes('ý tưởng') || lower.includes('idea') || lower.includes('suggest') || lower.includes('建议') || lower.includes('想法')) {
      return 'idea';
    }
    return 'statement';
  }

  _quickTranslateRaw(text, sourceLang, targetLang) {
    if (!text || sourceLang === targetLang) return text;

    if (sourceLang === 'vi' && targetLang === 'en') {
      let result = text;
      Object.entries(VI_TO_EN_KEYWORDS).forEach(([vi, en]) => {
        result = result.replace(new RegExp(vi, 'gi'), en);
      });
      return result;
    }

    if (sourceLang === 'en' && targetLang === 'vi') {
      let result = text;
      Object.entries(EN_TO_VI_KEYWORDS).forEach(([en, vi]) => {
        result = result.replace(new RegExp(`\\b${en}\\b`, 'gi'), vi);
      });
      return result;
    }

    if (sourceLang === 'zh' && targetLang === 'vi') {
      let result = text;
      Object.entries(ZH_TO_VI_KEYWORDS).forEach(([zh, vi]) => {
        result = result.replace(new RegExp(zh, 'g'), vi);
      });
      return result;
    }

    if (sourceLang === 'vi' && targetLang === 'zh') {
      let result = text;
      Object.entries(VI_TO_ZH_KEYWORDS).forEach(([vi, zh]) => {
        result = result.replace(new RegExp(vi, 'gi'), zh);
      });
      return result;
    }

    if (sourceLang === 'zh' && targetLang === 'en') {
      let result = text;
      Object.entries(ZH_TO_EN_KEYWORDS).forEach(([zh, en]) => {
        result = result.replace(new RegExp(zh, 'g'), en);
      });
      return result;
    }

    if (sourceLang === 'en' && targetLang === 'zh') {
      let result = text;
      Object.entries(EN_TO_ZH_KEYWORDS).forEach(([en, zh]) => {
        result = result.replace(new RegExp(`\\b${en}\\b`, 'gi'), zh);
      });
      return result;
    }

    return text;
  }

  /**
   * Prefix-aware interim translation: reuses cached prefix translation
   * and only translates newly added suffix words.
   */
  _quickTranslateWithPrefix(text, sourceLang, targetLang) {
    if (!text || !text.trim() || sourceLang === targetLang) return text;
    const cleanText = text.trim();
    const cacheKey = `${sourceLang}->${targetLang}:${cleanText.toLowerCase()}`;

    // 1. Exact match in prefix cache (0ms)
    if (interimPrefixCache.has(cacheKey)) {
      return interimPrefixCache.get(cacheKey);
    }

    // 2. Prefix lookup: find the longest matching cached word prefix
    const words = cleanText.split(/\s+/);
    if (words.length > 2) {
      for (let i = words.length - 1; i >= 1; i--) {
        const prefix = words.slice(0, i).join(' ');
        const prefixKey = `${sourceLang}->${targetLang}:${prefix.toLowerCase()}`;
        if (interimPrefixCache.has(prefixKey)) {
          const cachedPrefixTrans = interimPrefixCache.get(prefixKey);
          const suffix = words.slice(i).join(' ');
          const suffixTrans = this._quickTranslateRaw(suffix, sourceLang, targetLang);
          const combined = `${cachedPrefixTrans} ${suffixTrans}`.trim();
          interimPrefixCache.set(cacheKey, combined);
          return combined;
        }
      }
    }

    // 3. Fallback to raw dictionary translation & cache
    const result = this._quickTranslateRaw(cleanText, sourceLang, targetLang);
    if (interimPrefixCache.size > 800) {
      interimPrefixCache.clear();
    }
    interimPrefixCache.set(cacheKey, result);
    return result;
  }

  _quickTranslate(text, sourceLang, targetLang) {
    return this._quickTranslateWithPrefix(text, sourceLang, targetLang);
  }

  /**
   * Real, full sentence translation using Google Translate GTX public API
   * with fallback to Backend /api/translate and instant dictionary.
   * Timeouts strictly capped at 1000ms to avoid translation queue congestion.
   */
  async _translateSentence(text, sourceLang, targetLang) {
    if (!text || !text.trim() || sourceLang === targetLang) return text;

    const cleanText = text.trim();
    const sl = sourceLang === 'zh' ? 'zh-CN' : (sourceLang || 'auto');
    const tl = targetLang === 'zh' ? 'zh-CN' : (targetLang || 'vi');

    // 0. Check fast cache (0ms)
    const cacheKey = `${sl}->${tl}:${cleanText.toLowerCase()}`;
    if (translationCache.has(cacheKey)) {
      return translationCache.get(cacheKey);
    }

    // 1. Direct Google Translate GTX (Fastest, zero config, supports Chinese, Vietnamese, English, etc.)
    // Timeout set to 1000ms for ultra-fast fallback when network is slow
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);

      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(cleanText)}`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data[0])) {
          const translated = data[0].map((item) => item[0]).filter(Boolean).join('');
          if (translated && translated.trim()) {
            const finalResult = translated.trim();
            translationCache.set(cacheKey, finalResult);

            // Also notify detected language if sl was auto
            if (data[2] && this.callbacks.onLanguageDetected) {
              const detectedCode = data[2] === 'zh-CN' ? 'zh' : data[2];
              if (detectedCode && detectedCode !== this.detectedLangCode) {
                this.detectedLangCode = detectedCode;
                this.lastDetectedLang = detectedCode;
                const langObj = getLanguageByCode(detectedCode);
                this.callbacks.onLanguageDetected({
                  code: langObj.code,
                  name: langObj.name,
                  flag: langObj.flag,
                  confidence: 99
                });
              }
            }
            return finalResult;
          }
        }
      }
    } catch (e) {
      // Abort or network failure (<1000ms)
    }

    // 2. Second attempt: Backend /api/translate with 1000ms timeout
    try {
      const backendController = new AbortController();
      const backendTimeoutId = setTimeout(() => backendController.abort(), 1000);

      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText, sourceLang: sl, targetLang: tl }),
        signal: backendController.signal
      });
      clearTimeout(backendTimeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.translations && data.translations[targetLang]) {
          const trans = data.translations[targetLang];
          if (!trans.startsWith('[') || trans.includes('] ')) {
            const finalResult = trans.replace(/^\[[A-Z]+\]\s*/, '').trim();
            translationCache.set(cacheKey, finalResult);
            return finalResult;
          }
        }
      }
    } catch (e) {
      // Backend not running or timeout
    }

    // 3. Fallback: Quick keyword dictionary translation with prefix cache
    const fallbackQuick = this._quickTranslateWithPrefix(cleanText, sourceLang, targetLang);
    return fallbackQuick;
  }
}

export const speechService = new SpeechService();
