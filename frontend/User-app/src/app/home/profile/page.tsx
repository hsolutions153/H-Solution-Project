import { auth } from "@/auth";
import { ProfileScreen } from "@/components/profile/profile-screen";
import { getProfile } from "@/services/profile-db";
import "./profile.css";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  const email = session?.user?.email ?? "";
  const profile = getProfile(email, session?.user?.name ?? "User");

  return <ProfileScreen initialProfile={profile} mode="view" />;
}
