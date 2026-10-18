export const PRESENCE_UPDATED_EVENT = "technician-presence-updated";

const PRESENCE_STORAGE_KEY = "technician_is_online";

export function getCachedPresence(): boolean | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(PRESENCE_STORAGE_KEY);
  if (stored === "true") return true;
  if (stored === "false") return false;
  return null;
}

export function setCachedPresence(isOnline: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PRESENCE_STORAGE_KEY, String(isOnline));
  window.dispatchEvent(
    new CustomEvent<boolean>(PRESENCE_UPDATED_EVENT, { detail: isOnline })
  );
}
