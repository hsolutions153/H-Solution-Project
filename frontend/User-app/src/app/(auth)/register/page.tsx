import { Suspense } from "react";
import { SocialAuthCard } from "@/components/auth/social-auth-card";

export default function RegisterPage() {
  const availableProviders = {
    google: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
    apple: Boolean(
      process.env.AUTH_APPLE_ID &&
        process.env.APPLE_TEAM_ID &&
        process.env.APPLE_KEY_ID &&
        process.env.APPLE_PRIVATE_KEY,
    ),
  };

  return (
    <Suspense fallback={null}>
      <SocialAuthCard mode="register" availableProviders={availableProviders} />
    </Suspense>
  );
}
