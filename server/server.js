import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { setupRealtimeWebSocket } from './realtime.js';
import { TranslationService } from './translation.js';
import { SummaryService } from './summary.js';

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
    if (clientKey) {
      translationService.setApiKey(clientKey);
    }

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
    if (clientKey) {
      summaryService.setApiKey(clientKey);
    }

    const summaryResult = await summaryService.generateMeetingSummary(transcript, targetLang || 'vi');
    res.json(summaryResult);
  } catch (error) {
    console.error('Summary endpoint error:', error);
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
