import { auth } from "@/auth";
import { ProfileScreen } from "@/components/profile/profile-screen";
import { getProfile } from "@/services/profile";
import "./profile.css";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  const profile = await getProfile(session?.accessToken, session?.user);

  return <ProfileScreen initialProfile={profile} mode="view" />;
}

