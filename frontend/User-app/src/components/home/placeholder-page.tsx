import Link from "next/link";
import { HomeShell } from "@/components/home/home-shell";
import type { HomeNavId } from "@/constants/home-nav";

type PlaceholderPageProps = {
  activeNav: HomeNavId;
  title: string;
  icon: string;
  description: string;
  features?: string[];
  actionLabel?: string;
  actionHref?: string;
};

export function PlaceholderPage({
  activeNav,
  title,
  icon,
  description,
  features = [],
  actionLabel,
  actionHref,
}: PlaceholderPageProps) {
  return (
    <HomeShell activeNav={activeNav} title={title}>
      <section className="placeholder-page">
        <div className="placeholder-hero">
          <span className="material-symbols-outlined placeholder-hero-icon">{icon}</span>
          <h1 className="placeholder-title">{title}</h1>
          <p className="placeholder-desc">{description}</p>
        </div>

        {features.length > 0 && (
          <ul className="placeholder-list">
            {features.map((feature) => (
              <li key={feature} className="placeholder-list-item">
                <span className="material-symbols-outlined placeholder-list-icon">check_circle</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="placeholder-badge">
          <span className="material-symbols-outlined">construction</span>
          Đang phát triển
        </div>

        {actionLabel && actionHref && (
          <Link href={actionHref} className="placeholder-action">
            {actionLabel}
            <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
        )}
      </section>
    </HomeShell>
  );
}
