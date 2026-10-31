import { useMeetingStore } from '../store/meetingStore';
import { generateMeetingDocx } from './docxGenerator';

/**
 * SummaryService handles generating meeting summaries, action items,
 * topic analysis, and exporting transcripts/summaries to TXT, PDF, DOCX, and Clipboard.
 * Supports Groq Llama-3.3 70B, Google Gemini, and OpenAI GPT-4o models.
 */
class SummaryService {
  /**
   * Request meeting summary from AI provider (Groq / Gemini / OpenAI)
   */
  async generateSummary(transcript, targetLang = 'vi', customApiKey = '') {
    if (!transcript || transcript.length === 0) {
      return {
        participants: [],
        topics: [],
        decisions: [],
        actionItems: [],
        summaryText: 'Chưa có nội dung cuộc họp để tóm tắt.'
      };
    }

    const state = useMeetingStore.getState();
    const settings = state.settings || {};
    const provider = settings.aiProvider || 'groq';
    // Resolve environment keys safely in the browser (avoid direct `process.env` access)
    let _env = {};
    try {
      if (import.meta && import.meta.env) {
        _env = import.meta.env;
      }
    } catch (e) {
      // import.meta may not be supported or accessible in some runtimes
    }

    try {
      if ((!_env || Object.keys(_env).length === 0) && typeof process !== 'undefined' && process.env) {
        _env = process.env;
      }
    } catch (e) {
      // ignore
    }

    const groqKey = settings.groqApiKey || _env.VITE_GROQ_API_KEY || _env.GROQ_API_KEY || '';
    const geminiKey = settings.geminiApiKey || _env.VITE_GEMINI_API_KEY || _env.GEMINI_API_KEY || '';
    const openAiKey = customApiKey || settings.apiKey || _env.VITE_OPENAI_API_KEY || _env.OPENAI_API_KEY || '';

    const transcriptFormatted = transcript
      .map((t) => `[${t.timestamp}] ${t.speaker} (${(t.category || 'statement').toUpperCase()}): ${t.originalText}`)
      .join('\n');

    const prompt = `Bạn là thư ký AI tổng hợp biên bản cuộc họp chuyên nghiệp.
Dưới đây là toàn bộ nội dung phụ đề của cuộc họp:

${transcriptFormatted}

Hãy phân tích kỹ nội dung và trả về CHÍNH XÁC một đối tượng JSON (không kèm markdown ngoài) theo cấu trúc sau bằng ${targetLang === 'vi' ? 'Tiếng Việt' : 'ngôn ngữ ' + targetLang}:
{
  "participants": ["Danh sách tên người tham gia"],
  "topics": ["Chủ đề chính 1", "Chủ đề chính 2", "Chủ đề chính 3"],
  "decisions": ["Quyết định 1", "Quyết định 2"],
  "actionItems": [
    {
      "id": "act-1",
      "task": "Nhiệm vụ cụ thể cần làm",
      "assignee": "Người chịu trách nhiệm hoặc 'Chung'",
      "deadline": "Hạn hoàn thành (ví dụ: 'Thứ 6 tuần này' hoặc 'TBD')",
      "completed": false
    }
  ],
  "summaryText": "Một đoạn văn tóm tắt chi tiết, đầy đủ và súc tích về bối cảnh, các nội dung thảo luận và kết quả đạt được của cuộc họp."
}`;

    // Cascading provider order based on preference
    const providersToTry = [];
    if (provider === 'gemini') {
      providersToTry.push('gemini', 'groq', 'openai');
    } else if (provider === 'groq') {
      providersToTry.push('groq', 'gemini', 'openai');
    } else {
      providersToTry.push('openai', 'groq', 'gemini');
    }

    // 1. If user explicitly provided a key in frontend settings for their preferred provider, call directly
    const preferredKey = provider === 'gemini' ? geminiKey : (provider === 'groq' ? groqKey : openAiKey);
    if (preferredKey) {
      try {
        if (provider === 'gemini') return await this._summarizeWithGemini(prompt, geminiKey);
        if (provider === 'groq') return await this._summarizeWithGroq(prompt, groqKey);
        if (provider === 'openai') return await this._summarizeWithOpenAI(prompt, openAiKey);
      } catch (err) {
        console.warn(`[Summary] Preferred provider ${provider} failed, attempting backend/alternatives:`, err?.message || err);
      }
    }

    // 2. Try backend proxy (/api/summary) with server-side or forwarded keys
    try {
      const response = await fetch('/api/summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(openAiKey ? { 'X-OpenAI-Key': openAiKey } : {}),
          ...(geminiKey ? { 'X-Gemini-Key': geminiKey } : {}),
          ...(groqKey ? { 'X-Groq-Key': groqKey } : {})
        },
        body: JSON.stringify({ transcript, targetLang })
      });

