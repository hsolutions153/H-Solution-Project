'use client';

import React from 'react';

// Import UI CHUNG từ src/components/
import { LanguageSelector } from '@/components/LanguageSelector';
import { LoginHeader } from '@/components/LoginHeader';

// Import UI RIÊNG từ src/features/auth/components/
import { LoginForm } from './components/LoginForm';
import { LoginFooter } from './components/LoginFooter';

import { LoginFormData } from '@/types/auth';

interface LoginScreenProps {
  onLoginSuccess: () => void;
  onForgotPassword: () => void;
}

export const LoginScreen = ({ onLoginSuccess, onForgotPassword }: LoginScreenProps) => {
  const handleLogin = (data: LoginFormData) => {
    console.log('Thông tin đăng nhập:', data);
    onLoginSuccess();
  };

  return (
    // Màn hình nền tổng thể
    <div className="min-h-screen flex flex-col justify-center items-center p-4">
      
      <div className="w-full max-w-sm bg-slate-50 rounded-3xl border border-gray-200/60 p-6 shadow-sm relative flex flex-col justify-between">
        
        
        <div className="absolute top-4 right-4">
          <LanguageSelector />
        </div>

        <div className="my-auto pt-4">
          
          <LoginHeader />
          
          
          <LoginForm onSubmit={handleLogin} onForgotPassword={onForgotPassword} />

          
          <LoginFooter />
        </div>
      </div>
    </div>
  );
};