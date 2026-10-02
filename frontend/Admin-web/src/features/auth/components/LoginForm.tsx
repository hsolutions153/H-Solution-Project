"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLockup, Button, Field } from "@h-mobility/ui";
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
    <div className="min-h-screen w-full bg-canvas flex flex-col justify-between items-center py-10 px-4">
      <div className="w-full"></div>

      <div className="w-full max-w-md bg-surface rounded-sheet border border-line shadow-raised p-8 my-auto">
        <div className="flex flex-col items-start mb-7">
          <BrandLockup size={44} product="Quản trị hệ thống" />
          <h1 className="mt-7 text-2xl font-bold tracking-tight text-ink">Đăng nhập</h1>
          <p className="mt-1 text-sm text-slate-600">
            Dùng tài khoản quản trị để vào hệ thống điều phối sửa chữa.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field
            label="Email hoặc tên đăng nhập"
            type="text"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@h-solution.local"
            icon={<Mail />}
          />

          <Field
            label="Mật khẩu"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nhập mật khẩu"
            icon={<Lock />}
            error={error || undefined}
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
              </button>
            }
          />

          <label className="flex items-center gap-2.5 pt-1 text-sm text-slate-700 cursor-pointer select-none">
            <input type="checkbox" id="remember" className="size-4 rounded border-slate-300 accent-brand-600 cursor-pointer" />
            Ghi nhớ đăng nhập
          </label>

          <Button type="submit" size="lg" fullWidth loading={loading} className="mt-2">
            {loading ? "Đang kết nối..." : "Đăng nhập"}
            {!loading && <ArrowRight className="size-5" />}
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-line flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="size-4 shrink-0" />
          Hệ thống nội bộ, chỉ dành cho nhân viên được cấp quyền.
        </div>
      </div>

      <div className="flex items-center gap-6 text-sm text-slate-600 font-medium">
        <button className="flex items-center gap-1.5 hover:text-ink transition cursor-pointer">
          <Headphones className="size-4" />
          <span>Hỗ trợ kỹ thuật</span>
        </button>
        <button className="flex items-center gap-1.5 hover:text-ink transition cursor-pointer">
          <Globe className="size-4" />
          <span>Tiếng Việt (VN)</span>
        </button>
      </div>
    </div>
  );
};
