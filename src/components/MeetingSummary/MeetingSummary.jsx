import React, { useState, useMemo } from 'react';
import MorphIcon from '../MorphIcon/MorphIcon';
import { useMeetingStore } from '../../store/meetingStore';
import { summaryService } from '../../services/summaryService';
import { translationService } from '../../services/translationService';
import { getLanguageByCode, SENTENCE_CATEGORIES } from '../../data/languages';
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
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [copiedFullText, setCopiedFullText] = useState(false);
  const [copiedDialogueId, setCopiedDialogueId] = useState(null);
  const [summaryMode, setSummaryMode] = useState('dialogue'); // 'dialogue' | 'text' | 'ai'
  const [dialogueSearch, setDialogueSearch] = useState('');
  const [dialogueCategoryFilter, setDialogueCategoryFilter] = useState('all');
  const [dialogueSpeakerFilter, setDialogueSpeakerFilter] = useState('all');

  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalWords = useMemo(() => {
    return transcript.reduce((acc, t) => {
      const words = (t.originalText || '').trim().split(/\s+/).filter(Boolean);
      return acc + words.length;
    }, 0);
  }, [transcript]);

  const filteredDialogue = useMemo(() => {
    return transcript.filter((item) => {
      const q = dialogueSearch.toLowerCase();
      const matchesSearch =
        !q ||
        (item.originalText || '').toLowerCase().includes(q) ||
        (item.speaker || '').toLowerCase().includes(q) ||
        Object.values(item.translations || {}).some((tr) => (tr || '').toLowerCase().includes(q));

      const matchesCat = dialogueCategoryFilter === 'all' || item.category === dialogueCategoryFilter;
      const matchesSpeaker = dialogueSpeakerFilter === 'all' || item.speaker === dialogueSpeakerFilter;

      return matchesSearch && matchesCat && matchesSpeaker;
    });
  }, [transcript, dialogueSearch, dialogueCategoryFilter, dialogueSpeakerFilter]);

  const fullTextTranscript = useMemo(() => {
    if (!transcript || transcript.length === 0) return '';
    const header = [
      `========================================================================`,
      `BIÊN BẢN CHI TIẾT LỜI THOẠI CUỘC HỌP (FULL MEETING MINUTES)`,
      `Ngày lập: ${new Date().toLocaleDateString('vi-VN')} | Thời lượng: ${formatDuration(recordingTime)}`,
      `Người tham gia: ${participants.length > 0 ? participants.join(', ') : 'Chưa có thông tin'}`,
      `Tổng số lượt thoại: ${transcript.length} câu | Tổng số từ: ${totalWords} từ`,
      `========================================================================\n`,
    ].join('\n');

    const lines = transcript.map((item, idx) => {
      const trans = Object.values(item.translations || {})[0];
      let res = `[${idx + 1}] [${item.timestamp}] ${item.speaker} (${(item.category || 'STATEMENT').toUpperCase()}):\n"${item.originalText}"`;
      if (trans && trans !== item.originalText) {
        res += `\n  ↳ Dịch: "${trans}"`;
      }
      return res;
    }).join('\n\n');

    return `${header}\n${lines}`;
  }, [transcript, recordingTime, participants, totalWords]);

  const currentMeetingPayload = {
    date: new Date().toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }),
    duration: recordingTime,
    participants,
    topics,
    decisions,
    actionItems,
    summaryText,
    transcript,
  };

  const handleRegenerate = async () => {
    setIsAnalyzing(true);
    const res = await summaryService.generateSummary(
      transcript,
      primaryTargetLanguage,
      settings.apiKey
    );
    setAnalysisData(res);
  };

  const handleCopySummary = async () => {
    const text = `TÓM TẮT CUỘC HỌP\n\n📌 CHỦ ĐỀ CHÍNH:\n${topics.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\n✅ QUYẾT ĐỊNH:\n${decisions.map((d) => `• ${d}`).join('\n')}\n\n📋 VIỆC CẦN LÀM:\n${actionItems.map((a) => `[${a.completed ? 'X' : ' '}] ${a.assignee}: ${a.task} (${a.deadline})`).join('\n')}\n\n📝 TÓM TẮT:\n${summaryText}`;
    await summaryService.copyToClipboard(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 1800);
  };

  const handleCopyTranscript = async () => {
    const text = transcript
      .map((t) => `[${t.timestamp}] ${t.speaker}:\n${t.originalText}\n${Object.values(t.translations)[0] || ''}`)
      .join('\n\n');
    await summaryService.copyToClipboard(text);
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 1800);
  };

  const handleCopyFullText = async () => {
    if (!fullTextTranscript) return;
    await summaryService.copyToClipboard(fullTextTranscript);
    setCopiedFullText(true);
    setTimeout(() => setCopiedFullText(false), 2000);
  };

  const handleCopySingleDialogue = async (id, text) => {
    await summaryService.copyToClipboard(text);
    setCopiedDialogueId(id);
    setTimeout(() => setCopiedDialogueId(null), 1500);
  };

  const handleSpeakDialogue = (text, lang = 'vi') => {
    translationService.speakText(text, lang);
  };

  return (
    <div className="w-full space-y-4">
      {/* Top Header & Apple Action Strip */}
      <div className="w-full apple-glass rounded-2xl p-4 sm:p-5 border border-white/10 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300">
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

        {/* Action Button Pills */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={() => summaryService.exportToTxt(currentMeetingPayload)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full apple-pill text-xs font-semibold text-slate-200 hover:text-white transition-all active:scale-95"
            title="TXT"
          >
            <MorphIcon name="file-text" size={14} className="text-blue-400" />
            <span>TXT</span>
          </button>

          <button
            type="button"
            onClick={() => summaryService.exportToPdf(currentMeetingPayload)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full apple-pill text-xs font-semibold text-slate-200 hover:text-white transition-all active:scale-95"
            title="PDF"
          >
            <MorphIcon name="printer" size={14} className="text-rose-400" />
            <span>PDF</span>
          </button>

          <button
            type="button"
            onClick={() => summaryService.exportToDocx(currentMeetingPayload)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full apple-pill text-xs font-semibold text-slate-200 hover:text-white transition-all active:scale-95"
            title="DOC"
          >
            <MorphIcon name="file-down" size={14} className="text-emerald-400" />
            <span>DOC</span>
          </button>

          <button
            type="button"
            onClick={handleCopyTranscript}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full apple-pill text-xs font-semibold text-slate-200 hover:text-white transition-all active:scale-95"
          >
            <MorphIcon name="copy-check" state={copiedTranscript ? 'copied' : 'default'} size={14} className={copiedTranscript ? 'text-emerald-400' : ''} />
            <span>{t('summary.transcript')}</span>
          </button>

          <button
            type="button"
            onClick={handleCopySummary}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-md active:scale-95"
          >
            <MorphIcon name="copy-check" state={copiedSummary ? 'copied' : 'default'} size={14} />
            <span>{t('summary.summaryBtn')}</span>
          </button>

          <button
            type="button"
            onClick={handleRegenerate}
            disabled={isAnalyzing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full apple-pill text-blue-300 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
            title={t('summary.refreshAi')}
          >
            <MorphIcon name="refresh-cw" size={14} className={isAnalyzing ? 'animate-spin' : ''} />
            <span>{isAnalyzing ? t('summary.analyzing') : t('summary.refreshAi')}</span>
          </button>
        </div>
      </div>

      {/* Apple Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="apple-card rounded-2xl p-4 border border-white/10 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
            <MorphIcon name="users" size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-slate-400 font-medium">{t('summary.participants')} ({participants.length})</div>
            <div className="text-sm font-semibold text-white truncate mt-0.5">
              {participants.length > 0 ? participants.join(', ') : t('summary.noParticipants')}
            </div>
          </div>
        </div>

        <div className="apple-card rounded-2xl p-4 border border-white/10 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
            <MorphIcon name="clock" size={20} />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">{t('summary.duration')}</div>
            <div className="text-sm font-semibold text-white font-mono mt-0.5">
              {formatDuration(recordingTime)}
            </div>
          </div>
        </div>

        <div className="apple-card rounded-2xl p-4 border border-white/10 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
            <MorphIcon name="calendar" size={20} />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">{t('summary.reportDate')}</div>
            <div className="text-sm font-semibold text-white mt-0.5">
              {new Date().toLocaleDateString('vi-VN')}
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Topics & Decisions vs Action Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Key Topics */}
          <div className="apple-glass rounded-2xl p-4 sm:p-5 border border-white/10 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <MorphIcon name="bookmark" size={16} className="text-amber-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                {t('summary.keyTopics')}
              </h2>
            </div>
            <MeetingTopics topics={topics} />
          </div>

          {/* Decisions */}
          <div className="apple-glass rounded-2xl p-4 sm:p-5 border border-white/10 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <MorphIcon name="check-circle" size={16} className="text-emerald-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                {t('summary.decisions')}
              </h2>
            </div>

            {decisions.length === 0 ? (
              <p className="text-xs text-slate-400 italic">{t('summary.noDecisions')}</p>
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
              <MorphIcon name="list-todo" size={16} className="text-blue-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                {t('summary.actionItems')}
              </h2>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full apple-pill text-slate-300">
              {actionItems.filter((a) => a.completed).length}/{actionItems.length} {t('summary.completed')}
            </span>
          </div>

          {actionItems.length === 0 ? (
            <p className="text-xs text-slate-400 italic">{t('summary.noActionItems')}</p>
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
                    className="mt-0.5 w-4 h-4 rounded-full border-white/30 text-blue-600 focus:ring-0 bg-white/10 cursor-pointer"
                  />
                  <div className="flex-1 text-xs">
                    <div className={item.completed ? 'line-through text-slate-400' : 'font-medium'}>
                      {item.task}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400">
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

      {/* Detailed Meeting Summary & Recorded Dialogue Content */}
      <div className="w-full apple-glass rounded-2xl p-5 border border-white/10 shadow-lg space-y-4">
        {/* Header with Title and Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <MorphIcon name="file-text" size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                <span>{t('summary.fullSummaryTitle')}</span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Chi tiết các lời thoại đã ghi âm ({transcript.length} lượt thoại • {totalWords} từ)
              </p>
            </div>
          </div>

          {/* Segmented Mode Switcher */}
          <div className="flex items-center p-0.5 rounded-full border border-white/10 bg-black/40 text-xs self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setSummaryMode('dialogue')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                summaryMode === 'dialogue'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MorphIcon name="message-square" size={13} />
              <span>💬 Lời thoại chi tiết</span>
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
              <span>📄 Toàn văn biên bản</span>
            </button>
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
          </div>
        </div>

        {/* Tab 1: Detailed Dialogue List */}
        {summaryMode === 'dialogue' && (
          <div className="space-y-3">
            {/* Filter and Search Bar for Dialogue */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-white/[0.03] p-2.5 rounded-xl border border-white/5">
              <div className="flex-1 min-w-[200px] relative">
                <input
                  type="text"
                  placeholder="Tìm kiếm nội dung lời thoại đã ghi..."
                  value={dialogueSearch}
                  onChange={(e) => setDialogueSearch(e.target.value)}
                  className="w-full apple-input rounded-xl px-3.5 py-1.5 pl-8 text-xs text-white placeholder-slate-500"
                />
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <MorphIcon name="search" size={13} />
                </div>
              </div>

              {/* Speaker Filter */}
              {participants.length > 1 && (
                <select
                  value={dialogueSpeakerFilter}
                  onChange={(e) => setDialogueSpeakerFilter(e.target.value)}
                  className="apple-input rounded-xl px-2.5 py-1.5 text-xs text-slate-200 cursor-pointer"
                >
                  <option value="all" className="bg-[#1c1c1e]">Tất cả người nói</option>
                  {participants.map((spk) => (
                    <option key={spk} value={spk} className="bg-[#1c1c1e]">{spk}</option>
                  ))}
                </select>
              )}

              {/* Quick Copy All Dialogue */}
              <button
                type="button"
                onClick={handleCopyTranscript}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-medium border border-white/10 transition-all active:scale-95"
              >
                <MorphIcon name="copy-check" state={copiedTranscript ? 'copied' : 'default'} size={13} />
                <span>{copiedTranscript ? 'Đã chép lời thoại' : 'Chép tất cả lời thoại'}</span>
              </button>
            </div>

            {/* List of Dialogue items */}
            {filteredDialogue.length === 0 ? (
              <div className="p-8 text-center text-slate-400 italic apple-card rounded-xl border border-white/5">
                {dialogueSearch ? 'Không tìm thấy lời thoại phù hợp với từ khóa.' : 'Chưa có lời thoại nào được ghi âm trong cuộc họp này.'}
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {filteredDialogue.map((item, index) => {
                  const catInfo = SENTENCE_CATEGORIES[item.category] || SENTENCE_CATEGORIES.statement;
                  const langMeta = getLanguageByCode(item.originalLang);
                  const translationText = Object.values(item.translations || {})[0];

                  return (
                    <div
                      key={item.id || index}
                      className="apple-card rounded-xl p-3.5 border border-white/10 hover:border-white/20 transition-all space-y-2"
                    >
                      {/* Speaker header row */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-300 flex items-center justify-center text-[10px] font-bold border border-blue-500/30">
                            {item.speaker.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-xs text-slate-100">{item.speaker}</span>
                          <span className="text-[10px] font-mono text-slate-400">[{item.timestamp}]</span>
                          <span className="text-[10px] text-slate-500 font-mono">#{index + 1}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Category Badge */}
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${catInfo.color}`}>
                            {t(`categories.${item.category}`) || catInfo.badge}
                          </span>

                          {/* Copy button */}
                          <button
                            type="button"
                            onClick={() => handleCopySingleDialogue(item.id, `[${item.timestamp}] ${item.speaker}: "${item.originalText}"${translationText ? `\n-> "${translationText}"` : ''}`)}
                            className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                            title="Sao chép lời thoại này"
                          >
                            <MorphIcon
                              name="copy-check"
                              state={copiedDialogueId === item.id ? 'copied' : 'default'}
                              size={13}
                            />
                          </button>

                          {/* Listen button */}
                          <button
                            type="button"
                            onClick={() => handleSpeakDialogue(item.originalText, item.originalLang)}
                            className="p-1 text-slate-400 hover:text-blue-300 rounded-full hover:bg-white/10 transition-colors"
                            title="Nghe giọng đọc"
                          >
                            <MorphIcon name="volume" size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Spoken original text */}
                      <div className="text-xs sm:text-sm text-slate-200 pl-7 leading-relaxed font-normal flex items-start gap-1.5">
                        <span className="text-xs select-none mt-0.5">{langMeta.flag}</span>
                        <p className="flex-1">"{item.originalText}"</p>
                      </div>

                      {/* Translation text */}
                      {translationText && translationText !== item.originalText && (
                        <div className="ml-7 p-2 rounded-lg bg-emerald-500/[0.08] border border-emerald-500/20 text-emerald-300 text-xs flex items-start gap-1.5">
                          <span className="text-[10px] font-bold text-emerald-400 uppercase select-none mt-0.5">Dịch:</span>
                          <p className="flex-1 leading-relaxed">"{translationText}"</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Full Text Minutes Document */}
        {summaryMode === 'text' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-400">
                Toàn văn văn bản ghi lời thoại theo định dạng chuẩn biên bản cuộc họp:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyFullText}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow transition-all active:scale-95"
                >
                  <MorphIcon name="copy-check" state={copiedFullText ? 'copied' : 'default'} size={13} />
                  <span>{copiedFullText ? 'Đã sao chép toàn bộ' : 'Sao chép toàn bộ văn bản'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => summaryService.exportToTxt(currentMeetingPayload)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl apple-pill text-xs font-medium text-slate-200 hover:text-white transition-all active:scale-95"
                  title="Tải về file TXT"
                >
                  <MorphIcon name="file-text" size={13} className="text-blue-400" />
                  <span>Tải .TXT</span>
                </button>
              </div>
            </div>

            <div className="apple-card p-4 rounded-xl border border-white/10 bg-black/40 text-xs font-mono text-slate-200 leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto select-text border-l-4 border-l-blue-500">
              {fullTextTranscript || (
                <span className="text-slate-500 italic">
                  Chưa có nội dung lời thoại được ghi âm trong cuộc họp.
                </span>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Executive AI Summary */}
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
                <span>{copiedSummary ? 'Đã sao chép tóm tắt' : 'Sao chép tóm tắt AI'}</span>
              </button>
            </div>

            <div className="apple-card p-4 rounded-xl border border-white/10 text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line font-normal">
              {summaryText || (
                <span className="text-slate-400 italic">
                  {t('summary.fullSummaryEmpty')}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
