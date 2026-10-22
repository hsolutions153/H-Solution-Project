"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  LogOut,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { EMobiCareLogoIcon } from "@/components/brand/emobi-care-logo";
import {
  fetchApi,
  getAuthToken,
  getUserInfo,
  removeAuthToken,
  updateUserInfo,
} from "@/lib/api-client";
import { digitsOnly } from "@/utils/auth-validation";
import { FieldError, rules, useFieldErrors } from "@h-mobility/ui";
import { PageLoader } from "@/components/motion/page-loader";

export default function CompleteProfilePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const { errors, validate, fromApi, clearError, inputProps } = useFieldErrors();

  useEffect(() => {
    let isMounted = true;

    async function init() {
      let token = getAuthToken();

      // Kiểm tra phiên đăng nhập nếu chưa có token trong localStorage
      if (!token) {
        try {
          const res = await fetch("/api/auth/session");
          if (res.ok) {
            const session = await res.json();
            if (session?.accessToken) {
              const { setAuthToken } = await import("@/lib/api-client");
              setAuthToken(session.accessToken, session.backendUser);
              token = session.accessToken;
            }
          }
        } catch (err) {
          console.warn("Lỗi kiểm tra phiên đăng nhập:", err);
        }
      }

      if (!token) {
        if (isMounted) router.replace("/login");
        return;
      }

      // Điền trước thông tin từ bộ nhớ đệm hoặc API
      const cached = getUserInfo();
      if (cached) {
        if (cached.name) setName(cached.name);
        if (cached.email) setEmail(cached.email);
        if (cached.phone && cached.is_profile_complete) setPhone(cached.phone);
        if (cached.address && cached.address !== "Chưa cập nhật") setAddress(cached.address);
      }

      try {
        const customer = await fetchApi<any>("/customers/me");
        if (customer && isMounted) {
          if (customer.full_name) setName(customer.full_name);
          if (customer.email) setEmail(customer.email);
          if (customer.address && customer.address !== "Chưa cập nhật") {
            setAddress(customer.address);
          }
          if (customer.phone && customer.is_profile_complete) {
            setPhone(customer.phone);
          }

          // Nếu đã hoàn tất hồ sơ thì chuyển hướng về trang chủ
          if (
            customer.is_profile_complete &&
            customer.address &&
            customer.address !== "Chưa cập nhật" &&
            customer.phone
          ) {
            updateUserInfo({
              is_profile_complete: true,
              is_new_user: false,
            });
            router.replace("/home");
            return;
          }
        }
      } catch (err) {
        console.warn("Lỗi tải thông tin cá nhân:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");

    const trimmedName = name.trim();
    const cleanPhone = digitsOnly(phone.trim());
    const trimmedAddress = address.trim();

    const valid = validate(
      { name: trimmedName, phone: cleanPhone, address: trimmedAddress },
      {
        name: [
          rules.name(),
          (v) => (String(v).length < 2 ? "Họ và tên cần ít nhất 2 ký tự." : undefined),
        ],
        phone: rules.phone({ required: true }),
        address: [
          rules.required("Địa chỉ", 255),
          (v) =>
            String(v).length < 5
              ? "Địa chỉ quá ngắn. Nhập cụ thể số nhà, tên đường, phường/xã để kỹ thuật viên tìm đến."
              : undefined,
        ],
      },
    );
    if (!valid) return;

    setSubmitting(true);
    try {
      const updated = await fetchApi<any>("/customers/me", {
        method: "PATCH",
        body: JSON.stringify({
          full_name: trimmedName,
          phone: cleanPhone,
          address: trimmedAddress,
        }),
      });

      updateUserInfo({
        name: updated?.full_name || trimmedName,
        phone: updated?.phone || cleanPhone,
        address: updated?.address || trimmedAddress,
        is_profile_complete: true,
        is_new_user: false,
      });

      setSuccess(true);
      setTimeout(() => {
        router.replace("/home");
      }, 1000);
    } catch (err: any) {
      if (!fromApi(err, { full_name: "name" })) {
        setErrorMessage(err.message || "Không thể cập nhật thông tin. Vui lòng thử lại sau.");
      }
      setSubmitting(false);
    }
  }

  function handleLogout() {
    removeAuthToken();
    router.replace("/login?logged_out=1");
  }

  if (loading) {
    return (
      <PageLoader label="Đang tải thông tin tài khoản..." />
    );
  }

  return (
    <div className="responsive-container bg-background text-on-background font-sans selection:bg-primary/20 selection:text-primary">
      <main className="responsive-card px-margin-mobile py-lg w-full">
        <div className="flex flex-col items-center mb-lg text-center responsive-header w-full">
          <div className="mb-2 inline-flex items-center gap-2 px-3 py-1 bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 rounded-full">
            <EMobiCareLogoIcon size={20} />
            <span className="text-xs font-extrabold tracking-wider text-brand-900 dark:text-brand-300 uppercase">
              V-HCARE
            </span>
          </div>
          <h1 className="font-headline-md text-headline-md text-on-surface">
            Bổ sung thông tin cá nhân
          </h1>
          <p className="text-xs text-on-surface-variant mt-1">
            Vui lòng hoàn tất thông tin để kích hoạt tài khoản và nhận hỗ trợ cứu hộ SOS xe điện tận nơi
          </p>
        </div>

        {errorMessage && (
          <div className="mb-md p-sm bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-medium flex items-start gap-2.5 w-full">
            <span className="material-symbols-outlined text-rose-500 text-[18px] shrink-0 mt-0.5">
              error
            </span>
            <span>{errorMessage}</span>
          </div>
        )}

        {success && (
          <div className="mb-md p-sm bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2.5 w-full">
            <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />
            <span>Cập nhật thành công! Đang chuyển vào ứng dụng...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-md w-full" noValidate>
          <div className="flex flex-col gap-xs w-full">
            <label className="font-label-lg text-label-lg text-on-surface-variant" htmlFor="name">
              Họ và tên <span className="text-rose-500">*</span>
            </label>
            <div className="relative w-full">
              <UserRound
                aria-hidden="true"
                className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-outline pointer-events-none"
              />
              <input
                id="name"
                type="text"
                maxLength={100}
                placeholder="Ví dụ: Nguyễn Văn A"
                value={name}
                {...inputProps("name")}
                onChange={(e) => {
                  setName(e.target.value);
                  clearError("name");
                }}
                className="w-full h-13.5 pl-12 pr-md bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm font-medium text-on-surface placeholder:text-outline"
              />
            </div>
            <FieldError id="name-error" message={errors.name} />
          </div>

          {email && (
            <div className="flex flex-col gap-xs w-full">
              <label className="font-label-lg text-label-lg text-on-surface-variant">
                Email liên kết
              </label>
              <div className="relative w-full">
                <Mail
                  aria-hidden="true"
                  className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-outline pointer-events-none"
                />
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full h-13.5 pl-12 pr-28 bg-surface-container-low border border-outline-variant/60 rounded-xl text-sm font-medium text-on-surface-variant cursor-not-allowed"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                  <ShieldCheck className="size-3" />
                  Đã liên kết
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-xs w-full">
            <label className="font-label-lg text-label-lg text-on-surface-variant" htmlFor="phone">
              Số điện thoại liên hệ <span className="text-rose-500">*</span>
            </label>
            <div className="relative w-full">
              <Phone
                aria-hidden="true"
                className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-outline pointer-events-none"
              />
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="0912345678"
                value={phone}
                {...inputProps("phone")}
                onChange={(e) => {
                  setPhone(digitsOnly(e.target.value));
                  clearError("phone");
                }}
                className="w-full h-13.5 pl-12 pr-md bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm font-medium text-on-surface placeholder:text-outline"
              />
            </div>
            <FieldError id="phone-error" message={errors.phone} />
            {!errors.phone && (
              <p className="text-[11px] text-on-surface-variant">
                Kỹ thuật viên sẽ liên hệ số này khi bạn bấm gọi cứu hộ khẩn cấp SOS.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-xs w-full">
            <label className="font-label-lg text-label-lg text-on-surface-variant" htmlFor="address">
              Địa chỉ của bạn <span className="text-rose-500">*</span>
            </label>
            <div className="relative w-full">
              <MapPin
                aria-hidden="true"
                className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-outline pointer-events-none"
              />
              <input
                id="address"
                type="text"
                maxLength={255}
                placeholder="Số nhà, tên đường, phường/xã, quận/huyện, TP"
                value={address}
                {...inputProps("address")}
                onChange={(e) => {
                  setAddress(e.target.value);
                  clearError("address");
                }}
                className="w-full h-13.5 pl-12 pr-md bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm font-medium text-on-surface placeholder:text-outline"
              />
            </div>
            <FieldError id="address-error" message={errors.address} />
            {!errors.address && (
              <p className="text-[11px] text-on-surface-variant">
                Địa chỉ để kỹ thuật viên đến bảo dưỡng hoặc sửa chữa xe tận nơi.
              </p>
            )}
          </div>

          <div className="pt-2 flex flex-col items-center gap-3 w-full">
            <button
              type="submit"
              disabled={submitting || success}
              className="w-full h-13 flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-semibold shadow-lg shadow-brand-500/25 transition active:scale-[0.99] disabled:opacity-70 disabled:pointer-events-none cursor-pointer"
            >
              {submitting ? (
                <>
                  <LoaderCircle className="size-5 animate-spin" />
                  <span>Đang lưu thông tin...</span>
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="size-5" />
                  <span>Hoàn tất! Đang chuyển hướng...</span>
                </>
              ) : (
                <>
                  <span>Hoàn tất & Vào ứng dụng</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-rose-500 py-1 transition cursor-pointer"
            >
              <LogOut className="size-3.5" />
              <span>Đổi tài khoản khác / Đăng xuất</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
