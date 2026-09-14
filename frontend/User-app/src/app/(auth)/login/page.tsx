import { Suspense } from "react";
import { SocialAuthCard } from "@/components/auth/social-auth-card";

export default function LoginPage() {
  const googleReady = Boolean(
    process.env.AUTH_GOOGLE_ID &&
      process.env.AUTH_GOOGLE_SECRET &&
      !process.env.AUTH_GOOGLE_ID.includes("replace_with"),
  );
  const appleReady = Boolean(
    process.env.AUTH_APPLE_ID &&
      process.env.APPLE_TEAM_ID &&
      process.env.APPLE_KEY_ID &&
      process.env.APPLE_PRIVATE_KEY &&
      !process.env.AUTH_APPLE_ID.includes("replace_with"),
  );
  const availableProviders = {
    google: googleReady,
    apple: appleReady,
  };

  return (
    <Suspense fallback={null}>
      <SocialAuthCard mode="login" availableProviders={availableProviders} />
    </Suspense>
  );
}
