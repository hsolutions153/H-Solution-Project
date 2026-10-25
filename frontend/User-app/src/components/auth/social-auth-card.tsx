"use client";

import { digitsOnly, strongPasswordRule } from "@/utils/auth-validation";
import { BrandLockup, FieldError, rules, useFieldErrors } from "@h-mobility/ui";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type AuthCardProps = {
  mode: "login" | "register";
};

const authErrors: Record<string, string> = {
  AccessDenied: "Bạn đã từ chối quyền đăng nhập.",
  Configuration: "Phương thức đăng nhập chưa được cấu hình đúng.",
  CredentialsSignin: "Số điện thoại hoặc mật khẩu không chính xác.",
  OAuthCallbackError: "Nhà cung cấp không thể hoàn tất đăng nhập.",
  OAuthAccountNotLinked: "Email này đã được liên kết với một phương thức đăng nhập khác.",
};

export function SocialAuthCard({ mode }: AuthCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const { errors, validate, fromApi, clearError, inputProps } = useFieldErrors();

  const [step, setStep] = useState<"form" | "otp">("form");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [otpSeconds, setOtpSeconds] = useState(60);
  const [developmentCode, setDevelopmentCode] = useState<string>("");
  const [otpError, setOtpError] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const otpInputs = useRef<Array<HTMLInputElement | null>>([]);

  const errorCode = searchParams?.get("error");
  const oauthError = errorCode
    ? authErrors[errorCode] ?? "Đăng nhập không thành công. Vui lòng thử lại."
    : "";
  const resetSuccess = searchParams?.get("reset") === "success";
  const errorMessage = formError || oauthError;
  const isLogin = mode === "login";

  useEffect(() => {
    if (step !== "otp" || otpSeconds <= 0) return;
    const timer = window.setInterval(() => setOtpSeconds((val) => val - 1), 1000);
    return () => window.clearInterval(timer);
  }, [step, otpSeconds]);

  function handleDigitChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);
    setOtpError("");
    if (digit && index < 5) {
      otpInputs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputs.current[index - 1]?.focus();
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = Array.from({ length: 6 }, (_, i) => pasted[i] || "");
    setOtpDigits(next);
    setOtpError("");
    const focusIndex = Math.min(pasted.length, 5);
    otpInputs.current[focusIndex]?.focus();
  }

  async function handleResendOtp() {
    if (otpSeconds > 0 || isVerifyingOtp) return;
    setIsVerifyingOtp(true);
    setOtpError("");
    try {
      const { fetchApi } = await import("@/lib/api-client");
      const res = await fetchApi<{
        message: string;
        expires_in_seconds: number;
        otp_code?: string;
      }>("/auth/register/send-otp", {
        method: "POST",
        body: JSON.stringify({ phone, email }),
      });
      setDevelopmentCode(res.otp_code || "");
      setOtpDigits(["", "", "", "", "", ""]);
      setOtpSeconds(60);
      otpInputs.current[0]?.focus();
    } catch (err: any) {
      setOtpError(err.message || "Không thể gửi lại mã OTP. Vui lòng thử lại.");
    } finally {
      setIsVerifyingOtp(false);
    }
  }

  async function handleVerifyAndRegister(event?: React.FormEvent) {
    if (event) event.preventDefault();
    const code = otpDigits.join("");
    if (code.length !== 6) {
      setOtpError("Vui lòng nhập đủ mã OTP gồm 6 chữ số.");
      return;
    }
    setOtpError("");
    setIsVerifyingOtp(true);
    try {
      const { fetchApi, setAuthToken } = await import("@/lib/api-client");

      await fetchApi<{ message: string; user_id: string }>("/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          phone,
          password,
          address: address || null,
          otp_code: code,
        }),
      });

      const loginRes = await fetchApi<{
        access_token: string;
        token_type: string;
        is_new_user?: boolean;
        is_profile_complete?: boolean;
        user: {
          id: string;
          name: string;
          phone?: string;
          address?: string;
          is_new_user?: boolean;
          is_profile_complete?: boolean;
        };
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email || phone, password }),
      });

      if (loginRes.access_token) {
        setAuthToken(loginRes.access_token, loginRes.user);
        if (loginRes.is_profile_complete === false || loginRes.user?.is_profile_complete === false) {
          router.push("/complete-profile");
        } else {
          router.push("/home");
        }
        router.refresh();
      } else {
        setOtpError("Đăng ký thành công nhưng không thể tự động đăng nhập. Vui lòng đăng nhập lại.");
      }
    } catch (err: any) {
      setOtpError(err.message || "Mã OTP không chính xác hoặc đã hết hạn.");
    } finally {
      setIsVerifyingOtp(false);
    }
  }

  async function handleCredentials(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const valid = isLogin
      ? validate({ phone, password }, {
        phone: rules.phone({ required: true }),
        password: rules.loginPassword(),
      })
      : validate({ name, email, phone, address, password, confirmPassword, acceptTerms }, {
        name: rules.name(),
        email: rules.email(),
        phone: rules.phone({ required: true }),
        address: rules.maxLength("Địa chỉ", 255),
        password: strongPasswordRule(),
        confirmPassword: [
          rules.required("Mật khẩu xác nhận"),
          rules.matches(() => password, "Mật khẩu xác nhận không khớp với mật khẩu đã nhập."),
        ],
        acceptTerms: (checked) => (checked ? undefined : "Bạn cần đồng ý với Điều khoản sử dụng để tạo tài khoản."),
      });
    if (!valid) return;

    setLoadingProvider("credentials");
    try {
      const { fetchApi, setAuthToken } = await import("@/lib/api-client");

      if (!isLogin) {
        const res = await fetchApi<{
          message: string;
          expires_in_seconds: number;
          otp_code?: string;
        }>("/auth/register/send-otp", {
          method: "POST",
          body: JSON.stringify({ phone, email }),
        });
        setDevelopmentCode(res.otp_code || "");
        setOtpDigits(["", "", "", "", "", ""]);
        setOtpSeconds(60);
        setOtpError("");
        setStep("otp");
        setTimeout(() => otpInputs.current[0]?.focus(), 100);
        return;
      }

      const loginRes = await fetchApi<{
        access_token: string;
        token_type: string;
        is_new_user?: boolean;
        is_profile_complete?: boolean;
        user: { id: string; name: string; phone?: string; address?: string; is_new_user?: boolean; is_profile_complete?: boolean };
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email || phone, password }),
      });

      if (loginRes.access_token) {
        setAuthToken(loginRes.access_token, loginRes.user);
        if (loginRes.is_profile_complete === false || loginRes.user?.is_profile_complete === false) {
          router.push("/complete-profile");
        } else {
          router.push("/home");
        }
        router.refresh();
      } else {
        setFormError("Không thể đăng nhập. Vui lòng kiểm tra lại thông tin.");
      }
    } catch (err: any) {
      // Lỗi định dạng từ API hiện ngay dưới ô tương ứng; lỗi khác hiện ở đầu form
      if (!fromApi(err, isLogin ? { email: "phone" } : {})) {
        setFormError(err.message || "Máy chủ không thể xử lý yêu cầu. Vui lòng thử lại.");
      }
    } finally {
      setLoadingProvider(null);
    }
  }

  const isBusy = Boolean(loadingProvider) || isVerifyingOtp;

  if (step === "otp") {
    return (
      <div className="responsive-container bg-surface text-on-background font-sans selection:bg-primary/20 selection:text-primary">
        <main className="responsive-card px-margin-mobile py-lg">
          <div className="mb-7 responsive-header">
            <BrandLockup size={44} product="Cứu hộ & chăm sóc xe máy điện" />
            <h1 className="mt-7 text-2xl font-bold tracking-tight text-ink">
              Xác thực số điện thoại
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Nhập mã OTP gồm 6 chữ số đã được gửi đến số điện thoại{" "}
              <span className="font-semibold text-ink">{phone}</span>
            </p>
          </div>

          {otpError && (
            <div
              role="alert"
              className="mb-md p-sm bg-error-container text-on-error-container border border-error/20 rounded-xl text-sm font-semibold flex items-center gap-xs"
            >
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{otpError}</span>
            </div>
          )}

          {developmentCode && (
            <div className="mb-md p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-xl text-xs text-amber-800 dark:text-amber-200 text-center">
              Mã OTP thử nghiệm:{" "}
              <strong className="font-mono text-base tracking-widest ml-1">{developmentCode}</strong>
            </div>
          )}

          <form onSubmit={handleVerifyAndRegister} className="space-y-md">
            <div className="grid grid-cols-6 gap-2 my-4">
              {otpDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    otpInputs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className="w-full h-14 text-center text-xl font-bold bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  aria-label={`Số OTP thứ ${index + 1}`}
                />
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-on-surface-variant">
              <span>Không nhận được mã?</span>
              {otpSeconds > 0 ? (
                <span className="text-slate-500 font-medium">Gửi lại sau {otpSeconds}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isVerifyingOtp}
                  className="font-semibold text-primary hover:underline cursor-pointer disabled:opacity-50"
                >
                  Gửi lại mã OTP
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isVerifyingOtp || otpDigits.join("").length !== 6}
              className="w-full h-14 bg-primary text-on-primary font-headline-md text-headline-md rounded-xl shadow-md active:scale-[0.98] transition-transform disabled:opacity-60 cursor-pointer"
            >
              {isVerifyingOtp ? "Đang xác thực..." : "Xác nhận & Hoàn tất"}
            </button>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => {
                  setStep("form");
                  setOtpError("");
                }}
                disabled={isVerifyingOtp}
                className="text-sm font-semibold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Quay lại chỉnh sửa thông tin</span>
              </button>
            </div>
          </form>
        </main>
      </div>
    );
  }

  return (
    <div className="responsive-container bg-surface text-on-background font-sans selection:bg-primary/20 selection:text-primary">
      <main className="responsive-card px-margin-mobile py-lg">
        <div className="mb-7 responsive-header">
          <BrandLockup size={44} product="Cứu hộ & chăm sóc xe máy điện" />
          <h1 className="mt-7 text-2xl font-bold tracking-tight text-ink">
            {isLogin ? "Đăng nhập" : "Tạo tài khoản"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {isLogin ? "Gọi cứu hộ, đặt lịch sửa chữa và theo dõi xe của bạn." : "Chỉ mất một phút để bắt đầu."}
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mb-md p-sm bg-error-container text-on-error-container border border-error/20 rounded-xl text-sm font-semibold flex items-center gap-xs"
          >
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{errorMessage}</span>
          </div>
        )}
        {resetSuccess && !errorMessage && (
          <div
            role="status"
            className="mb-md p-sm bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-semibold"
          >
            Mật khẩu đã được cập nhật. Bạn có thể đăng nhập bằng mật khẩu mới.
          </div>
        )}

        <form className="space-y-md" onSubmit={handleCredentials} noValidate>
          {!isLogin && (
            <div className="flex flex-col gap-xs">
              <label className="font-label-lg text-label-lg text-on-surface-variant" htmlFor="name">
                Họ và tên
              </label>
              <div className="relative">
                <UserRound
                  aria-hidden="true"
                  className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-outline pointer-events-none"
                />
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Nguyễn Văn A"
                  maxLength={100}
                  value={name}
                  {...inputProps("name")}
                  onChange={(event) => {
                    setName(event.target.value);
                    clearError("name");
                  }}
                  className="w-full h-14 pl-12 pr-md bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
              <FieldError id="name-error" message={errors.name} />
            </div>
          )}

          {!isLogin && (
            <div className="flex flex-col gap-xs">
              <label className="font-label-lg text-label-lg text-on-surface-variant" htmlFor="email">
                Email
              </label>
              <div className="relative">
                <Mail
                  aria-hidden="true"
                  className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-outline pointer-events-none"
                />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="example@gmail.com"
                  maxLength={100}
                  value={email}
                  {...inputProps("email")}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    clearError("email");
                  }}
                  className="w-full h-14 pl-12 pr-md bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
              <FieldError id="email-error" message={errors.email} />
            </div>
          )}

          <div className="flex flex-col gap-xs">
            <label className="font-label-lg text-label-lg text-on-surface-variant" htmlFor="phone">
              Số điện thoại
            </label>
            <div className="relative">
              <Phone
                aria-hidden="true"
                className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-outline pointer-events-none"
              />
              <input
                id="phone"
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
                className="w-full h-14 pl-12 pr-md bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <FieldError id="phone-error" message={errors.phone} />
          </div>

          {!isLogin && (
            <div className="flex flex-col gap-xs">
              <label className="font-label-lg text-label-lg text-on-surface-variant" htmlFor="address">
                Địa chỉ
              </label>
              <div className="relative">
                <MapPin
                  aria-hidden="true"
                  className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-outline pointer-events-none"
                />
                <input
                  id="address"
                  type="text"
                  autoComplete="street-address"
                  maxLength={255}
                  placeholder="Ví dụ: 123 Nguyễn Trãi, Q.1, TP.HCM"
                  value={address}
                  {...inputProps("address")}
                  onChange={(event) => {
                    setAddress(event.target.value);
                    clearError("address");
                  }}
                  className="w-full h-14 pl-12 pr-md bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
              <FieldError id="address-error" message={errors.address} />
            </div>
          )}

          <div className="flex flex-col gap-xs">
            <label className="font-label-lg text-label-lg text-on-surface-variant" htmlFor="password">
              Mật khẩu
            </label>
            <div className="relative">
              <LockKeyhole
                aria-hidden="true"
                className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-outline pointer-events-none"
              />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete={isLogin ? "current-password" : "new-password"}
                placeholder="Abc123456@"
                maxLength={72}
                value={password}
                {...inputProps("password")}
                onChange={(event) => {
                  setPassword(event.target.value);
                  clearError("password");
                }}
                className="w-full h-14 pl-12 pr-14 bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 grid place-items-center text-outline"
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? (
                  <EyeOff aria-hidden="true" className="size-5" />
                ) : (
                  <Eye aria-hidden="true" className="size-5" />
                )}
              </button>
            </div>
            <FieldError id="password-error" message={errors.password} />
            {!isLogin && !errors.password && (
              <p className="text-xs leading-5 text-on-surface-variant">
                Ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.
              </p>
            )}
            {isLogin && (
              <div className="mt-xs text-right">
                <Link href="/forgot-password" className="text-sm font-semibold text-primary hover:underline">
                  Quên mật khẩu?
                </Link>
              </div>
            )}
          </div>

          {!isLogin && (
            <>
              <div className="flex flex-col gap-xs">
                <label className="font-label-lg text-label-lg text-on-surface-variant" htmlFor="confirmPassword">
                  Xác nhận mật khẩu
                </label>
                <div className="relative">
                  <ShieldCheck
                    aria-hidden="true"
                    className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-outline pointer-events-none"
                  />
                  <input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Abc123456@"
                    maxLength={72}
                    value={confirmPassword}
                    {...inputProps("confirmPassword")}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value);
                      clearError("confirmPassword");
                    }}
                    className="w-full h-14 pl-12 pr-md bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <FieldError id="confirmPassword-error" message={errors.confirmPassword} />
              </div>
              <div>
                <label className="flex items-start gap-sm text-sm text-on-surface-variant">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    {...inputProps("acceptTerms")}
                    onChange={(event) => {
                      setAcceptTerms(event.target.checked);
                      clearError("acceptTerms");
                    }}
                    className="mt-1 accent-primary"
                  />
                  <span>Tôi đồng ý với Điều khoản sử dụng và Chính sách bảo mật.</span>
                </label>
                <FieldError id="acceptTerms-error" message={errors.acceptTerms} />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={isBusy}
            className="w-full h-14 bg-primary text-on-primary font-headline-md text-headline-md rounded-xl shadow-md active:scale-[0.98] transition-transform disabled:opacity-60 cursor-pointer"
          >
            {loadingProvider === "credentials"
              ? isLogin
                ? "Đang xử lý..."
                : "Đang gửi mã OTP..."
              : isLogin
                ? "Đăng nhập"
                : "Tiếp tục xác thực OTP"}
          </button>
        </form>

        <p className="mt-lg text-center text-sm text-on-surface-variant">
          {isLogin ? "Chưa có tài khoản?" : "Đã có tài khoản?"}{" "}
          <Link href={isLogin ? "/register" : "/login"} className="font-semibold text-primary hover:underline">
            {isLogin ? "Đăng ký" : "Đăng nhập"}
          </Link>
        </p>
      </main>
    </div>
  );
}
