import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { Provider } from "next-auth/providers";

export const { handlers, auth, signIn, signOut } = NextAuth(async () => {
  const providers: Provider[] = [
    Credentials({
      credentials: {
        phone: { label: "Số điện thoại", type: "tel" },
        password: { label: "Mật khẩu", type: "password" },
      },
      async authorize(credentials) {
        const phone =
          typeof credentials.phone === "string"
            ? credentials.phone.trim()
            : "";
        const password =
          typeof credentials.password === "string" ? credentials.password : "";

        if (!phone || !password || password.length > 128) return null;

        return {
          id: "USER-1",
          name: "Người dùng",
          email: "user@example.com",
        };
      },
    }),
  ];
  return {
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "h-solution-nextauth-secret-key-2026",
    trustHost: true,
    logger: {
      error(error: any) {
        const errorStr = String(error?.message || error?.cause || error);
        if (
          error?.name === "JWTSessionError" ||
          error?.code === "JWTSessionError" ||
          errorStr.includes("no matching decryption secret")
        ) {
          return;
        }
        console.error("Lỗi xác thực NextAuth:", error);
      },
    },
    providers,
    pages: {
      signIn: "/login",
      error: "/login",
    },
    session: {
      strategy: "jwt",
    },
    callbacks: {
      async jwt({ token }) {
        return token;
      },
      async session({ session, token }) {
        if (token?.accessToken) {
          (session as any).accessToken = token.accessToken;
          (session as any).refreshToken = token.refreshToken;
          (session as any).backendUser = token.backendUser;
          (session as any).isNewUser = token.isNewUser;
          (session as any).isProfileComplete = token.isProfileComplete;
        }
        return session;
      },
      authorized({ auth: session }) {
        return Boolean(session?.user);
      },
    },
  };
});
