import { GlacierHeader } from "@/components/home/glacier-header";
import { HomeBottomNav } from "@/components/home/bottom-nav";
import type { HomeNavId } from "@/constants/home-nav";

type HomeShellProps = {
  activeNav: HomeNavId;
  title?: string;
  children: React.ReactNode;
  mainClassName?: string;
  hideHeader?: boolean;
};

export function HomeShell({ activeNav, title, children, mainClassName, hideHeader = false }: HomeShellProps) {
  return (
    <div className="home-page">
      {!hideHeader && <GlacierHeader title={title} />}
      <main className={`home-content ${mainClassName || ""}`}>{children}</main>
      <HomeBottomNav active={activeNav} />
    </div>
  );
}
