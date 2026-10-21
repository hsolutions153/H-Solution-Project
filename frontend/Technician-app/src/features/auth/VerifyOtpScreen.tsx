'use client';

import { useState, useRef } from 'react';
import { LanguageSelector } from '@/components/LanguageSelector';
import { LoginHeader } from '@/components/LoginHeader';
import { VerifyOtpForm, VerifyOtpFormRef } from './components/VerifyOtpForm';
import { VerifyErrorModal } from './components/VerifyErrorModal';
import { VerifySuccessScreen } from './VerifySuccessScreen';
import { VerifyOtpFormData } from '@/types/auth';
import { ArrowLeft } from 'lucide-react';
import { fetchApi } from '@/lib/api-client';

interface VerifyOtpScreenProps {
  onBack: () => void;
  onVerifySuccess: (otp: string) => void;
  phone: string;
  developmentCode?: string;
}

export const VerifyOtpScreen = ({
  onBack,
  onVerifySuccess,
  phone,
  developmentCode,
}: VerifyOtpScreenProps) => {
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const formRef = useRef<VerifyOtpFormRef>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verifiedOtp, setVerifiedOtp] = useState("");
  const [devCode, setDevCode] = useState(developmentCode || "");
  const handleVerifyOtp = async (data: VerifyOtpFormData) => {
    setLoading(true); setError("");
    try {
      await fetchApi("/auth/verify-otp", { method: "POST", body: JSON.stringify({ phone, otp_code: data.otp }) });
      setVerifiedOtp(data.otp); setIsSuccess(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Mã OTP không hợp lệ.");
      setIsErrorModalOpen(true);
    } finally { setLoading(false); }
  };
  const handleResend = async () => {
    setLoading(true); setError("");
    try {
      const result = await fetchApi<{ otp_code?: string }>("/auth/forgot-password", { method: "POST", body: JSON.stringify({ phone }) });
      setDevCode(result.otp_code || ""); formRef.current?.resetOtp();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Không thể gửi lại mã OTP.");
    } finally { setLoading(false); }
  };

  // Thử lại khi nhập sai
  const handleRetry = () => {
    setIsErrorModalOpen(false);
    formRef.current?.resetOtp(); // Xóa sạch 6 ô OTP và focus ô đầu
  };

  // Nếu xác thực thành công -> Hiển thị VerifySuccessScreen
  if (isSuccess) {
    return <VerifySuccessScreen onResetPassword={() => onVerifySuccess(verifiedOtp)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm bg-slate-50 rounded-3xl border border-slate-200/60 p-6 shadow-sm relative flex flex-col justify-between">
        
        <div className="absolute top-4 right-4">
          <LanguageSelector />
        </div>

        <div className="my-auto pt-4">
          
          <LoginHeader />

          
          <p className="text-xs text-center mb-2">Số điện thoại: {phone}</p>
          {devCode && <p className="text-xs text-center mb-2">Mã thử nghiệm: <b>{devCode}</b></p>}
          {error && <p role="alert" className="text-xs text-rose-600 mb-2">{error}</p>}
          <VerifyOtpForm
            ref={formRef}
            loading={loading}
            onSubmit={handleVerifyOtp}
            onResendOtp={handleResend}
          />

          
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={onBack}
              className="text-xs font-bold text-brand-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
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