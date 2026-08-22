import Image from "next/image";
import Link from "next/link";

type PasswordResetShellProps = {
  children: React.ReactNode;
  showBack?: boolean;
  compactBrand?: boolean;
};

export function PasswordResetShell({
  children,
  showBack = false,
  compactBrand = false,
}: PasswordResetShellProps) {
  return (
    <main className="reset-page">
      <header className={`reset-brand ${compactBrand ? "reset-brand--compact" : ""}`}>
        {showBack && (
          <Link href="/login" className="reset-back-icon" aria-label="Quay lại đăng nhập">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
        )}
        <Image src="/logo.jpg" alt="H-solutions" width={170} height={86} priority />
      </header>
      {children}
      <p className="reset-powered">ĐƯỢC PHÁT TRIỂN BỞI H-SOLUTIONS</p>
    </main>
  );
}
