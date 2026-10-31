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

  setGeminiKey(key) {
    if (key) this.geminiKey = key;
  }

  setGroqKey(key) {
    if (key) this.groqKey = key;
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

      // Diagnostic: log basic file info to help debug "could not process file" errors
      try {
        const stats = await fs.promises.stat(tempFilePath);
        const fd = await fs.promises.open(tempFilePath, 'r');
        const header = Buffer.alloc(12);
        await fd.read(header, 0, 12, 0);
        await fd.close();
        console.log('[Transcription] Wrote temp audio file:', tempFilePath, `size=${stats.size}`);
        console.log('[Transcription] File header (hex):', header.toString('hex'));
      } catch (diagErr) {
        console.warn('[Transcription] Could not read temp file diagnostics:', diagErr?.message || diagErr);
      }

      // 1. Primary: Groq Whisper LPU (~150ms-300ms, ultra-fast, zero connection drops)
      const groqKey = process.env.GROQ_API_KEY || this.groqKey || DEFAULT_GROQ_KEY;
      if (groqKey) {
        try {
          const groqClient = new OpenAI({
            apiKey: groqKey,
            baseURL: 'https://api.groq.com/openai/v1',
            // Allow more time for uploads to be accepted by the Groq endpoint
            timeout: 15000,
          });

          const transcription = await groqClient.audio.transcriptions.create({
            file: fs.createReadStream(tempFilePath),
            model: 'whisper-large-v3-turbo',
            response_format: 'verbose_json',
            prompt: 'Cuộc họp thảo luận công việc bằng tiếng Việt, tiến độ, dự án, kế hoạch, thống nhất, báo cáo, phân công, deadline, giải pháp, KPI, roadmap, bug, fix, deploy, release.',
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
          // Better diagnostic logging to capture response body/status when available
          try {
            const status = groqError?.response?.status || groqError?.status;
            const body = groqError?.response?.data || groqError?.response?.body || groqError?.body;
            console.warn('[Transcription] Groq Whisper error, status:', status, 'body:', body);
          } catch (e) {
            console.warn('[Transcription] Groq Whisper error (no response body):', groqError?.message || groqError);
          }
        }
      }

      // 2. Secondary Fallback: Google Gemini Audio API (multi-model fallback)
      const geminiKey = this.geminiKey || process.env.GEMINI_API_KEY || DEFAULT_GEMINI_KEY;
      if (geminiKey) {
        const candidateModels = [
          'gemini-3.5-flash-lite',
          'gemini-3.1-flash-lite',
          'gemini-3.5-flash',
          'gemini-2.5-flash',
          'gemini-1.5-flash'
        ];
        const base64Audio = audioBuffer.toString('base64');

        for (const model of candidateModels) {
          try {
            const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiKey)}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': geminiKey
              },
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
            if (resp.status === 404) continue;
          } catch (geminiError) {
            console.warn(`[Transcription] Gemini model ${model} error:`, geminiError?.message || geminiError);
          }
        }
      }

      // 3. Third Fallback: OpenAI Whisper API (if reachable)
      if (this.openai && this.apiKey) {
        try {
          const transcription = await this.openai.audio.transcriptions.create({
            file: fs.createReadStream(tempFilePath),
            model: process.env.OPENAI_TRANSCRIPTION_MODEL || 'whisper-1',
            response_format: 'verbose_json',
            prompt: 'Cuộc họp thảo luận công việc bằng tiếng Việt, tiến độ, dự án, kế hoạch, thống nhất, báo cáo, phân công, deadline, giải pháp.',
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
          try {
            const status = openaiError?.response?.status || openaiError?.status;
            const body = openaiError?.response?.data || openaiError?.response?.body || openaiError?.body;
            console.warn('[Transcription] OpenAI Whisper Error, status:', status, 'body:', body);
          } catch (e) {
            console.warn('[Transcription] OpenAI Whisper Error:', openaiError?.message || openaiError);
          }
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
