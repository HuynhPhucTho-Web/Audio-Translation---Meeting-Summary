import React, { useState } from 'react';
import MorphIcon from '../MorphIcon/MorphIcon';
import { SENTENCE_CATEGORIES, getLanguageByCode } from '../../data/languages';
import { translationService } from '../../services/translationService';
import { useMeetingStore } from '../../store/meetingStore';

function getSpeakerColor(speaker) {
  const colors = [
    'from-blue-600 to-indigo-600 text-blue-200 border-blue-500/30',
    'from-purple-600 to-pink-600 text-purple-200 border-purple-500/30',
    'from-emerald-600 to-teal-600 text-emerald-200 border-emerald-500/30',
    'from-amber-600 to-orange-600 text-amber-200 border-amber-500/30',
  ];
  let hash = 0;
  for (let i = 0; i < speaker.length; i++) {
    hash = speaker.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function SpeakerMessage({ message, targetLanguages = ['vi'] }) {
  const { t, showTranslation } = useMeetingStore();
  const [copied, setCopied] = useState(false);
  const categoryInfo = SENTENCE_CATEGORIES[message.category] || SENTENCE_CATEGORIES.statement;
  const origLang = getLanguageByCode(message.originalLang);
  const colorClass = getSpeakerColor(message.speaker);

  const handleCopy = async () => {
    const translation = Object.values(message.translations)[0] || '';
    const textToCopy = `[${message.timestamp}] ${message.speaker}:\n${message.originalText}\n${translation}`;
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleSpeak = (text, langCode) => {
    translationService.speakText(text, langCode);
  };

  return (
    <div className="apple-card rounded-2xl p-4 border border-white/10 hover:border-white/20 transition-all shadow-sm">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full bg-gradient-to-tr ${colorClass} border flex items-center justify-center text-[10px] font-bold shadow-sm`}>
            {message.speaker.charAt(0).toUpperCase()}
          </div>
          <span className="font-semibold text-xs text-slate-100">{message.speaker}</span>
          <span className="text-[10px] font-mono text-slate-400">{message.timestamp}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full border ${categoryInfo.color}`}>
            {t(`categories.${message.category}`) || categoryInfo.badge}
          </span>

          <button
            type="button"
            onClick={handleCopy}
            className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
            title={t('liveSubtitle.copyContent')}
          >
            <MorphIcon name="copy-check" state={copied ? 'copied' : 'default'} size={14} className={copied ? 'text-emerald-400' : ''} />
          </button>
        </div>
      </div>

      {/* Spoken Content (Original) */}
      <div className="text-slate-200 text-sm leading-relaxed flex items-start gap-2 pl-8">
        <span className="text-xs opacity-80 select-none mt-0.5">{origLang.flag}</span>
        <div className="flex-1 space-y-1 font-normal">
          {(message.originalText || '').split('\n').map((line, idx) => (
            <p key={idx} className="leading-relaxed">"{line}"</p>
          ))}
        </div>
      </div>

      {/* Translations (shown only when showTranslation is true) */}
      {showTranslation && (
        <>
          {/* Subtle Hairline Divider */}
          <div className="my-2 ml-8 border-t border-white/[0.08]" />

          {/* Translations */}
          <div className="pl-8 space-y-1.5">
            {targetLanguages.map((code) => {
              const lang = getLanguageByCode(code);
              const transText = message.translations[code] || Object.values(message.translations)[0];
              if (!transText) return null;
              const transLines = (transText || '').split('\n').filter(Boolean);

              return (
                <div
                  key={code}
                  className="bg-emerald-500/[0.08] border border-emerald-500/20 rounded-xl p-2 px-3 text-sm flex items-start justify-between gap-2"
                >
                  <div className="flex items-start gap-2 flex-1 text-emerald-300">
                    <span className="text-xs select-none mt-0.5">{lang.flag}</span>
                    <div className="flex-1 space-y-1.5 font-medium">
                      {transLines.map((line, idx) => (
                        <p key={idx} className="leading-relaxed">"{line}"</p>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSpeak(transText, code)}
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
}
