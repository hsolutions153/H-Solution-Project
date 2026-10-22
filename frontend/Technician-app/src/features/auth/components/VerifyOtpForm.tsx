'use client';

import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { VerifyOtpFormData } from '@/types/auth';
import { FieldError } from '@h-mobility/ui';

interface VerifyOtpFormProps {
  loading?: boolean;
  onSubmit: (data: VerifyOtpFormData) => void | Promise<void>;
  onResendOtp?: () => void | Promise<void>;
}

export interface VerifyOtpFormRef {
  resetOtp: () => void | Promise<void>;
}

export const VerifyOtpForm = forwardRef<VerifyOtpFormRef, VerifyOtpFormProps>(
  ({ onSubmit, onResendOtp, loading }, ref) => {
    const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
    const [otpError, setOtpError] = useState('');
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Cung cấp hàm resetOtp ra bên ngoài thông qua ref
    useImperativeHandle(ref, () => ({
      resetOtp: () => {
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      },
    }));

    // Xử lý khi gõ từng số OTP
    const handleChange = (text: string, index: number) => {
      const value = text.replace(/[^0-9]/g, '');
      const newOtp = [...otp];
      newOtp[index] = value.slice(-1);
      setOtp(newOtp);
      setOtpError('');

      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    };

    // Xử lý khi bấm nút Xóa (Backspace)
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
      if (e.key === 'Backspace' && !otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    };

    // Xử lý khi Paste cả chuỗi 6 số
    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
      if (!pastedData) return;

      const newOtp = [...otp];
      pastedData.split('').forEach((char, i) => {
        newOtp[i] = char;
      });
      setOtp(newOtp);

      const nextFocusIndex = Math.min(pastedData.length, 5);
      inputRefs.current[nextFocusIndex]?.focus();
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const fullOtp = otp.join('');
      if (fullOtp.length < 6) {
        const missing = 6 - fullOtp.length;
        setOtpError(
          fullOtp.length === 0
            ? 'Vui lòng nhập mã OTP gồm 6 chữ số.'
            : `Mã OTP gồm 6 chữ số, bạn còn thiếu ${missing} số.`,
        );
        inputRefs.current[otp.findIndex((d) => !d)]?.focus();
        return;
      }
      onSubmit({ otp: fullOtp });
    };

    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-6 text-center">
        
        <div className="mb-5">
          <h2 className="text-base font-bold text-slate-800 mb-2">
            Nhập mã xác thực
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed max-w-[260px] mx-auto">
            Mã xác thực OTP đã được gửi đến số điện thoại của bạn. Vui lòng nhập mã gồm 6 chữ số dưới đây.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          
          <div className="flex justify-between gap-1.5 px-1">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(e.target.value, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                onPaste={handlePaste}
                aria-label={`Chữ số OTP thứ ${index + 1}`}
                aria-invalid={otpError && !digit ? true : undefined}
                aria-describedby={otpError ? 'otp-error' : undefined}
                className="w-10 h-12 text-center text-base font-bold bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600 transition-all shadow-sm"
              />
            ))}
          </div>
          <FieldError id="otp-error" message={otpError} className="text-center" />

          
          <div>
            <button
              type="button"
              onClick={onResendOtp}
              disabled={loading}
              className="text-xs font-bold text-brand-800 hover:underline inline-block"
            >
              Gửi lại mã
            </button>
          </div>

          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-brand-800 hover:bg-brand-900 active:bg-brand-950 text-white font-bold text-sm rounded-lg shadow-md transition-colors"
          >
            Xác nhận
          </button>
        </form>
      </div>
    );
  }
);

VerifyOtpForm.displayName = 'VerifyOtpForm';