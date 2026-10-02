import type { ComponentType, ReactNode } from "react";
import { cn } from "../cn";

export interface BottomNavItem {
  id: string;
  label: string;
  icon: ReactNode;
  /** When set, the item renders as a link; otherwise as a button calling onSelect. */
  href?: string;
}

type LinkLike = ComponentType<{ href: string; className?: string; children: ReactNode; "aria-current"?: "page" }>;

interface BottomNavProps {
  items: BottomNavItem[];
  activeId: string;
  onSelect?: (id: string) => void;
  /** Pass next/link's Link to get client-side navigation for href items. */
  linkComponent?: LinkLike;
  className?: string;
}

/** Mobile tab bar shared by User-app and Technician-app. */
export function BottomNav({ items, activeId, onSelect, linkComponent, className }: BottomNavProps) {
  const LinkTag: LinkLike = linkComponent ?? ((props) => <a {...props} />);
  return (
    <nav
      className={cn(
        "grid border-t border-line bg-white/95 px-2 pt-1.5 shadow-nav backdrop-blur",
        "pb-[calc(0.375rem+env(safe-area-inset-bottom))]",
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((item) => {
        const active = item.id === activeId;
        const itemClass = cn(
          "group flex flex-col items-center gap-1 rounded-control py-1.5 text-[11px] font-semibold transition-colors",
          active ? "text-brand-700" : "text-slate-500 hover:text-brand-700",
        );
        const content = (
          <>
            <span
              className={cn(
                "flex h-7 w-12 items-center justify-center rounded-full transition-colors [&>svg]:size-5",
                active ? "bg-brand-100" : "group-hover:bg-slate-100",
              )}
            >
              {item.icon}
            </span>
            {item.label}
          </>
        );
        return item.href ? (
          <LinkTag key={item.id} href={item.href} className={itemClass} aria-current={active ? "page" : undefined}>
            {content}
          </LinkTag>
        ) : (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect?.(item.id)}
            className={cn(itemClass, "cursor-pointer")}
            aria-current={active ? "page" : undefined}
          >
            {content}
          </button>
        );
      })}
    </nav>
  );
}
