"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { userNavGroups } from "@/constants/user-nav";

function isGroupActive(pathname: string, basePath: string) {
  if (basePath === "/home") return pathname === "/home";
  return pathname.startsWith(basePath);
}

function isChildActive(pathname: string, searchParams: URLSearchParams, childPath: string) {
  const [path, query] = childPath.split("?");
  if (pathname !== path) return false;
  if (!query) return pathname === path && !searchParams.get("tab") && !searchParams.get("step");

  const childParams = new URLSearchParams(query);
  for (const [key, value] of childParams.entries()) {
    if (searchParams.get(key) !== value) return false;
  }
  return true;
}

type SidebarNavProps = {
  onNavigate?: () => void;
  compact?: boolean;
};

export function SidebarNav({ onNavigate, compact = false }: SidebarNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const defaultExpanded = useMemo(
    () =>
      userNavGroups
        .filter((g) => g.children && isGroupActive(pathname, g.path))
        .map((g) => g.id),
    [pathname]
  );

  const [expanded, setExpanded] = useState<string[]>(defaultExpanded);

  const toggleGroup = (id: string) => {
    setExpanded((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <nav className="flex flex-col gap-xs">
      {userNavGroups.map((group) => {
        const groupActive = isGroupActive(pathname, group.path);
        const isExpanded = expanded.includes(group.id) || groupActive;

        if (!group.children) {
          const active = pathname === group.path;
          return (
            <Link
              key={group.id}
              href={group.path}
              onClick={onNavigate}
              className={`flex items-center gap-md h-[44px] px-sm rounded-xl transition-all font-label-lg ${
                compact ? "text-xs font-semibold" : "text-sm"
              } group ${
                active
                  ? "bg-primary text-white shadow-sm"
                  : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              }`}
            >
              <span
                className={`material-symbols-outlined ${compact ? "text-[20px]" : ""} ${
                  active ? "fill-current" : ""
                }`}
              >
                {group.icon}
              </span>
              <span className="leading-tight">
                {group.labelVi}
              </span>
            </Link>
          );
        }

        return (
          <div key={group.id} className="space-y-0.5">
            <button
              type="button"
              onClick={() => toggleGroup(group.id)}
              className={`w-full flex items-center gap-md h-[44px] px-sm rounded-xl transition-all font-label-lg text-left ${
                compact ? "text-xs font-semibold" : "text-sm"
              } ${
                groupActive
                  ? "text-primary"
                  : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{group.icon}</span>
              <span className="flex-1 leading-tight">
                {group.labelVi}
                {!compact && (
                  <span className="block text-[10px] font-normal opacity-70">{group.labelEn}</span>
                )}
              </span>
              <span className="material-symbols-outlined text-[18px] text-outline">
                {isExpanded ? "expand_less" : "expand_more"}
              </span>
            </button>

            {isExpanded && (
              <div className="ml-3 pl-3 border-l border-outline-variant/50 space-y-0.5">
                {group.children.map((child, index) => {
                  const active = isChildActive(pathname, searchParams, child.path);
                  const isLast = index === group.children!.length - 1;
                  return (
                    <Link
                      key={child.path}
                      href={child.path}
                      onClick={onNavigate}
                      className={`flex items-center gap-2 py-2 px-2 rounded-lg transition-all ${
                        compact ? "text-[11px]" : "text-xs"
                      } ${
                        active
                          ? "text-primary font-semibold bg-primary/5"
                          : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container/60"
                      }`}
                    >
                      <span className="text-outline font-mono text-[10px] shrink-0">
                        {isLast ? "└" : "├"}
                      </span>
                      <span className="leading-tight">
                        {child.labelVi}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
