import React, { useState, useEffect } from 'react';
import MorphIcon from '../MorphIcon/MorphIcon';
import { useMeetingStore } from '../../store/meetingStore';
import { audioService } from '../../services/audioService';
import { UI_LANGUAGES } from '../../i18n/translations';

export default function SettingsModal() {
  const {
    isSettingsOpen,
    setIsSettingsOpen,
    settings,
    updateSettings,
    resetMeeting,
    uiLanguage,
    setUiLanguage,
    t,
  } = useMeetingStore();

  const [apiKey, setApiKey] = useState(settings.apiKey || '');
  const [groqApiKey, setGroqApiKey] = useState(settings.groqApiKey || '');
  const [geminiApiKey, setGeminiApiKey] = useState(settings.geminiApiKey || '');
  const [aiProvider, setAiProvider] = useState(settings.aiProvider || 'groq');
  const [modelChat, setModelChat] = useState(settings.modelChat || 'gpt-4o-mini');
  const [modelSTT, setModelSTT] = useState(settings.modelSTT || 'whisper-1');
  const [autoTTS, setAutoTTS] = useState(settings.autoTTS || false);
  const [audioDeviceId, setAudioDeviceId] = useState(settings.audioDeviceId || 'default');
  const [audioDevices, setAudioDevices] = useState([]);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isSettingsOpen) {
      audioService.constructor.getAudioDevices().then((devices) => {
        setAudioDevices(devices);
      });
    }
  }, [isSettingsOpen]);

  if (!isSettingsOpen) return null;

  const handleSave = () => {
    updateSettings({
      aiProvider,
      groqApiKey,
      geminiApiKey,
      apiKey,
      modelChat,
      modelSTT,
      autoTTS,
      audioDeviceId,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setIsSettingsOpen(false);
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      {/* Backdrop click to dismiss */}
      <div className="absolute inset-0" onClick={() => setIsSettingsOpen(false)} />

      <div className="relative apple-glass w-full max-w-lg rounded-3xl border border-white/15 shadow-2xl p-6 z-10">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => setIsSettingsOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <MorphIcon name="x" size={16} />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-full bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-400">
            <MorphIcon name="sliders" size={16} />
          </div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">
            {t('settings.title')}
          </h2>
        </div>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Entire Website UI Language Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MorphIcon name="globe" size={14} className="text-blue-400" />
                {t('settings.uiLanguage')}
              </span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {UI_LANGUAGES.map((lang) => {
                const isSelected = lang.code === uiLanguage;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setUiLanguage(lang.code)}
                    className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-blue-600/30 border border-blue-500/50 text-white font-semibold shadow-sm'
                        : 'bg-white/[0.04] border border-white/[0.08] text-white/70 hover:bg-white/[0.08] hover:text-white'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span className="truncate">{lang.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* AI Provider Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MorphIcon name="sparkles" size={14} className="text-amber-400" />
                Mô hình AI tóm tắt cuộc họp
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">Tối ưu tốc độ & chất lượng</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'groq', name: '⚡ Groq Llama 3.3', sub: 'Siêu tốc (~0.5s)' },
                { id: 'gemini', name: '✨ Gemini Flash', sub: 'Ngữ cảnh 1M token' },
                { id: 'openai', name: '🧠 OpenAI GPT-4o', sub: 'Tiêu chuẩn cao' }
              ].map((prov) => (
                <button
                  key={prov.id}
                  type="button"
                  onClick={() => setAiProvider(prov.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    aiProvider === prov.id
                      ? 'bg-blue-600/30 border-blue-500 text-white shadow-sm'
                      : 'bg-white/[0.04] border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.08]'
                  }`}
                >
                  <div className="text-xs font-semibold truncate">{prov.name}</div>
                  <div className="text-[10px] opacity-75 mt-0.5">{prov.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Groq API Key */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MorphIcon name="zap" size={14} className="text-amber-400" />
                GROQ API Key (Khuyên dùng - Siêu tốc)
              </span>
              <span className="text-[10px] text-slate-400 lowercase font-normal">Llama-3.3 70B</span>
            </label>
            <input
              type="password"
              placeholder="gsk_..."
              value={groqApiKey}
              onChange={(e) => setGroqApiKey(e.target.value)}
              className="w-full apple-input rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 font-mono transition-all"
            />
          </div>

          {/* Gemini API Key */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MorphIcon name="sparkles" size={14} className="text-blue-400" />
                GEMINI API Key (Google AI)
              </span>
              <span className="text-[10px] text-slate-400 lowercase font-normal">Gemini 1.5 Flash</span>
            </label>
            <input
              type="password"
              placeholder="AQ.Ab..."
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              className="w-full apple-input rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 font-mono transition-all"
            />
          </div>

          {/* OpenAI API Key */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MorphIcon name="key" size={14} className="text-purple-400" />
                {t('settings.apiKey')}
              </span>
              <span className="text-[10px] text-slate-400 lowercase font-normal">
                {t('settings.apiKeyDesc')}
              </span>
            </label>
            <input
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full apple-input rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 font-mono transition-all"
            />
          </div>

          {/* Model Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                <MorphIcon name="cpu" size={14} className="text-blue-400" />
                {t('settings.modelChat')}
              </label>
              <select
                value={modelChat}
                onChange={(e) => setModelChat(e.target.value)}
                className="w-full apple-input rounded-xl px-3 py-2 text-xs text-white cursor-pointer"
              >
                <option value="gpt-4o-mini" className="bg-[#1c1c1e]">gpt-4o-mini (Nhanh & Tối ưu)</option>
                <option value="gpt-4o" className="bg-[#1c1c1e]">gpt-4o (Chính xác cao)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                <MorphIcon name="mic" size={14} className="text-blue-400" />
                {t('settings.modelSTT')}
              </label>
              <select
                value={modelSTT}
                onChange={(e) => setModelSTT(e.target.value)}
                className="w-full apple-input rounded-xl px-3 py-2 text-xs text-white cursor-pointer"
              >
                <option value="whisper-1" className="bg-[#1c1c1e]">whisper-1 (Chuẩn đa ngữ)</option>
                <option value="gpt-4o-realtime" className="bg-[#1c1c1e]">gpt-4o-realtime</option>
              </select>
            </div>
          </div>

          {/* Microphone Device */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
              <MorphIcon name="mic" size={14} className="text-blue-400" />
              {t('settings.micDevice')}
            </label>
            <select
              value={audioDeviceId}
              onChange={(e) => setAudioDeviceId(e.target.value)}
              className="w-full apple-input rounded-xl px-3 py-2 text-xs text-white cursor-pointer"
            >
              <option value="default" className="bg-[#1c1c1e]">{t('settings.defaultMic')}</option>
              {audioDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId} className="bg-[#1c1c1e]">
                  {d.label || `Microphone ${d.deviceId.slice(0, 5)}...`}
                </option>
              ))}
            </select>
          </div>

          {/* Toggles */}
          <div className="pt-2 border-t border-white/10 space-y-2.5">
            {/* Auto Text to Speech */}
            <div className="flex items-center justify-between p-3 rounded-2xl apple-card border border-white/10">
              <div>
                <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <MorphIcon name="volume" size={16} className="text-blue-400" />
                  <span>{t('settings.autoTTS')}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {t('settings.autoTTSDesc')}
                </div>
              </div>
              <input
                type="checkbox"
                checked={autoTTS}
                onChange={(e) => setAutoTTS(e.target.checked)}
                className="w-5 h-5 rounded-full border-white/30 text-blue-600 focus:ring-0 bg-white/10 cursor-pointer"
              />
            </div>
          </div>

          {/* Reset option */}
          <div className="pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => {
                if (window.confirm(t('settings.resetConfirm'))) {
                  resetMeeting();
                  setIsSettingsOpen(false);
                }
              }}
              className="text-xs text-rose-400 hover:text-rose-300 hover:underline"
            >
              {t('settings.resetData')}
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2.5 mt-5 pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={() => setIsSettingsOpen(false)}
            className="px-4 py-2 rounded-full apple-pill text-xs font-semibold text-slate-300 hover:text-white transition-all active:scale-95"
          >
            {t('settings.close')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition-all active:scale-95 flex items-center gap-1.5"
          >
            <MorphIcon name="shield-check" size={16} />
            <span>{savedSuccess ? t('settings.saved') : t('settings.save')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
