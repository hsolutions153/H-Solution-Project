'use client';

import { useState } from 'react';
import { fetchApi } from '@/lib/api-client';
import { LanguageSelector } from '@/components/LanguageSelector';
import { LoginHeader } from '@/components/LoginHeader';
import { ResetPasswordForm } from './components/ResetPasswordForm';
import { ResetPasswordFormData } from '@/types/auth';

interface ResetPasswordScreenProps {
  phone: string;
  otpCode: string;
  onResetSuccess: () => void;
  onBackToLogin: () => void;
}

export const ResetPasswordScreen = ({
  phone,
  otpCode,
  onResetSuccess,
  onBackToLogin,
}: ResetPasswordScreenProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const handleResetPassword = async (data: ResetPasswordFormData) => {
    setLoading(true); setError("");
    try {
      await fetchApi("/auth/reset-password", {
        method: "POST", body: JSON.stringify({ phone, otp_code: otpCode, new_password: data.newPassword }),
      });
      onResetSuccess();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Không thể đặt lại mật khẩu.");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm bg-slate-50 rounded-3xl border border-slate-200/60 p-6 shadow-sm relative flex flex-col justify-between">
        
        <div className="absolute top-4 right-4">
          <LanguageSelector />
        </div>

        <div className="my-auto pt-4">
          
          <LoginHeader />

          
          {error && <p role="alert" className="text-xs text-rose-600 mb-2">{error}</p>}
          <ResetPasswordForm
            loading={loading}
            onSubmit={handleResetPassword}
            onBackToLogin={onBackToLogin}
          />
        </div>
      </div>
    </div>
  );
};