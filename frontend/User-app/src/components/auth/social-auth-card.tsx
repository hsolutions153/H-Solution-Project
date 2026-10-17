"use client";

import {
  digitsOnly,
  EMAIL_PATTERN,
  isStrongPassword,
  VIETNAM_PHONE_PATTERN,
} from "@/utils/auth-validation";
import { BrandLockup } from "@h-mobility/ui";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type SocialAuthCardProps = {
  mode: "login" | "register";
  availableProviders: {
    google: boolean;
    apple: boolean;
  };
};

const authErrors: Record<string, string> = {
  AccessDenied: "Bạn đã từ chối quyền đăng nhập.",
  Configuration: "Phương thức đăng nhập chưa được cấu hình đúng.",
  CredentialsSignin: "Số điện thoại hoặc mật khẩu không chính xác.",
  OAuthCallbackError: "Nhà cung cấp không thể hoàn tất đăng nhập.",
  OAuthAccountNotLinked: "Email này đã được liên kết với một phương thức đăng nhập khác.",
};

export function SocialAuthCard({
  mode,
  availableProviders,
}: SocialAuthCardProps) {
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

  const errorCode = searchParams.get("error");
  const oauthError = errorCode
    ? authErrors[errorCode] ?? "Đăng nhập không thành công. Vui lòng thử lại."
    : "";
  const resetSuccess = searchParams.get("reset") === "success";
  const errorMessage = formError || oauthError;
  const isLogin = mode === "login";

  // Kiểm tra phiên xác thực NextAuth (sau chuyển hướng Google OAuth)
  useEffect(() => {
    let isMounted = true;
    async function checkNextAuthSession() {
      if (searchParams.get("logged_out")) {
        const { removeAuthToken } = await import("@/lib/api-client");
        removeAuthToken();
        return;
      }
      try {
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const session = await res.json();
          if (session?.accessToken) {
            const { setAuthToken } = await import("@/lib/api-client");
            const backendUser = session.backendUser || {
              id: session.user?.id || "google-user",
              name: session.user?.name || "Khách hàng",
              email: session.user?.email,
            };
            const isProfileComplete = session.isProfileComplete ?? backendUser.is_profile_complete;
            const isNewUser = session.isNewUser ?? backendUser.is_new_user;

            backendUser.is_new_user = isNewUser;
            backendUser.is_profile_complete = isProfileComplete;

            setAuthToken(session.accessToken, backendUser);
            if (isMounted) {
              if (isNewUser || isProfileComplete === false) {
                router.push("/complete-profile");
              } else {
                router.push("/home");
              }
            }
          }
        }
      } catch { }
    }
    checkNextAuthSession();
    return () => {
      isMounted = false;
    };
  }, [router, searchParams]);

  async function handleCredentials(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!VIETNAM_PHONE_PATTERN.test(phone)) {
      setFormError("Số điện thoại phải gồm 10 chữ số và đúng đầu số Việt Nam.");
      return;
    }
    if (!isLogin && !EMAIL_PATTERN.test(email)) {
      setFormError("Email phải đúng định dạng, ví dụ: ten@example.com.");
      return;
    }
    if (!isLogin && !isStrongPassword(password)) {
      setFormError(
        "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.",
      );
      return;
    }
    if (!isLogin && password !== confirmPassword) {
      setFormError("Mật khẩu xác nhận không khớp.");
      return;
    }
    if (!isLogin && !acceptTerms) {
      setFormError("Bạn cần đồng ý với điều khoản sử dụng.");
      return;
    }

    setLoadingProvider("credentials");
    try {
      const { fetchApi, setAuthToken } = await import("@/lib/api-client");

      if (!isLogin) {
        await fetchApi<{ message: string; user_id: string }>("/auth/signup", {
          method: "POST",
          body: JSON.stringify({ name, email, phone, password, address }),
        });
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
      setFormError(err.message || "Máy chủ không thể xử lý yêu cầu. Vui lòng thử lại.");
    } finally {
      setLoadingProvider(null);
    }
  }

  async function handleSocialSignIn(provider: "google" | "apple") {
    if (!availableProviders[provider]) {
      setFormError(
        `${provider === "google" ? "Google" : "Apple"} chưa được cấu hình trên máy chủ.`,
      );
      return;
    }

    setFormError("");
    setLoadingProvider(provider);
    try {
      await signIn(provider, { callbackUrl: "/home" });
    } catch {
      setFormError("Không thể bắt đầu đăng nhập với nhà cung cấp này.");
      setLoadingProvider(null);
    }
  }

  const isBusy = Boolean(loadingProvider);

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

        <form className="space-y-md" onSubmit={handleCredentials}>
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
                  required
                  minLength={2}
                  maxLength={100}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full h-14 pl-12 pr-md bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
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
                  required
                  pattern="[^\s@]+@[^\s@]+\.[^\s@]{2,}"
                  title="Nhập email đúng định dạng, ví dụ: ten@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full h-14 pl-12 pr-md bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
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
                required
                pattern="0(?:3|5|7|8|9)[0-9]{8}"
                maxLength={10}
                title="Nhập số điện thoại Việt Nam, ví dụ 0912345678"
                placeholder="0912345678"
                value={phone}
                onChange={(event) => setPhone(digitsOnly(event.target.value))}
                className="w-full h-14 pl-12 pr-md bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
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
                  onChange={(event) => setAddress(event.target.value)}
                  className="w-full h-14 pl-12 pr-md bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
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
                required
                minLength={8}
                maxLength={128}
                pattern={isLogin ? undefined : "(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9\\s]).{8,128}"}
                title={
                  isLogin
                    ? undefined
                    : "Ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt"
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
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
            {!isLogin && (
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
                    required
                    minLength={8}
                    maxLength={128}
                    pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9\s]).{8,128}"
                    title="Ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="w-full h-14 pl-12 pr-md bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              </div>
              <label className="flex items-start gap-sm text-sm text-on-surface-variant">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(event) => setAcceptTerms(event.target.checked)}
                  className="mt-1 accent-primary"
                />
                <span>Tôi đồng ý với Điều khoản sử dụng và Chính sách bảo mật.</span>
              </label>
            </>
          )}

          <button
            type="submit"
            disabled={isBusy}
            className="w-full h-14 bg-primary text-on-primary font-headline-md text-headline-md rounded-xl shadow-md active:scale-[0.98] transition-transform disabled:opacity-60 cursor-pointer"
          >
            {loadingProvider === "credentials"
              ? "Đang xử lý..."
              : isLogin
                ? "Đăng nhập"
                : "Đăng ký"}
          </button>
        </form>

        <div className="flex items-center gap-md my-lg">
          <div className="grow h-px bg-outline-variant" />
          <span className="text-xs text-outline">HOẶC</span>
          <div className="grow h-px bg-outline-variant" />
        </div>

        <div className="grid grid-cols-2 gap-md">
          <button
            type="button"
            onClick={() => handleSocialSignIn("google")}
            disabled={isBusy || !availableProviders.google}
            title={
              availableProviders.google
                ? "Đăng nhập bằng Google"
                : "Google chưa được cấu hình"
            }
            className="flex items-center justify-center gap-sm h-14 border border-outline-variant rounded-xl bg-surface-container-lowest disabled:opacity-60 cursor-pointer"
          >
            <svg fill="none" height="24" viewBox="0 0 24 24" width="24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#7fb8da" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span>Google</span>
          </button>

          <button
            type="button"
            onClick={() => handleSocialSignIn("apple")}
            disabled={isBusy || !availableProviders.apple}
            title={
              availableProviders.apple
                ? "Đăng nhập bằng Apple"
                : "Apple chưa được cấu hình"
            }
            className="flex items-center justify-center gap-sm h-14 bg-black text-white rounded-xl disabled:opacity-60 cursor-pointer"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.79 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.1ZM12.03 7.25C11.88 5.02 13.69 3.18 15.77 3c.29 2.58-2.34 4.5-3.74 4.25Z" />
            </svg>
            <span>Apple</span>
          </button>
        </div>

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
