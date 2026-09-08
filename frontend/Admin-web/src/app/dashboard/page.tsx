"use client";

import React from "react";
import { useAdmin } from "@/context/AdminContext";
import { DashboardFeature } from "@/features/dashboard";
import { OrdersList } from "@/features/orders/OrdersList";
import { CustomersList } from "@/features/customers/CustomersList";
import { DevicesList } from "@/features/devices/DevicesList";
import { TechniciansList } from "@/features/technicians/TechniciansList";
import { HistoryList } from "@/features/history/HistoryList";

export default function DashboardPage() {
  const { activeTab, setActiveTab, openCreateOrder } = useAdmin();

  switch (activeTab) {
    case "orders":
      return <OrdersList />;
    case "customers":
      return <CustomersList />;
    case "devices":
      return <DevicesList />;
    case "technicians":
      return <TechniciansList />;
    case "history":
      return <HistoryList />;
    case "dashboard":
    default:
      return (
        <DashboardFeature
          onNavigateToOrders={() => setActiveTab("orders")}
          onNavigateToTechs={() => setActiveTab("technicians")}
          onOpenCreateOrder={openCreateOrder}
        />
      );
  }
}