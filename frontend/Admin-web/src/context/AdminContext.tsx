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
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
