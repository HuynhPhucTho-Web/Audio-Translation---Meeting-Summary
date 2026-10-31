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

    let ebmlHeader = null;
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

        // Detect and store EBML header if this chunk starts with WebM signature
        if (
          audioChunk.length >= 4 &&
          audioChunk[0] === 0x1a &&
          audioChunk[1] === 0x45 &&
          audioChunk[2] === 0xdf &&
          audioChunk[3] === 0xa3
        ) {
          let clusterIdx = -1;
          for (let i = 0; i < audioChunk.length - 4; i++) {
            if (
              audioChunk[i] === 0x1f &&
              audioChunk[i + 1] === 0x43 &&
              audioChunk[i + 2] === 0xb6 &&
              audioChunk[i + 3] === 0x75
            ) {
              clusterIdx = i;
              break;
            }
          }
          if (clusterIdx > 0) {
            ebmlHeader = audioChunk.subarray(0, clusterIdx);
          } else {
            ebmlHeader = audioChunk.subarray(0, Math.min(512, audioChunk.length));
          }
        }

        audioBufferQueue.push(audioChunk);

        // Process chunk after gathering sufficient audio length (~3 seconds / 3 chunks)
        if (audioBufferQueue.length >= 3) {
          let combinedAudio = Buffer.concat(audioBufferQueue);
          audioBufferQueue = [];

          // Prepend header if this segment does not already contain an EBML header
          const hasEbmlHeader =
            combinedAudio.length >= 4 &&
            combinedAudio[0] === 0x1a &&
            combinedAudio[1] === 0x45 &&
            combinedAudio[2] === 0xdf &&
            combinedAudio[3] === 0xa3;

          if (!hasEbmlHeader && ebmlHeader) {
            combinedAudio = Buffer.concat([ebmlHeader, combinedAudio]);
          }

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
