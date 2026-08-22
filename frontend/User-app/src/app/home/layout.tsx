import { auth } from "@/auth";
import { redirect } from "next/navigation";
import "./home.css";
import "./device/device.css";

export default async function HomeLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return children;
}
