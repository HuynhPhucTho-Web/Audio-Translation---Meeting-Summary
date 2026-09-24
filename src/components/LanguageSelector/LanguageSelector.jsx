import React, { useState, useRef, useEffect } from 'react';
import MorphIcon from '../MorphIcon/MorphIcon';
import { useMeetingStore } from '../../store/meetingStore';
import { SUPPORTED_LANGUAGES, getLanguageByCode } from '../../data/languages';
import { speechService } from '../../services/speechService';

// Frequently used languages for quick-access sections in dropdowns
const POPULAR_LANG_CODES = ['vi', 'en', 'zh', 'ja', 'ko', 'fr', 'de', 'es'];

export default function LanguageSelector() {
  const {
    t,
    detectedLanguage,
    setDetectedLanguage,
    targetLanguages,
    primaryTargetLanguage,
    setPrimaryTargetLanguage,
    addTargetLanguage,
    removeTargetLanguage,
    spokenInputLanguage,
    setSpokenInputLanguage,
  } = useMeetingStore();

  const [isSpokenOpen, setIsSpokenOpen] = useState(false);
  const [isTargetOpen, setIsTargetOpen] = useState(false);
  const [isMultiModalOpen, setIsMultiModalOpen] = useState(false);

  const [searchSpoken, setSearchSpoken] = useState('');
  const [searchTarget, setSearchTarget] = useState('');
  const [searchMulti, setSearchMulti] = useState('');

  const spokenRef = useRef(null);
  const targetRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (spokenRef.current && !spokenRef.current.contains(e.target)) {
        setIsSpokenOpen(false);
      }
      if (targetRef.current && !targetRef.current.contains(e.target)) {
        setIsTargetOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Metadata for current spoken language
  const isSpokenAuto = !spokenInputLanguage || spokenInputLanguage === 'auto';
  const spokenLangMeta = isSpokenAuto
    ? {
        code: 'auto',
        name: t('langSelector.autoDetect') || 'Tự động phát hiện',
        flag: '✨',
      }
    : getLanguageByCode(spokenInputLanguage);

  // Metadata for current primary target language
  const primaryLangMeta = getLanguageByCode(primaryTargetLanguage);

  // Filtered language lists
  const filteredSpokenLangs = SUPPORTED_LANGUAGES.filter(
    (lang) =>
      lang.name.toLowerCase().includes(searchSpoken.toLowerCase()) ||
      lang.code.toLowerCase().includes(searchSpoken.toLowerCase())
  );

  const filteredTargetLangs = SUPPORTED_LANGUAGES.filter(
    (lang) =>
      lang.name.toLowerCase().includes(searchTarget.toLowerCase()) ||
      lang.code.toLowerCase().includes(searchTarget.toLowerCase())
  );

  const filteredMultiLangs = SUPPORTED_LANGUAGES.filter(
    (lang) =>
      lang.name.toLowerCase().includes(searchMulti.toLowerCase()) ||
      lang.code.toLowerCase().includes(searchMulti.toLowerCase())
  );

  // Handlers
  const handleSelectSpokenLanguage = (code) => {
    setSpokenInputLanguage(code);
    speechService.setSpokenLanguage(code);
    if (code !== 'auto') {
      const matched = getLanguageByCode(code);
      setDetectedLanguage({
        code: matched.code,
        name: matched.name,
        flag: matched.flag,
        confidence: 99,
      });
    } else {
      setDetectedLanguage({
        code: 'auto',
        name: t('langSelector.autoDetect') || 'Tự động phát hiện',
        flag: '✨',
        confidence: 100,
      });
    }
    setIsSpokenOpen(false);
    setSearchSpoken('');
  };

  const handleSelectPrimaryTarget = (code) => {
    setPrimaryTargetLanguage(code);
    speechService.setTargetLanguage(code);
    setIsTargetOpen(false);
    setSearchTarget('');
  };

  const handleSwapLanguages = () => {
    const currentSpoken = isSpokenAuto ? (detectedLanguage.code !== 'auto' ? detectedLanguage.code : 'vi') : spokenInputLanguage;
    const currentTarget = primaryTargetLanguage;

    setSpokenInputLanguage(currentTarget);
    speechService.setSpokenLanguage(currentTarget);
    const newSpokenMeta = getLanguageByCode(currentTarget);
    setDetectedLanguage({
      code: newSpokenMeta.code,
      name: newSpokenMeta.name,
      flag: newSpokenMeta.flag,
      confidence: 99,
    });

    setPrimaryTargetLanguage(currentSpoken);
    speechService.setTargetLanguage(currentSpoken);
  };

  const toggleMultiLanguage = (code) => {
    if (code === primaryTargetLanguage) return; // Cannot toggle primary
    if (targetLanguages.includes(code)) {
      removeTargetLanguage(code);
    } else {
      addTargetLanguage(code);
    }
  };

  return (
    <div className="relative z-30 w-full apple-glass rounded-2xl p-2 sm:px-4 sm:py-2.5 shadow-lg border border-white/10 flex flex-wrap items-center justify-between gap-2.5">
      {/* LEFT: Spoken Language Dropdown Pill */}
      <div className="relative" ref={spokenRef}>
        <button
          type="button"
          onClick={() => {
            setIsSpokenOpen(!isSpokenOpen);
            setIsTargetOpen(false);
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 border ${
            isSpokenOpen
              ? 'bg-blue-600 text-white border-blue-400 ring-2 ring-blue-500/30'
              : 'apple-pill hover:bg-white/15 text-slate-200 hover:text-white border-white/10'
          }`}
          title={t('langSelector.spokenLang')}
        >
          <MorphIcon name="mic" size={14} className={isSpokenOpen ? 'text-white' : 'text-blue-400'} />
          <span className="text-slate-400 text-[11px] hidden sm:inline">{t('langSelector.spokenLang')}</span>
          <span className="text-sm select-none">{spokenLangMeta.flag}</span>
          <span className="font-semibold">{spokenLangMeta.name}</span>

          {/* If Auto mode detected a language, show dynamic pill */}
          {isSpokenAuto && detectedLanguage.code !== 'auto' && (
            <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono">
              <span className="w-1 h-1 rounded-full bg-blue-400 animate-ping" />
              <span>{detectedLanguage.flag} {detectedLanguage.confidence || 98}%</span>
            </span>
          )}

          <MorphIcon
            name="chevron"
            state={isSpokenOpen ? 'open' : 'default'}
            size={12}
            className="text-slate-400"
          />
        </button>

        {/* Spoken Language Dropdown Popover */}
        {isSpokenOpen && (
          <div className="absolute left-0 mt-2 z-[9999] w-72 max-h-[380px] flex flex-col bg-[#1c1c1e] border border-white/20 rounded-2xl shadow-2xl p-2.5 overflow-hidden animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between px-2 py-1 mb-2 border-b border-white/10">
              <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                {t('langSelector.spokenLang')}
              </span>
              <button
                type="button"
                onClick={() => setIsSpokenOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-white/10"
              >
                <MorphIcon name="x" size={13} />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative mb-2 px-1">
              <MorphIcon name="search" size={13} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                placeholder={t('langSelector.searchLang')}
                value={searchSpoken}
                onChange={(e) => setSearchSpoken(e.target.value)}
                className="w-full bg-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 border border-white/10 outline-none focus:border-blue-500"
              />
            </div>

            {/* Language Options List */}
            <div className="overflow-y-auto space-y-1 pr-1 flex-1 max-h-[250px]">
              {/* Auto Detect Option (Always on top unless searching) */}
              {!searchSpoken && (
                <button
                  type="button"
                  onClick={() => handleSelectSpokenLanguage('auto')}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors ${
                    isSpokenAuto
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-200 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MorphIcon name="sparkles" size={14} className={isSpokenAuto ? 'text-white' : 'text-blue-400'} />
                    <span>{t('langSelector.autoDetect')}</span>
                  </div>
                  {isSpokenAuto && (
                    <MorphIcon name="check" size={13} className="text-white" />
                  )}
                </button>
              )}

              {/* Popular Languages Group (When not searching) */}
              {!searchSpoken && (
                <div className="px-2 pt-2 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-t border-white/10 mt-1">
                  Phổ biến
                </div>
              )}

              {(!searchSpoken
                ? POPULAR_LANG_CODES.map((c) => getLanguageByCode(c))
                : filteredSpokenLangs
              ).map((lang) => {
                const isSelected = !isSpokenAuto && spokenInputLanguage === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleSelectSpokenLanguage(lang.code)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'text-slate-200 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base select-none">{lang.flag}</span>
                      <span>{lang.name}</span>
                    </div>
                    {isSelected && (
                      <MorphIcon name="check" size={13} className="text-white" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* CENTER: Swap Direction Button */}
      <div className="flex items-center justify-center">
        <button
          type="button"
          onClick={handleSwapLanguages}
          className="flex items-center justify-center w-8 h-8 rounded-full apple-pill hover:bg-white/15 text-slate-300 hover:text-white transition-all active:scale-90 border border-white/10 shadow-sm"
          title={t('langSelector.swap')}
        >
          <MorphIcon name="swap" size={14} className="text-blue-400" />
        </button>
      </div>

      {/* RIGHT: Target Language Dropdown & Multi-Language Popup Trigger */}
      <div className="flex items-center gap-2">
        {/* Primary Target Language Dropdown Pill */}
        <div className="relative" ref={targetRef}>
          <button
            type="button"
            onClick={() => {
              setIsTargetOpen(!isTargetOpen);
              setIsSpokenOpen(false);
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 border ${
              isTargetOpen
                ? 'bg-emerald-600 text-white border-emerald-400 ring-2 ring-emerald-500/30'
                : 'apple-pill hover:bg-white/15 text-slate-200 hover:text-white border-white/10'
            }`}
            title={t('langSelector.translateTo')}
          >
            <MorphIcon name="globe" size={14} className={isTargetOpen ? 'text-white' : 'text-emerald-400'} />
            <span className="text-slate-400 text-[11px] hidden sm:inline">{t('langSelector.translateTo')}</span>
            <span className="text-sm select-none">{primaryLangMeta.flag}</span>
            <span className="font-semibold">{primaryLangMeta.name}</span>
            <MorphIcon
              name="chevron"
              state={isTargetOpen ? 'open' : 'default'}
              size={12}
              className="text-slate-400"
            />
          </button>

          {/* Target Language Dropdown Popover */}
          {isTargetOpen && (
            <div className="absolute right-0 mt-2 z-[9999] w-72 max-h-[380px] flex flex-col bg-[#1c1c1e] border border-white/20 rounded-2xl shadow-2xl p-2.5 overflow-hidden animate-fadeIn">
              {/* Header */}
              <div className="flex items-center justify-between px-2 py-1 mb-2 border-b border-white/10">
                <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                  {t('langSelector.chooseTargetLang')}
                </span>
                <button
                  type="button"
                  onClick={() => setIsTargetOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-white/10"
                >
                  <MorphIcon name="x" size={13} />
                </button>
              </div>

              {/* Search Input */}
              <div className="relative mb-2 px-1">
                <MorphIcon name="search" size={13} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  autoFocus
                  placeholder={t('langSelector.searchLang')}
                  value={searchTarget}
                  onChange={(e) => setSearchTarget(e.target.value)}
                  className="w-full bg-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 border border-white/10 outline-none focus:border-emerald-500"
                />
              </div>

              {/* Language Options List */}
              <div className="overflow-y-auto space-y-1 pr-1 flex-1 max-h-[250px]">
                {!searchTarget && (
                  <div className="px-2 pt-1 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Phổ biến
                  </div>
                )}

                {(!searchTarget
                  ? POPULAR_LANG_CODES.map((c) => getLanguageByCode(c))
                  : filteredTargetLangs
                ).map((lang) => {
                  const isSelected = primaryTargetLanguage === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => handleSelectPrimaryTarget(lang.code)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors ${
                        isSelected
                          ? 'bg-emerald-600 text-white font-semibold'
                          : 'text-slate-200 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base select-none">{lang.flag}</span>
                        <span>{lang.name}</span>
                      </div>
                      {isSelected && (
                        <MorphIcon name="check" size={13} className="text-white" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Multi-Language Popup Trigger Button */}
        <button
          type="button"
          onClick={() => setIsMultiModalOpen(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 border ${
            targetLanguages.length > 1
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-semibold shadow-sm'
              : 'apple-pill hover:bg-white/15 text-slate-300 hover:text-white border-white/10'
          }`}
          title="Mở popup cài đặt dịch song song đa ngôn ngữ"
        >
          <MorphIcon name="plus" size={12} className="text-emerald-400" />
          <span>
            {targetLanguages.length > 1
              ? `+${targetLanguages.length - 1} ${t('langSelector.add')}`
              : t('langSelector.addParallelLang')}
          </span>
        </button>
      </div>

      {/* POPUP / MODAL: Multi-Language Parallel Translation Manager */}
      {isMultiModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          {/* Backdrop click to dismiss */}
          <div className="absolute inset-0" onClick={() => setIsMultiModalOpen(false)} />

          <div className="relative apple-glass w-full max-w-md rounded-3xl border border-white/20 shadow-2xl p-5 z-10">
            {/* Modal Close Button */}
            <button
              type="button"
              onClick={() => setIsMultiModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <MorphIcon name="x" size={16} />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <MorphIcon name="globe" size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide">
                  Dịch song song đa ngôn ngữ
                </h2>
                <p className="text-[11px] text-slate-400">
                  Chọn các ngôn ngữ muốn hệ thống tự động dịch đồng thời trong thời gian thực
                </p>
              </div>
            </div>

            {/* Currently Active Languages Bar */}
            <div className="my-3 p-2.5 rounded-2xl bg-white/[0.04] border border-white/10">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Đang dịch sang ({targetLanguages.length}):
              </div>
              <div className="flex flex-wrap gap-1.5">
                {targetLanguages.map((code) => {
                  const meta = getLanguageByCode(code);
                  const isPrimary = code === primaryTargetLanguage;
                  return (
                    <span
                      key={code}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                        isPrimary
                          ? 'bg-emerald-600/30 border-emerald-500/50 text-emerald-200'
                          : 'bg-white/10 border-white/15 text-white'
                      }`}
                    >
                      <span>{meta.flag}</span>
                      <span>{meta.name}</span>
                      {isPrimary ? (
                        <span className="text-[9px] px-1 rounded bg-emerald-500/40 text-emerald-200 uppercase font-mono">
                          Chính
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => removeTargetLanguage(code)}
                          className="text-slate-400 hover:text-rose-400 transition-colors ml-0.5"
                          title="Gỡ bỏ ngôn ngữ này"
                        >
                          <MorphIcon name="x" size={11} />
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Search Box */}
            <div className="relative mb-2">
              <MorphIcon name="search" size={13} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t('langSelector.searchLang')}
                value={searchMulti}
                onChange={(e) => setSearchMulti(e.target.value)}
                className="w-full bg-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 border border-white/10 outline-none focus:border-emerald-500"
              />
            </div>

            {/* Checkbox List of Available Languages */}
            <div className="max-h-[220px] overflow-y-auto space-y-1 pr-1">
              {filteredMultiLangs.map((lang) => {
                const isSelected = targetLanguages.includes(lang.code);
                const isPrimary = lang.code === primaryTargetLanguage;

                return (
                  <div
                    key={lang.code}
                    onClick={() => toggleMultiLanguage(lang.code)}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-emerald-500/15 border border-emerald-500/30 text-white'
                        : 'hover:bg-white/[0.06] text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base select-none">{lang.flag}</span>
                      <span className="font-medium">{lang.name}</span>
                      <span className="text-[10px] text-slate-500 uppercase font-mono">
                        ({lang.code})
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isPrimary && (
                        <span className="text-[10px] text-emerald-400 font-mono">
                          Mặc định
                        </span>
                      )}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isPrimary}
                        onChange={() => toggleMultiLanguage(lang.code)}
                        className="w-4 h-4 rounded text-emerald-500 focus:ring-0 bg-white/10 border-white/20 cursor-pointer"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsMultiModalOpen(false)}
                className="px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/30 transition-all active:scale-95 flex items-center gap-1.5"
              >
                <MorphIcon name="check" size={14} />
                <span>Hoàn tất</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
