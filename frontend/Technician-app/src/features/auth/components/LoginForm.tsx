"use client";

import React, { useState } from "react";
import { LoginFormData } from "@/types/auth";
import { User, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { Button, Field } from "@h-mobility/ui";

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

      setAuthToken(
        loginRes.access_token,
        {
          ...loginRes.user,
          role: loginRes.role,
        }
      );
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field
        label="Số điện thoại hoặc email"
        type="text"
        required
        autoComplete="username"
        value={identity}
        onChange={(e) => setIdentity(e.target.value)}
        placeholder="tech1@h-solution.local"
        icon={<User />}
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
            className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          >
            {showPassword ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
          </button>
        }
      />

      <div className="flex items-center justify-between pt-1 text-sm">
        <label className="flex items-center gap-2 cursor-pointer text-slate-700 select-none">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="size-4 rounded border-slate-300 accent-brand-600 cursor-pointer"
          />
          Ghi nhớ đăng nhập
        </label>
        <button
          type="button"
          onClick={onForgotPassword}
          className="font-semibold text-brand-700 hover:underline cursor-pointer"
        >
          Quên mật khẩu?
        </button>
      </div>

      <Button type="submit" size="lg" fullWidth loading={loading} className="mt-2">
        {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        {!loading && <ArrowRight className="size-5" />}
      </Button>
    </form>
  );
};
