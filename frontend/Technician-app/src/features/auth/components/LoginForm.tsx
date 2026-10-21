"use client";

import React, { useState } from "react";
import { LoginFormData } from "@/types/auth";
import { User, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { Button, Field, rules, useFieldErrors } from "@h-mobility/ui";

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
  const { errors, validate, fromApi, clearError } = useFieldErrors();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const valid = validate(
      { identity, password },
      { identity: rules.phoneOrEmail("Số điện thoại hoặc email"), password: rules.loginPassword() },
    );
    if (!valid) return;
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
      if (fromApi(err, { email: "identity" })) return;
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
    <form onSubmit={handleSubmit} method="POST" action="#" className="space-y-4" noValidate>
      <Field
        label="Số điện thoại hoặc email"
        type="text"
        name="identity"
        autoComplete="username"
        value={identity}
        onChange={(e) => {
          setIdentity(e.target.value);
          clearError("identity");
        }}
        placeholder="0912345678 hoặc ten@gmail.com"
        icon={<User />}
        error={errors.identity}
      />

      <Field
        label="Mật khẩu"
        type={showPassword ? "text" : "password"}
        name="password"
        autoComplete="current-password"
        maxLength={72}
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          clearError("password");
        }}
        placeholder="Nhập mật khẩu"
        icon={<Lock />}
        error={errors.password || error || undefined}
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
