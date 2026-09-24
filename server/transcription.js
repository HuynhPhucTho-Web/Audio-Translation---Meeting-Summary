import fs from 'fs';
import path from 'path';
import os from 'os';
import OpenAI from 'openai';

// Do not hard-code API keys in source. Use environment variables.
const DEFAULT_GROQ_KEY = process.env.GROQ_API_KEY || '';
const DEFAULT_GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const DEFAULT_OPENAI_KEY = process.env.OPENAI_API_KEY || '';

/**
 * Transcription Service handles Audio Buffer -> Speech-To-Text via Groq Whisper LPU,
 * with fallbacks to Google Gemini 1.5 Flash and OpenAI Whisper.
 */
export class TranscriptionService {
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
   * Transcribe an audio buffer (webm/mp4/wav)
   */
  async transcribeAudioBuffer(audioBuffer, mimeType = 'audio/webm') {
    if (!audioBuffer || audioBuffer.length === 0) {
      return { text: '', language: 'vi', confidence: 0 };
    }

    const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('wav') ? 'wav' : 'webm';
    const tempFilePath = path.join(os.tmpdir(), `meeting_audio_${Date.now()}_${Math.random().toString(36).substr(2, 6)}.${ext}`);

    try {
      await fs.promises.writeFile(tempFilePath, audioBuffer);

      // 1. Primary: Groq Whisper LPU (~150ms-300ms, ultra-fast, zero connection drops)
      const groqKey = process.env.GROQ_API_KEY || this.groqKey || DEFAULT_GROQ_KEY;
      if (groqKey) {
        try {
          const groqClient = new OpenAI({
            apiKey: groqKey,
            baseURL: 'https://api.groq.com/openai/v1',
            timeout: 6000,
          });

          const transcription = await groqClient.audio.transcriptions.create({
            file: fs.createReadStream(tempFilePath),
            model: 'whisper-large-v3-turbo',
            response_format: 'verbose_json',
          });

          const text = (transcription.text || '').trim();
          if (text) {
            return {
              text,
              language: transcription.language || 'vi',
              confidence: 98,
              duration: transcription.duration || 0,
            };
          }
        } catch (groqError) {
          console.warn('[Transcription] Groq Whisper error, trying Gemini fallback:', groqError?.message || groqError);
        }
      }

      // 2. Secondary Fallback: Google Gemini 1.5 Flash Audio API
      const geminiKey = process.env.GEMINI_API_KEY || this.geminiKey || DEFAULT_GEMINI_KEY;
      if (geminiKey) {
        try {
          const base64Audio = audioBuffer.toString('base64');
          const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: 'Transcribe this spoken meeting audio accurately word-for-word. Output strictly valid JSON: {"text": "exact words spoken", "language": "vi"}' },
                  { inlineData: { mimeType: mimeType || 'audio/webm', data: base64Audio } }
                ]
              }],
              generationConfig: { responseMimeType: 'application/json', temperature: 0.1 }
            })
          });

          if (resp.ok) {
            const data = await resp.json();
            const txt = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
            const parsed = JSON.parse(txt);
            if (parsed.text && parsed.text.trim()) {
              return {
                text: parsed.text.trim(),
                language: parsed.language || 'vi',
                confidence: 97,
                duration: 0,
              };
            }
          }
        } catch (geminiError) {
          console.warn('[Transcription] Gemini Audio error, trying OpenAI fallback:', geminiError?.message || geminiError);
        }
      }

      // 3. Third Fallback: OpenAI Whisper API (if reachable)
      if (this.openai && this.apiKey) {
        try {
          const transcription = await this.openai.audio.transcriptions.create({
            file: fs.createReadStream(tempFilePath),
            model: process.env.OPENAI_TRANSCRIPTION_MODEL || 'whisper-1',
            response_format: 'verbose_json',
          });

          const text = (transcription.text || '').trim();
          if (text) {
            return {
              text,
              language: transcription.language || 'vi',
              confidence: 96,
              duration: transcription.duration || 0,
            };
          }
        } catch (openaiError) {
          console.warn('[Transcription] OpenAI Whisper Error:', openaiError?.message || openaiError);
        }
      }

      return { text: '', language: 'vi', confidence: 0 };
    } finally {
      try {
        if (fs.existsSync(tempFilePath)) {
          await fs.promises.unlink(tempFilePath);
        }
      } catch (cleanErr) {}
    }
  }
}
