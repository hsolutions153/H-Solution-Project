export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  avatar: string;
  notifications: boolean;
}

export interface CustomerMeResponse {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  address: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  avatar?: string;
}

export async function getProfile(
  accessToken?: string,
  fallbackUser?: { name?: string | null; email?: string | null; phone?: string | null }
): Promise<UserProfile> {
  const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";

  if (accessToken) {
    try {
      const res = await fetch(`${backendUrl}/api/v1/customers/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (res.ok) {
        const data = (await res.json()) as CustomerMeResponse;
        return {
          id: data.id,
          name: data.full_name || fallbackUser?.name || "Khách hàng",
          phone: data.phone || fallbackUser?.phone || "",
          email: data.email || fallbackUser?.email || "",
          address: data.address || "",
          avatar: data.avatar || "",
          notifications: true,
        };
      } else {
        console.error("[profile] Failed to fetch /api/v1/customers/me:", res.status);
      }
    } catch (err) {
      console.error("[profile] Error calling /api/v1/customers/me:", err);
    }
  }

  return {
    name: fallbackUser?.name || "Khách hàng",
    phone: fallbackUser?.phone || "",
    email: fallbackUser?.email || "",
    address: "",
    avatar: "",
    notifications: true,
  };
}
