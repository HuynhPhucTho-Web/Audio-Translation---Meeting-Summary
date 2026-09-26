import React, { useState, useMemo } from 'react';
import MorphIcon from '../MorphIcon/MorphIcon';
import { useMeetingStore } from '../../store/meetingStore';
import { summaryService } from '../../services/summaryService';
import MeetingTopics from '../MeetingTopics/MeetingTopics';

export default function MeetingSummary() {
  const {
    recordingTime,
    participants,
    topics,
    decisions,
    actionItems,
    summaryText,
    isAnalyzing,
    transcript,
    primaryTargetLanguage,
    toggleActionItem,
    setAnalysisData,
    setIsAnalyzing,
    settings,
    t,
  } = useMeetingStore();

  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedFullText, setCopiedFullText] = useState(false);
  const [summaryMode, setSummaryMode] = useState('ai'); // 'ai' | 'text'

  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalWords = useMemo(() => {
    return transcript.reduce((acc, item) => {
      const words = (item.originalText || '').trim().split(/\s+/).filter(Boolean);
      return acc + words.length;
    }, 0);
  }, [transcript]);

  // Clean full text transcript: ONLY pure text, NO timestamps (08:42:42 PM), NO indices ([1]), NO category tags
  const fullTextTranscript = useMemo(() => {
    if (!transcript || transcript.length === 0) return '';

    const blocks = [];
    let currentSpeaker = null;
    let currentTexts = [];
    let currentTranslations = [];

    transcript.forEach((item) => {
      const orig = (item.originalText || '').trim();
      if (!orig) return;

      const trans = Object.values(item.translations || {})[0]?.trim();

      if (item.speaker === currentSpeaker) {
        currentTexts.push(orig);
        if (trans && trans !== orig) currentTranslations.push(trans);
      } else {
        if (currentSpeaker && currentTexts.length > 0) {
          blocks.push({
            speaker: currentSpeaker,
            text: currentTexts.join(' '),
            translation: currentTranslations.length > 0 ? currentTranslations.join(' ') : null,
          });
        }
        currentSpeaker = item.speaker || 'Người nói';
        currentTexts = [orig];
        currentTranslations = trans && trans !== orig ? [trans] : [];
      }
    });

    if (currentSpeaker && currentTexts.length > 0) {
      blocks.push({
        speaker: currentSpeaker,
        text: currentTexts.join(' '),
        translation: currentTranslations.length > 0 ? currentTranslations.join(' ') : null,
      });
    }

    return blocks
      .map((b) => {
        let content = `${b.speaker}:\n${b.text}`;
        if (b.translation) {
          content += `\n↳ Dịch: ${b.translation}`;
        }
        return content;
      })
      .join('\n\n');
  }, [transcript]);

  const currentMeetingPayload = {
    date: new Date().toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }),
    duration: recordingTime,
    participants,
    topics,
    decisions,
    actionItems,
    summaryText,
    transcript,
    cleanFullText: fullTextTranscript,
  };

  const handleRegenerate = async () => {
    setIsAnalyzing(true);
    try {
      const res = await summaryService.generateSummary(
        transcript,
        primaryTargetLanguage,
        settings.apiKey
      );
      setAnalysisData(res);
    } catch (err) {
      console.error('Error generating summary:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopySummary = async () => {
    if (!summaryText && topics.length === 0 && decisions.length === 0) return;
    const parts = [];
    if (topics.length > 0) {
      parts.push(`📌 CHỦ ĐỀ CHÍNH:\n${topics.map((t, i) => `${i + 1}. ${t}`).join('\n')}`);
    }
    if (decisions.length > 0) {
      parts.push(`✅ QUYẾT ĐỊNH:\n${decisions.map((d) => `• ${d}`).join('\n')}`);
    }
    if (actionItems.length > 0) {
      parts.push(
        `📋 VIỆC CẦN LÀM:\n${actionItems
          .map((a) => `[${a.completed ? 'X' : ' '}] ${a.assignee}: ${a.task}${a.deadline ? ` (${a.deadline})` : ''}`)
          .join('\n')}`
      );
    }
    if (summaryText) {
      parts.push(`📝 TÓM TẮT:\n${summaryText}`);
    }
    await summaryService.copyToClipboard(parts.join('\n\n'));
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 1800);
  };

  const handleCopyFullText = async () => {
    if (!fullTextTranscript) return;
    await summaryService.copyToClipboard(fullTextTranscript);
    setCopiedFullText(true);
    setTimeout(() => setCopiedFullText(false), 1800);
  };

  return (
    <div className="w-full space-y-4">
      {/* Top Header & Clean Action Strip */}
      <div className="w-full apple-glass rounded-2xl p-4 sm:p-5 border border-white/10 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 shrink-0">
            <MorphIcon name="sparkles" size={20} />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight leading-tight">
              {t('summary.title')}
            </h1>
            <p className="text-xs text-slate-400">
              {t('summary.subtitle')}
            </p>
          </div>
        </div>

        {/* Clean Action Buttons: Làm mới AI & Xuất File (Không trùng lặp) */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end">
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={isAnalyzing}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-md active:scale-95 disabled:opacity-50"
            title={t('summary.refreshAi')}
          >
            <MorphIcon name="refresh-cw" size={13} className={isAnalyzing ? 'animate-spin' : ''} />
            <span>{isAnalyzing ? t('summary.analyzing') : t('summary.refreshAi')}</span>
          </button>

          <div className="h-4 w-[1px] bg-white/20 hidden sm:block mx-0.5" />

          {/* Export Pills */}
          <div className="inline-flex items-center gap-1 bg-white/5 p-0.5 rounded-full border border-white/10">
            <button
              type="button"
              onClick={() => summaryService.exportToTxt(currentMeetingPayload)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-all active:scale-95"
              title="Xuất file TXT"
            >
              <MorphIcon name="file-text" size={13} className="text-blue-400" />
              <span>TXT</span>
            </button>

            <button
              type="button"
              onClick={() => summaryService.exportToPdf(currentMeetingPayload)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-all active:scale-95"
              title="Xuất file PDF"
            >
              <MorphIcon name="printer" size={13} className="text-rose-400" />
              <span>PDF</span>
            </button>

            <button
              type="button"
              onClick={() => summaryService.exportToDocx(currentMeetingPayload)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-all active:scale-95"
              title="Xuất file DOC"
            >
              <MorphIcon name="file-down" size={13} className="text-emerald-400" />
              <span>DOC</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row (Compact & Responsive on Mobile) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="apple-card rounded-2xl p-3.5 sm:p-4 border border-white/10 flex items-center gap-3 shadow-sm">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
            <MorphIcon name="users" size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs text-slate-400 font-medium">
              {t('summary.participants')} ({participants.length})
            </div>
            <div className="text-xs sm:text-sm font-semibold text-white truncate mt-0.5" title={participants.join(', ')}>
              {participants.length > 0 ? participants.join(', ') : t('summary.noParticipants')}
            </div>
          </div>
        </div>

        <div className="apple-card rounded-2xl p-3.5 sm:p-4 border border-white/10 flex items-center gap-3 shadow-sm">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
            <MorphIcon name="clock" size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs text-slate-400 font-medium">{t('summary.duration')}</div>
            <div className="text-xs sm:text-sm font-semibold text-white font-mono mt-0.5">
              {formatDuration(recordingTime)}
            </div>
          </div>
        </div>

        <div className="apple-card rounded-2xl p-3.5 sm:p-4 border border-white/10 flex items-center gap-3 shadow-sm">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
            <MorphIcon name="calendar" size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs text-slate-400 font-medium">{t('summary.reportDate')}</div>
            <div className="text-xs sm:text-sm font-semibold text-white mt-0.5">
              {new Date().toLocaleDateString('vi-VN')}
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Topics & Decisions vs Action Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column: Topics & Decisions */}
        <div className="space-y-4">
          {/* Key Topics */}
          <div className="apple-glass rounded-2xl p-4 sm:p-5 border border-white/10 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <MorphIcon name="bookmark" size={15} className="text-amber-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                {t('summary.keyTopics')}
              </h2>
            </div>
            <MeetingTopics topics={topics} />
          </div>

          {/* Decisions */}
          <div className="apple-glass rounded-2xl p-4 sm:p-5 border border-white/10 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <MorphIcon name="check-circle" size={15} className="text-emerald-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                {t('summary.decisions')}
              </h2>
            </div>

            {decisions.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-1">{t('summary.noDecisions')}</p>
            ) : (
              <div className="space-y-2">
                {decisions.map((decision, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 text-xs text-slate-200 apple-card p-3 rounded-xl border border-white/10"
                  >
                    <span className="text-emerald-400 font-bold leading-none mt-0.5">•</span>
                    <span className="leading-relaxed">{decision}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Action Items */}
        <div className="apple-glass rounded-2xl p-4 sm:p-5 border border-white/10 shadow-lg flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MorphIcon name="list-todo" size={15} className="text-blue-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                {t('summary.actionItems')}
              </h2>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full apple-pill text-slate-300">
              {actionItems.filter((a) => a.completed).length}/{actionItems.length} {t('summary.completed')}
            </span>
          </div>

          {actionItems.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-1">{t('summary.noActionItems')}</p>
          ) : (
            <div className="space-y-2 flex-1">
              {actionItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleActionItem(item.id)}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                    item.completed
                      ? 'bg-emerald-500/[0.04] border-emerald-500/20 text-slate-400'
                      : 'apple-card border-white/10 hover:border-white/20 text-slate-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => toggleActionItem(item.id)}
                    className="mt-0.5 w-4 h-4 rounded-full border-white/30 text-blue-600 focus:ring-0 bg-white/10 cursor-pointer shrink-0"
                  />
                  <div className="flex-1 text-xs min-w-0">
                    <div className={item.completed ? 'line-through text-slate-400' : 'font-medium'}>
                      {item.task}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1.5 text-[11px] text-slate-400">
                      {item.assignee && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-blue-300 font-mono">
                          <MorphIcon name="user" size={11} />
                          <span>{item.assignee}</span>
                        </span>
                      )}
                      {item.deadline && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 text-purple-300 font-mono">
                          <MorphIcon name="calendar" size={11} />
                          <span>{item.deadline}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detailed Content: Tóm tắt AI & Toàn văn bản (Không có chi tiết giờ) */}
      <div className="w-full apple-glass rounded-2xl p-4 sm:p-5 border border-white/10 shadow-lg space-y-4">
        {/* Header with Title and Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <MorphIcon name="file-text" size={16} />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                <span>{summaryMode === 'ai' ? 'Bản tóm tắt cuộc họp' : 'Toàn văn bản ghi'}</span>
              </h2>
              <p className="text-[11px] text-slate-400">
                {transcript.length} lượt thoại • {totalWords} từ
              </p>
            </div>
          </div>

          {/* 2-Mode Segmented Switcher (Làm gọn, không trùng lặp) */}
          <div className="inline-flex items-center p-0.5 rounded-full border border-white/10 bg-black/40 text-xs self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setSummaryMode('ai')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                summaryMode === 'ai'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MorphIcon name="sparkles" size={13} />
              <span>🤖 Tóm tắt AI</span>
            </button>

            <button
              type="button"
              onClick={() => setSummaryMode('text')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                summaryMode === 'text'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MorphIcon name="align-left" size={13} />
              <span>📄 Toàn văn bản</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Executive AI Summary */}
        {summaryMode === 'ai' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-400">
                Bản tóm tắt phân tích bối cảnh và kết quả do AI tổng hợp:
              </span>
              <button
                type="button"
                onClick={handleCopySummary}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40 text-xs font-medium transition-all active:scale-95"
              >
                <MorphIcon name="copy-check" state={copiedSummary ? 'copied' : 'default'} size={13} />
                <span>{copiedSummary ? 'Đã sao chép' : 'Sao chép tóm tắt'}</span>
              </button>
            </div>

            <div className="apple-card p-4 sm:p-5 rounded-xl border border-white/10 text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line font-normal min-h-[120px]">
              {summaryText ? (
                summaryText
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                    <MorphIcon name="sparkles" size={20} />
                  </div>
                  <p className="text-xs text-slate-400 max-w-md">
                    {t('summary.fullSummaryEmpty')}
                  </p>
                  <button
                    type="button"
                    onClick={handleRegenerate}
                    disabled={isAnalyzing}
                    className="px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isAnalyzing ? 'Đang phân tích...' : 'Tạo tóm tắt AI ngay'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Full Text Document (Chỉ hiện văn bản thuần, KHÔNG hiện chi tiết giờ) */}
        {summaryMode === 'text' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-400">
                Toàn văn nội dung lời thoại cuộc họp (văn bản thuần, không chứa mốc giờ):
              </span>
              <button
                type="button"
                onClick={handleCopyFullText}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow transition-all active:scale-95"
              >
                <MorphIcon name="copy-check" state={copiedFullText ? 'copied' : 'default'} size={13} />
                <span>{copiedFullText ? 'Đã sao chép toàn văn' : 'Sao chép toàn văn'}</span>
              </button>
            </div>

            <div className="apple-card p-4 sm:p-5 rounded-xl border border-white/10 bg-black/30 text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto select-text border-l-4 border-l-blue-500 min-h-[120px]">
              {fullTextTranscript || (
                <span className="text-slate-500 italic">
                  Chưa có nội dung lời thoại nào được ghi âm trong cuộc họp.
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
