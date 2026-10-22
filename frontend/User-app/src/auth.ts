import NextAuth from "next-auth";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import type { Provider } from "next-auth/providers";
import { importPKCS8, SignJWT } from "jose";

async function createAppleClientSecret() {
  const clientId = process.env.AUTH_APPLE_ID;
  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const privateKey = process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientId || !teamId || !keyId || !privateKey) {
    return null;
  }

  try {
    const now = Math.floor(Date.now() / 1000);
    const signingKey = await importPKCS8(privateKey, "ES256");

    return await new SignJWT({})
      .setProtectedHeader({ alg: "ES256", kid: keyId })
      .setIssuer(teamId)
      .setIssuedAt(now)
      .setExpirationTime(now + 5 * 60)
      .setAudience("https://appleid.apple.com")
      .setSubject(clientId)
      .sign(signingKey);
  } catch (error) {
    // Khóa Apple sai không được làm hỏng toàn bộ NextAuth, chỉ bỏ qua provider Apple.
    console.error("APPLE_PRIVATE_KEY không hợp lệ, bỏ qua đăng nhập Apple:", error);
    return null;
  }
}

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
  const googleId = process.env.AUTH_GOOGLE_ID;
  const googleSecret = process.env.AUTH_GOOGLE_SECRET;

  if (googleId && googleSecret) {
    providers.push(
      Google({
        clientId: googleId,
        clientSecret: googleSecret,
        authorization: {
          params: {
            prompt: "select_account",
            access_type: "offline",
            response_type: "code",
          },
        },
      }),
    );
  }

  const appleClientSecret = await createAppleClientSecret();
  if (process.env.AUTH_APPLE_ID && appleClientSecret) {
    providers.push(
      Apple({
        clientId: process.env.AUTH_APPLE_ID,
        clientSecret: appleClientSecret,
      }),
    );
  }

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
      async jwt({ token, account }) {
        if (account?.provider === "google") {
          if (!account.id_token) throw new Error("Thiếu thông tin xác minh Google.");
          try {
            const apiUrl = process.env.API_URL || "";
            const res = await fetch(`${apiUrl}/auth/google`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id_token: account.id_token,
              }),
            });
            if (res.ok) {
              const data = await res.json();
              token.accessToken = data.access_token;
              token.refreshToken = data.refresh_token;
              token.backendUser = data.user;
              token.isNewUser = data.is_new_user;
              token.isProfileComplete = data.is_profile_complete;
            } else {
              throw new Error("Không thể xác minh tài khoản Google.");
            }
          } catch (err) {
            console.error("Lỗi gọi API đăng nhập Google backend:", err);
            throw new Error("Không thể hoàn tất đăng nhập Google.");
          }
        }
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
