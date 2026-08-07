import React from "react";
import {
  FileText,
  UserX,
  Wrench,
  Clock,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";

const metrics = [
  {
    label: "Yêu cầu mới nhận",
    value: 24,
    change: "+12%",
    color: "border-l-blue-600",
    icon: <FileText className="w-5 h-5 text-blue-600" />,
    iconBg: "bg-blue-50",
  },
  {
    label: "Chưa phân công",
    value: "08",
    statusText: "Cần xử lý",
    color: "border-l-red-500",
    icon: <UserX className="w-5 h-5 text-red-500" />,
    iconBg: "bg-red-50",
  },
  {
    label: "Đang xử lý",
    value: 42,
    color: "border-l-blue-600",
    icon: <Wrench className="w-5 h-5 text-blue-600" />,
    iconBg: "bg-blue-50",
  },
  {
    label: "Chờ phê duyệt",
    value: 15,
    color: "border-l-slate-400",
    icon: <Clock className="w-5 h-5 text-slate-500" />,
    iconBg: "bg-slate-100",
  },
  {
    label: "Đã hoàn tất",
    value: 128,
    color: "border-l-emerald-500",
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
    iconBg: "bg-emerald-50",
  },
];

export const MetricCards = () => {
  return (
    <div className="grid grid-cols-5 gap-4 mb-6">
      {metrics.map((item, index) => (
        <div
          key={index}
          className={`bg-white p-4 rounded-xl border border-slate-200 border-l-4 ${item.color} shadow-sm flex flex-col justify-between`}
        >
          {/* Top section: Icon + Status/Change */}
          <div className="flex justify-between items-center mb-3">
            <div
              className={`w-10 h-10 rounded-xl ${item.iconBg} flex items-center justify-center`}
            >
              {item.icon}
            </div>
            {item.change && (
              <span className="text-emerald-600 font-bold text-xs flex items-center gap-1">
                {item.change} <TrendingUp className="w-3.5 h-3.5" />
              </span>
            )}
            {item.statusText && (
              <span className="text-red-500 font-bold text-xs">
                {item.statusText}
              </span>
            )}
          </div>

          {/* Bottom section: Label & Value (Canh giữa với text-center) */}
          <div className="text-center">
            <div className="text-xs text-slate-500 font-medium mb-1">
              {item.label}
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {item.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
