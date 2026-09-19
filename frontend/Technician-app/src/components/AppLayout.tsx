"use client";

import React from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";

interface AppLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  onResetHome?: () => void;
}

export const AppLayout = ({
  children,
  activeTab,
  onTabChange,
  onLogout,
  onResetHome,
}: AppLayoutProps) => {
  const handleTabChange = (tabName: string) => {
    onTabChange(tabName);
    if (tabName === "home" && onResetHome) {
      onResetHome();
    }
  };

  return (
    <div className="h-screen bg-slate-50 w-full max-w-sm mx-auto border-x border-gray-200 flex flex-col relative shadow-lg rounded-3xl overflow-hidden font-sans">
      
      <Header onLogout={onLogout} />

      
      <div className="flex-1 overflow-y-auto scroll-area pb-24">
        {children}
      </div>

      
      <div id="fab-container" className="absolute bottom-20 right-4 z-30 pointer-events-auto" />

      
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
};