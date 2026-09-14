import NextAuth from "next-auth";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import type { Provider } from "next-auth/providers";
import { importPKCS8, SignJWT } from "jose";


interface TokenResponse {
  access_token: string;
  token_type: string;
  role_id: string;
  role: string;
  user: {
    id: string;
    name: string;
    phone?: string | null;
  };
}

async function createAppleClientSecret() {
  const clientId = process.env.AUTH_APPLE_ID;
  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const privateKey = process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (
    !clientId ||
    !teamId ||
    !keyId ||
    !privateKey ||
    clientId.includes("replace_with") ||
    teamId.includes("replace_with") ||
    keyId.includes("replace_with") ||
    privateKey.includes("replace_with")
  ) {
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
    console.warn("[auth] Failed to create Apple client secret:", error);
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

        console.log("[auth] Received login attempt for phone:", phone);

        if (!phone || !password || password.length > 128) {
          console.warn("[auth] Validation failed in authorize: invalid phone or password length.");
          return null;
        }

        const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";
        console.log("[auth] Forwarding to backend:", `${backendUrl}/api/v1/auth/login`);

        try {
          const res = await fetch(`${backendUrl}/api/v1/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone, password }),
          });

          console.log("[auth] Backend response status:", res.status);

          if (!res.ok) {
            const errorText = await res.text();
            console.error("[auth] Backend returned error:", res.status, errorText);
            return null;
          }

          const data = (await res.json()) as TokenResponse;
          console.log("[auth] Login successful for user:", data.user?.name, "(id:", data.user?.id, ")");

          return {
            id: data.user.id,
            name: data.user.name,
            phone: data.user.phone ?? phone,
            accessToken: data.access_token,
            role: data.role,
            roleId: data.role_id,
          };
        } catch (error) {
          console.error("[auth] Exception while calling backend login:", error);
          return null;
        }
      },
    }),
  ];
  const googleId = process.env.AUTH_GOOGLE_ID;
  const googleSecret = process.env.AUTH_GOOGLE_SECRET;

  if (
    googleId &&
    googleSecret &&
    !googleId.includes("replace_with") &&
    !googleSecret.includes("replace_with")
  ) {
    providers.push(Google({ clientId: googleId, clientSecret: googleSecret }));
  }

  const appleClientSecret = await createAppleClientSecret();
  if (
    process.env.AUTH_APPLE_ID &&
    !process.env.AUTH_APPLE_ID.includes("replace_with") &&
    appleClientSecret
  ) {
    providers.push(
      Apple({
        clientId: process.env.AUTH_APPLE_ID,
        clientSecret: appleClientSecret,
      }),
    );
  }

  return {
    debug: false,
    secret: process.env.AUTH_SECRET,
    trustHost: true,
    providers,
    pages: {
      signIn: "/login",
    },
    session: {
      strategy: "jwt",
    },
    callbacks: {
      authorized({ auth: session }) {
        return Boolean(session?.user);
      },
      jwt({ token, user }) {
        if (user) {
          // Persist backend token & role into the JWT
          token.accessToken = (user as Record<string, unknown>).accessToken as string;
          token.role = (user as Record<string, unknown>).role as string;
          token.roleId = (user as Record<string, unknown>).roleId as string;
          token.phone = (user as Record<string, unknown>).phone as string;
        }
        return token;
      },
      session({ session, token }) {
        session.accessToken = token.accessToken as string | undefined;
        if (session.user) {
          Object.assign(session.user, {
            role: token.role,
            roleId: token.roleId,
            phone: token.phone,
          });
        }
        return session;
      },
    },
  };
});
