"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { removeAuthToken } from "@/lib/api-client";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    removeAuthToken();
    router.replace("/login?logged_out=1");
  }, [router]);

  return (
    <main className="min-h-screen grid place-items-center p-6 text-center">
      <div>
        <span className="material-symbols-outlined animate-spin text-3xl text-primary">
          progress_activity
        </span>
        <p className="mt-3 text-sm text-on-surface-variant">Đang đăng xuất...</p>
      </div>
    </main>
  );
}
