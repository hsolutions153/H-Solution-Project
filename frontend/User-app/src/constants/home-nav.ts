export type HomeNavId = "home" | "wheelchair" | "device" | "history" | "profile";

export const homeNavItems: Array<{
  id: HomeNavId;
  href: string;
  icon: string;
  label: string;
}> = [
  { id: "home", href: "/home", icon: "home", label: "Trang chủ" },
  { id: "wheelchair", href: "/home/booking", icon: "calendar_month", label: "Đặt lịch" },
  { id: "device", href: "/home/device", icon: "two_wheeler", label: "Thiết bị" },
  { id: "history", href: "/home/history", icon: "schedule", label: "Lịch sử" },
  { id: "profile", href: "/home/profile", icon: "person", label: "Cá nhân" },
];
