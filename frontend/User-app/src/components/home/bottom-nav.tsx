import Link from "next/link";
import { homeNavItems, type HomeNavId } from "@/constants/home-nav";
import { EMobiCareLogoIcon } from "@/components/brand/emobi-care-logo";

type HomeBottomNavProps = {
  active: HomeNavId;
};

export function HomeBottomNav({ active }: HomeBottomNavProps) {
  return (
    <nav className="bottom-nav">
      <Link href="/home" className="sidebar-brand" aria-label="H-Mobility Care Trang chủ">
        <EMobiCareLogoIcon size={36} />
        <div className="sidebar-brand-text-wrap">
          <span className="sidebar-brand-text">H-MOBILITY CARE</span>
          <span className="sidebar-brand-tagline">Cứu hộ xe máy điện</span>
        </div>
      </Link>
      <div className="bottom-nav-links">
        {homeNavItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`bottom-nav-item ${item.id === active ? "bottom-nav-item--active" : ""}`}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="bottom-nav-label">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
