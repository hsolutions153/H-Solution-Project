const BASE_URL = "/v1";

export const api = {
  async get<T = unknown>(
    url: string,
    config?: { params?: Record<string, string | number | boolean | undefined | null> }
  ): Promise<{ data: T }> {
    let query = "";
    if (config?.params) {
      const filtered = Object.entries(config.params).filter(
        ([, v]) => v !== undefined && v !== null
      );
      if (filtered.length > 0) {
        query =
          "?" +
          new URLSearchParams(
            filtered.map(([k, v]) => [k, String(v)])
          ).toString();
      }
    }

    const res = await fetch(`${BASE_URL}${url}${query}`, {
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
    const data = await res.json();
    return { data };
  },

  async post<T = unknown>(url: string, body?: unknown): Promise<{ data: T }> {
    const res = await fetch(`${BASE_URL}${url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
    const data = await res.json();
    return { data };
  },

  async patch<T = unknown>(url: string, body?: unknown): Promise<{ data: T }> {
    const res = await fetch(`${BASE_URL}${url}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
    const data = await res.json();
    return { data };
  },

  async delete<T = unknown>(url: string): Promise<{ data: T }> {
    const res = await fetch(`${BASE_URL}${url}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
    const data = await res.json().catch(() => ({}));
    return { data };
  },
};
