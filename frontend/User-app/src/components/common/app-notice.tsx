"use client";

import { useEffect, useState } from "react";

type NoticeDetail = { message?: string };

export function AppNotice() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    const onNotice = (event: Event) => {
      const detail = (event as CustomEvent<NoticeDetail>).detail;
      if (detail?.message) setMessage(detail.message);
    };
    window.addEventListener("APP_NOTICE", onNotice);
    return () => window.removeEventListener("APP_NOTICE", onNotice);
  }, []);

  if (!message) return null;
  return (
    <div className="fixed inset-x-4 bottom-5 z-[70] mx-auto flex max-w-[32rem] items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 shadow-lg" role="alert">
      <p className="min-w-0 flex-1 leading-relaxed">{message}</p>
      <button type="button" className="shrink-0 rounded-md px-1 text-rose-700 hover:bg-rose-100" onClick={() => setMessage("")} aria-label="Đóng thông báo">
        ×
      </button>
    </div>
  );
}

export function showAppNotice(message: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("APP_NOTICE", { detail: { message } }));
  }
}
