import { TranscriptionService } from './transcription.js';
import { TranslationService } from './translation.js';
import { SummaryService } from './summary.js';

export function setupRealtimeWebSocket(wss) {
  const transcriptionService = new TranscriptionService();
  const translationService = new TranslationService();
  const summaryService = new SummaryService();

  wss.on('connection', (ws, req) => {
    console.log('[WebSocket] Client connected from', req.socket.remoteAddress);

    let clientMeta = {
      targetLanguages: ['vi'],
      primaryTargetLanguage: 'vi',
      detectedLanguage: 'auto',
      speakerCount: 1,
    };

    let audioBufferQueue = [];
    let currentSpeakerIndex = 1;

    // Send connected acknowledgement
    ws.send(JSON.stringify({
      type: 'connection_status',
      data: { connected: true, serverTime: Date.now() }
    }));

    ws.on('message', async (data, isBinary) => {
      try {
        if (!isBinary) {
          // JSON message (metadata or commands)
          const text = data.toString();
          const parsed = JSON.parse(text);

          if (parsed.type === 'audio_chunk_meta') {
            clientMeta = { ...clientMeta, ...parsed };
          } else if (parsed.type === 'set_api_key') {
            if (parsed.apiKey) {
              transcriptionService.setApiKey(parsed.apiKey);
              translationService.setApiKey(parsed.apiKey);
              summaryService.setApiKey(parsed.apiKey);
            }
          } else if (parsed.type === 'generate_summary') {
            const summary = await summaryService.generateMeetingSummary(
              parsed.transcript || [],
              parsed.targetLang || 'vi'
            );
            ws.send(JSON.stringify({
              type: 'meeting_summary',
              data: summary
            }));
          }
          return;
        }

        // Binary Audio Chunk received
        const audioChunk = Buffer.from(data);
        audioBufferQueue.push(audioChunk);

        // Process chunk after gathering sufficient audio length (e.g. ~2-3 seconds)
        if (audioBufferQueue.length >= 1) {
          const combinedAudio = Buffer.concat(audioBufferQueue);
          audioBufferQueue = [];

          // 1. Transcribe audio chunk
          const sttResult = await transcriptionService.transcribeAudioBuffer(combinedAudio);

          if (sttResult && sttResult.text && sttResult.text.trim()) {
            const originalText = sttResult.text.trim();
            const originalLang = sttResult.language || 'en';

            // Send language detection update
            ws.send(JSON.stringify({
              type: 'language_detected',
              data: {
                code: originalLang,
                name: originalLang === 'vi' ? 'Tiếng Việt' : originalLang === 'en' ? 'English' : originalLang.toUpperCase(),
                confidence: sttResult.confidence || 98
              }
            }));

            // Assign speaker identifier
            const speakerName = `Speaker ${currentSpeakerIndex}`;
            // Toggle speaker occasionally to simulate diarization
            if (Math.random() > 0.6) {
              currentSpeakerIndex = currentSpeakerIndex === 1 ? 2 : 1;
            }

            // 2. Translate and classify intent
            const { translations, category } = await translationService.translateAndClassify(
              originalText,
              clientMeta.targetLanguages || ['vi'],
              originalLang
            );

            // 3. Emit committed subtitle event
            const subtitlePayload = {
              id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              speaker: speakerName,
              originalText,
              originalLang,
              translations,
              category,
              confidence: sttResult.confidence || 95,
            };

            ws.send(JSON.stringify({
              type: 'subtitle_committed',
              data: subtitlePayload
            }));
          }
        }
      } catch (err) {
        console.error('[WebSocket] Error processing message:', err);
        ws.send(JSON.stringify({
          type: 'error',
          data: { message: err.message }
        }));
      }
    });

    ws.on('close', () => {
      console.log('[WebSocket] Client disconnected');
      audioBufferQueue = [];
    });

    ws.on('error', (err) => {
      console.error('[WebSocket] Error:', err);
    });
  });
}
