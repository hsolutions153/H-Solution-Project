import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await auth();
  const refreshToken = (session as { refreshToken?: string } | null)?.refreshToken;
  if (!refreshToken) {
    return NextResponse.json({ message: "Không có phiên xác thực để khởi tạo" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("refresh_token_customer", refreshToken, {
    httpOnly: true,
    secure: process.env.APP_ENV?.toLowerCase() === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/v1/auth",
  });
  return response;
}
