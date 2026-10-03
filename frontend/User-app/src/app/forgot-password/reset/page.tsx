"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { PasswordResetShell } from "@/components/auth/password-reset-shell";
import { isStrongPassword } from "@/utils/auth-validation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const longEnough = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialCharacter = /[^A-Za-z0-9\s]/.test(password);
  const matches = Boolean(password) && password === confirmPassword;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!isStrongPassword(password) || !matches) {
      setError("Vui lòng đáp ứng đầy đủ các yêu cầu về mật khẩu.");
      return;
    }
    const stored = sessionStorage.getItem("passwordResetVerified");
    if (!stored) {
      setError("Phiên đặt lại mật khẩu đã hết hạn. Vui lòng thực hiện lại.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const credentials = JSON.parse(stored) as {
        phone: string;
        otp_code: string;
      };
      const { fetchApi } = await import("@/lib/api-client");
      await fetchApi<{ message: string }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          phone: credentials.phone,
          otp_code: credentials.otp_code,
          new_password: password,
        }),
      });

      sessionStorage.removeItem("passwordResetRequest");
      sessionStorage.removeItem("passwordResetVerified");
      router.push("/login?reset=success");
    } catch (err: any) {
      setError(err.message || "Không thể cập nhật mật khẩu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PasswordResetShell compactBrand>
      <section className="reset-card reset-card--password">
        <h1>Tạo mật khẩu mới</h1>
        <p>Nhập mật khẩu mới cho tài khoản. Mật khẩu phải có ít nhất 8 ký tự.</p>
        <form onSubmit={submit}>
          <label htmlFor="new-password">MẬT KHẨU MỚI</label>
          <div className="reset-password-input">
            <LockKeyhole aria-hidden="true" />
            <input
              id="new-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={72}
              pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9\s]).{8,72}"
              title="Ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt"
              placeholder="Nhập mật khẩu mới"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Hiện hoặc ẩn mật khẩu">
              {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </button>
          </div>
          <label htmlFor="confirm-new-password">XÁC NHẬN MẬT KHẨU</label>
          <div className="reset-password-input">
            <ShieldCheck aria-hidden="true" />
            <input
              id="confirm-new-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={72}
              pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9\s]).{8,72}"
              title="Mật khẩu xác nhận phải đúng quy tắc và trùng với mật khẩu mới"
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
            <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Hiện hoặc ẩn mật khẩu">
              {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </button>
          </div>
          <div className="reset-requirements">
            <b>YÊU CẦU MẬT KHẨU</b>
            <span className={longEnough ? "is-valid" : ""}>○ Ít nhất 8 ký tự</span>
            <span className={hasUppercase ? "is-valid" : ""}>○ Có ít nhất một chữ hoa</span>
            <span className={hasLowercase ? "is-valid" : ""}>○ Có ít nhất một chữ thường</span>
            <span className={hasNumber ? "is-valid" : ""}>○ Có ít nhất một chữ số</span>
            <span className={hasSpecialCharacter ? "is-valid" : ""}>○ Có ít nhất một ký tự đặc biệt</span>
            <span className={matches ? "is-valid" : ""}>○ Hai mật khẩu phải trùng nhau</span>
          </div>
          {error && <p className="reset-error">{error}</p>}
          <button className="reset-primary" disabled={loading}>
            {loading ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
            <ArrowRight aria-hidden="true" />
          </button>
        </form>
        <p className="reset-help">Cần trợ giúp? <a href="tel:19000000">Liên hệ hỗ trợ</a></p>
      </section>
    </PasswordResetShell>
  );
}
