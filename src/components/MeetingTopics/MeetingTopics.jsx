import React from 'react';
import MorphIcon from '../MorphIcon/MorphIcon';
import { useMeetingStore } from '../../store/meetingStore';

export default function MeetingTopics({ topics = [] }) {
  const { t } = useMeetingStore();
  if (!topics || topics.length === 0) {
    const label = t('summary.noTopics');
    const display = (!label || label === 'summary.noTopics') ? 'Chưa có chủ đề nào được trích xuất.' : label;
    return (
      <div className="text-xs text-slate-400 italic py-1">
        {display}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {topics.map((topic, idx) => (
        <div
          key={idx}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full apple-pill text-blue-300 text-xs font-medium shadow-sm hover:bg-white/15 transition-colors"
        >
          <MorphIcon name="sparkles" size={13} className="text-blue-400" />
          <span>{topic}</span>
        </div>
      ))}
    </div>
  );
}
