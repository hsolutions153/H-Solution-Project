'use client';

import React, { useState } from 'react';
import { ResetPasswordFormData } from '@/types/auth';
import { Eye, EyeOff, Info, LogIn } from 'lucide-react';
import { FieldError, rules, useFieldErrors } from '@h-mobility/ui';

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
  const { errors, validate, clearError, inputProps } = useFieldErrors();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valid = validate(
      { newPassword, confirmPassword },
      {
        newPassword: [
          rules.password({ label: 'Mật khẩu mới' }),
          (v) => {
            const s = String(v);
            const missing = [!/[a-zA-Z]/.test(s) && 'chữ cái', !/\d/.test(s) && 'chữ số'].filter(Boolean);
            return missing.length ? `Mật khẩu mới còn thiếu: ${missing.join(', ')}.` : undefined;
          },
        ],
        confirmPassword: [
          rules.required('Mật khẩu xác nhận'),
          rules.matches(() => newPassword, 'Mật khẩu xác nhận không khớp với mật khẩu mới.'),
        ],
      },
    );
    if (!valid) return;
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

      <form onSubmit={handleSubmit} className="space-y-4 text-left" noValidate>
        
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Mật khẩu mới
          </label>
          <div className="relative">
            <input
              type={showNewPassword ? 'text' : 'password'}
              placeholder="Nhập mật khẩu mới"
              maxLength={72}
              value={newPassword}
              {...inputProps('newPassword')}
              onChange={(e) => {
                setNewPassword(e.target.value);
                clearError('newPassword');
              }}
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-brand-700 focus:ring-1 focus:ring-brand-700 pr-10 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <FieldError id="newPassword-error" message={errors.newPassword} />
        </div>

        
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Xác nhận mật khẩu mới
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Xác nhận mật khẩu"
              maxLength={72}
              value={confirmPassword}
              {...inputProps('confirmPassword')}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                clearError('confirmPassword');
              }}
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-brand-700 focus:ring-1 focus:ring-brand-700 pr-10 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <FieldError id="confirmPassword-error" message={errors.confirmPassword} />
        </div>

        
        <div className="flex items-start gap-2 p-3 bg-slate-50 border border-slate-100 rounded-lg text-[11px] text-slate-500 leading-relaxed">
          <Info className="w-4 h-4 text-brand-700 shrink-0 mt-0.5" />
          <span>Mật khẩu phải từ 8 ký tự, bao gồm chữ cái và chữ số.</span>
        </div>

        
        
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