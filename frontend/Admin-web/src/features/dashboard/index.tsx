"use client";

import React from "react";
import { MetricCards } from "./components/MetricCards";
import { EmergencyOrdersTable } from "./components/EmergencyOrdersTable";
import { QuickActions } from "./components/QuickActions";
import { TechStaffStatus } from "./components/TechStaffStatus";

export interface DashboardFeatureProps {
  onNavigateToOrders?: () => void;
  onNavigateToTechs?: () => void;
  onOpenCreateOrder?: () => void;
}

export const DashboardFeature = ({
  onNavigateToOrders,
  onNavigateToTechs,
  onOpenCreateOrder,
}: DashboardFeatureProps) => {
  return (
    <div className="p-6 bg-slate-50 min-h-[calc(100vh-80px)] space-y-6">
      <MetricCards />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="lg:col-span-2 flex">
          <EmergencyOrdersTable
            onNavigateToOrders={onNavigateToOrders}
            onOpenCreateOrder={onOpenCreateOrder}
          />
        </div>

        <div className="lg:col-span-1 flex flex-col justify-between space-y-6">
          <QuickActions
            onOpenCreateOrder={onOpenCreateOrder}
            onNavigateToOrders={onNavigateToOrders}
            onNavigateToTechs={onNavigateToTechs}
          />
          <TechStaffStatus onNavigateToTechs={onNavigateToTechs} />
        </div>
      </div>
    </div>
  );
};