"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PasswordResetShell } from "@/components/auth/password-reset-shell";

type StoredRequest = {
  requestId: string;
  phone: string;
  expiresAt: string;
  developmentCode?: string;
};

function maskPhone(phone: string) {
  return phone.length > 6
    ? `${phone.slice(0, 4)} ${"*".repeat(Math.max(2, phone.length - 7))} ${phone.slice(-3)}`
    : phone;
}

function OtpVerificationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRequestId = searchParams.get("requestId") ?? "";
  const initialPhone = searchParams.get("phone") ?? "";
  const [requestId] = useState(initialRequestId);
  const [phone] = useState(initialPhone);
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [seconds, setSeconds] = useState(60);
  const [developmentCode, setDevelopmentCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    const stored = sessionStorage.getItem("passwordResetRequest");
    if (!stored) return;
    try {
      const data = JSON.parse(stored) as StoredRequest;
      if (data.requestId === requestId) {
        queueMicrotask(() => setDevelopmentCode(data.developmentCode ?? ""));
      }
    } catch {
      // The development helper is optional.
    }
  }, [requestId]);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds((value) => value - 1), 1000);
    return () => window.clearInterval(timer);
  }, [seconds]);

  function setDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    setDigits((current) => current.map((item, itemIndex) => itemIndex === index ? digit : item));
    if (digit && index < 5) inputs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    event.preventDefault();
    setDigits(Array.from({ length: 6 }, (_, index) => pasted[index] ?? ""));
    inputs.current[Math.min(pasted.length, 6) - 1]?.focus();
  }

  async function verify() {
    const code = digits.join("");
    if (code.length !== 6) {
      setError("Vui lòng nhập đủ mã xác minh gồm 6 số.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      sessionStorage.setItem(
        "passwordResetVerified",
        JSON.stringify({ phone, otp_code: code }),
      );
      router.push("/forgot-password/reset");
    } catch {
      setError("Không thể xử lý mã xác minh.");
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    setLoading(true);
    setError("");
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
      setDevelopmentCode(payload.otp_code ?? "");
      setDigits(["", "", "", "", "", ""]);
      setSeconds(60);
      inputs.current[0]?.focus();
    } catch (err: any) {
      setError(err.message || "Không thể gửi lại mã.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PasswordResetShell showBack compactBrand>
      <section className="reset-verify">
        <div className="reset-otp-logo">
          <span className="material-symbols-outlined">asterisk</span>
        </div>
        <h1>Xác minh OTP</h1>
        <p>Nhập mã xác minh gồm 6 số đã được gửi tới số điện thoại</p>
        <strong>{maskPhone(phone)}</strong>
        {developmentCode && (
          <p className="reset-dev-code">Mã thử nghiệm: <b>{developmentCode}</b></p>
        )}
        <div className="reset-otp-inputs">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(element) => { inputs.current[index] = element; }}
              value={digit}
              inputMode="numeric"
              maxLength={1}
              aria-label={`Số OTP thứ ${index + 1}`}
              onChange={(event) => setDigit(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              onPaste={handlePaste}
              autoFocus={index === 0}
            />
          ))}
        </div>
        <p className="reset-resend">
          Chưa nhận được mã?{" "}
          {seconds > 0 ? (
            <span>Gửi lại sau 00:{String(seconds).padStart(2, "0")}</span>
          ) : (
            <button type="button" onClick={resend} disabled={loading}>Gửi lại mã</button>
          )}
        </p>
        {error && <p className="reset-error">{error}</p>}
        <button className="reset-primary" onClick={verify} disabled={loading}>
          {loading ? "Đang xác minh..." : "Xác nhận"}
        </button>
        <button className="reset-change-phone" onClick={() => router.push("/forgot-password")}>
          <span className="material-symbols-outlined">edit</span> Đổi số điện thoại
        </button>
      </section>
    </PasswordResetShell>
  );
}

export default function OtpVerificationPage() {
  return (
    <Suspense fallback={null}>
      <OtpVerificationContent />
    </Suspense>
  );
}
