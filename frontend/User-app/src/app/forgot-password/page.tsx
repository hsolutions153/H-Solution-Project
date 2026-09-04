"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Phone } from "lucide-react";
import { PasswordResetShell } from "@/components/auth/password-reset-shell";
import {
  digitsOnly,
  VIETNAM_PHONE_PATTERN,
} from "@/utils/auth-validation";


export default function ForgotPasswordPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!VIETNAM_PHONE_PATTERN.test(phone)) {
      setError("Số điện thoại phải gồm 10 chữ số và đúng đầu số Việt Nam.");
      return;
    }
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
      setError(err.message || "Không thể kết nối tới máy chủ.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PasswordResetShell>
      <section className="reset-card reset-card--request">
        <h1>Quên mật khẩu?</h1>
        <p>Nhập số điện thoại để nhận mã xác minh khôi phục mật khẩu.</p>
        <form onSubmit={submit}>
          <label htmlFor="reset-phone">SỐ ĐIỆN THOẠI</label>
          <div className="reset-input-wrap">
            <Phone aria-hidden="true" />
            <input
              id="reset-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              required
              pattern="0(?:3|5|7|8|9)[0-9]{8}"
              maxLength={10}
              title="Nhập số điện thoại Việt Nam gồm 10 chữ số, ví dụ 0912345678"
              placeholder="0912345678"
              value={phone}
              onChange={(event) => setPhone(digitsOnly(event.target.value))}
            />
          </div>
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
