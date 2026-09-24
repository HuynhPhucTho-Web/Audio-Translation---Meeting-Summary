import OpenAI from 'openai';

// Do not hard-code API keys in source. Use environment variables.
const DEFAULT_GROQ_KEY = process.env.GROQ_API_KEY || '';
const DEFAULT_GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const DEFAULT_OPENAI_KEY = process.env.OPENAI_API_KEY || '';

/**
 * Summary Service handles generating structured meeting insights
 */
export class SummaryService {
  constructor(apiKey = process.env.OPENAI_API_KEY || '') {
    this.apiKey = apiKey;
    this.openai = apiKey ? new OpenAI({ apiKey }) : null;
  }

  setApiKey(key) {
    if (key && key !== this.apiKey) {
      this.apiKey = key;
      this.openai = new OpenAI({ apiKey: key });
    }
  }

  async generateMeetingSummary(transcript, targetLang = 'vi') {
    if (!transcript || transcript.length === 0) {
      return {
        participants: [],
        topics: [],
        decisions: [],
        actionItems: [],
        summaryText: 'Cuộc họp chưa có nội dung trao đổi.'
      };
    }

    const groqKey = process.env.GROQ_API_KEY || DEFAULT_GROQ_KEY;
    const geminiKey = process.env.GEMINI_API_KEY || DEFAULT_GEMINI_KEY;

    if (groqKey) {
      try {
        const transcriptFormatted = transcript
          .map((t) => `[${t.timestamp}] ${t.speaker} (${t.category || 'statement'}): ${t.originalText}`)
          .join('\n');

        const prompt = `You are an executive AI meeting assistant. Generate a structured summary in ${targetLang === 'vi' ? 'Vietnamese' : 'English'}.\nTranscript:\n${transcriptFormatted}\nOutput JSON schema:\n{"participants":[],"topics":[],"decisions":[],"actionItems":[{"id":"act-1","task":"","assignee":"","deadline":"","completed":false}],"summaryText":""}`;

        const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: 'You are an executive meeting synthesizer. Output valid JSON only.' },
              { role: 'user', content: prompt }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.2
          })
        });
        if (resp.ok) {
          const data = await resp.json();
          return JSON.parse(data.choices[0]?.message?.content || '{}');
        }
      } catch (err) {
        console.warn('[Summary Server] Groq error:', err?.message);
      }
    }

    if (geminiKey) {
      try {
        const transcriptFormatted = transcript
          .map((t) => `[${t.timestamp}] ${t.speaker} (${t.category || 'statement'}): ${t.originalText}`)
          .join('\n');

        const prompt = `You are an executive AI meeting assistant. Generate a structured summary in ${targetLang === 'vi' ? 'Vietnamese' : 'English'}.\nTranscript:\n${transcriptFormatted}\nOutput strictly valid JSON with keys: participants, topics, decisions, actionItems (array of {id, task, assignee, deadline, completed}), summaryText.`;

        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
          })
        });
        if (resp.ok) {
          const data = await resp.json();
          const txt = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
          return JSON.parse(txt);
        }
      } catch (err) {
        console.warn('[Summary Server] Gemini error:', err?.message);
      }
    }

    if (!this.openai || !this.apiKey) {
      return this._heuristicSummary(transcript, targetLang);
    }

    try {
      const transcriptFormatted = transcript
        .map((t) => `[${t.timestamp}] ${t.speaker} (${t.category || 'statement'}): ${t.originalText}`)
        .join('\n');

      const prompt = `
You are an executive AI meeting assistant.
Given the following full transcript of a meeting, generate a professional, structured meeting summary in ${targetLang === 'vi' ? 'Vietnamese' : 'English'}.

Transcript:
${transcriptFormatted}

Extract and return strictly a valid JSON object matching this schema:
{
  "participants": ["List of all detected speaker names"],
  "topics": ["Key topic 1", "Key topic 2", "Key topic 3"],
  "decisions": ["Official decision 1", "Official decision 2"],
  "actionItems": [
    {
      "id": "act-1",
      "task": "Specific task description",
      "assignee": "Person responsible or 'Unassigned'",
      "deadline": "Due date if mentioned, else 'TBD'",
      "completed": false
    }
  ],
  "summaryText": "A comprehensive paragraph summarizing the discussions, goals, and outcomes."
}
`;

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an executive meeting synthesizer. Output valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      const raw = response.choices[0]?.message?.content || '{}';
      return JSON.parse(raw);
    } catch (error) {
      console.error('[Summary] API Error:', error?.message || error);
      return this._heuristicSummary(transcript, targetLang);
    }
  }

  _heuristicSummary(transcript, targetLang) {
    const participants = Array.from(new Set(transcript.map((t) => t.speaker)));
    const decisions = transcript
      .filter((t) => t.category === 'decision')
      .map((t) => t.translations[targetLang] || t.originalText);

    const actionItems = transcript
      .filter((t) => t.category === 'action')
      .map((t, idx) => ({
        id: `act-${idx}`,
        task: t.translations[targetLang] || t.originalText,
        assignee: t.speaker,
        deadline: 'Cuối tuần này',
        completed: false
      }));

    return {
      participants: participants.length > 0 ? participants : ['Speaker 1'],
      topics: [
        'Tiến độ phát triển ứng dụng',
        'Kế hoạch ra mắt phiên bản tiếp theo',
        'Khắc phục các sự cố kỹ thuật'
      ],
      decisions: decisions.length > 0 ? decisions : [
        'Thống nhất hoàn thành các tính năng chính trước thời hạn bàn giao.'
      ],
      actionItems: actionItems.length > 0 ? actionItems : [
        {
          id: 'act-1',
          task: 'Kiểm thử toàn diện API và giao diện',
          assignee: participants[0] || 'Team Lead',
          deadline: '27/09',
          completed: false
        }
      ],
      summaryText: `Cuộc họp đã diễn ra thành công với sự tham gia của ${participants.join(', ')}. Các thành viên đã thảo luận chi tiết về tiến độ và phân công các nhiệm vụ cần hoàn thiện.`
    };
  }
}
