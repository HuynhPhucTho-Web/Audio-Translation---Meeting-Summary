import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { setupRealtimeWebSocket } from './realtime.js';
import { TranslationService } from './translation.js';
import { SummaryService } from './summary.js';
import { TranscriptionService } from './transcription.js';

dotenv.config();

// Do NOT store real API keys in source. Use `.env` in project root or
// environment variables in production. We read values from process.env only.
// If you need local development defaults, place them in a local `.env` (gitignored).

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Initialize WebSocket Server
const wss = new WebSocketServer({ server, path: '/ws' });
setupRealtimeWebSocket(wss);

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Services
const translationService = new TranslationService();
const summaryService = new SummaryService();
const transcriptionService = new TranscriptionService();

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'AI Meeting Translator API',
    time: new Date().toISOString(),
    openaiConfigured: !!process.env.OPENAI_API_KEY,
    groqConfigured: !!process.env.GROQ_API_KEY,
    geminiConfigured: !!process.env.GEMINI_API_KEY
  });
});

// Translation API endpoint
app.post('/api/translate', async (req, res) => {
  try {
    const { text, sourceLang, targetLang, targetLanguages } = req.body;
    const clientKey = req.headers['x-openai-key'];
    if (clientKey) translationService.setApiKey(clientKey);
    const geminiKey = req.headers['x-gemini-key'];
    if (geminiKey && translationService.setGeminiKey) translationService.setGeminiKey(geminiKey);
    const groqKey = req.headers['x-groq-key'];
    if (groqKey && translationService.setGroqKey) translationService.setGroqKey(groqKey);

    const targets = targetLanguages || (targetLang ? [targetLang] : ['vi']);
    const result = await translationService.translateAndClassify(text, targets, sourceLang || 'auto');
    res.json(result);
  } catch (error) {
    console.error('Translation endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Meeting Summary API endpoint
app.post('/api/summary', async (req, res) => {
  try {
    const { transcript, targetLang } = req.body;
    const clientKey = req.headers['x-openai-key'];
    if (clientKey) summaryService.setApiKey(clientKey);
    const geminiKey = req.headers['x-gemini-key'];
    if (geminiKey) summaryService.setGeminiKey(geminiKey);
    const groqKey = req.headers['x-groq-key'];
    if (groqKey) summaryService.setGroqKey(groqKey);

    const summaryResult = await summaryService.generateMeetingSummary(transcript, targetLang || 'vi');
    res.json(summaryResult);
  } catch (error) {
    console.error('Summary endpoint error, falling back to heuristic:', error);
    // Graceful fallback prevents HTTP 500 error on client
    res.json(summaryService._heuristicSummary(req.body.transcript, req.body.targetLang || 'vi'));
  }
});

// Audio Transcription API endpoint (File upload / Audio Base64)
app.post('/api/transcribe', async (req, res) => {
  try {
    const { audioBase64, mimeType } = req.body;
    const clientKey = req.headers['x-openai-key'];
    if (clientKey) transcriptionService.setApiKey(clientKey);
    const geminiKey = req.headers['x-gemini-key'];
    if (geminiKey && transcriptionService.setGeminiKey) transcriptionService.setGeminiKey(geminiKey);
    const groqKey = req.headers['x-groq-key'];
    if (groqKey && transcriptionService.setGroqKey) transcriptionService.setGroqKey(groqKey);

    if (!audioBase64) {
      return res.status(400).json({ error: 'Missing audioBase64 in request body' });
    }

    const audioBuffer = Buffer.from(audioBase64, 'base64');
    const result = await transcriptionService.transcribeAudioBuffer(audioBuffer, mimeType || 'audio/webm');
    res.json(result);
  } catch (error) {
    console.error('Transcription endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Convert Audio to Genuine Standard MP3 endpoint
app.post('/api/convert-to-mp3', async (req, res) => {
  try {
    const { audioBase64, mimeType, filename } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'Missing audioBase64' });
    }

    const inputExt = mimeType && mimeType.includes('wav') ? 'wav' : 'webm';
    const tempIn = path.join(
      os.tmpdir(),
      `input_${Date.now()}_${Math.random().toString(36).substr(2, 5)}.${inputExt}`
    );
    const tempOut = path.join(
      os.tmpdir(),
      `output_${Date.now()}_${Math.random().toString(36).substr(2, 5)}.mp3`
    );

    const inputBuffer = Buffer.from(audioBase64, 'base64');
    await fs.promises.writeFile(tempIn, inputBuffer);

    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const safeTitle = `Cuoc hop ${dateStr}`;

    const cmd = `ffmpeg -y -i "${tempIn}" -vn -c:a libmp3lame -b:a 192k -metadata title="${safeTitle}" -metadata artist="AI Meeting Translator" "${tempOut}"`;

    exec(cmd, async (err) => {
      try {
        if (err || !fs.existsSync(tempOut)) {
          console.warn('[Server] FFmpeg conversion failed, fallback to original:', err?.message);
          if (fs.existsSync(tempIn)) await fs.promises.unlink(tempIn).catch(() => {});
          res.setHeader('Content-Type', 'audio/wav');
          return res.send(inputBuffer);
        }

        const mp3Buffer = await fs.promises.readFile(tempOut);
        await Promise.all([
          fs.promises.unlink(tempIn).catch(() => {}),
          fs.promises.unlink(tempOut).catch(() => {}),
        ]);

        const outName = filename || `Cuoc_Hop_${Date.now()}.mp3`;
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(outName)}"`);
        res.send(mp3Buffer);
      } catch (innerErr) {
        res.status(500).json({ error: innerErr.message });
      }
    });
  } catch (error) {
    console.error('Convert to MP3 error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve frontend in production
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/ws')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

// Start Server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🎙️  AI Meeting Translator Server running on port ${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}/ws`);
  console.log(`🌐 HTTP API endpoint: http://localhost:${PORT}/api/health`);
  console.log(`⚡ Primary Engine:   GROQ ✅ (Whisper LPU ~200ms & Llama-3.3 70B)`);
  console.log(`✨ Secondary Engine: GEMINI ✅ (Gemini 1.5 Flash - 1M Context)`);
  console.log(`🤖 Fallback Engine:  OPENAI ${process.env.OPENAI_API_KEY ? '✅' : '(Tùy chọn)'}`);
  console.log(`=======================================================`);
});
