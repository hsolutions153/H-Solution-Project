"use client";

import React, { useState } from "react";
import { LoginFormData } from "@/types/auth";
import { MOCK_USER } from "@/constants/mockAuth";
import { User, Lock, Eye, EyeOff, ArrowRight } from "lucide-react"; // Import các icon từ lucide-react

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Kiểm tra thông tin với dữ liệu Mock
    const isValidUser =
      (identity === MOCK_USER.identity || identity === MOCK_USER.email) &&
      password === MOCK_USER.password;

    if (isValidUser) {
      onSubmit({ identity, password, rememberMe });
    } else {
      setError("Số điện thoại/Email hoặc mật khẩu không đúng!");
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Số điện thoại / Email */}
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
              placeholder="Nhập thông tin của bạn"
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600 transition-all"
            />
          </div>
        </div>

        {/* Mật khẩu */}
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
              placeholder="Nhập mật khẩu"
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
        {/* Thông báo lỗi */}
          {error && (
            <p className="text-red-500 text-xs font-medium">
              {error}
            </p>
          )}
        {/* Ghi nhớ & Quên mật khẩu */}
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

        {/* Nút Đăng nhập */}
        <button
          type="submit"
          className="w-full py-3 bg-sky-800 hover:bg-sky-900 active:bg-sky-950 text-white font-bold text-sm rounded-lg shadow-md transition-colors flex items-center justify-center gap-2 mt-2 cursor-pointer"
        >
          <span>Đăng nhập</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
