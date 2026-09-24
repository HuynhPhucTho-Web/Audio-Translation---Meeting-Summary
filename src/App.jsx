import React, { useState, useRef, useEffect } from 'react';
import MorphIcon from './components/MorphIcon/MorphIcon';
import { useMeetingStore } from './store/meetingStore';
import { UI_LANGUAGES } from './i18n/translations';
import Home from './pages/Home';
import Meeting from './pages/Meeting';
import History from './pages/History';
import SettingsModal from './components/Settings/SettingsModal';

export default function App() {
  const [currentPage, setCurrentPage] = useState('meeting');
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
    <div className="min-h-screen w-full flex flex-col bg-transparent text-[#f5f5f7] selection:bg-blue-500/30 selection:text-white">
      {/* Top Navbar: Apple macOS / VisionOS Frosted Glass Bar */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-2xl bg-white/[0.04] border-b border-white/[0.08] h-16 flex items-center px-4 sm:px-8">
        <div className="w-full max-w-5xl xl:max-w-6xl mx-auto flex items-center justify-between relative">
          {/* Brand */}
          <div
            onClick={() => setCurrentPage('meeting')}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            <img
              src="/logo.png"
              alt="Meeting Translator Logo"
              className="w-8 h-8 rounded-xl object-contain drop-shadow-[0_2px_10px_rgba(59,130,246,0.4)] group-hover:scale-105 transition-transform duration-200"
            />
            <span className="font-semibold text-[15px] tracking-tight text-white/90 group-hover:text-white transition-colors">
              {t('nav.brand')}
            </span>

            {isRecording && (
              <div className="ml-1 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-medium tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                {isPaused ? t('nav.paused') : t('nav.recording')}
              </div>
            )}
          </div>

          {/* Center Nav — clean segmented pill with MorphIcons */}
          <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 rounded-full bg-white/[0.05] border border-white/[0.08]">
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
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </nav>

          {/* Right Action Bar: UI Language Switcher & Settings */}
          <div className="flex items-center gap-2">
            {/* UI Language Dropdown Button */}
            <div className="relative" ref={langMenuRef}>
              <button
                type="button"
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-white/80 hover:text-white text-xs font-medium transition-all duration-200 active:scale-95 shadow-sm"
                title="Thay đổi ngôn ngữ giao diện (Website UI Language)"
              >
                <MorphIcon name="globe" size={14} className="text-blue-400" />
                <span>{currentLangObj.flag}</span>
                <span className="font-semibold uppercase tracking-wider text-[11px] hidden sm:inline">
                  {currentLangObj.code}
                </span>
                <MorphIcon
                  name="chevron"
                  state={isLangMenuOpen ? 'open' : 'default'}
                  size={12}
                  className="text-white/50"
                />
              </button>

              {/* Dropdown Menu */}
              {isLangMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 py-1.5 rounded-2xl bg-[#1c1c1e]/95 backdrop-blur-xl border border-white/[0.12] shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
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
              className="flex items-center justify-center w-9 h-9 rounded-full text-white/60 hover:text-white hover:bg-white/[0.08] transition-all duration-200 active:scale-90"
              title={t('nav.settings')}
            >
              <MorphIcon name="sliders" size={17} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container - Constrained and centered to prevent over-stretching */}
      <main className="flex-1 w-full max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col">
        {currentPage === 'home' && (
          <Home onStartMeeting={() => setCurrentPage('meeting')} />
        )}

        {currentPage === 'meeting' && <Meeting />}

        {currentPage === 'history' && (
          <History onNavigateToMeeting={() => setCurrentPage('meeting')} />
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal />
    </div>
  );
}
