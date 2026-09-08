"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  UserX,
  Wrench,
  Clock,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";

export const MetricCards = () => {
  const [metricsData, setMetricsData] = useState<{
    total: number;
    requested: number;
    unassigned: number;
    inProgress: number;
    waitingApproval: number;
    completed: number;
  }>({
    total: 0,
    requested: 0,
    unassigned: 0,
    inProgress: 0,
    waitingApproval: 0,
    completed: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const { fetchApi } = await import("@/lib/api-client");
        const [metricRes, ordersRes] = await Promise.all([
          fetchApi<any>("/dashboard/metrics").catch(() => null),
          fetchApi<any>("/orders").catch(() => null),
        ]);

        const items: any[] = Array.isArray(ordersRes?.items)
          ? ordersRes.items
          : [];

        const unassignedCount = items.filter(
          (o) => !o.technician_id && o.status !== "COMPLETED" && o.status !== "CANCELLED"
        ).length;

        const inProg = items.filter((o) =>
          [
            "CONFIRMED",
            "ASSIGNED",
            "ACCEPTED",
            "EN_ROUTE",
            "ARRIVED",
            "DIAGNOSING",
            "REPAIRING",
          ].includes(o.status)
        ).length;

        const waiting = items.filter((o) =>
          ["ESTIMATE_SUBMITTED", "WAITING_FOR_APPROVAL"].includes(o.status)
        ).length;

        const comp = items.filter((o) => o.status === "COMPLETED").length;
        const req = items.filter((o) => ["REQUESTED", "PENDING"].includes(o.status)).length;

        setMetricsData({
          total: metricRes?.total_orders || items.length,
          requested: req,
          unassigned: unassignedCount,
          inProgress: inProg,
          waitingApproval: waiting,
          completed: comp,
        });
      } catch (err) {
        console.warn("Could not fetch live metrics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const timer = setInterval(fetchMetrics, 10000);
    return () => clearInterval(timer);
  }, []);

  const cards = [
    {
      label: "Yêu cầu mới nhận",
      value: loading ? "..." : metricsData.requested || 0,
      change: "+Mới",
      color: "border-l-blue-600",
      icon: <FileText className="w-5 h-5 text-blue-600" />,
      iconBg: "bg-blue-50",
    },
    {
      label: "Chưa phân công",
      value: loading ? "..." : metricsData.unassigned || 0,
      statusText: metricsData.unassigned > 0 ? "Cần xử lý" : "Đã sạch",
      color: "border-l-red-500",
      icon: <UserX className="w-5 h-5 text-red-500" />,
      iconBg: "bg-red-50",
    },
    {
      label: "Đang xử lý",
      value: loading ? "..." : metricsData.inProgress || 0,
      color: "border-l-sky-600",
      icon: <Wrench className="w-5 h-5 text-sky-600" />,
      iconBg: "bg-sky-50",
    },
    {
      label: "Chờ duyệt báo giá",
      value: loading ? "..." : metricsData.waitingApproval || 0,
      color: "border-l-amber-500",
      icon: <Clock className="w-5 h-5 text-amber-600" />,
      iconBg: "bg-amber-50",
    },
    {
      label: "Đã hoàn tất",
      value: loading ? "..." : metricsData.completed || 0,
      color: "border-l-emerald-500",
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
      iconBg: "bg-emerald-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
      {cards.map((item, index) => (
        <div
          key={index}
          className={`bg-white p-4 rounded-xl border border-slate-200 border-l-4 ${item.color} shadow-xs flex flex-col justify-between`}
        >
          {/* Top section: Icon + Status/Change */}
          <div className="flex justify-between items-center mb-3">
            <div
              className={`w-10 h-10 rounded-xl ${item.iconBg} flex items-center justify-center`}
            >
              {item.icon}
            </div>
            {item.change && (
              <span className="text-blue-600 font-bold text-xs flex items-center gap-1">
                {item.change} <TrendingUp className="w-3.5 h-3.5" />
              </span>
            )}
            {item.statusText && (
              <span
                className={`font-bold text-xs ${
                  Number(item.value) > 0 ? "text-red-500" : "text-emerald-600"
                }`}
              >
                {item.statusText}
              </span>
            )}
          </div>

          {/* Bottom section */}
          <div className="text-center">
            <div className="text-xs text-slate-500 font-bold mb-1">
              {item.label}
            </div>
            <div className="text-2xl font-black text-slate-900">
              {item.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
