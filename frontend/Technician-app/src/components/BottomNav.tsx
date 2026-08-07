"use client";

import React from "react";
import { Home, CalendarDays, History, User } from "lucide-react";

interface BottomNavProps {
  activeTab?: string;
  onTabChange?: (tabName: string) => void;
}

export const BottomNav = ({ activeTab = "home", onTabChange }: BottomNavProps) => {
  const navItems = [
    { id: "home", label: "Home", icon: <Home className="w-5 h-5" /> },
    { id: "schedule", label: "Schedule", icon: <CalendarDays className="w-5 h-5" /> },
    { id: "history", label: "History", icon: <History className="w-5 h-5" /> },
    { id: "profile", label: "Profile", icon: <User className="w-5 h-5" /> },
  ];

  return (
    <div className="bg-white border-t border-gray-200 flex justify-around py-2 px-3 shadow-lg">
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onTabChange && onTabChange(item.id)}
            className={`flex flex-col items-center justify-center w-16 py-1.5 rounded-2xl text-[11px] font-medium transition-colors cursor-pointer ${
              isActive
                ? "bg-sky-100 text-sky-900 font-bold"
                : "text-slate-500 hover:bg-sky-50 hover:text-sky-800"
            }`}
          >
            <span className="mb-0.5 flex items-center justify-center">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};