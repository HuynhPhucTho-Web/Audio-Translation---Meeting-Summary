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

  const [activeTab, setActiveTab] = useState('ai'); // 'ai' | 'system'
  const [showFallbackKeys, setShowFallbackKeys] = useState(false);

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
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      {/* Backdrop click to dismiss */}
      <div className="absolute inset-0" onClick={() => setIsSettingsOpen(false)} />

      <div className="relative apple-glass w-full max-w-lg rounded-3xl border border-white/15 shadow-2xl p-5 sm:p-6 z-10 flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <MorphIcon name="sliders" size={17} />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                {t('settings.title')}
              </h2>
              <p className="text-[11px] text-slate-400">Tùy chỉnh mô hình AI, khóa API và thiết bị âm thanh</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsSettingsOpen(false)}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            title="Đóng"
          >
            <MorphIcon name="x" size={16} />
          </button>
        </div>

        {/* Tab Switcher: Gọn gàng, phân chia rõ ràng */}
        <div className="flex items-center p-1 rounded-2xl bg-white/[0.05] border border-white/10 my-3.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'ai'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <MorphIcon name="sparkles" size={14} className={activeTab === 'ai' ? 'text-amber-300' : 'text-slate-400'} />
            <span>AI & Khóa API</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('system')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'system'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <MorphIcon name="sliders" size={14} className={activeTab === 'system' ? 'text-blue-300' : 'text-slate-400'} />
            <span>Âm thanh & Hệ thống</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="space-y-4 overflow-y-auto pr-1 flex-1">
          {/* TAB 1: AI & API KEYS */}
          {activeTab === 'ai' && (
            <div className="space-y-3.5">
              {/* AI Engine Selection Cards */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Chọn Engine AI chính (Tóm tắt & Dịch):</span>
                  <span className="text-[10px] text-emerald-400 font-mono">Tự động tối ưu</span>
                </label>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      id: 'groq',
                      name: '⚡ Groq Llama 3.3',
                      badge: 'Siêu tốc',
                      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
                      sub: 'Khuyên dùng (~0.5s)',
                      hasKey: !!groqApiKey,
                    },
                    {
                      id: 'gemini',
                      name: '✨ Google Gemini',
                      badge: 'Miễn phí',
                      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
                      sub: 'Flash 3.5 / 2.5',
                      hasKey: !!geminiApiKey,
                    },
                    {
                      id: 'openai',
                      name: '🧠 OpenAI GPT-4o',
                      badge: 'Cao cấp',
                      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
                      sub: 'GPT-4o Mini',
                      hasKey: !!apiKey,
                    },
                  ].map((prov) => {
                    const isSelected = aiProvider === prov.id;
                    return (
                      <button
                        key={prov.id}
                        type="button"
                        onClick={() => setAiProvider(prov.id)}
                        className={`p-2.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                          isSelected
                            ? 'bg-blue-600/25 border-blue-500 shadow-md ring-1 ring-blue-500/40 text-white'
                            : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.07]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono border ${prov.badgeColor}`}>
                            {prov.badge}
                          </span>
                          {prov.hasKey && (
                            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" title="Đã có khóa API" />
                          )}
                        </div>
                        <div className="text-xs font-bold truncate text-slate-100">{prov.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{prov.sub}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Primary API Key Card */}
              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2">
                {aiProvider === 'groq' && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                        <MorphIcon name="zap" size={14} className="text-amber-400" />
                        <span>Khóa GROQ API Key</span>
                      </label>
                      <a
                        href="https://console.groq.com/keys"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-blue-400 hover:underline flex items-center gap-0.5"
                      >
                        Lấy key miễn phí ↗
                      </a>
                    </div>
                    <input
                      type="password"
                      placeholder="gsk_..."
                      value={groqApiKey}
                      onChange={(e) => setGroqApiKey(e.target.value)}
                      className="w-full apple-input rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 font-mono"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Mô hình Llama-3.3 70B Versatile, tạo tóm tắt cuộc họp tiếng Việt chỉ trong 0.5s.
                    </p>
                  </div>
                )}

                {aiProvider === 'gemini' && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                        <MorphIcon name="sparkles" size={14} className="text-blue-400" />
                        <span>Khóa Google GEMINI API Key</span>
                      </label>
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-blue-400 hover:underline flex items-center gap-0.5"
                      >
                        Lấy key Google AI ↗
                      </a>
                    </div>
                    <input
                      type="password"
                      placeholder="AIzaSy... hoặc AQ.Ab..."
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      className="w-full apple-input rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 font-mono"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Tương thích tất cả định dạng key mới (`AQ.`) và cũ (`AIza`). Hỗ trợ model Gemini 3.5 / 2.5 Flash.
                    </p>
                  </div>
                )}

                {aiProvider === 'openai' && (
                  <div className="space-y-2.5">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                          <MorphIcon name="key" size={14} className="text-purple-400" />
                          <span>Khóa OpenAI API Key</span>
                        </label>
                        <a
                          href="https://platform.openai.com/api-keys"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-blue-400 hover:underline flex items-center gap-0.5"
                        >
                          Tạo key OpenAI ↗
                        </a>
                      </div>
                      <input
                        type="password"
                        placeholder="sk-..."
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="w-full apple-input rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-300 mb-1">Model Chat & Dịch</label>
                        <select
                          value={modelChat}
                          onChange={(e) => setModelChat(e.target.value)}
                          className="w-full apple-input rounded-xl px-2.5 py-1.5 text-xs text-white cursor-pointer"
                        >
                          <option value="gpt-4o-mini" className="bg-[#1c1c1e]">gpt-4o-mini (Khuyên dùng)</option>
                          <option value="gpt-4o" className="bg-[#1c1c1e]">gpt-4o</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-300 mb-1">Model Speech-to-Text</label>
                        <select
                          value={modelSTT}
                          onChange={(e) => setModelSTT(e.target.value)}
                          className="w-full apple-input rounded-xl px-2.5 py-1.5 text-xs text-white cursor-pointer"
                        >
                          <option value="whisper-1" className="bg-[#1c1c1e]">whisper-1</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Collapsible: Secondary / Fallback Keys */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowFallbackKeys(!showFallbackKeys)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  <MorphIcon
                    name="chevron"
                    state={showFallbackKeys ? 'open' : 'default'}
                    size={12}
                    className="text-slate-400"
                  />
                  <span>Cấu hình thêm khóa dự phòng (Fallback keys)</span>
                </button>

                {showFallbackKeys && (
                  <div className="mt-2.5 p-3 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2.5 animate-fadeIn">
                    <p className="text-[10px] text-slate-400">
                      Nếu engine chính gặp lỗi hoặc hết quota, hệ thống sẽ tự động chuyển sang các engine dự phòng này.
                    </p>

                    {aiProvider !== 'groq' && (
                      <div>
                        <label className="block text-[11px] font-medium text-slate-300 mb-1 flex items-center gap-1">
                          <MorphIcon name="zap" size={12} className="text-amber-400" />
                          <span>Groq Key (Dự phòng)</span>
                        </label>
                        <input
                          type="password"
                          placeholder="gsk_..."
                          value={groqApiKey}
                          onChange={(e) => setGroqApiKey(e.target.value)}
                          className="w-full apple-input rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono"
                        />
                      </div>
                    )}

                    {aiProvider !== 'gemini' && (
                      <div>
                        <label className="block text-[11px] font-medium text-slate-300 mb-1 flex items-center gap-1">
                          <MorphIcon name="sparkles" size={12} className="text-blue-400" />
                          <span>Gemini Key (Dự phòng)</span>
                        </label>
                        <input
                          type="password"
                          placeholder="AIzaSy... hoặc AQ.Ab..."
                          value={geminiApiKey}
                          onChange={(e) => setGeminiApiKey(e.target.value)}
                          className="w-full apple-input rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono"
                        />
                      </div>
                    )}

                    {aiProvider !== 'openai' && (
                      <div>
                        <label className="block text-[11px] font-medium text-slate-300 mb-1 flex items-center gap-1">
                          <MorphIcon name="key" size={12} className="text-purple-400" />
                          <span>OpenAI Key (Dự phòng)</span>
                        </label>
                        <input
                          type="password"
                          placeholder="sk-..."
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          className="w-full apple-input rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SYSTEM & AUDIO */}
          {activeTab === 'system' && (
            <div className="space-y-3.5">
              {/* UI Language Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <MorphIcon name="globe" size={14} className="text-blue-400" />
                  <span>{t('settings.uiLanguage')}</span>
                </label>
                <div className="relative">
                  <select
                    value={uiLanguage}
                    onChange={(e) => setUiLanguage(e.target.value)}
                    className="w-full apple-input rounded-xl px-3.5 py-2.5 text-xs text-white cursor-pointer appearance-none pr-8"
                  >
                    {UI_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code} className="bg-[#1c1c1e]">
                        {lang.flag} {lang.name} ({lang.code.toUpperCase()})
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <MorphIcon name="chevron-down" size={14} />
                  </div>
                </div>
              </div>

              {/* Microphone Device */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <MorphIcon name="mic" size={14} className="text-blue-400" />
                  <span>{t('settings.micDevice')}</span>
                </label>
                <div className="relative">
                  <select
                    value={audioDeviceId}
                    onChange={(e) => setAudioDeviceId(e.target.value)}
                    className="w-full apple-input rounded-xl px-3.5 py-2.5 text-xs text-white cursor-pointer appearance-none pr-8"
                  >
                    <option value="default" className="bg-[#1c1c1e]">
                      {t('settings.defaultMic')}
                    </option>
                    {audioDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId} className="bg-[#1c1c1e]">
                        {d.label || `Microphone ${d.deviceId.slice(0, 8)}...`}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <MorphIcon name="chevron-down" size={14} />
                  </div>
                </div>
              </div>

              {/* Auto Text to Speech Toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.04] border border-white/10">
                <div className="pr-3">
                  <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <MorphIcon name="volume" size={15} className="text-blue-400" />
                    <span>{t('settings.autoTTS')}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    {t('settings.autoTTSDesc')}
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={autoTTS}
                    onChange={(e) => setAutoTTS(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                </label>
              </div>

              {/* Reset Session Option */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-slate-300">Đặt lại phiên làm việc</div>
                  <div className="text-[10px] text-slate-500">Xóa dữ liệu phụ đề và bắt đầu phiên họp mới</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(t('settings.resetConfirm'))) {
                      resetMeeting();
                      setIsSettingsOpen(false);
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 text-xs font-medium transition-colors border border-rose-500/20 active:scale-95"
                >
                  {t('settings.resetData')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2.5 pt-3.5 mt-3 border-t border-white/10 shrink-0">
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
