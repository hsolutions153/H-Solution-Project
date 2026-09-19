"use client";

import React from "react";
import { Check, ArrowRight } from "lucide-react";
import { LoginHeader } from "@/components/LoginHeader";

interface VerifySuccessScreenProps {
  onResetPassword?: () => void;
}

export const VerifySuccessScreen = ({
  onResetPassword,
}: VerifySuccessScreenProps) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onResetPassword?.();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      
      <div className="w-full max-w-sm bg-white rounded-3xl border border-gray-200/80 p-6 shadow-sm flex flex-col justify-between">
        <div className="my-auto pt-2">
          
          <LoginHeader />

          
          <form onSubmit={handleSubmit} className="mt-6 text-center">
            
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500 shadow-sm shadow-emerald-200">
              <Check className="h-8 w-8 text-white stroke-[2.5]" />
            </div>

            <h2 className="mb-2 text-base font-bold text-slate-900">
              Xác thực thành công!
            </h2>

            <p className="mb-6 text-xs text-slate-500 leading-relaxed px-2">
              Tài khoản của bạn đã được xác thực thành công. Vui lòng tiến hành
              đặt lại mật khẩu mới.
            </p>

            
            <button
              type="submit"
              className="w-full rounded-xl bg-sky-900 py-3 text-sm font-bold text-white shadow-md hover:bg-sky-950 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Đặt lại mật khẩu</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <hr className="my-6 border-gray-100" />

          
          <p className="text-[11px] text-center text-slate-500">
            Bạn cần hỗ trợ?{" "}
            <a
              href="tel:1900xxxx"
              className="font-bold text-sky-800 hover:underline transition-colors"
            >
              Liên hệ tổng đài
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};