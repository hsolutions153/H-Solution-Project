import React from "react";
import { MetricCards } from "./components/MetricCards";
import { EmergencyOrdersTable } from "./components/EmergencyOrdersTable";
import { QuickActions } from "./components/QuickActions";
import { TechStaffStatus } from "./components/TechStaffStatus";
import { RepairTrendChart } from "./components/RepairTrendChart";

export const DashboardFeature = () => {
  return (
    <div className="p-6 bg-slate-50 min-h-[calc(100vh-80px)] space-y-6">
      {/* Khối thống kê trên cùng */}
      <MetricCards />

      {/* Đổi items-start thành items-stretch */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Cột trái: Bảng đơn khẩn cấp */}
        <div className="lg:col-span-2 flex flex-col">
          <EmergencyOrdersTable />
        </div>

        {/* Cột phải: Quick Actions & Nhân sự */}
        <div className="lg:col-span-1 flex flex-col justify-between space-y-6">
          <QuickActions />
          <TechStaffStatus />
        </div>
      </div>
      {/* 3. Khối Biểu đồ xu hướng sửa chữa ở cuối trang */}
      <div>
        <RepairTrendChart />
      </div>
    </div>
  );
};
