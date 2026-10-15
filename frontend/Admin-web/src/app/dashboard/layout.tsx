"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/common/Sidebar";
import { Header } from "@/components/common/Header";
import { AdminProvider, useAdmin, AdminTab } from "@/context/AdminContext";
import { CreateOrderModal } from "@/features/orders/CreateOrderModal";
import { CheckCircle2 } from "lucide-react";

const TAB_TITLES: Record<AdminTab, string> = {
  dashboard: "Bảng điều khiển",
  orders: "Yêu cầu sửa chữa",
  customers: "Quản lý Khách hàng",
  devices: "Phương tiện & Thiết bị",
  technicians: "Đội ngũ Kỹ thuật viên",
  history: "Lịch sử Sửa chữa",
};

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const {
    activeTab,
    setActiveTab,
    showCreateOrder,
    openCreateOrder,
    closeCreateOrder,
    toastMessage,
    showToast,
  } = useAdmin();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const isLoggedIn = localStorage.getItem("isLoggedIn");

    if (!token || isLoggedIn !== "true") {
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    const tabName = TAB_TITLES[activeTab] || "Bảng điều khiển";
    document.title = `${tabName} | H-Mobility Care Admin`;
  }, [activeTab]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-brand-500/30 flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as AdminTab)}
        onOpenCreateOrder={openCreateOrder}
      />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header title={TAB_TITLES[activeTab] || "Bảng điều khiển"} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      {showCreateOrder && (
        <CreateOrderModal
          onClose={closeCreateOrder}
          onSuccess={(msg) => {
            showToast(msg);
          }}
        />
      )}
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </AdminProvider>
  );
}
