import { Suspense } from "react";
import { SocialAuthCard } from "@/components/auth/social-auth-card";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <SocialAuthCard mode="login" />
    </Suspense>
  );
}
