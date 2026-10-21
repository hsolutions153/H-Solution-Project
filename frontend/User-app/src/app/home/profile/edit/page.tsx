import { ProfileScreen } from "@/components/profile/profile-screen";
import "../profile.css";

export const dynamic = "force-dynamic";

export default function EditProfilePage() {
  const profile = {
    id: "",
    name: "Người dùng",
    email: "",
    phone: "",
    address: "",
    avatar: "",
    notifications: true,
  };

  return <ProfileScreen initialProfile={profile} mode="edit" />;
}
