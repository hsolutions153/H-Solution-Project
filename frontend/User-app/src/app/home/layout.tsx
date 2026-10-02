"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/lib/api-client";
import "./home.css";
import "./device/device.css";

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      let token = getAuthToken();

      // Check if logged in via NextAuth (e.g. Google OAuth)
      if (!token) {
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
              backendUser.is_new_user = session.isNewUser ?? backendUser.is_new_user;
              backendUser.is_profile_complete = session.isProfileComplete ?? backendUser.is_profile_complete;
              setAuthToken(session.accessToken, backendUser);
              token = session.accessToken;
            }
          }
        } catch (err) {
          console.warn("Session sync error:", err);
        }
      }

      if (!token) {
        if (isMounted) router.replace("/login");
        return;
      }

      // Check if user has completed their profile
      try {
        const { getUserInfo, fetchApi, updateUserInfo } = await import("@/lib/api-client");
        const user = getUserInfo();

        if (user && (user.is_new_user || user.is_profile_complete === false)) {
          if (isMounted) router.replace("/complete-profile");
          return;
        }

        // Double check against /customers/me if address is missing or placeholder
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
        console.warn("Verify profile error:", err);
      }

      if (isMounted) setIsAuthenticated(true);
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [router]);

  // Show nothing while checking auth to prevent flash
  if (isAuthenticated === null) {
    return null;
  }

  return children;
}
