import Link from "next/link";
import { EMobiCareLogoIcon } from "@/components/brand/emobi-care-logo";
import { HeaderAvatar } from "@/components/home/header-avatar";

type GlacierHeaderProps = {
  title?: string;
  showProfileLink?: boolean;
};

export function GlacierHeader({ title, showProfileLink = true }: GlacierHeaderProps) {
  return (
    <header className="home-header">
      <Link href="/home" className="home-logo" aria-label="Về trang chủ H-Mobility Care">
        <EMobiCareLogoIcon size={32} />
        <div className="home-brand-header-info">
          <span className="home-brand-name">H-Mobility Care</span>
          {title ? (
            <span className="home-page-subtitle">{title}</span>
          ) : (
            <span className="home-brand-tagline">Ứng dụng cứu hộ xe 24/7</span>
          )}
        </div>
      </Link>
      {showProfileLink ? (
        <div className="home-header-actions">
          <button type="button" className="home-notification-btn" aria-label="Thông báo">
            <span className="material-symbols-outlined" aria-hidden="true">notifications</span>
            <span className="home-notification-dot" aria-hidden="true" />
          </button>
          <Link href="/home/profile" className="home-profile-btn" aria-label="Hồ sơ cá nhân">
            <HeaderAvatar />
          </Link>
        </div>
      ) : (
        <div className="home-profile-btn home-profile-btn--placeholder" aria-hidden />
      )}
    </header>
  );
}
