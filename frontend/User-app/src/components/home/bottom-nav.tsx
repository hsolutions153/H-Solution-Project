import Link from "next/link";
import { homeNavItems, type HomeNavId } from "@/constants/home-nav";

type HomeBottomNavProps = {
  active: HomeNavId;
};

export function HomeBottomNav({ active }: HomeBottomNavProps) {
  return (
    <nav className="bottom-nav">
      <div className="sidebar-brand">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="14" cy="14" r="3" fill="#0D2137" />
          <line x1="14" y1="2" x2="14" y2="26" stroke="#0D2137" strokeWidth="2" strokeLinecap="round" />
          <line x1="2" y1="14" x2="26" y2="14" stroke="#0D2137" strokeWidth="2" strokeLinecap="round" />
          <line x1="5.5" y1="5.5" x2="22.5" y2="22.5" stroke="#0D2137" strokeWidth="2" strokeLinecap="round" />
          <line x1="22.5" y1="5.5" x2="5.5" y2="22.5" stroke="#0D2137" strokeWidth="2" strokeLinecap="round" />
          <line x1="14" y1="2" x2="11" y2="5" stroke="#0D2137" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="14" y1="2" x2="17" y2="5" stroke="#0D2137" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="14" y1="26" x2="11" y2="23" stroke="#0D2137" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="14" y1="26" x2="17" y2="23" stroke="#0D2137" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="2" y1="14" x2="5" y2="11" stroke="#0D2137" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="2" y1="14" x2="5" y2="17" stroke="#0D2137" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="26" y1="14" x2="23" y2="11" stroke="#0D2137" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="26" y1="14" x2="23" y2="17" stroke="#0D2137" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span className="sidebar-brand-text">GLACIER</span>
      </div>
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
