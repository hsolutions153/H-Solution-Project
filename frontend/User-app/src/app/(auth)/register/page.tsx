import { Suspense } from "react";
import { SocialAuthCard } from "@/components/auth/social-auth-card";

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <SocialAuthCard mode="register" />
    </Suspense>
  );
}
