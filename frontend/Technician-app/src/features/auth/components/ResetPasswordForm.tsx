'use client';

import React, { useState } from 'react';
import { ResetPasswordFormData } from '@/types/auth';
import { Eye, EyeOff, Info, LogIn } from 'lucide-react';

interface ResetPasswordFormProps {
  loading?: boolean;
  onSubmit: (data: ResetPasswordFormData) => void | Promise<void>;
  onBackToLogin: () => void | Promise<void>;
}

export const ResetPasswordForm = ({ onSubmit, onBackToLogin, loading }: ResetPasswordFormProps) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Kiểm tra độ dài tối thiểu 8 ký tự
    if (newPassword.length < 8 || newPassword.length > 72) {
      setErrorMessage('Mật khẩu phải từ 8 đến 72 ký tự.');
      return;
    }

    // Kiểm tra bao gồm cả chữ và số
    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    if (!hasLetter || !hasNumber) {
      setErrorMessage('Mật khẩu phải bao gồm cả chữ cái và chữ số.');
      return;
    }

    // Kiểm tra khớp mật khẩu
    if (newPassword !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp.');
      return;
    }

    onSubmit({ newPassword, confirmPassword });
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-6 text-center">
      
      <div className="mb-5">
        <h2 className="text-base font-bold text-slate-800 mb-1">
          Đặt lại mật khẩu
        </h2>
        <p className="text-xs text-slate-500">
          Tạo mật khẩu mới cho tài khoản của bạn
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Mật khẩu mới
          </label>
          <div className="relative">
            <input
              type={showNewPassword ? 'text' : 'password'}
              placeholder="Nhập mật khẩu mới"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-brand-700 focus:ring-1 focus:ring-brand-700 pr-10 transition-all"
              required
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Xác nhận mật khẩu mới
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Xác nhận mật khẩu"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-brand-700 focus:ring-1 focus:ring-brand-700 pr-10 transition-all"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        
        <div className="flex items-start gap-2 p-3 bg-slate-50 border border-slate-100 rounded-lg text-[11px] text-slate-500 leading-relaxed">
          <Info className="w-4 h-4 text-brand-700 shrink-0 mt-0.5" />
          <span>Mật khẩu phải từ 8 ký tự, bao gồm chữ cái và chữ số.</span>
        </div>

        
        {errorMessage && (
          <p className="text-xs text-rose-500 font-medium text-center">{errorMessage}</p>
        )}

        
        <button
          type="submit"
            disabled={loading}
          className="w-full py-3 bg-brand-800 hover:bg-brand-900 active:bg-brand-950 text-white font-bold text-xs rounded-lg shadow-md transition-colors flex items-center justify-center gap-2 mt-2 cursor-pointer"
        >
          <span>Lưu mật khẩu & Đăng nhập</span>
          <LogIn className="w-3.5 h-3.5" />
        </button>
      </form>

      
      <div className="mt-5 text-center">
        <button
          type="button"
          onClick={onBackToLogin}
          className="text-xs font-semibold text-brand-800 hover:underline cursor-pointer"
        >
          Quay lại trang Đăng nhập
        </button>
      </div>
    </div>
  );
};