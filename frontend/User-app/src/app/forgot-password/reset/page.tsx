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
import { strongPasswordRule } from "@/utils/auth-validation";
import { FieldError, rules, useFieldErrors } from "@h-mobility/ui";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { errors, validate, fromApi, clearError, inputProps } = useFieldErrors();

  const longEnough = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialCharacter = /[^A-Za-z0-9\s]/.test(password);
  const matches = Boolean(password) && password === confirmPassword;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const valid = validate(
      { password, confirmPassword },
      {
        password: strongPasswordRule("Mật khẩu mới"),
        confirmPassword: [
          rules.required("Mật khẩu xác nhận"),
          rules.matches(() => password, "Mật khẩu xác nhận không khớp với mật khẩu mới."),
        ],
      },
    );
    if (!valid) return;
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
      if (!fromApi(err, { new_password: "password" })) {
        setError(err.message || "Không thể cập nhật mật khẩu.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <PasswordResetShell compactBrand>
      <section className="reset-card reset-card--password">
        <h1>Tạo mật khẩu mới</h1>
        <p>Nhập mật khẩu mới cho tài khoản. Mật khẩu phải có ít nhất 8 ký tự.</p>
        <form onSubmit={submit} noValidate>
          <label htmlFor="new-password">MẬT KHẨU MỚI</label>
          <div className="reset-password-input">
            <LockKeyhole aria-hidden="true" />
            <input
              id="new-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              maxLength={72}
              placeholder="Nhập mật khẩu mới"
              value={password}
              {...inputProps("password")}
              onChange={(event) => {
                setPassword(event.target.value);
                clearError("password");
              }}
            />
            <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Hiện hoặc ẩn mật khẩu">
              {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </button>
          </div>
          <FieldError id="password-error" message={errors.password} />
          <label htmlFor="confirm-new-password">XÁC NHẬN MẬT KHẨU</label>
          <div className="reset-password-input">
            <ShieldCheck aria-hidden="true" />
            <input
              id="confirm-new-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              maxLength={72}
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              {...inputProps("confirmPassword")}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                clearError("confirmPassword");
              }}
            />
            <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Hiện hoặc ẩn mật khẩu">
              {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </button>
          </div>
          <FieldError id="confirmPassword-error" message={errors.confirmPassword} />
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
