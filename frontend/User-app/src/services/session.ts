import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function unauthorizedIfNoSession() {
  const session = await auth();
  return session?.user
    ? null
    : NextResponse.json({ message: "Bạn chưa đăng nhập." }, { status: 401 });
}
