import React from "react";
import { Task } from "@/types/task";
import {
  MapPin,
  Settings,
  BatteryCharging,
  Wrench,
  RefreshCw,
} from "lucide-react";

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  onDetailClick?: (task: Task) => void;
}

export const TaskCard = ({ task, onClick, onDetailClick }: TaskCardProps) => {
  const statusStyles: Record<string, string> = {
    WAITING_ACCEPT: "bg-amber-100 text-amber-700",
    IN_PROGRESS: "bg-sky-200 text-sky-800",
    PENDING: "bg-gray-200 text-slate-600",
    WAITING_CONFIRM: "bg-gray-200 text-slate-600",
    ASSIGNED: "bg-amber-100 text-amber-700",
    ACCEPTED: "bg-blue-100 text-blue-700",
    EN_ROUTE: "bg-blue-100 text-blue-700",
    ARRIVED: "bg-purple-100 text-purple-700",
    DIAGNOSING: "bg-indigo-100 text-indigo-700",
    WAITING_FOR_APPROVAL: "bg-amber-100 text-amber-700",
    ESTIMATE_APPROVED: "bg-emerald-100 text-emerald-700",
    ESTIMATE_REJECTED: "bg-red-100 text-red-700",
    REPAIRING: "bg-sky-200 text-sky-800",
    COMPLETED: "bg-emerald-100 text-emerald-700",
    CANCELLED: "bg-red-100 text-red-700",
    WAITING_MOVE: "bg-amber-100 text-amber-700",
    MOVING: "bg-blue-100 text-blue-700",
  };

  const isHighlighted = task.status === "IN_PROGRESS";

  // Hàm render icon linh hoạt dựa theo task.icon
  const renderTaskIcon = (iconName?: string) => {
    switch (iconName) {
      case "settings":
        return <Settings className="w-4 h-4 text-sky-900 shrink-0" />;
      case "battery-charging":
        return <BatteryCharging className="w-4 h-4 text-sky-900 shrink-0" />;
      case "wrench":
        return <Wrench className="w-4 h-4 text-sky-900 shrink-0" />;
      case "refresh-cw":
        return <RefreshCw className="w-4 h-4 text-sky-900 shrink-0" />;
      default:
        return <Settings className="w-4 h-4 text-sky-900 shrink-0" />;
    }
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl p-4 shadow-sm border text-xs transition-all cursor-pointer ${
        isHighlighted
          ? "border-l-4 border-l-sky-800 border-gray-200"
          : "border-gray-200 hover:border-l-4 hover:border-l-sky-800"
      }`}
    >
      {/* Dòng 1: Mã Job + Badge Trạng thái */}
      <div className="flex items-center justify-between mb-2">
        <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
          {task.code}
        </span>
        <span
          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${statusStyles[task.status]}`}
        >
          {task.statusText}
        </span>
      </div>

      {/* Tên Khách hàng */}
      <h3 className="font-bold text-slate-900 text-sm mb-1">
        {task.customerName}
      </h3>

      {/* Thời gian */}
      <div className="text-slate-500 text-[11px] mb-2">
        {task.time}
      </div>

      {/* Địa chỉ */}
      <div className="flex items-start gap-1.5 text-slate-500 mb-3 leading-relaxed">
        <MapPin className="w-4 h-4 shrink-0 text-slate-400 mt-0.5" />
        <span>{task.address}</span>
      </div>

      <hr className="border-gray-100 mb-3" />

      {/* Tên dịch vụ & Nút Chi tiết */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
          {renderTaskIcon(task.icon)}
          <span>{task.serviceName}</span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDetailClick?.(task);
          }}
          className="font-bold text-sky-800 hover:underline cursor-pointer flex items-center gap-0.5"
        >
          Chi tiết &gt;
        </button>
      </div>
    </div>
  );
};