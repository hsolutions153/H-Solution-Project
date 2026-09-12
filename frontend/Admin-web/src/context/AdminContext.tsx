"use client";

import React, { createContext, useContext, useState } from "react";

export type AdminTab =
  | "dashboard"
  | "orders"
  | "customers"
  | "devices"
  | "technicians"
  | "history";

interface AdminContextType {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  showCreateOrder: boolean;
  openCreateOrder: () => void;
  closeCreateOrder: () => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  toggleSidebar: () => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  // Khôi phục trạng thái thu gọn từ localStorage khi load
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("admin_sidebar_collapsed");
      if (saved !== null) {
        setSidebarCollapsed(saved === "true");
      }
    } catch {}
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("admin_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <AdminContext.Provider
      value={{
        activeTab,
        setActiveTab,
        showCreateOrder,
        openCreateOrder: () => setShowCreateOrder(true),
        closeCreateOrder: () => setShowCreateOrder(false),
        toastMessage,
        showToast,
        sidebarCollapsed,
        setSidebarCollapsed,
        toggleSidebar,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
};
