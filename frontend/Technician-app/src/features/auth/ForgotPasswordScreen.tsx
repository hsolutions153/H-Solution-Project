"use client";

import React from "react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { LoginHeader } from "@/components/LoginHeader";
import { ForgotPasswordForm } from "./components/ForgotPasswordForm";
import { ForgotPasswordFormData } from "@/types/auth";
import { ArrowLeft } from "lucide-react"; // Import icon ArrowLeft

interface ForgotPasswordScreenProps {
  onBackToLogin: () => void;
  onSubmitSuccess?: () => void;
}

export const ForgotPasswordScreen = ({
  onBackToLogin,
  onSubmitSuccess,
}: ForgotPasswordScreenProps) => {
  const handleForgotPassword = (data: ForgotPasswordFormData) => {
    console.log("Yêu cầu gửi OTP cho:", data.identity);
    alert(`Đã gửi mã OTP đến: ${data.identity}`);
    if (onSubmitSuccess) onSubmitSuccess();
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4">
      
      <div className="w-full max-w-sm bg-slate-50 rounded-3xl border border-gray-200/60 p-6 shadow-sm relative flex flex-col justify-between">
        
        <div className="absolute top-4 right-4">
          <LanguageSelector />
        </div>

        <div className="my-auto pt-4">
          
          <LoginHeader />

          
          <ForgotPasswordForm onSubmit={handleForgotPassword} />

          
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={onBackToLogin}
              className="text-xs font-bold text-sky-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay lại Đăng nhập</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
