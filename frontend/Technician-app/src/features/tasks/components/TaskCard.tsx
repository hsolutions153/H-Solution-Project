import React from "react";
import { Task } from "@/types/task";
import {
  MapPin,
  Settings,
  BatteryCharging,
  Wrench,
  RefreshCw,
} from "lucide-react";
import { StatusBadge } from "@h-mobility/ui";

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  onDetailClick?: (task: Task) => void;
}

export const TaskCard = ({ task, onClick, onDetailClick }: TaskCardProps) => {
  const isHighlighted = task.status === "IN_PROGRESS";

  // Hàm render icon linh hoạt dựa theo task.icon
  const renderTaskIcon = (iconName?: string) => {
    switch (iconName) {
      case "settings":
        return <Settings className="w-4 h-4 text-brand-900 shrink-0" />;
      case "battery-charging":
        return <BatteryCharging className="w-4 h-4 text-brand-900 shrink-0" />;
      case "wrench":
        return <Wrench className="w-4 h-4 text-brand-900 shrink-0" />;
      case "refresh-cw":
        return <RefreshCw className="w-4 h-4 text-brand-900 shrink-0" />;
      default:
        return <Settings className="w-4 h-4 text-brand-900 shrink-0" />;
    }
  };

  return (
    <div
      onClick={onClick}
      className={`bg-surface rounded-card p-4 shadow-card border text-xs transition-shadow cursor-pointer hover:shadow-raised ${
        isHighlighted ? "border-brand-300 ring-1 ring-brand-200" : "border-line"
      }`}
    >
      
      <div className="flex items-center justify-between mb-2">
        <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
          {task.code}
        </span>
        <StatusBadge status={task.status} label={task.statusText} />
      </div>

      
      <h3 className="font-bold text-slate-900 text-sm mb-1">
        {task.customerName}
      </h3>

      
      <div className="text-slate-500 text-[11px] mb-2">
        {task.time}
      </div>

      
      <div className="flex items-start gap-1.5 text-slate-500 mb-3 leading-relaxed">
        <MapPin className="w-4 h-4 shrink-0 text-slate-400 mt-0.5" />
        <span>{task.address}</span>
      </div>

      <hr className="border-slate-100 mb-3" />

      
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
          className="font-bold text-brand-800 hover:underline cursor-pointer flex items-center gap-0.5"
        >
          Chi tiết &gt;
        </button>
      </div>
    </div>
  );
};