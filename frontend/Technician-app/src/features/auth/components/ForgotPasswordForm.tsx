'use client';

import React, { useState } from 'react';
import { ForgotPasswordFormData } from '@/types/auth';
import { User, ArrowRight } from 'lucide-react';
import { FieldError, rules, useFieldErrors } from '@h-mobility/ui';

interface ForgotPasswordFormProps {
  loading?: boolean;
  onSubmit: (data: ForgotPasswordFormData) => void | Promise<void>;
}

export const ForgotPasswordForm = ({ onSubmit, loading }: ForgotPasswordFormProps) => {
  const [identity, setIdentity] = useState('');
  const { errors, validate, clearError, inputProps } = useFieldErrors();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate({ identity }, { identity: rules.phone({ required: true }) })) return;
    onSubmit({ identity });
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-6">
      
      <div className="mb-5">
        <h2 className="text-base font-bold text-slate-800 mb-2">
          Quên mật khẩu
        </h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Nhập số điện thoại đã đăng ký để nhận mã xác thực OTP.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Số điện thoại
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 flex items-center justify-center">
              <User className="w-4 h-4" />
            </span>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={identity}
              {...inputProps('identity')}
              onChange={(e) => {
                setIdentity(e.target.value.replace(/\D/g, ''));
                clearError('identity');
              }}
              placeholder="0912345678"
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600 transition-all"
            />
          </div>
          <FieldError id="identity-error" message={errors.identity} />
        </div>

        
        <button
          type="submit"
            disabled={loading}
          className="w-full py-3 bg-brand-800 hover:bg-brand-900 active:bg-brand-950 text-white font-bold text-sm rounded-lg shadow-md transition-colors flex items-center justify-center gap-2 mt-2 cursor-pointer"
        >
          <span>Gửi mã xác thực</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};