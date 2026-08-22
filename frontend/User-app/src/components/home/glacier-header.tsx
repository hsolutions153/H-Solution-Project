import Link from "next/link";

type GlacierHeaderProps = {
  title?: string;
  showProfileLink?: boolean;
};

export function GlacierHeader({ title, showProfileLink = true }: GlacierHeaderProps) {
  return (
    <header className="home-header">
      <div className="home-logo">
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
        <span className="home-logo-text">{title ?? "GLACIER"}</span>
      </div>
      {showProfileLink ? (
        <div className="home-header-actions">
          <button type="button" className="home-notification-btn" aria-label="Thông báo">
            <span className="material-symbols-outlined" aria-hidden="true">notifications</span>
            <span className="home-notification-dot" aria-hidden="true" />
          </button>
          <Link href="/home/profile" className="home-profile-btn" aria-label="Hồ sơ cá nhân">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"
                fill="#0D2137"
              />
            </svg>
          </Link>
        </div>
      ) : (
        <div className="home-profile-btn home-profile-btn--placeholder" aria-hidden />
      )}
    </header>
  );
}
