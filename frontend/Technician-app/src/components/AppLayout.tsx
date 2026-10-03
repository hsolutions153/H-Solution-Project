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
    if ((tabName === "home" || tabName === "tasks") && onResetHome) {
      onResetHome();
    }
  };

  return (
    <div className="h-full bg-canvas w-full flex flex-col relative overflow-hidden font-sans">
      
      <Header onLogout={onLogout} />

      
      <div className="flex-1 overflow-y-auto scroll-area">
        {children}
      </div>

      
      <div id="fab-container" className="absolute bottom-[5.5rem] right-4 z-30 pointer-events-auto" />

      
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
};