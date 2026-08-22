"use client";

import { signOut } from "next-auth/react";
import { useEffect } from "react";

export default function LogoutPage() {
  useEffect(() => {
    void signOut({ redirectTo: "/login" });
  }, []);

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
