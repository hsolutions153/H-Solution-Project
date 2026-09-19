'use client';

import React from 'react';
import { LanguageSelector } from '@/components/LanguageSelector';
import { LoginHeader } from '@/components/LoginHeader';
import { ResetPasswordForm } from './components/ResetPasswordForm';
import { ResetPasswordFormData } from '@/types/auth';

interface ResetPasswordScreenProps {
  onResetSuccess: () => void;
  onBackToLogin: () => void;
}

export const ResetPasswordScreen = ({
  onResetSuccess,
  onBackToLogin,
}: ResetPasswordScreenProps) => {
  const handleResetPassword = (data: ResetPasswordFormData) => {
    console.log('Mật khẩu mới:', data.newPassword);
    alert('Đặt lại mật khẩu thành công! Vui lòng đăng nhập bằng mật khẩu mới.');
    onResetSuccess(); // Chuyển về trang Login
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm bg-slate-50 rounded-3xl border border-gray-200/60 p-6 shadow-sm relative flex flex-col justify-between">
        
        <div className="absolute top-4 right-4">
          <LanguageSelector />
        </div>

        <div className="my-auto pt-4">
          
          <LoginHeader />

          
          <ResetPasswordForm
            onSubmit={handleResetPassword}
            onBackToLogin={onBackToLogin}
          />
        </div>
      </div>
    </div>
  );
};