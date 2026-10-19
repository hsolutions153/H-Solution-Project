import { fetchAllPages, describeApiIssues } from "@h-mobility/ui";

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || "";
}

// Tên vai trò dùng để backend chọn cookie refresh tương ứng với app này
const REFRESH_ROLE = "admin";

export interface UserSession {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  role?: string;
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
    window.dispatchEvent(new Event("session-changed"));
  }
}

export function removeAuthToken(): void {
  if (typeof window === "undefined") return;
  if (getAuthToken()) {
    // Thu hồi refresh token (cookie httpOnly) trên server, không chờ kết quả
    fetch(`${getBaseUrl()}/auth/logout?role=${REFRESH_ROLE}`, {
      method: "POST",
      credentials: "include",
      keepalive: true,
    }).catch(() => {});
  }
  localStorage.removeItem("access_token");
  localStorage.removeItem("user_info");
  window.dispatchEvent(new Event("session-changed"));
}

let refreshPromise: Promise<boolean> | null = null;

// Làm mới access token bằng cookie refresh, dùng chung một promise để tránh gọi trùng
async function refreshAccessToken(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${getBaseUrl()}/auth/refresh?role=${REFRESH_ROLE}`, {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) return false;
        const data = await res.json();
        localStorage.setItem("access_token", data.access_token);
        return true;
      } catch {
        return false;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
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
  /** 422 issues from the API: [{ field, message, type }]. Forms map them onto inputs. */
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
  retried = false
): Promise<T> {
  const token = getAuthToken();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Không gắn Content-Type nếu body là FormData
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
      credentials: "include",
      ...options,
      headers,
    });
  } catch (err: unknown) {
    console.warn(`[Lỗi kết nối API] ${endpoint}:`, err instanceof Error ? err.message : err);
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
  let data: {
    detail?: { message?: string; code?: string; details?: unknown } | string;
    message?: string;
    code?: string;
    details?: unknown;
  } | null = null;
  try {
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = { message: await response.text() };
    }
  } catch {
    data = null;
  }

  if (!response.ok) {
    const errorMsg =
      (typeof data?.detail === "object" ? data.detail?.message : null) ||
      (typeof data?.detail === "string" ? data.detail : null) ||
      data?.message ||
      `Yêu cầu thất bại (${response.status})`;
    const errorCode = (typeof data?.detail === "object" ? data.detail?.code : undefined) || data?.code;
    const errorDetails = data?.details ?? (typeof data?.detail === "object" ? data.detail?.details : undefined);

    const canRefresh =
      response.status === 401 &&
      typeof window !== "undefined" &&
      !retried &&
      !endpoint.startsWith("/auth/") &&
      !(options.headers as Record<string, string> | undefined)?.["Authorization"] &&
      Boolean(token);

    if (canRefresh) {
      // Tab khác có thể đã làm mới token rồi, khi đó chỉ cần thử lại
      const alreadyRefreshed = getAuthToken() !== token;
      if (alreadyRefreshed || (await refreshAccessToken())) {
        return fetchApi<T>(endpoint, options, true);
      }
    }

    if (response.status === 401 && typeof window !== "undefined") {
      removeAuthToken();
    }

    // Lỗi 422: nêu rõ trường nào sai và sai thế nào thay vì câu chung chung
    throw new ApiError(describeApiIssues(errorDetails) || errorMsg, response.status, errorCode, errorDetails);
  }

  return data as T;
}

export async function fetchApiPages<T>(endpoint: string): Promise<{ items: T[] }> {
  return { items: await fetchAllPages<T>((url) => fetchApi(url), endpoint) };
}
