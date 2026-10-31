import React, { useState, useRef, useEffect } from 'react';
import MorphIcon from '../MorphIcon/MorphIcon';
import { useMeetingStore } from '../../store/meetingStore';
import { SUPPORTED_LANGUAGES, getLanguageByCode } from '../../data/languages';
import { speechService } from '../../services/speechService';

// Frequently used quick-access languages
const QUICK_LANG_CODES = ['vi', 'en', 'zh', 'ja', 'ko', 'fr'];

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
  const [isSwapped, setIsSwapped] = useState(false);

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

  // Filtered lists
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
    const currentSpoken = isSpokenAuto
      ? detectedLanguage.code !== 'auto'
        ? detectedLanguage.code
        : 'vi'
      : spokenInputLanguage;
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
    setIsSwapped(prev => !prev);
  };

  const toggleMultiLanguage = (code) => {
    if (code === primaryTargetLanguage) return; // Cannot disable primary
    if (targetLanguages.includes(code)) {
      removeTargetLanguage(code);
    } else {
      addTargetLanguage(code);
    }
  };

  return (
    <div className="relative z-30 w-full apple-glass rounded-2xl p-2 sm:px-4 sm:py-2.5 shadow-lg border border-white/10 flex flex-wrap items-center justify-between gap-2 sm:gap-3">
      {/* 1. LEFT: Spoken Language Dropdown */}
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
          <span className="text-slate-400 text-[11px] hidden md:inline">Nói:</span>
          <span className="text-sm select-none">{spokenLangMeta.flag}</span>
          <span className="font-semibold truncate max-w-[110px] sm:max-w-none">{spokenLangMeta.name}</span>

          {/* Dynamic Auto-detect indicator */}
          {isSpokenAuto && detectedLanguage.code !== 'auto' && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
              <span>{detectedLanguage.flag}</span>
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
          <div className="absolute left-0 mt-2 z-[9999] w-[320px] sm:w-[360px] flex flex-col bg-[#1c1c1e] border border-white/20 rounded-3xl shadow-2xl p-3 overflow-hidden animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
                <MorphIcon name="mic" size={14} className="text-blue-400" />
                <span>{t('langSelector.spokenLang')}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsSpokenOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-white/10"
              >
                <MorphIcon name="x" size={14} />
              </button>
            </div>

            {/* Quick 1-Click Select Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none">
              <button
                type="button"
                onClick={() => handleSelectSpokenLanguage('auto')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium shrink-0 transition-all ${
                  isSpokenAuto
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'bg-white/10 hover:bg-white/20 text-slate-300'
                }`}
              >
                <MorphIcon name="sparkles" size={12} />
                <span>Tự động</span>
              </button>
              {QUICK_LANG_CODES.map((code) => {
                const l = getLanguageByCode(code);
                const isSel = !isSpokenAuto && spokenInputLanguage === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => handleSelectSpokenLanguage(code)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium shrink-0 transition-all ${
                      isSel
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'bg-white/10 hover:bg-white/20 text-slate-300'
                    }`}
                  >
                    <span>{l.flag}</span>
                    <span>{l.code.toUpperCase()}</span>
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative mb-2.5">
              <MorphIcon name="search" size={13} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                placeholder="Tìm nhanh ngôn ngữ nói..."
                value={searchSpoken}
                onChange={(e) => setSearchSpoken(e.target.value)}
                className="w-full bg-white/10 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-400 border border-white/10 outline-none focus:border-blue-500"
              />
              {searchSpoken && (
                <button
                  type="button"
                  onClick={() => setSearchSpoken('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <MorphIcon name="x" size={12} />
                </button>
              )}
            </div>

            {/* 2-Column Grid of Language Cards */}
            <div className="grid grid-cols-2 gap-1.5 max-h-[220px] overflow-y-auto pr-1">
              {filteredSpokenLangs.map((lang) => {
                const isSelected = !isSpokenAuto && spokenInputLanguage === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleSelectSpokenLanguage(lang.code)}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white font-semibold shadow-md'
                        : 'bg-white/[0.04] hover:bg-white/10 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-lg select-none shrink-0">{lang.flag}</span>
                      <div className="text-left truncate">
                        <div className="truncate font-medium">{lang.name}</div>
                        <div className="text-[10px] opacity-60 uppercase font-mono">{lang.code}</div>
                      </div>
                    </div>
                    {isSelected && (
                      <MorphIcon name="check" size={14} className="text-white shrink-0 ml-1" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 2. CENTER: Swap Direction Button with spring animation on click */}
      <div className="flex items-center justify-center">
        <button
          type="button"
          onClick={handleSwapLanguages}
          className="flex items-center justify-center w-8 h-8 rounded-full apple-pill hover:bg-white/15 text-slate-300 hover:text-white transition-all active:scale-90 border border-white/10 shadow-sm"
          title={t('langSelector.swap')}
        >
          <MorphIcon
            name="swap"
            size={14}
            className={`text-blue-400 transition-transform duration-300 ${isSwapped ? 'rotate-180' : 'rotate-0'}`}
          />
        </button>
      </div>

      {/* 3. RIGHT: Target Language Dropdown & Parallel Translation */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Primary Target Dropdown */}
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
            <span className="text-slate-400 text-[11px] hidden md:inline">Dịch sang:</span>
            <span className="text-sm select-none">{primaryLangMeta.flag}</span>
            <span className="font-semibold truncate max-w-[110px] sm:max-w-none">{primaryLangMeta.name}</span>
            <MorphIcon
              name="chevron"
              state={isTargetOpen ? 'open' : 'default'}
              size={12}
              className="text-slate-400"
            />
          </button>

          {/* Target Language Dropdown Popover */}
          {isTargetOpen && (
            <div className="absolute right-0 mt-2 z-[9999] w-[320px] sm:w-[360px] flex flex-col bg-[#1c1c1e] border border-white/20 rounded-3xl shadow-2xl p-3 overflow-hidden animate-fadeIn">
              {/* Header */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
                  <MorphIcon name="globe" size={14} className="text-emerald-400" />
                  <span>{t('langSelector.chooseTargetLang')}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTargetOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-white/10"
                >
                  <MorphIcon name="x" size={14} />
                </button>
              </div>

              {/* Quick 1-Click Select Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none">
                {QUICK_LANG_CODES.map((code) => {
                  const l = getLanguageByCode(code);
                  const isSel = primaryTargetLanguage === code;
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => handleSelectPrimaryTarget(code)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium shrink-0 transition-all ${
                        isSel
                          ? 'bg-emerald-600 text-white font-semibold'
                          : 'bg-white/10 hover:bg-white/20 text-slate-300'
                      }`}
                    >
                      <span>{l.flag}</span>
                      <span>{l.code.toUpperCase()}</span>
                    </button>
                  );
                })}
              </div>

              {/* Search Input */}
              <div className="relative mb-2.5">
                <MorphIcon name="search" size={13} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Tìm nhanh ngôn ngữ đích..."
                  value={searchTarget}
                  onChange={(e) => setSearchTarget(e.target.value)}
                  className="w-full bg-white/10 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-400 border border-white/10 outline-none focus:border-emerald-500"
                />
                {searchTarget && (
                  <button
                    type="button"
                    onClick={() => setSearchTarget('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <MorphIcon name="x" size={12} />
                  </button>
                )}
              </div>

              {/* 2-Column Grid of Language Cards */}
              <div className="grid grid-cols-2 gap-1.5 max-h-[220px] overflow-y-auto pr-1">
                {filteredTargetLangs.map((lang) => {
                  const isSelected = primaryTargetLanguage === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => handleSelectPrimaryTarget(lang.code)}
                      className={`flex items-center justify-between p-2 rounded-xl text-xs transition-all ${
                        isSelected
                          ? 'bg-emerald-600 text-white font-semibold shadow-md'
                          : 'bg-white/[0.04] hover:bg-white/10 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-lg select-none shrink-0">{lang.flag}</span>
                        <div className="text-left truncate">
                          <div className="truncate font-medium">{lang.name}</div>
                          <div className="text-[10px] opacity-60 uppercase font-mono">{lang.code}</div>
                        </div>
                      </div>
                      {isSelected && (
                        <MorphIcon name="check" size={14} className="text-white shrink-0 ml-1" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Multi-Language Parallel Button */}
        <button
          type="button"
          onClick={() => setIsMultiModalOpen(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 border ${
            targetLanguages.length > 1
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-semibold shadow-sm'
              : 'apple-pill hover:bg-white/15 text-slate-300 hover:text-white border-white/10'
          }`}
          title="Dịch song song sang nhiều ngôn ngữ cùng lúc"
        >
          <MorphIcon name="plus" size={12} className="text-emerald-400" />
          <span>
            {targetLanguages.length > 1 ? `+${targetLanguages.length - 1} ${t('langSelector.add')}` : 'Đa ngữ'}
          </span>
        </button>
      </div>

      {/* POPUP MODAL: Multi-Language Parallel Translation Manager */}
      {isMultiModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          {/* Backdrop click to dismiss */}
          <div className="absolute inset-0" onClick={() => setIsMultiModalOpen(false)} />

          <div className="relative apple-glass w-full max-w-md rounded-3xl border border-white/20 shadow-2xl p-5 z-10 animate-fadeIn">
            {/* Modal Close Button */}
            <button
              type="button"
              onClick={() => setIsMultiModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <MorphIcon name="x" size={16} />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
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

            {/* Active Tags */}
            <div className="my-3 p-3 rounded-2xl bg-white/[0.04] border border-white/10">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Đang kích hoạt ({targetLanguages.length}):
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
                          onClick={() => toggleMultiLanguage(code)}
                          className="hover:text-rose-400 text-slate-400 ml-0.5"
                          title="Hủy ngôn ngữ này"
                        >
                          <MorphIcon name="x" size={11} />
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Grid of all available languages to toggle */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-[220px] overflow-y-auto pr-1 my-3">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isActive = targetLanguages.includes(lang.code);
                const isPrimary = lang.code === primaryTargetLanguage;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => toggleMultiLanguage(lang.code)}
                    disabled={isPrimary}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs transition-all border ${
                      isPrimary
                        ? 'bg-emerald-600/25 border-emerald-500/50 text-emerald-200 opacity-90 cursor-default'
                        : isActive
                        ? 'bg-blue-600/30 border-blue-500 text-white font-semibold'
                        : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.08]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-base select-none">{lang.flag}</span>
                      <span className="truncate">{lang.name}</span>
                    </div>
                    {isActive && (
                      <MorphIcon name="check" size={13} className="text-emerald-400 shrink-0 ml-1" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Modal Done Button */}
            <div className="pt-2 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setIsMultiModalOpen(false)}
                className="px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md active:scale-95 transition-all"
              >
                Xong
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
