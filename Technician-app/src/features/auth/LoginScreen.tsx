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
      {/* Khung thẻ bo tròn tổng thể (giống hệt ảnh bên phải nhưng đổi màu nền thành bg-slate-50 hoặc bỏ viền trắng đi cho liền mạch) */}
      <div className="w-full max-w-sm bg-slate-50 rounded-3xl border border-gray-200/60 p-6 shadow-sm relative flex flex-col justify-between">
        
        {/* Nút ngôn ngữ được ghim ở góc trên bên phải của khung này */}
        <div className="absolute top-4 right-4">
          <LanguageSelector />
        </div>

        <div className="my-auto pt-4">
          {/* 1. Header (Logo & Tiêu đề) */}
          <LoginHeader />
          
          {/* 2. Form đăng nhập */}
          <LoginForm onSubmit={handleLogin} onForgotPassword={onForgotPassword} />

          {/* 3. Footer (Hỗ trợ & Thanh ngang dưới cùng) */}
          <LoginFooter />
        </div>
      </div>
    </div>
  );
};