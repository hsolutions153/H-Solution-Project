"use client";

import { useState } from "react";
import { fetchApi } from "@/lib/api-client";
import { LanguageSelector } from "@/components/LanguageSelector";
import { LoginHeader } from "@/components/LoginHeader";
import { ForgotPasswordForm } from "./components/ForgotPasswordForm";
import { ForgotPasswordFormData } from "@/types/auth";
import { ArrowLeft } from "lucide-react";

interface ForgotPasswordScreenProps {
  onBackToLogin: () => void;
  onSubmitSuccess?: (phone: string, developmentCode?: string) => void;
}

export const ForgotPasswordScreen = ({
  onBackToLogin,
  onSubmitSuccess,
}: ForgotPasswordScreenProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const handleForgotPassword = async (data: ForgotPasswordFormData) => {
    setLoading(true); setError("");
    try {
      const phone = data.identity.trim();
      const result = await fetchApi<{ otp_code?: string }>("/auth/forgot-password", {
        method: "POST", body: JSON.stringify({ phone }),
      });
      onSubmitSuccess?.(phone, result.otp_code);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Không thể gửi mã OTP.");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4">
      
      <div className="w-full max-w-sm bg-slate-50 rounded-3xl border border-slate-200/60 p-6 shadow-sm relative flex flex-col justify-between">
        
        <div className="absolute top-4 right-4">
          <LanguageSelector />
        </div>

        <div className="my-auto pt-4">
          
          <LoginHeader />

          
          <ForgotPasswordForm onSubmit={handleForgotPassword} loading={loading} />
          {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}

          
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={onBackToLogin}
              className="text-xs font-bold text-brand-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
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
