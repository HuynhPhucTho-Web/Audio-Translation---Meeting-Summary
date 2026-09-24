import React from 'react';
import MorphIcon from '../MorphIcon/MorphIcon';
import { useMeetingStore } from '../../store/meetingStore';

export default function Waveform({ isRecording, isPaused, compact = false }) {
  const { audioVolume, waveformBars } = useMeetingStore();

  return (
    <div className={`flex items-center gap-3 ${compact ? 'w-auto' : 'w-full max-w-md'}`}>
      {/* Cupertino Voice Spectrum Container */}
      <div className={`flex items-center justify-between gap-[3px] bg-black/40 px-3 py-1.5 rounded-full border border-white/10 shadow-inner ${compact ? 'h-9 w-44' : 'h-10 w-full'}`}>
        {waveformBars.slice(0, 24).map((height, idx) => {
          const isActive = isRecording && !isPaused;
          const dynamicHeight = isActive ? `${Math.max(14, height)}%` : '14%';

          return (
            <div
              key={idx}
              className="flex-1 flex items-center justify-center h-full"
            >
              <div
                className={`w-full max-w-[5px] rounded-full transition-all duration-75 ${
                  !isActive
                    ? 'bg-white/15'
                    : audioVolume > 35
                    ? 'bg-gradient-to-t from-blue-500 via-indigo-400 to-rose-400 shadow-[0_0_6px_rgba(99,102,241,0.6)]'
                    : 'bg-gradient-to-t from-blue-400 to-indigo-300'
                }`}
                style={{
                  height: dynamicHeight,
                  minHeight: '3px',
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Input Level Badge */}
      <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 shrink-0">
        <MorphIcon
          name="volume"
          state={audioVolume > 5 && isRecording && !isPaused ? 'default' : 'muted'}
          size={14}
          className={audioVolume > 5 && isRecording && !isPaused ? 'text-blue-400 animate-pulse' : 'text-slate-600'}
        />
        <span className="w-7">{isRecording && !isPaused ? `${audioVolume}%` : '0%'}</span>
      </div>
    </div>
  );
}
