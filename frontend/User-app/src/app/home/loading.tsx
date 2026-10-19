"use client";

import { usePathname } from "next/navigation";
import { HomeShell } from "@/components/home/home-shell";
import { PageBodySkeleton } from "@/components/motion/skeleton";
import type { HomeNavId } from "@/constants/home-nav";

function navFor(pathname: string): HomeNavId {
  if (pathname.startsWith("/home/booking")) return "wheelchair";
  if (pathname.startsWith("/home/device")) return "device";
  if (pathname.startsWith("/home/history")) return "history";
  if (pathname.startsWith("/home/profile")) return "profile";
  return "home";
}

/** Shown instantly on navigation inside /home so header and bottom nav stay in place. */
export default function HomeLoading() {
  const pathname = usePathname();
  return (
    <HomeShell activeNav={navFor(pathname)}>
      <PageBodySkeleton />
    </HomeShell>
  );
}
