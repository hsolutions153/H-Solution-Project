"use client";

import React from "react";
import { Home, ClipboardList, CalendarDays, History, User } from "lucide-react";
import { BottomNav as SharedBottomNav } from "@h-mobility/ui";

interface BottomNavProps {
  activeTab?: string;
  onTabChange?: (tabName: string) => void;
}

const NAV_ITEMS = [
  { id: "home", label: "Trang chủ", icon: <Home strokeWidth={2} /> },
  { id: "tasks", label: "Công việc", icon: <ClipboardList strokeWidth={2} /> },
  { id: "schedule", label: "Lịch hẹn", icon: <CalendarDays strokeWidth={2} /> },
  { id: "history", label: "Lịch sử", icon: <History strokeWidth={2} /> },
  { id: "profile", label: "Cá nhân", icon: <User strokeWidth={2} /> },
];

export const BottomNav = ({ activeTab = "home", onTabChange }: BottomNavProps) => {
  return <SharedBottomNav items={NAV_ITEMS} activeId={activeTab} onSelect={onTabChange} />;
};
