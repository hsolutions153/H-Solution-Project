import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, password, address } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "Vui lòng điền đầy đủ họ tên, email và mật khẩu." },
        { status: 400 },
      );
    }

    const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";

    const response = await fetch(`${backendUrl}/api/v1/auth/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: String(name).trim(),
        email: String(email).trim(),
        phone: phone ? String(phone).trim() : null,
        password: String(password),
        address: address ? String(address).trim() : null,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      let errorMessage = "Đăng ký tài khoản thất bại.";
      if (data?.detail) {
        if (typeof data.detail === "string") {
          errorMessage = data.detail;
        } else if (Array.isArray(data.detail) && data.detail.length > 0) {
          errorMessage = data.detail[0]?.msg || "Dữ liệu đăng ký không hợp lệ.";
        }
      } else if (data?.message) {
        errorMessage = data.message;
      }

      return NextResponse.json(
        { message: errorMessage },
        { status: response.status },
      );
    }

    return NextResponse.json(
      {
        message: data?.message || "Đăng ký tài khoản thành công",
        user_id: data?.user_id,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[register] Error calling backend signup:", error);
    return NextResponse.json(
      { message: "Không thể kết nối đến máy chủ backend. Vui lòng thử lại sau." },
      { status: 500 },
    );
  }
}
