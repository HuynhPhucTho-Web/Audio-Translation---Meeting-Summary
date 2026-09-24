import React from 'react';
import MorphIcon from '../components/MorphIcon/MorphIcon';
import { useMeetingStore } from '../store/meetingStore';

export default function Home({ onStartMeeting }) {
  const { savedMeetings, t } = useMeetingStore();

  return (
    <div className="w-full flex-1 flex flex-col justify-center space-y-8 py-6">
      {/* Apple-style Hero Section */}
      <div className="text-center space-y-4 max-w-3xl mx-auto flex flex-col items-center">
        {/* App Logo */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 mb-1 rounded-3xl p-2.5 bg-white/[0.04] border border-white/10 shadow-2xl flex items-center justify-center backdrop-blur-md hover:scale-105 transition-all duration-300">
          <img
            src="/logo.png"
            alt="AI Meeting Translator Logo"
            className="w-full h-full object-contain drop-shadow-[0_8px_20px_rgba(59,130,246,0.4)]"
          />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full apple-pill text-blue-300 text-xs font-semibold shadow-sm">
          <MorphIcon name="sparkles" size={14} className="text-blue-400" />
          <span>{t('home.heroBadge')}</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
          {t('home.heroTitle1')} <br />
          <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-rose-400 bg-clip-text text-transparent">
            {t('home.heroTitle2')}
          </span>
        </h1>

        <p className="text-slate-400 text-xs sm:text-sm max-w-lg mx-auto leading-relaxed">
          {t('home.heroDesc')}
        </p>

        {/* Apple Pill Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => onStartMeeting()}
            className="flex items-center gap-2 px-7 py-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 transition-all active:scale-95"
          >
            <MorphIcon name="mic" size={16} />
            <span>{t('home.startBtn')}</span>
            <MorphIcon name="arrow-right" size={14} className="ml-0.5" />
          </button>
        </div>
      </div>

      {/* 4 Apple Feature Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {/* Pillar 1 */}
        <div className="apple-glass p-5 rounded-2xl border border-white/10 hover:border-white/20 transition-all shadow-md flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-blue-500/15 text-blue-400 flex items-center justify-center mb-4">
              <MorphIcon name="mic" size={20} />
            </div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">
              {t('home.feature1Title')}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t('home.feature1Desc')}
            </p>
          </div>
        </div>

        {/* Pillar 2 */}
        <div className="apple-glass p-5 rounded-2xl border border-white/10 hover:border-white/20 transition-all shadow-md flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-purple-500/15 text-purple-400 flex items-center justify-center mb-4">
              <MorphIcon name="globe" size={20} />
            </div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">
              {t('home.feature2Title')}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t('home.feature2Desc')}
            </p>
          </div>
        </div>

        {/* Pillar 3 */}
        <div className="apple-glass p-5 rounded-2xl border border-white/10 hover:border-white/20 transition-all shadow-md flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-4">
              <MorphIcon name="file-text" size={20} />
            </div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">
              {t('home.feature3Title')}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t('home.feature3Desc')}
            </p>
          </div>
        </div>

        {/* Pillar 4 */}
        <div className="apple-glass p-5 rounded-2xl border border-white/10 hover:border-white/20 transition-all shadow-md flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center mb-4">
              <MorphIcon name="sparkles" size={20} />
            </div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">
              {t('home.feature4Title')}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t('home.feature4Desc')}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Meetings Strip */}
      {savedMeetings.length > 0 && (
        <div className="w-full apple-glass p-4 rounded-2xl border border-white/10 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              {t('home.recentTitle')}
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              {savedMeetings.length} {t('home.meetingsSaved')}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {savedMeetings.slice(0, 3).map((m) => (
              <div
                key={m.id}
                onClick={() => onStartMeeting(false)}
                className="apple-card p-3 rounded-xl border border-white/10 hover:border-blue-500/40 cursor-pointer transition-all"
              >
                <div className="text-[11px] font-mono text-blue-400">{m.date}</div>
                <div className="text-xs font-semibold text-white mt-1 truncate">
                  {m.topics?.[0] || 'Meeting discussion'}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {(m.participants || []).length} {t('home.participants')} • {Math.round(m.duration / 60)} {t('home.minutes')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
