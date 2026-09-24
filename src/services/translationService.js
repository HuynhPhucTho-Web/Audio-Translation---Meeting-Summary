/**
 * TranslationService handles Text-to-Speech (TTS) playback and direct REST translation queries
 */
class TranslationService {
  constructor() {
    this.speechSynth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  }

  /**
   * Speak out text in the specified language using Web Speech Synthesis
   */
  speakText(text, langCode = 'vi') {
    if (!this.speechSynth || !text) return;

    // Stop current speech
    this.speechSynth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Map short codes to BCP 47 language tags
    const langMap = {
      vi: 'vi-VN',
      en: 'en-US',
      ja: 'ja-JP',
      ko: 'ko-KR',
      zh: 'zh-CN',
      fr: 'fr-FR',
      de: 'de-DE',
      es: 'es-ES',
      it: 'it-IT',
      th: 'th-TH',
      ru: 'ru-RU',
      pt: 'pt-PT',
    };

    utterance.lang = langMap[langCode] || 'vi-VN';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Try finding an exact voice
    const voices = this.speechSynth.getVoices();
    const matchedVoice = voices.find((v) => v.lang.startsWith(langCode));
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    this.speechSynth.speak(utterance);
  }

  stopSpeaking() {
    if (this.speechSynth) {
      this.speechSynth.cancel();
    }
  }

  /**
   * Direct translation call: tries backend /api/translate first, then Google Translate GTX
   */
  async translateText(text, sourceLang = 'auto', targetLang = 'vi', apiKey = '') {
    if (!text || !text.trim() || sourceLang === targetLang) {
      return { translatedText: text, detectedLang: sourceLang, category: 'statement' };
    }

    const sl = sourceLang === 'zh' ? 'zh-CN' : (sourceLang || 'auto');
    const tl = targetLang === 'zh' ? 'zh-CN' : (targetLang || 'vi');

    // 1. Try backend
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'X-OpenAI-Key': apiKey } : {})
        },
        body: JSON.stringify({
          text,
          sourceLang: sl,
          targetLang: tl
        })
      });

      if (response.ok) {
        const json = await response.json();
        if (json.translations && json.translations[targetLang]) {
          return {
            translatedText: json.translations[targetLang],
            detectedLang: json.detectedLang || sourceLang,
            category: json.category || 'statement'
          };
        }
      }
    } catch (err) {
      // Backend not running
    }

    // 2. Direct Google Translate GTX (supports Chinese, Vietnamese, English, etc.)
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data[0])) {
          const translated = data[0].map((item) => item[0]).filter(Boolean).join('');
          return {
            translatedText: translated.trim() || text,
            detectedLang: data[2] || sourceLang,
            category: 'statement'
          };
        }
      }
    } catch (e) {
      console.warn('Google GTX error:', e);
    }

    return {
      translatedText: text,
      detectedLang: sourceLang || 'en',
      category: 'statement'
    };
  }
}

export const translationService = new TranslationService();
