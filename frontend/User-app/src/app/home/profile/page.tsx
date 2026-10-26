import { ProfileScreen } from "@/components/profile/profile-screen";
import { HomeShell } from "@/components/home/home-shell";
import "./profile.css";

export const dynamic = "force-dynamic";

export default function ProfilePage() {
  const profile = {
    id: "",
    name: "Người dùng",
    email: "",
    phone: "",
    address: "",
    avatar: "",
    notifications: true,
  };

  return (
    <HomeShell activeNav="profile" hideHeader mainClassName="home-content--profile">
      <ProfileScreen initialProfile={profile} mode="view" />
    </HomeShell>
  );
}
