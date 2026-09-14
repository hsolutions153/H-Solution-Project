const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const api = {
  async get<T = any>(
    url: string,
    config?: { params?: Record<string, any> }
  ): Promise<{ data: T }> {
    let query = "";
    if (config?.params) {
      const filtered = Object.entries(config.params).filter(
        ([_, v]) => v !== undefined && v !== null
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

  async post<T = any>(url: string, body?: any): Promise<{ data: T }> {
    const res = await fetch(`${BASE_URL}${url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
    const data = await res.json();
    return { data };
  },

  async patch<T = any>(url: string, body?: any): Promise<{ data: T }> {
    const res = await fetch(`${BASE_URL}${url}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
    const data = await res.json();
    return { data };
  },

  async delete<T = any>(url: string): Promise<{ data: T }> {
    const res = await fetch(`${BASE_URL}${url}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
    const data = await res.json().catch(() => ({}));
    return { data };
  },
};
