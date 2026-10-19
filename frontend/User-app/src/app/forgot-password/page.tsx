"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Phone } from "lucide-react";
import { PasswordResetShell } from "@/components/auth/password-reset-shell";
import { digitsOnly } from "@/utils/auth-validation";
import { FieldError, rules, useFieldErrors } from "@h-mobility/ui";


export default function ForgotPasswordPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { errors, validate, fromApi, clearError, inputProps } = useFieldErrors();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!validate({ phone }, { phone: rules.phone({ required: true }) })) return;
    setLoading(true);
    try {
      const { fetchApi } = await import("@/lib/api-client");
      const payload = await fetchApi<{
        message: string;
        expires_in_seconds: number;
        otp_code?: string;
      }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ phone }),
      });

      sessionStorage.setItem(
        "passwordResetRequest",
        JSON.stringify({
          phone,
          developmentCode: payload.otp_code,
        }),
      );
      router.push(`/forgot-password/verify?phone=${encodeURIComponent(phone)}`);
    } catch (err: any) {
      if (!fromApi(err)) setError(err.message || "Không thể kết nối tới máy chủ.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PasswordResetShell>
      <section className="reset-card reset-card--request">
        <h1>Quên mật khẩu?</h1>
        <p>Nhập số điện thoại để nhận mã xác minh khôi phục mật khẩu.</p>
        <form onSubmit={submit} noValidate>
          <label htmlFor="reset-phone">SỐ ĐIỆN THOẠI</label>
          <div className="reset-input-wrap">
            <Phone aria-hidden="true" />
            <input
              id="reset-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={10}
              placeholder="0912345678"
              value={phone}
              {...inputProps("phone")}
              onChange={(event) => {
                setPhone(digitsOnly(event.target.value));
                clearError("phone");
              }}
            />
          </div>
          <FieldError id="phone-error" message={errors.phone} />
          {error && <p className="reset-error">{error}</p>}
          <button className="reset-primary" disabled={loading}>
            {loading ? "Đang gửi..." : "Gửi mã xác minh"}
            <ArrowRight aria-hidden="true" />
          </button>
        </form>
        <Link href="/login" className="reset-back-link">
          <span>←</span> Quay lại đăng nhập
        </Link>
      </section>
      <p className="reset-help">Cần trợ giúp? <a href="tel:19000000">Liên hệ chúng tôi</a></p>
    </PasswordResetShell>
  );
}
