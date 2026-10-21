'use client';

import { X } from 'lucide-react';

interface VerifyErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
}

export const VerifyErrorModal = ({ isOpen, onClose, onRetry }: VerifyErrorModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
      <div className="relative w-full max-w-xs rounded-2xl bg-white p-6 shadow-xl text-center">
        
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100">
          <X className="h-8 w-8 text-rose-500" />
        </div>

        
        <h3 className="mb-2 text-base font-bold text-slate-800">Xác thực thất bại!</h3>
        <p className="mb-6 text-xs text-slate-500 leading-relaxed">
          Mã OTP nhập vào không chính xác hoặc đã hết hạn. Vui lòng thử lại.
        </p>

        
        <button
          type="button"
          onClick={onRetry}
          className="w-full rounded-xl bg-brand-900 py-3 text-xs font-bold text-white shadow-md hover:bg-brand-950 transition-colors"
        >
          Thử lại
        </button>
      </div>
    </div>
  );
};