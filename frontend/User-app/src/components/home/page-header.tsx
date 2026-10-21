import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

type PageHeaderProps = {
  title: string;
  subtitle?: ReactNode;
  backHref?: string;
  onBack?: () => void;
  trailing?: ReactNode;
};

const backClass = "flex size-10 shrink-0 items-center justify-center rounded-full border border-line bg-white text-slate-700 transition-colors hover:bg-slate-50 active:scale-95 cursor-pointer";

export function PageHeader({ title, subtitle, backHref, onBack, trailing }: PageHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      {backHref ? (
        <Link href={backHref} aria-label="Quay lại" className={backClass}>
          <ArrowLeft className="size-5" />
        </Link>
      ) : onBack ? (
        <button type="button" onClick={onBack} aria-label="Quay lại" className={backClass}>
          <ArrowLeft className="size-5" />
        </button>
      ) : null}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-bold leading-tight text-ink">{title}</h1>
        {subtitle ? <p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p> : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}
