import React, { useEffect, useRef, useState } from 'react';
import MorphIcon from '../MorphIcon/MorphIcon';
import { useMeetingStore, groupTranscriptIntoParagraphs } from '../../store/meetingStore';
import { getLanguageByCode, SENTENCE_CATEGORIES } from '../../data/languages';
import { translationService } from '../../services/translationService';
import './LiveSubtitle.css';

export default function LiveSubtitle() {
  const {
    liveSubtitle,
    transcript,
    primaryTargetLanguage,
    targetLanguages,
    isRecording,
    settings,
    transcriptMode,
    setTranscriptMode,
    showTranslation,
    toggleShowTranslation,
    t,
  } = useMeetingStore();

  const scrollRef = useRef(null);
  const bottomAnchorRef = useRef(null);
  const [copiedId, setCopiedId] = useState(null);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

  // Smooth auto-scroll to bottom function (rolls content upwards)
  const scrollToBottom = (smooth = true) => {
    if (bottomAnchorRef.current) {
      bottomAnchorRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end',
      });
    } else if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  // Auto-scroll when new transcript items arrive or live subtitles stream
  useEffect(() => {
    // Only auto-scroll if user hasn't scrolled far up
    if (!showScrollBottomBtn) {
      scrollToBottom(true);
    }
  }, [transcript, liveSubtitle.originalText, liveSubtitle.translatedText]);

  // Always force scroll down on initial mount or when recording starts
  useEffect(() => {
    if (isRecording) {
      scrollToBottom(true);
      setShowScrollBottomBtn(false);
    }
  }, [isRecording]);

  // Track if user scrolled up manually
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    // If scrolled more than 100px away from bottom, show jump-to-bottom button
    if (distanceFromBottom > 100) {
      setShowScrollBottomBtn(true);
    } else {
      setShowScrollBottomBtn(false);
    }
  };

  // Text-To-Speech auto playback if enabled in settings
  useEffect(() => {
    if (settings.autoTTS && transcript.length > 0) {
      const latest = transcript[transcript.length - 1];
      const translated = latest.translations[primaryTargetLanguage];
      if (translated) {
        translationService.speakText(translated, primaryTargetLanguage);
      }
    }
  }, [transcript.length, settings.autoTTS, primaryTargetLanguage]);

  const handleSpeak = (text, lang) => {
    translationService.speakText(text, lang);
  };

  const handleCopy = async (id, originalText, translations = {}) => {
    let textToCopy = originalText;
    if (showTranslation) {
      const trans = Object.values(translations)[0];
      if (trans) textToCopy += `\n${trans}`;
    }
    await navigator.clipboard.writeText(textToCopy);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const targetLangObj = getLanguageByCode(primaryTargetLanguage);
  const displayTranscript = transcriptMode === 'paragraph'
    ? groupTranscriptIntoParagraphs(transcript)
    : transcript;

  return (
    <div className="w-full flex-1 flex flex-col apple-glass rounded-2xl border border-white/10 shadow-xl overflow-hidden h-[540px] max-h-[calc(100vh-270px)] min-h-[380px] relative">
      {/* Sleek Apple Dictation Subtitle Header & Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 border-b border-white/10 bg-black/30 shrink-0">
        <div className="flex items-center gap-2">
          <MorphIcon name="message-square" size={16} className="text-blue-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            {t('liveSubtitle.title')}
          </h2>
          <span className="text-[11px] font-mono text-slate-400">
            ({displayTranscript.length} {transcriptMode === 'paragraph' ? t('liveSubtitle.modeParagraph') : t('liveSubtitle.sentences')})
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Transcript Mode Switcher (Sentence vs Paragraph) */}
          <div className="flex items-center p-0.5 rounded-full border border-white/10 bg-black/40 text-xs">
            <button
              type="button"
              onClick={() => setTranscriptMode('sentence')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
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
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
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
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border transition-all active:scale-95 ${
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

          {isRecording && (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[11px]">{t('liveSubtitle.recordingLive')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Subtitles Scroll Viewport (Rolls content upwards, pinned to bottom) */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="subtitle-container flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth"
      >
        {displayTranscript.length === 0 && !liveSubtitle.originalText && (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center py-16">
            <div className="w-16 h-16 rounded-2xl apple-card flex items-center justify-center mb-3 p-3 shadow-inner border border-white/10">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain drop-shadow-[0_4px_12px_rgba(59,130,246,0.3)]" />
            </div>
            <p className="text-sm font-semibold text-slate-300">{t('liveSubtitle.readyTitle')}</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              {t('liveSubtitle.readyDesc')}
            </p>
          </div>
        )}

        {/* Committed Subtitles List */}
        {displayTranscript.map((item) => {
          const categoryInfo = SENTENCE_CATEGORIES[item.category] || SENTENCE_CATEGORIES.statement;
          const origLangObj = getLanguageByCode(item.originalLang);

          return (
            <div
              key={item.id}
              className="apple-card rounded-2xl p-3.5 border border-white/10 hover:border-white/20 transition-all shadow-sm animate-fadeIn"
            >
              {/* Speaker row */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                    {item.speaker.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-semibold text-xs text-slate-100">
                    {item.speaker}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {item.timestamp}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Category Pill */}
                  <span
                    className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full border ${categoryInfo.color}`}
                  >
                    {t(`categories.${item.category}`) || categoryInfo.badge}
                  </span>

                  {/* Morphing Copy Button */}
                  <button
                    type="button"
                    onClick={() => handleCopy(item.id, item.originalText, item.translations)}
                    className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                    title={t('liveSubtitle.copyContent')}
                  >
                    <MorphIcon
                      name="copy-check"
                      state={copiedId === item.id ? 'copied' : 'default'}
                      size={15}
                    />
                  </button>
                </div>
              </div>

              {/* Line 1: Spoken Original */}
              <div className="text-slate-200 text-sm leading-relaxed flex items-start gap-2 pl-8">
                <span className="text-xs select-none opacity-80 mt-0.5">{origLangObj.flag}</span>
                <div className="flex-1 space-y-1 font-normal">
                  {(item.originalText || '').split('\n').map((line, idx) => (
                    <p key={idx} className="leading-relaxed">"{line}"</p>
                  ))}
                </div>
              </div>

              {/* Line 2: Translated Output (Only if showTranslation is true) */}
              {showTranslation && (
                <>
                  <div className="my-2 ml-8 border-t border-white/[0.08]" />
                  <div className="pl-8 space-y-1.5">
                    {targetLanguages.map((langCode) => {
                      const langMeta = getLanguageByCode(langCode);
                      const translationText = item.translations[langCode] || item.translations[primaryTargetLanguage] || item.originalText;
                      const transLines = (translationText || '').split('\n').filter(Boolean);

                      return (
                        <div
                          key={langCode}
                          className="text-emerald-300 text-sm font-medium leading-relaxed flex items-start justify-between gap-2 bg-emerald-500/[0.08] p-2 px-3 rounded-xl border border-emerald-500/20"
                        >
                          <div className="flex items-start gap-2 flex-1">
                            <span className="text-xs select-none mt-0.5">{langMeta.flag}</span>
                            <div className="flex-1 space-y-1.5">
                              {transLines.map((line, idx) => (
                                <p key={idx} className="leading-relaxed">"{line}"</p>
                              ))}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSpeak(translationText, langCode)}
                            className="text-slate-400 hover:text-emerald-300 p-1 rounded-full hover:bg-emerald-500/20 transition-colors shrink-0"
                            title={t('liveSubtitle.listenVoice')}
                          >
                            <MorphIcon name="volume" size={15} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })}

        {/* Live Interim Streaming Subtitle (Pinned at bottom, actively updating) */}
        {liveSubtitle.isSpeaking && (
          <div className="apple-card rounded-2xl p-4 border border-blue-500/40 bg-blue-950/20 shadow-lg animate-fadeIn">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold">
                  <MorphIcon name="user" size={13} />
                </div>
                <span className="font-semibold text-xs text-blue-300">
                  {liveSubtitle.speaker} {t('liveSubtitle.speaking')}
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 uppercase tracking-wider">
                {t('liveSubtitle.liveBadge')}
              </span>
            </div>

            <div className="text-white text-sm italic pl-8">
              "{liveSubtitle.originalText}"
              <span className="typing-cursor" />
            </div>

            {showTranslation && liveSubtitle.translatedText && (
              <>
                <div className="my-2 ml-8 border-t border-blue-500/20" />
                <div className="text-emerald-300 text-sm font-medium flex items-center gap-2 pl-8">
                  <span>{targetLangObj.flag}</span>
                  <span>"{liveSubtitle.translatedText}"</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Bottom Anchor for Auto-Scroll Roll Effect */}
        <div ref={bottomAnchorRef} className="h-1 w-full" />
      </div>

      {/* Floating "Jump to bottom" button when user scrolls up */}
      {showScrollBottomBtn && (
        <button
          type="button"
          onClick={() => {
            setShowScrollBottomBtn(false);
            scrollToBottom(true);
          }}
          className="absolute bottom-12 right-6 apple-glass px-4 py-1.5 rounded-full text-xs font-semibold text-white shadow-2xl border border-white/20 hover:bg-white/20 transition-all active:scale-95 flex items-center gap-1.5 z-20 animate-fadeIn"
        >
          <MorphIcon name="chevron-down" size={14} className="text-blue-400" />
          <span>{t('liveSubtitle.scrollToBottom')}</span>
        </button>
      )}

      {/* Bottom Subtitle Bar with Quick Toggle */}
      <div className="px-4 py-1.5 bg-black/35 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 font-mono">
            <MorphIcon name="chevron" state="up" size={11} className="text-emerald-400" />
            <span>{t('liveSubtitle.autoRoll')}</span>
          </span>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="hidden sm:inline font-mono">
            {transcriptMode === 'paragraph' ? t('liveSubtitle.modeParagraph') : t('liveSubtitle.modeSentence')}
          </span>
        </div>

        <button
          type="button"
          onClick={toggleShowTranslation}
          className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-medium transition-all ${
            showTranslation
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
              : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
          }`}
          title={showTranslation ? t('liveSubtitle.turnOffTranslation') : t('liveSubtitle.turnOnTranslation')}
        >
          <MorphIcon name="globe" size={11} className={showTranslation ? 'text-emerald-400' : 'text-slate-400'} />
          <span>{showTranslation ? t('liveSubtitle.turnOffTranslation') : t('liveSubtitle.turnOnTranslation')}</span>
        </button>
      </div>
    </div>
  );
}
