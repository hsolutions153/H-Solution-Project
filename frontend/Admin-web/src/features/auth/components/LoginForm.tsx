"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Headphones,
  Globe,
  ShieldCheck
} from "lucide-react";

export const LoginForm = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { fetchApi, setAuthToken } = await import("@/lib/api-client");

      const loginRes = await fetchApi<{
        access_token: string;
        token_type: string;
        role: string;
        user: { id: string; name: string; phone?: string };
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (loginRes.role !== "ADMIN") {
        setError("Tài khoản này không có quyền quản trị viên.");
        return;
      }

      setAuthToken(loginRes.access_token, {
        ...loginRes.user,
        role: loginRes.role,
      });
      localStorage.setItem("isLoggedIn", "true");
      router.push("/dashboard");
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
    <div className="min-h-screen w-full bg-slate-50 flex flex-col justify-between items-center py-10 px-4">
      <div className="w-full"></div>

      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/80 shadow-2xl shadow-slate-200/50 p-8 my-auto">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative w-16 h-16 rounded-2xl overflow-hidden shadow-lg shadow-blue-500/10 border border-slate-200/80 bg-white flex items-center justify-center p-2 mb-3">
            <Image
              src="/images/lg01.jpg"
              alt="AdminRepair Logo"
              fill
              sizes="64px"
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            AdminRepair
          </h1>
          <span className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-4">
            GLACIER EDITION
          </span>

          <h2 className="text-xl font-bold text-slate-800">
            Đăng nhập Quản trị
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Nhập thông tin tài khoản để truy cập hệ thống sửa chữa.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              Email hoặc Tên đăng nhập
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-5 h-5" />
              </span>
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@h-solution.local"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              Mật khẩu
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-5 h-5" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Abc123456@"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-11 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition"
                title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm font-medium">{error}</p>
          )}

          <div className="flex items-center gap-2.5 pt-1">
            <input
              type="checkbox"
              id="remember"
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label
              htmlFor="remember"
              className="text-sm text-slate-600 cursor-pointer select-none font-medium"
            >
              Ghi nhớ đăng nhập
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl text-base transition flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-70 cursor-pointer mt-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Đang kết nối...
              </span>
            ) : (
              <>
                <span>Đăng nhập</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-center">
          <ShieldCheck className="w-4 h-4 text-slate-400" />
          <p className="text-xs text-slate-400">
            Hệ thống nội bộ. Chỉ dành cho nhân viên được cấp quyền.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6 text-sm text-slate-500 font-medium">
        <button className="flex items-center gap-1.5 hover:text-slate-800 transition cursor-pointer">
          <Headphones className="w-4 h-4" />
          <span>Hỗ trợ kỹ thuật</span>
        </button>
        <span className="text-slate-300">•</span>
        <button className="flex items-center gap-1.5 hover:text-slate-800 transition cursor-pointer">
          <Globe className="w-4 h-4" />
          <span>Tiếng Việt (VN)</span>
        </button>
      </div>
    </div>
  );
};
