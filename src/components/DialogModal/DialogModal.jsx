import React, { useEffect } from 'react';
import MorphIcon from '../MorphIcon/MorphIcon';
import { useMeetingStore } from '../../store/meetingStore';

export default function DialogModal() {
  const { dialogModal, closeDialogModal } = useMeetingStore();

  useEffect(() => {
    if (!dialogModal?.isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (dialogModal.onCancel) dialogModal.onCancel();
        else closeDialogModal();
      } else if (e.key === 'Enter') {
        if (dialogModal.onConfirm) dialogModal.onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dialogModal, closeDialogModal]);

  if (!dialogModal || !dialogModal.isOpen) return null;

  const { title, message, type = 'warning', confirmText, cancelText, onConfirm, onCancel } = dialogModal;

  const getIconConfig = () => {
    switch (type) {
      case 'danger':
        return {
          iconName: 'trash',
          badgeBg: 'bg-rose-500/15 border-rose-500/30 text-rose-400 shadow-rose-500/20',
          btnBg: 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30',
        };
      case 'warning':
        return {
          iconName: 'sparkles',
          badgeBg: 'bg-amber-500/15 border-amber-500/30 text-amber-400 shadow-amber-500/20',
          btnBg: 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30',
        };
      case 'success':
        return {
          iconName: 'check',
          badgeBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-emerald-500/20',
          btnBg: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30',
        };
      case 'info':
      default:
        return {
          iconName: 'info',
          badgeBg: 'bg-blue-500/15 border-blue-500/30 text-blue-400 shadow-blue-500/20',
          btnBg: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30',
        };
    }
  };

  const config = getIconConfig();

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      {/* Click outside to cancel */}
      <div
        className="absolute inset-0"
        onClick={() => {
          if (onCancel) onCancel();
          else closeDialogModal();
        }}
      />

      <div className="relative apple-glass w-full max-w-sm sm:max-w-md rounded-3xl border border-white/20 shadow-[0_25px_60px_rgba(0,0,0,0.8)] p-5 sm:p-6 z-10 flex flex-col items-center text-center animate-in zoom-in-95 duration-150">
        {/* Glow Icon Badge */}
        <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center mb-3.5 shadow-lg ${config.badgeBg}`}>
          <MorphIcon name={config.iconName} size={24} />
        </div>

        {/* Title */}
        <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
          {title}
        </h3>

        {/* Message */}
        {message && (
          <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed px-1">
            {message}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 w-full mt-6 pt-1">
          {cancelText && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 px-4 rounded-full apple-pill hover:bg-white/15 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition-all active:scale-95 border border-white/15 text-center"
            >
              {cancelText}
            </button>
          )}

          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 py-2.5 px-4 rounded-full text-xs sm:text-sm font-semibold shadow-lg transition-all active:scale-95 text-center ${config.btnBg}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
