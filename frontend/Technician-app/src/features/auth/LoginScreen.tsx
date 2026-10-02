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
    <div className="min-h-full flex flex-col bg-surface px-5 pt-4 pb-8">
      <LanguageSelector />

      <div className="my-auto pt-6">
        <LoginHeader />
        <LoginForm onSubmit={handleLogin} onForgotPassword={onForgotPassword} />
        <LoginFooter />
      </div>
    </div>
  );
};
