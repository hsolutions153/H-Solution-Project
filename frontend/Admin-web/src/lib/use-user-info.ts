"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { UserSession } from "./api-client";

function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener("session-changed", listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener("session-changed", listener);
  };
}

export function useUserInfo(): UserSession | null {
  const raw = useSyncExternalStore(subscribe, () => localStorage.getItem("user_info"), () => null);
  return useMemo(() => {
    try { return raw ? JSON.parse(raw) as UserSession : null; }
    catch { return null; }
  }, [raw]);
}
