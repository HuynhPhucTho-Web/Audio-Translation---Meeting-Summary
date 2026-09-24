import React from 'react';
import MorphIcon from '../components/MorphIcon/MorphIcon';
import { useMeetingStore } from '../store/meetingStore';
import { summaryService } from '../services/summaryService';

export default function History({ onNavigateToMeeting }) {
  const { savedMeetings, deleteMeetingHistory, loadMeetingFromHistory, t } = useMeetingStore();

  const handleOpen = (meeting) => {
    loadMeetingFromHistory(meeting);
    if (onNavigateToMeeting) {
      onNavigateToMeeting();
    }
  };

  const formatDuration = (seconds = 0) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="w-full flex-1 flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <MorphIcon name="history" size={20} className="text-blue-400" />
            <span>{t('history.title')}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('history.subtitle')}
          </p>
        </div>
        <span className="text-xs font-mono apple-pill px-3 py-1 rounded-full text-slate-300">
          {t('history.total')} {savedMeetings.length}
        </span>
      </div>

      {savedMeetings.length === 0 ? (
        <div className="apple-glass rounded-2xl p-20 text-center border border-white/10 flex-1 flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl apple-card flex items-center justify-center mb-3 text-blue-400 border border-white/10 shadow-sm">
            <MorphIcon name="folder" size={28} />
          </div>
          <h2 className="text-sm font-semibold text-slate-200">{t('history.emptyTitle')}</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            {t('history.emptyDesc')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto">
          {savedMeetings.map((meeting) => (
            <div
              key={meeting.id}
              className="apple-glass rounded-2xl p-4 border border-white/10 hover:border-white/20 transition-all shadow-md flex flex-col justify-between"
            >
              <div>
                {/* Header row */}
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-mono text-blue-400 flex items-center gap-1.5">
                    <MorphIcon name="calendar" size={14} />
                    {meeting.date}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(t('history.deleteConfirm'))) {
                        deleteMeetingHistory(meeting.id);
                      }
                    }}
                    className="text-slate-400 hover:text-rose-400 p-1 rounded-full hover:bg-white/10 transition-colors"
                    title={t('history.delete')}
                  >
                    <MorphIcon name="trash" size={14} />
                  </button>
                </div>

                {/* Duration & Participants */}
                <div className="flex items-center gap-4 text-xs text-slate-300 mb-3 font-mono">
                  <div className="flex items-center gap-1">
                    <MorphIcon name="clock" size={14} className="text-purple-400" />
                    <span>{formatDuration(meeting.duration)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MorphIcon name="users" size={14} className="text-emerald-400" />
                    <span>{(meeting.participants || []).length} {t('history.people')}</span>
                  </div>
                </div>

                {/* Topics */}
                {meeting.topics && meeting.topics.length > 0 && (
                  <div className="mb-3">
                    <div className="flex flex-wrap gap-1.5">
                      {meeting.topics.slice(0, 2).map((topic, i) => (
                        <span
                          key={i}
                          className="text-[11px] px-2.5 py-0.5 rounded-full apple-card border border-white/10 text-blue-300 truncate max-w-[180px]"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Summary snippet */}
                {meeting.summaryText && (
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed apple-card p-2.5 rounded-xl border border-white/5 mb-3">
                    {meeting.summaryText}
                  </p>
                )}
              </div>

              {/* Action buttons footer */}
              <div className="pt-2.5 border-t border-white/10 flex items-center justify-between gap-2 mt-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => summaryService.exportToTxt(meeting)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                    title="TXT"
                  >
                    <MorphIcon name="file-text" size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => summaryService.exportToPdf(meeting)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-full hover:bg-white/10 transition-colors"
                    title="PDF"
                  >
                    <MorphIcon name="printer" size={16} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpen(meeting)}
                  className="flex items-center gap-1 px-3 py-1 rounded-full apple-pill text-blue-300 text-xs font-semibold hover:bg-white/15 transition-all active:scale-95"
                >
                  <span>{t('history.open')}</span>
                  <MorphIcon name="arrow-right" size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
