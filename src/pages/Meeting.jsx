import React, { useMemo } from 'react';
import MorphIcon from '../components/MorphIcon/MorphIcon';
import { useMeetingStore, groupTranscriptIntoParagraphs } from '../store/meetingStore';
import AudioRecorder from '../components/AudioRecorder/AudioRecorder';
import LanguageSelector from '../components/LanguageSelector/LanguageSelector';
import LiveSubtitle from '../components/LiveSubtitle/LiveSubtitle';
import SpeakerMessage from '../components/SpeakerMessage/SpeakerMessage';
import MeetingSummary from '../components/MeetingSummary/MeetingSummary';
import { SENTENCE_CATEGORIES } from '../data/languages';
import { summaryService } from '../services/summaryService';

export default function Meeting() {
  const {
    activeTab,
    setActiveTab,
    transcript,
    targetLanguages,
    searchQuery,
    setSearchQuery,
    selectedCategoryFilter,
    setCategoryFilter,
    selectedSpeakerFilter,
    setSpeakerFilter,
    participants,
    isRecording,
    transcriptMode,
    setTranscriptMode,
    showTranslation,
    toggleShowTranslation,
    t,
  } = useMeetingStore();

  const [copiedAll, setCopiedAll] = React.useState(false);

  // Filtered transcript for Tab 2
  const filteredTranscript = useMemo(() => {
    const sourceTranscript = transcriptMode === 'paragraph'
      ? groupTranscriptIntoParagraphs(transcript)
      : transcript;

    return sourceTranscript.filter((item) => {
      const matchesSearch =
        !searchQuery ||
        item.originalText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        Object.values(item.translations).some((t) =>
          t.toLowerCase().includes(searchQuery.toLowerCase())
        ) ||
        item.speaker.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategoryFilter === 'all' || item.category === selectedCategoryFilter;

      const matchesSpeaker =
        selectedSpeakerFilter === 'all' || item.speaker === selectedSpeakerFilter;

      return matchesSearch && matchesCategory && matchesSpeaker;
    });
  }, [transcript, searchQuery, selectedCategoryFilter, selectedSpeakerFilter, transcriptMode]);

  const handleCopyAll = async () => {
    const source = transcriptMode === 'paragraph' ? groupTranscriptIntoParagraphs(transcript) : transcript;
    const text = source
      .map((item) => {
        let entry = `[${item.timestamp}] ${item.speaker} (${(item.category || '').toUpperCase()}):\n${item.originalText}`;
        if (showTranslation) {
          const trans = Object.values(item.translations)[0];
          if (trans) entry += `\n${trans}`;
        }
        return entry;
      })
      .join('\n\n');
    await summaryService.copyToClipboard(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="w-full flex-1 flex flex-col space-y-4">
      {/* Apple-style Segmented Control Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-1 border-b border-white/10">
        {/* Segmented Control */}
        <div className="apple-segmented-control flex items-center gap-1 w-full sm:w-auto p-1">
          <button
            type="button"
            onClick={() => setActiveTab('live')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-tight transition-all active:scale-95 ${
              activeTab === 'live'
                ? 'bg-white/20 text-white shadow-md backdrop-blur-xl'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-1.5">
              {isRecording && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
              <MorphIcon name="mic" size={14} className="text-blue-400" />
            </div>
            <span className="uppercase">{t('meeting.tabLive')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('transcript')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-tight transition-all active:scale-95 ${
              activeTab === 'transcript'
                ? 'bg-white/20 text-white shadow-md backdrop-blur-xl'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <MorphIcon name="file-text" size={14} />
            <span className="uppercase">{t('meeting.tabTranscript')} ({transcript.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-tight transition-all active:scale-95 ${
              activeTab === 'summary'
                ? 'bg-white/20 text-white shadow-md backdrop-blur-xl'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <MorphIcon name="sparkles" size={14} className="text-amber-300" />
            <span className="uppercase">{t('meeting.tabSummary')}</span>
          </button>
        </div>

        {/* Apple Status Badges on the right */}
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full apple-pill text-[11px] text-slate-300">
            <MorphIcon name="users" size={12} className="text-blue-400" />
            <span>{participants.length} {t('history.people')}</span>
          </span>
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full apple-pill text-[11px] text-slate-300">
            <MorphIcon name="message-square" size={12} className="text-emerald-400" />
            <span>{transcript.length} {t('meeting.sentences')}</span>
          </span>
        </div>
      </div>

      {/* TAB 1: LIVE */}
      {activeTab === 'live' && (
        <div className="w-full flex-1 flex flex-col space-y-3.5">
          {/* Language Selector Bar (Placed at top for easy access and unobstructed dropdown) */}
          <LanguageSelector />

          {/* Audio Recorder with Direct Record Button */}
          <AudioRecorder />

          {/* Live Subtitle Stream */}
          <LiveSubtitle />
        </div>
      )}

      {/* TAB 2: TRANSCRIPT */}
      {activeTab === 'transcript' && (
        <div className="w-full flex-1 flex flex-col space-y-3.5">
          {/* Apple Search & Filter Toolbar */}
          <div className="w-full apple-glass rounded-2xl p-3 border border-white/10 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <MorphIcon name="search" size={14} className="text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t('meeting.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full apple-input rounded-full pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 transition-all"
              />
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              {/* Transcript Mode Switcher (Sentence vs Paragraph) */}
              <div className="flex items-center p-0.5 rounded-full border border-white/10 bg-black/40 text-xs">
                <button
                  type="button"
                  onClick={() => setTranscriptMode('sentence')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                    transcriptMode === 'sentence'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title={t('liveSubtitle.modeSentence')}
                >
                  <MorphIcon name="align-left" size={12} />
                  <span>{t('liveSubtitle.modeSentence')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTranscriptMode('paragraph')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                    transcriptMode === 'paragraph'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title={t('liveSubtitle.modeParagraph')}
                >
                  <MorphIcon name="layers" size={12} />
                  <span>{t('liveSubtitle.modeParagraph')}</span>
                </button>
              </div>

              {/* Translation Toggle Button */}
              <button
                type="button"
                onClick={toggleShowTranslation}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all active:scale-95 ${
                  showTranslation
                    ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300 hover:bg-emerald-500/25'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
                title={showTranslation ? t('liveSubtitle.turnOffTranslation') : t('liveSubtitle.turnOnTranslation')}
              >
                <MorphIcon
                  name="globe"
                  size={12}
                  className={showTranslation ? 'text-emerald-400' : 'text-slate-400'}
                />
                <span>{showTranslation ? t('liveSubtitle.turnOffTranslation') : t('liveSubtitle.turnOnTranslation')}</span>
              </button>

              {/* Speaker Filter */}
              <div className="flex items-center gap-1.5 apple-pill px-3 py-1 rounded-full text-xs text-slate-300">
                <MorphIcon name="users" size={13} className="text-blue-400" />
                <select
                  value={selectedSpeakerFilter}
                  onChange={(e) => setSpeakerFilter(e.target.value)}
                  className="bg-transparent text-white outline-none cursor-pointer text-xs"
                >
                  <option value="all" className="bg-[#1c1c1e]">{t('meeting.allSpeakers')}</option>
                  {participants.map((spk) => (
                    <option key={spk} value={spk} className="bg-[#1c1c1e]">
                      {spk}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-1.5 apple-pill px-3 py-1 rounded-full text-xs text-slate-300">
                <MorphIcon name="filter" size={13} className="text-blue-400" />
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-transparent text-white outline-none cursor-pointer text-xs"
                >
                  <option value="all" className="bg-[#1c1c1e]">{t('meeting.allCategories')}</option>
                  {Object.entries(SENTENCE_CATEGORIES).map(([key, info]) => (
                    <option key={key} value={key} className="bg-[#1c1c1e]">
                      {t(`categories.${key}`) || info.badge}
                    </option>
                  ))}
                </select>
              </div>

              {/* Copy All Button */}
              <button
                type="button"
                onClick={handleCopyAll}
                className="flex items-center gap-1.5 px-3 py-1 apple-pill hover:bg-white/15 text-slate-200 text-xs font-semibold rounded-full transition-all active:scale-95"
              >
                <MorphIcon name="copy-check" state={copiedAll ? 'copied' : 'default'} size={14} />
                <span>{copiedAll ? t('meeting.copied') : t('meeting.copyAll')}</span>
              </button>
            </div>
          </div>

          {/* Transcript Message Feed */}
          {filteredTranscript.length === 0 ? (
            <div className="apple-glass rounded-2xl p-14 text-center border border-white/10">
              <p className="text-slate-400 text-xs font-medium">{t('meeting.noFilterResults')}</p>
            </div>
          ) : (
            <div className="space-y-2.5 overflow-y-auto pr-1">
              {filteredTranscript.map((message) => (
                <SpeakerMessage
                  key={message.id}
                  message={message}
                  targetLanguages={targetLanguages}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SUMMARY */}
      {activeTab === 'summary' && (
        <div className="w-full flex-1">
          <MeetingSummary />
        </div>
      )}
    </div>
  );
}
