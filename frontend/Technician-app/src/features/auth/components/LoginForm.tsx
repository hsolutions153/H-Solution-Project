"use client";

import React, { useState } from "react";
import { LoginFormData } from "@/types/auth";
import { User, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";

interface LoginFormProps {
  onSubmit: (data: LoginFormData) => void;
  onForgotPassword: () => void;
}

export const LoginForm = ({ onSubmit, onForgotPassword }: LoginFormProps) => {
  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { fetchApi, setAuthToken } = await import("@/lib/api-client");

      const loginRes = await fetchApi<{
        access_token: string;
        token_type: string;
        role: string;
        user: { id: string; name: string; phone?: string };
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: identity.trim(), password }),
      });

      if (loginRes.role !== "TECHNICIAN") {
        setError("Tài khoản này không có quyền kỹ thuật viên.");
        return;
      }

      setAuthToken(loginRes.access_token, {
        ...loginRes.user,
        role: loginRes.role,
      });
      onSubmit({ identity, password, rememberMe });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Máy chủ không thể xử lý yêu cầu. Vui lòng thử lại.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Số điện thoại hoặc Email
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 flex items-center justify-center">
              <User className="w-4 h-4" />
            </span>
            <input
              type="text"
              required
              value={identity}
              onChange={(e) => setIdentity(e.target.value)}
              placeholder="tech1@h-solution.local"
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Mật khẩu
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </span>
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Abc123456@"
              className="w-full pl-9 pr-10 py-2.5 bg-white border border-gray-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-red-500 text-xs font-medium">{error}</p>
        )}

        <div className="flex items-center justify-between text-xs pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-slate-600">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-sky-800 focus:ring-sky-600 cursor-pointer"
            />
            <span>Ghi nhớ đăng nhập</span>
          </label>
          <button
            type="button"
            onClick={onForgotPassword}
            className="font-bold text-sky-800 hover:underline cursor-pointer"
          >
            Quên mật khẩu?
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-sky-800 hover:bg-sky-900 active:bg-sky-950 text-white font-bold text-sm rounded-lg shadow-md transition-colors flex items-center justify-center gap-2 mt-2 cursor-pointer disabled:opacity-70"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Đang đăng nhập...</span>
            </>
          ) : (
            <>
              <span>Đăng nhập</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
