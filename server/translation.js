import OpenAI from 'openai';

// Do not hard-code API keys in source. Use environment variables.
const DEFAULT_GROQ_KEY = process.env.GROQ_API_KEY || '';
const DEFAULT_GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const DEFAULT_OPENAI_KEY = process.env.OPENAI_API_KEY || '';

/**
 * Translation & Classification Service using Groq Llama-3.3 70B, Google Gemini, and Google GTX.
 */
export class TranslationService {
  constructor(apiKey = (process.env.OPENAI_API_KEY || DEFAULT_OPENAI_KEY)) {
    this.apiKey = apiKey;
    this.groqKey = process.env.GROQ_API_KEY || DEFAULT_GROQ_KEY;
    this.geminiKey = process.env.GEMINI_API_KEY || DEFAULT_GEMINI_KEY;
    this.openai = apiKey ? new OpenAI({ apiKey }) : null;
  }

  setApiKey(key) {
    if (key && key !== this.apiKey) {
      this.apiKey = key;
      this.openai = new OpenAI({ apiKey: key });
    }
  }

  /**
   * Translate text into specified target languages and classify sentence type
   * @param {string} text 
   * @param {string[]} targetLanguages (e.g. ['vi', 'ja', 'ko'])
   * @param {string} sourceLang (e.g. 'en')
   */
  async translateAndClassify(text, targetLanguages = ['vi'], sourceLang = 'auto') {
    if (!text || text.trim() === '') {
      return { translations: {}, category: 'statement' };
    }

    const prompt = `
You are an expert real-time meeting translator and conversational analyst.
Analyze the following spoken meeting sentence:
Sentence: "${text}"
Original Language: ${sourceLang}
Target Translation Languages: ${targetLanguages.join(', ')}

Perform two tasks:
1. Translate the sentence accurately into each of the requested target languages.
2. Classify the sentence into EXACTLY ONE of these categories based on its meeting intent:
   - "statement" (general facts or comments)
   - "question" (asking for information or clarification)
   - "idea" (suggestions, proposals, creative thoughts)
   - "problem" (bugs, blockers, delays, errors)
   - "decision" (agreed-upon choices, resolutions, official consensus)
   - "action" (assigned tasks, commitments to do something)
   - "deadline" (time commitments, due dates, milestones)

Output strictly valid JSON with this format:
{
  "category": "statement" | "question" | "idea" | "problem" | "decision" | "action" | "deadline",
  "translations": {
    "vi": "Vietnamese translation...",
    "ja": "Japanese translation..."
  }
}
`;

    // 1. Primary: Groq Llama-3.3 70B (Siêu tốc ~200ms, không lag, không lỗi connection)
    const groqKey = process.env.GROQ_API_KEY || this.groqKey || DEFAULT_GROQ_KEY;
    if (groqKey) {
      try {
        const groqClient = new OpenAI({
          apiKey: groqKey,
          baseURL: 'https://api.groq.com/openai/v1',
          timeout: 4000,
        });

        const response = await groqClient.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'You output only JSON without markdown markers.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.2,
          response_format: { type: 'json_object' }
        });

        const raw = response.choices[0]?.message?.content || '{}';
        const parsed = JSON.parse(raw);
        if (parsed.translations && Object.keys(parsed.translations).length > 0) {
          return {
            category: parsed.category || 'statement',
            translations: parsed.translations
          };
        }
      } catch (groqErr) {
        console.warn('[Translation] Groq error, trying Gemini fallback:', groqErr?.message || groqErr);
      }
    }

    // 2. Secondary: Google Gemini 1.5 Flash
    const geminiKey = process.env.GEMINI_API_KEY || this.geminiKey || DEFAULT_GEMINI_KEY;
    if (geminiKey) {
      try {
        const geminiResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
          })
        });

        if (geminiResp.ok) {
          const geminiData = await geminiResp.json();
          const txt = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
          const parsed = JSON.parse(txt);
          if (parsed.translations && Object.keys(parsed.translations).length > 0) {
            return {
              category: parsed.category || 'statement',
              translations: parsed.translations
            };
          }
        }
      } catch (geminiErr) {
        console.warn('[Translation] Gemini error, trying Google Translate fallback:', geminiErr?.message || geminiErr);
      }
    }

    // 3. Fallback: Google Translate GTX (Free, ultra-fast, zero dependencies)
    return this._realTranslateAndClassify(text, targetLanguages, sourceLang);
  }

  async _realTranslateAndClassify(text, targetLanguages, sourceLang) {
    const lower = text.toLowerCase();
    let category = 'statement';

    if (lower.includes('?') || lower.startsWith('can we') || lower.startsWith('could you') || lower.startsWith('bạn có thể') || lower.startsWith('tại sao') || lower.includes('吗') || lower.includes('什么')) {
      category = 'question';
    } else if (lower.includes('lỗi') || lower.includes('bug') || lower.includes('issue') || lower.includes('problem') || lower.includes('error') || lower.includes('latency') || lower.includes('问题') || lower.includes('错误')) {
      category = 'problem';
    } else if (lower.includes('thống nhất') || lower.includes('quyết định') || lower.includes('agree') || lower.includes('decide') || lower.includes('officially') || lower.includes('同意') || lower.includes('决定')) {
      category = 'decision';
    } else if (lower.includes('tôi sẽ') || lower.includes('i will') || lower.includes('hoàn thành') || lower.includes('finish') || lower.includes('kiểm thử') || lower.includes('我会') || lower.includes('完成')) {
      category = 'action';
    } else if (lower.includes('deadline') || lower.includes('hạn') || lower.includes('thứ sáu') || lower.includes('friday') || lower.includes('october') || lower.includes('截止') || lower.includes('期限')) {
      category = 'deadline';
    } else if (lower.includes('nên') || lower.includes('thử') || lower.includes('suggest') || lower.includes('idea') || lower.includes('redis') || lower.includes('nghĩ') || lower.includes('建议') || lower.includes('想法')) {
      category = 'idea';
    }

    const translations = {};
    const sl = sourceLang === 'zh' ? 'zh-CN' : (sourceLang || 'auto');

    await Promise.all(
      targetLanguages.map(async (lang) => {
        const tl = lang === 'zh' ? 'zh-CN' : lang;
        if (sl === tl) {
          translations[lang] = text;
          return;
        }

        try {
          const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data[0])) {
              const translated = data[0].map((item) => item[0]).filter(Boolean).join('');
              if (translated && translated.trim()) {
                translations[lang] = translated.trim();
                return;
              }
            }
          }
        } catch (err) {
          console.warn(`[Translation] Google translate failed for ${lang}:`, err.message);
        }

        translations[lang] = text;
      })
    );

    return { category, translations };
  }
}
