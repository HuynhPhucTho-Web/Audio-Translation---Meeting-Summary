export const SUPPORTED_LANGUAGES = [
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳', voice: 'vi-VN' },
  { code: 'en', name: 'English', flag: '🇬🇧', voice: 'en-US' },
  { code: 'ja', name: '日本語', flag: '🇯🇵', voice: 'ja-JP' },
  { code: 'ko', name: '한국어', flag: '🇰🇷', voice: 'ko-KR' },
  { code: 'zh', name: 'Tiếng Trung (中文)', flag: '🇨🇳', voice: 'zh-CN' },
  { code: 'fr', name: 'Français', flag: '🇫🇷', voice: 'fr-FR' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪', voice: 'de-DE' },
  { code: 'es', name: 'Español', flag: '🇪🇸', voice: 'es-ES' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹', voice: 'it-IT' },
  { code: 'th', name: 'ไทย', flag: '🇹🇭', voice: 'th-TH' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺', voice: 'ru-RU' },
  { code: 'pt', name: 'Português', flag: '🇵🇹', voice: 'pt-PT' },
];

export const SENTENCE_CATEGORIES = {
  statement: {
    label: 'Statement',
    icon: 'message-square',
    color: 'bg-slate-800 text-slate-300 border-slate-700',
    badge: 'Statement'
  },
  question: {
    label: 'Question',
    icon: 'help-circle',
    color: 'bg-amber-950/60 text-amber-300 border-amber-800/60',
    badge: 'Question'
  },
  idea: {
    label: 'Idea',
    icon: 'lightbulb',
    color: 'bg-yellow-950/60 text-yellow-300 border-yellow-800/60',
    badge: 'Idea'
  },
  problem: {
    label: 'Problem',
    icon: 'alert-triangle',
    color: 'bg-rose-950/60 text-rose-300 border-rose-800/60',
    badge: 'Problem'
  },
  decision: {
    label: 'Decision',
    icon: 'check-circle',
    color: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60',
    badge: 'Decision'
  },
  action: {
    label: 'Action',
    icon: 'bookmark',
    color: 'bg-sky-950/60 text-sky-300 border-sky-800/60',
    badge: 'Action'
  },
  deadline: {
    label: 'Deadline',
    icon: 'calendar',
    color: 'bg-purple-950/60 text-purple-300 border-purple-800/60',
    badge: 'Deadline'
  }
};

export function getLanguageByCode(code) {
  if (!code || code === 'auto') return { code: 'auto', name: 'Tự động phát hiện', flag: '✨' };
  const lower = code.toLowerCase();
  return (
    SUPPORTED_LANGUAGES.find(
      (lang) => lang.code.toLowerCase() === lower || lower.startsWith(lang.code.toLowerCase())
    ) || { code: lower, name: code.toUpperCase(), flag: '🌐' }
  );
}