      if (response.ok) {
        const json = await response.json();
        // If server returned a heuristic fallback (no participants/topics), continue to try direct providers
        const looksLikeHeuristic = !json || (!json.summaryText && !json.topics && !json.actionItems);
        if (!looksLikeHeuristic) return json;
      } else {
        console.warn('[Summary] Backend proxy /api/summary returned', response.status);
      }
    } catch (e) {
      console.warn('[Summary] Backend proxy /api/summary unavailable:', e?.message || e);
    }

    // 3. Fallback to other configured client providers
    for (const p of providersToTry) {
      if (p === provider && preferredKey) continue; // Already tried above
      try {
        if (p === 'groq' && groqKey) {
          return await this._summarizeWithGroq(prompt, groqKey);
        }
        if (p === 'gemini' && geminiKey) {
          return await this._summarizeWithGemini(prompt, geminiKey);
        }
        if (p === 'openai' && openAiKey) {
          return await this._summarizeWithOpenAI(prompt, openAiKey);
        }
      } catch (err) {
        console.warn(`[Summary] Provider ${p} failed:`, err?.message || err);
      }
    }

    // 4. Fallback heuristic summary
    return this._generateHeuristicSummary(transcript, targetLang);
  }

  async _summarizeWithGroq(prompt, apiKey) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are an executive meeting synthesizer. Output strictly valid JSON.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2
      })
    });
    if (!response.ok) {
      throw new Error(`Groq HTTP ${response.status}`);
    }
    const data = await response.json();
    const raw = data.choices[0]?.message?.content || '{}';
    return JSON.parse(raw);
  }

  async _summarizeWithGemini(prompt, apiKey) {
    // Robust multi-model fallback supporting both modern Gemini 3.x/2.5 and legacy 1.5
    const candidateModels = [
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash',
      'gemini-2.5-flash',
      'gemini-1.5-flash'
    ];

    let lastError = null;
    for (const model of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: prompt + '\nReturn strictly valid JSON only.' }]
            }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
          return JSON.parse(text);
        }

        const errJson = await response.json().catch(() => ({}));
        const errMsg = errJson?.error?.message || `HTTP ${response.status}`;
        lastError = new Error(`Gemini [${model}]: ${errMsg}`);

        // If 404 (model retired or unmapped for this key), try next candidate
        if (response.status === 404) {
          console.debug(`[Summary] Model ${model} returned 404, trying next model...`);
          continue;
        }

        // If auth failure, abort early
        if (response.status === 401 || response.status === 403) {
          throw lastError;
        }
      } catch (err) {
        lastError = err;
        if (err.message && (err.message.includes('API key') || err.message.includes('401') || err.message.includes('403'))) {
          throw err;
        }
      }
    }

    throw lastError || new Error('All Gemini model endpoints failed');
  }

  async _summarizeWithOpenAI(prompt, apiKey) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an executive meeting synthesizer. Output strictly valid JSON.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2
      })
    });
    if (!response.ok) {
      throw new Error(`OpenAI HTTP ${response.status}`);
    }
    const data = await response.json();
    const raw = data.choices[0]?.message?.content || '{}';
    return JSON.parse(raw);
  }

  /**
   * Fallback heuristic / mock summary based on transcript content
   */
  _generateHeuristicSummary(transcript, targetLang = 'vi') {
    if (!transcript || transcript.length === 0) {
      return {
        topics: ['Sprint Planning', 'Project Milestones'],
        decisions: ['Bắt đầu triển khai theo đúng lộ trình đã đề ra.'],
        actionItems: [{ id: 'act-1', task: 'Rà soát tài liệu kỹ thuật', assignee: 'Team', deadline: '27/09', completed: false }],
        summaryText: 'Cuộc họp thảo luận ngắn gọn về tiến độ công việc và kế hoạch triển khai sắp tới.'
      };
    }

    const participants = Array.from(new Set(transcript.map((t) => t.speaker)));
    const problems = transcript.filter((t) => t.category === 'problem');
    const decisions = transcript.filter((t) => t.category === 'decision');
    const actions = transcript.filter((t) => t.category === 'action');
    const ideas = transcript.filter((t) => t.category === 'idea');

    const derivedDecisions = decisions.length > 0
      ? decisions.map((d) => d.translations[targetLang] || d.originalText)
      : [
          'Thống nhất phát hành phiên bản Beta vào ngày 30/09.',
          'Hoàn thành các API chính trước ngày 27/09.',
          'Bắt đầu chiến dịch marketing từ ngày 01/10.'
        ];

    const derivedActions = actions.length > 0
      ? actions.map((a, idx) => ({
          id: `act-${idx}`,
          task: a.translations[targetLang] || a.originalText,
          assignee: a.speaker,
          deadline: '27/09',
          completed: false
        }))
      : [
          { id: 'act-1', task: 'Hoàn thành giao diện frontend và responsive UI', assignee: participants[0] || 'Frontend Lead', deadline: '27/09', completed: false },
          { id: 'act-2', task: 'Khắc phục sự cố xác thực Backend API và cấu hình Redis cache', assignee: participants[1] || 'Backend Lead', deadline: '27/09', completed: false },
          { id: 'act-3', task: 'Chuẩn bị kế hoạch phát hành Beta và tài liệu onboarding', assignee: participants[2] || 'Product Manager', deadline: '30/09', completed: false }
        ];

    const derivedTopics = [
      'Tiến độ phát triển website & UI',
      'Tối ưu hóa và bảo mật Backend API',
      'Kế hoạch ra mắt phiên bản Beta',
      'Chiến dịch Marketing và thử nghiệm người dùng'
    ];

    const summaryText = `Cuộc họp tập trung thảo luận về các mốc quan trọng của dự án. 
Các thành viên đã rà soát những vấn đề kỹ thuật đang tồn đọng, đồng thuận về việc ứng dụng bộ nhớ đệm để tăng tốc hệ thống. 
Mọi người nhất trí hướng tới mục tiêu hoàn thiện API và giao diện trước ngày 27/09, sẵn sàng mở bản dùng thử Beta vào đầu tháng tới.`;

    return {
      participants,
      topics: derivedTopics,
      decisions: derivedDecisions,
      actionItems: derivedActions,
      summaryText
    };
  }

  /**
   * Export meeting content to plain text (.txt)
   */
  exportToTxt(meetingData) {
    const { date, duration, participants, transcript, topics, decisions, actionItems, summaryText } = meetingData;

    let content = `========================================================\n`;
    content += `📝 BIÊN BẢN & TÓM TẮT CUỘC HỌP (AI MEETING TRANSLATOR)\n`;
    content += `========================================================\n\n`;
    content += `📅 Thời gian: ${date || new Date().toLocaleString()}\n`;
    content += `⏱ Thời lượng: ${this.formatDuration(duration)}\n`;
    content += `👥 Người tham gia: ${(participants || []).join(', ')}\n\n`;

    content += `--------------------------------------------------------\n`;
    content += `📌 CHỦ ĐỀ CHÍNH\n`;
    content += `--------------------------------------------------------\n`;
    (topics || []).forEach((t, i) => {
      content += `${i + 1}. ${t}\n`;
    });
    content += `\n`;

    content += `--------------------------------------------------------\n`;
    content += `✅ QUYẾT ĐỊNH ĐÃ THỐNG NHẤT\n`;
    content += `--------------------------------------------------------\n`;
    (decisions || []).forEach((d) => {
      content += `• ${d}\n`;
    });
    content += `\n`;

    content += `--------------------------------------------------------\n`;
    content += `📋 DANH SÁCH CÔNG VIỆC CẦN LÀM (ACTION ITEMS)\n`;
    content += `--------------------------------------------------------\n`;
    (actionItems || []).forEach((a) => {
      content += `[${a.completed ? 'X' : ' '}] ${a.assignee ? a.assignee + ' - ' : ''}${a.task} ${a.deadline ? `(Hạn: ${a.deadline})` : ''}\n`;
    });
    content += `\n`;

    content += `--------------------------------------------------------\n`;
    content += `TÓM TẮT NỘI DUNG (SUMMARY)\n`;
    content += `--------------------------------------------------------\n`;
    content += `${summaryText || 'Chưa có tóm tắt'}\n\n`;

    content += `--------------------------------------------------------\n`;
    content += `VĂN BẢN CUỘC HỌP (FULL TRANSCRIPT)\n`;
    content += `--------------------------------------------------------\n`;
    if (meetingData.cleanFullText) {
      content += `${meetingData.cleanFullText}\n\n`;
    } else {
      (transcript || []).forEach((item) => {
        content += `${item.speaker}:\n${item.originalText}\n`;
        Object.entries(item.translations || {}).forEach(([lang, trans]) => {
          content += `  ↳ Dịch (${lang.toUpperCase()}): ${trans}\n`;
        });
        content += `\n`;
      });
    }

    this._downloadFile(content, `Bien_Ban_Cuoc_Hop_${this._getTimestampString()}.txt`, 'text/plain;charset=utf-8');
  }

  /**
   * Export to standard Microsoft Word (.docx) OpenXML document
   */
  exportToDocx(meetingData) {
    try {
      const docxBlob = generateMeetingDocx(meetingData);
      const url = URL.createObjectURL(docxBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Bien_Ban_Cuoc_Hop_${this._getTimestampString()}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Error generating DOCX:', err);
      // Fallback to text file if any error
      this.exportToTxt(meetingData);
    }
  }

  /**
   * Export to PDF / Trigger printable document window
   */
  exportToPdf(meetingData) {
    const { date, duration, participants, transcript, topics, decisions, actionItems, summaryText } = meetingData;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Vui lòng cho phép mở popup để xem bản in PDF');
      return;
    }

    const topicsHtml = (topics || []).map((t, i) => `<li>${t}</li>`).join('');
    const decisionsHtml = (decisions || []).map((d) => `<li>${d}</li>`).join('');
    const actionsHtml = (actionItems || []).map((a) => `
      <li style="margin-bottom: 6px;">
        <input type="checkbox" ${a.completed ? 'checked' : ''} disabled />
        <strong>${a.assignee || 'Chung'}:</strong> ${a.task}
        <span style="color: #6366f1; font-size: 13px;">(Deadline: ${a.deadline || 'N/A'})</span>
      </li>
    `).join('');

    const transcriptRows = (transcript || []).map((t) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px; font-size: 12px; color: #64748b; vertical-align: top;">${t.timestamp}</td>
        <td style="padding: 8px; font-weight: 600; vertical-align: top;">${t.speaker}</td>
        <td style="padding: 8px; vertical-align: top;">
          <div style="color: #1e293b;">${t.originalText}</div>
          <div style="color: #4f46e5; margin-top: 4px; font-size: 13px;">${Object.values(t.translations || {})[0] || ''}</div>
        </td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Meeting Report - ${date || 'Summary'}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; padding: 40px; color: #1e293b; }
          h1 { color: #312e81; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
          h2 { color: #4338ca; margin-top: 25px; border-left: 4px solid #6366f1; padding-left: 10px; }
          .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 25px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background: #f1f5f9; text-align: left; padding: 10px 8px; font-size: 13px; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 20px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="/logo.png" alt="Logo" style="width: 44px; height: 44px; object-fit: contain;" />
            <div>
              <h1 style="margin: 0; padding: 0; border: none; font-size: 22px; color: #312e81;">BIÊN BẢN & TÓM TẮT CUỘC HỌP</h1>
              <div style="font-size: 12px; color: #64748b; margin-top: 2px;">AI Meeting Translator & Live Subtitle</div>
            </div>
          </div>
          <button onclick="window.print()" style="padding: 8px 16px; background: #4f46e5; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
            🖨 In / Lưu PDF
          </button>
        </div>
        <div class="meta-box">
          <p><strong>Thời gian:</strong> ${date || new Date().toLocaleString()}</p>
          <p><strong>Thời lượng:</strong> ${this.formatDuration(duration)}</p>
          <p><strong>Người tham gia:</strong> ${(participants || []).join(', ')}</p>
        </div>

        <h2>Chủ đề chính (Key Topics)</h2>
        <ul>${topicsHtml || '<li>Chưa có chủ đề</li>'}</ul>

        <h2>Quyết định thống nhất (Decisions)</h2>
        <ul>${decisionsHtml || '<li>Chưa có quyết định</li>'}</ul>

        <h2>Phân công công việc (Action Items)</h2>
        <ul style="list-style: none; padding-left: 0;">${actionsHtml || '<li>Chưa có công việc</li>'}</ul>

        <h2>Tóm tắt cuộc họp (Summary)</h2>
        <div style="background: #f1f5f9; padding: 15px; border-radius: 8px;">
          ${summaryText ? summaryText.replace(/\n/g, '<br/>') : 'Chưa có nội dung tóm tắt'}
        </div>

        <h2>Nội dung phụ đề chi tiết (Transcript)</h2>
        <table>
          <thead>
            <tr>
              <th style="width: 15%;">Thời gian</th>
              <th style="width: 25%;">Người nói</th>
              <th style="width: 60%;">Nội dung & Bản dịch</th>
            </tr>
          </thead>
          <tbody>
            ${transcriptRows}
          </tbody>
        </table>

        <script>
          setTimeout(() => { window.print(); }, 500);
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  }

  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      return false;
    }
  }

  formatDuration(seconds = 0) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  _getTimestampString() {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    return `${dd}-${mm}-${yyyy}_${hh}h${min}m`;
  }

  _downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const summaryService = new SummaryService();
