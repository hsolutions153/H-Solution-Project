'use client';

import { LanguageSelector } from '@/components/LanguageSelector';
import { LoginHeader } from '@/components/LoginHeader';

import { LoginForm } from './components/LoginForm';
import { LoginFooter } from './components/LoginFooter';

interface LoginScreenProps {
  onLoginSuccess: () => void;
  onForgotPassword: () => void;
}

export const LoginScreen = ({ onLoginSuccess, onForgotPassword }: LoginScreenProps) => {
  return (
    <div className="min-h-full flex flex-col bg-surface px-5 pt-4 pb-8">
      <LanguageSelector />

      <div className="my-auto pt-6">
        <LoginHeader />
        <LoginForm onSubmit={onLoginSuccess} onForgotPassword={onForgotPassword} />
        <LoginFooter />
      </div>
    </div>
  );
};
