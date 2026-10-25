"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/lib/api-client";
import { PageLoader } from "@/components/motion/page-loader";
import "./home.css";
import "./device/device.css";
import { AppNotice } from "@/components/common/app-notice";

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      let token = getAuthToken();

      // Khôi phục access token từ refresh cookie khi mở lại app.
      if (!token) {
        const { refreshAccessToken } = await import("@/lib/api-client");
        await refreshAccessToken();
        token = getAuthToken();
      }

      if (!token) {
        if (isMounted) router.replace("/login");
        return;
      }

      // Kiểm tra hoàn thiện hồ sơ người dùng
      try {
        const { getUserInfo, fetchApi, updateUserInfo } = await import("@/lib/api-client");
        const user = getUserInfo();

        if (user && (user.is_new_user || user.is_profile_complete === false)) {
          if (isMounted) router.replace("/complete-profile");
          return;
        }

        // Đối soát lại thông tin từ API /customers/me
        if (!user?.address || user.address === "Chưa cập nhật" || !user?.phone || user.is_profile_complete === undefined) {
          const customer = await fetchApi<any>("/customers/me");
          if (customer) {
            const isComplete = Boolean(
              customer.address &&
              customer.address !== "Chưa cập nhật" &&
              customer.phone &&
              customer.is_profile_complete !== false
            );
            updateUserInfo({
              name: customer.full_name || customer.name || user?.name,
              phone: customer.phone,
              address: customer.address,
              avatar_url: customer.avatar_url || undefined,
              is_profile_complete: isComplete,
              is_new_user: !isComplete,
            });
            if (!isComplete) {
              if (isMounted) router.replace("/complete-profile");
              return;
            }
          }
        }
      } catch (err) {
        console.warn("Lỗi xác minh thông tin hồ sơ:", err);
      }

      if (isMounted) setIsAuthenticated(true);
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [router]);

  // Splash thay cho màn hình trắng trong lúc xác minh phiên đăng nhập
  if (isAuthenticated === null) {
    return <PageLoader label="Đang kiểm tra phiên đăng nhập..." />;
  }

  return <>{children}<AppNotice /></>;
}
