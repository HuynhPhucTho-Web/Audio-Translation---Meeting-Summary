import React, { useState, useRef, useEffect } from 'react';
import MorphIcon from './components/MorphIcon/MorphIcon';
import { useMeetingStore } from './store/meetingStore';
import { UI_LANGUAGES } from './i18n/translations';
import Home from './pages/Home';
import Meeting from './pages/Meeting';
import History from './pages/History';
import SettingsModal from './components/Settings/SettingsModal';
import DialogModal from './components/DialogModal/DialogModal';

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const langMenuRef = useRef(null);

  const {
    isRecording,
    isPaused,
    setIsSettingsOpen,
    uiLanguage,
    setUiLanguage,
    t,
  } = useMeetingStore();

  const currentLangObj = UI_LANGUAGES.find((l) => l.code === uiLanguage) || UI_LANGUAGES[0];

  // Close language menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target)) {
        setIsLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col bg-transparent text-[#f5f5f7] selection:bg-blue-500/30 selection:text-white overflow-x-hidden">
      {/* Top Navbar: Apple macOS / VisionOS Frosted Glass Bar */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-2xl bg-white/[0.04] border-b border-white/[0.08] h-14 sm:h-16 flex items-center px-3 sm:px-8">
        <div className="w-full max-w-5xl xl:max-w-6xl mx-auto flex items-center justify-between relative gap-2">
          {/* Brand */}
          <div
            onClick={() => setCurrentPage('home')}
            className="flex items-center gap-2 cursor-pointer select-none group min-w-0"
          >
            <img
              src="/logo.png"
              alt="Meeting Translator Logo"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl object-contain drop-shadow-[0_2px_10px_rgba(59,130,246,0.4)] shrink-0 group-hover:scale-105 transition-transform duration-200"
            />
            <span className="font-semibold text-xs sm:text-[15px] tracking-tight text-white/90 group-hover:text-white transition-colors truncate max-w-[120px] xs:max-w-[180px] sm:max-w-none">
              {t('nav.brand')}
            </span>

            {isRecording && (
              <div className="ml-0.5 sm:ml-1 flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-medium tracking-wide shrink-0">
                <MorphIcon
                  name={isPaused ? 'play' : 'record'}
                  state={isPaused ? 'play' : 'recording'}
                  size={10}
                  color="#f43f5e"
                  className={isPaused ? '' : 'animate-pulse'}
                />
                <span className="hidden xs:inline">{isPaused ? t('nav.paused') : t('nav.recording')}</span>
                <span className="xs:hidden font-mono">REC</span>
              </div>
            )}
          </div>

          {/* Center Nav — clean segmented pill for Tablet & Desktop */}
          <nav className="hidden sm:flex absolute left-1/2 -translate-x-1/2 items-center gap-1 p-1 rounded-full bg-white/[0.05] border border-white/[0.08]">
            {[
              { key: 'home', label: t('nav.home'), iconName: 'home' },
              { key: 'meeting', label: t('nav.meeting'), iconName: 'mic' },
              { key: 'history', label: t('nav.history'), iconName: 'history' },
            ].map(({ key, label, iconName }) => (
              <button
                key={key}
                type="button"
                onClick={() => setCurrentPage(key)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200 ${
                  currentPage === key
                    ? 'bg-white text-black shadow-sm'
                    : 'text-white/50 hover:text-white/90'
                }`}
              >
                <MorphIcon name={iconName} size={15} />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          {/* Right Action Bar: UI Language Switcher & Settings */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* UI Language Dropdown Button */}
            <div className="relative" ref={langMenuRef}>
              <button
                type="button"
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-white/80 hover:text-white text-xs font-medium transition-all duration-200 active:scale-95 shadow-sm"
                title="Thay đổi ngôn ngữ giao diện (Website UI Language)"
              >
                <MorphIcon name="globe" size={13} className="text-blue-400 shrink-0" />
                <span className="text-sm leading-none">{currentLangObj.flag}</span>
                <span className="font-semibold uppercase tracking-wider text-[10px] sm:text-[11px] hidden xs:inline">
                  {currentLangObj.code}
                </span>
                <MorphIcon
                  name="chevron"
                  state={isLangMenuOpen ? 'open' : 'default'}
                  size={11}
                  className="text-white/50"
                />
              </button>

              {/* Dropdown Menu - Mobile Safe Positioned */}
              {isLangMenuOpen && (
                <div className="absolute right-0 mt-2 w-44 sm:w-48 py-1.5 rounded-2xl bg-[#1c1c1e]/95 backdrop-blur-xl border border-white/[0.12] shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1 text-[10px] font-semibold text-white/40 uppercase tracking-wider border-b border-white/[0.06] mb-1">
                    UI Language
                  </div>
                  {UI_LANGUAGES.map((lang) => {
                    const isActive = lang.code === uiLanguage;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => {
                          setUiLanguage(lang.code);
                          setIsLangMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors ${
                          isActive
                            ? 'bg-blue-600/20 text-blue-400 font-semibold'
                            : 'text-white/80 hover:bg-white/[0.06] hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{lang.flag}</span>
                          <span>{lang.name}</span>
                        </div>
                        {isActive && (
                          <MorphIcon name="check" size={13} className="text-blue-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Settings Button */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full text-white/70 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] transition-all duration-200 active:scale-90"
              title={t('nav.settings')}
            >
              <MorphIcon name="sliders" size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container - Mobile optimized padding + extra bottom space for mobile tab bar */}
      <main className="flex-1 w-full max-w-5xl xl:max-w-6xl mx-auto px-2.5 sm:px-6 lg:px-8 py-3.5 sm:py-5 pb-24 sm:pb-6 flex flex-col">
        {currentPage === 'home' && (
          <Home onStartMeeting={() => setCurrentPage('meeting')} />
        )}

        {currentPage === 'meeting' && <Meeting />}

        {currentPage === 'history' && (
          <History onNavigateToMeeting={() => setCurrentPage('meeting')} />
        )}
      </main>

      {/* Mobile iOS Floating Bottom Navigation Bar */}
      <nav className="sm:hidden fixed bottom-3 inset-x-3 z-40 max-w-xs mx-auto p-1.5 rounded-full bg-[#1c1c1e]/90 backdrop-blur-2xl border border-white/15 shadow-[0_8px_30px_rgba(0,0,0,0.6)] flex items-center justify-around">
        {[
          { key: 'home', label: t('nav.home'), iconName: 'home' },
          { key: 'meeting', label: t('nav.meeting'), iconName: 'mic', isSpecial: true },
          { key: 'history', label: t('nav.history'), iconName: 'history' },
        ].map(({ key, label, iconName, isSpecial }) => {
          const isActive = currentPage === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setCurrentPage(key)}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-2 rounded-full transition-all active:scale-95 relative ${
                isActive
                  ? 'bg-white/15 text-white font-semibold shadow-inner'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <div className="relative">
                <MorphIcon
                  name={iconName}
                  size={17}
                  className={isActive ? (isSpecial ? 'text-blue-400' : 'text-white') : 'text-slate-400'}
                />
                {isSpecial && isRecording && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Settings Modal */}
      <SettingsModal />

      {/* Global Apple Custom Dialog & Confirmation Popup */}
      <DialogModal />
    </div>
  );
}
