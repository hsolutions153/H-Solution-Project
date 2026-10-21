import Link from "next/link";
import { CalendarDays, Clock3, Home, type LucideIcon, Bike, User } from "lucide-react";
import { BottomNav } from "@h-mobility/ui";
import { homeNavItems, type HomeNavId } from "@/constants/home-nav";

const ICONS: Record<HomeNavId, LucideIcon> = {
  home: Home,
  wheelchair: CalendarDays,
  device: Bike,
  history: Clock3,
  profile: User,
};

type HomeBottomNavProps = {
  active: HomeNavId;
};

export function HomeBottomNav({ active }: HomeBottomNavProps) {
  const items = homeNavItems.map((item) => {
    const Icon = ICONS[item.id];
    return { id: item.id, label: item.label, href: item.href, icon: <Icon strokeWidth={2} /> };
  });
  return (
    <div className="fixed inset-x-0 bottom-0 z-50">
      <BottomNav items={items} activeId={active} linkComponent={Link} />
    </div>
  );
}
