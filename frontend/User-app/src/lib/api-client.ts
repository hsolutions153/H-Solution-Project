import { fetchAllPages } from "@h-mobility/ui";

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";
}

export interface UserSession {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  role?: string;
  address?: string;
  avatar_url?: string;
  is_new_user?: boolean;
  is_profile_complete?: boolean;
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export function setAuthToken(token: string, user?: UserSession): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("access_token", token);
  if (user) {
    localStorage.setItem("user_info", JSON.stringify(user));
  }
}

export function updateUserInfo(partial: Partial<UserSession>): void {
  if (typeof window === "undefined") return;
  const current = getUserInfo() || ({} as UserSession);
  const updated = { ...current, ...partial };
  localStorage.setItem("user_info", JSON.stringify(updated));
}

export function removeAuthToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("access_token");
  localStorage.removeItem("user_info");
}

export function getUserInfo(): UserSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("user_info");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Only add Content-Type if body is not FormData
  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const baseUrl = getBaseUrl();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (err: any) {
    console.warn(`[Network/Fetch Error] ${endpoint}:`, err?.message || err);
    throw new ApiError(
      "Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng.",
      0,
      "NETWORK_ERROR"
    );
  }

  if (response.status === 204) {
    return {} as T;
  }

  const contentType = response.headers.get("content-type");
  let data: any = null;
  try {
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }
  } catch {
    data = null;
  }

  if (!response.ok) {
    const errorMsg =
      data?.detail?.message ||
      (typeof data?.detail === "string" ? data.detail : null) ||
      data?.message ||
      `Yêu cầu thất bại (${response.status})`;
    const errorCode = data?.detail?.code || data?.code;

    if (response.status === 401 && typeof window !== "undefined") {
      removeAuthToken();
    }

    throw new ApiError(errorMsg, response.status, errorCode);
  }

  return data as T;
}

export async function fetchApiPages<T>(endpoint: string): Promise<{ items: T[] }> {
  return { items: await fetchAllPages<T>((url) => fetchApi(url), endpoint) };
}
