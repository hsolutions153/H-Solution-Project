import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { CustomerMeResponse } from "@/services/profile";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ message: "Chưa đăng nhập" }, { status: 401 });
  }

  const body = await request.json();
  const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";

  // Map frontend fields (name -> full_name) to backend
  const payload: Record<string, unknown> = {};
  if (body.name !== undefined) payload.full_name = body.name;
  if (body.phone !== undefined) payload.phone = body.phone;
  if (body.email !== undefined) payload.email = body.email;
  if (body.address !== undefined) payload.address = body.address;

  try {
    const res = await fetch(`${backendUrl}/api/v1/customers/me`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let message = "Không thể cập nhật thông tin trên máy chủ";
      try {
        const errJson = await res.json();
        if (errJson.message) {
          message = errJson.message;
        } else if (errJson.detail) {
          message = typeof errJson.detail === "string" ? errJson.detail : JSON.stringify(errJson.detail);
        }
      } catch {
        // fallback
      }
      console.error("[api/profile] Backend update failed:", res.status, message);
      return NextResponse.json({ message }, { status: res.status });
    }

    const data = (await res.json()) as CustomerMeResponse;
    return NextResponse.json({
      data: {
        id: data.id,
        name: data.full_name ?? body.name,
        phone: data.phone ?? body.phone,
        email: data.email ?? body.email,
        address: data.address ?? body.address,
        avatar: body.avatar ?? "",
        notifications: body.notifications ?? true,
      },
    });
  } catch (error) {
    console.error("[api/profile] Exception:", error);
    return NextResponse.json(
      { message: "Lỗi kết nối máy chủ" },
      { status: 500 }
    );
  }
}
