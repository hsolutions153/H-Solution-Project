"use client";

import React, { createContext, useContext, useState, useSyncExternalStore } from "react";

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
  selectedOrderId: string | null;
  openOrderDetail: (orderId: string) => void;
  closeOrderDetail: () => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  toggleSidebar: () => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

const sidebarKey = "admin_sidebar_collapsed";
function subscribeSidebar(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener("sidebar-changed", listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener("sidebar-changed", listener);
  };
}

export const AdminProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const sidebarCollapsed = useSyncExternalStore(
    subscribeSidebar, () => localStorage.getItem(sidebarKey) === "true", () => false,
  );
  const setSidebarCollapsed = (value: boolean | ((previous: boolean) => boolean)) => {
    const next = typeof value === "function" ? value(sidebarCollapsed) : value;
    localStorage.setItem(sidebarKey, String(next));
    window.dispatchEvent(new Event("sidebar-changed"));
  };

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => !prev);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const openOrderDetail = (orderId: string) => {
    setSelectedOrderId(orderId);
    setActiveTab("orders");
  };

  const closeOrderDetail = () => {
    setSelectedOrderId(null);
  };

  return (
    <AdminContext.Provider
      value={{
        activeTab,
        setActiveTab,
        showCreateOrder,
        openCreateOrder: () => setShowCreateOrder(true),
        closeCreateOrder: () => setShowCreateOrder(false),
        selectedOrderId,
        openOrderDetail,
        closeOrderDetail,
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
