'use client';

import React, { useState, useRef } from 'react';
import { LanguageSelector } from '@/components/LanguageSelector';
import { LoginHeader } from '@/components/LoginHeader';
import { VerifyOtpForm, VerifyOtpFormRef } from './components/VerifyOtpForm';
import { VerifyErrorModal } from './components/VerifyErrorModal';
import { VerifySuccessScreen } from './VerifySuccessScreen';
import { VerifyOtpFormData } from '@/types/auth';
import { ArrowLeft } from 'lucide-react';

interface VerifyOtpScreenProps {
  onBack: () => void;
  onVerifySuccess: () => void;
}

export const VerifyOtpScreen = ({
  onBack,
  onVerifySuccess,
}: VerifyOtpScreenProps) => {
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const formRef = useRef<VerifyOtpFormRef>(null);

  const handleVerifyOtp = (data: VerifyOtpFormData) => {
    console.log("Mã OTP nhập vào:", data.otp);

    // Giả lập check OTP (ví dụ OTP đúng là 123456)
    if (data.otp === "123456") {
      setIsSuccess(true);
    } else {
      // Mở popup thất bại thay vì alert
      setIsErrorModalOpen(true);
    }
  };

  const handleResend = () => {
    alert("Đã gửi lại mã OTP mới!");
  };

  // Thử lại khi nhập sai
  const handleRetry = () => {
    setIsErrorModalOpen(false);
    formRef.current?.resetOtp(); // Xóa sạch 6 ô OTP và focus ô đầu
  };

  // Nếu xác thực thành công -> Hiển thị VerifySuccessScreen
  if (isSuccess) {
    return <VerifySuccessScreen onResetPassword={onVerifySuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm bg-slate-50 rounded-3xl border border-gray-200/60 p-6 shadow-sm relative flex flex-col justify-between">
        
        <div className="absolute top-4 right-4">
          <LanguageSelector />
        </div>

        <div className="my-auto pt-4">
          
          <LoginHeader />

          
          <VerifyOtpForm
            ref={formRef}
            onSubmit={handleVerifyOtp}
            onResendOtp={handleResend}
          />

          
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={onBack}
              className="text-xs font-bold text-sky-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay lại</span>
            </button>
          </div>
        </div>
      </div>

      
      <VerifyErrorModal
        isOpen={isErrorModalOpen}
        onClose={() => setIsErrorModalOpen(false)}
        onRetry={handleRetry}
      />
    </div>
  );
};