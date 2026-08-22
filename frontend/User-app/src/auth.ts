import NextAuth from "next-auth";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import type { Provider } from "next-auth/providers";
import { importPKCS8, SignJWT } from "jose";
import { verifyPassword } from "@/services/password";
import { findUserByPhone } from "@/services/user-db";

async function createAppleClientSecret() {
  const clientId = process.env.AUTH_APPLE_ID;
  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const privateKey = process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientId || !teamId || !keyId || !privateKey) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const signingKey = await importPKCS8(privateKey, "ES256");

  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt(now)
    .setExpirationTime(now + 5 * 60)
    .setAudience("https://appleid.apple.com")
    .setSubject(clientId)
    .sign(signingKey);
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

        const user = findUserByPhone(phone);
        if (!user || !(await verifyPassword(password, user.passwordHash))) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
        };
      },
    }),
  ];
  const googleId = process.env.AUTH_GOOGLE_ID;
  const googleSecret = process.env.AUTH_GOOGLE_SECRET;

  if (googleId && googleSecret) {
    providers.push(Google({ clientId: googleId, clientSecret: googleSecret }));
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
    trustHost: true,
    providers,
    pages: {
      signIn: "/login",
      error: "/login",
    },
    session: {
      strategy: "jwt",
    },
    callbacks: {
      authorized({ auth: session }) {
        return Boolean(session?.user);
      },
    },
  };
});
