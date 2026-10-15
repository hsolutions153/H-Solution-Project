import { Task } from "@/types/task";
import {
  MapPin,
  Settings,
  BatteryCharging,
  Wrench,
  RefreshCw,
  Clock,
  ChevronRight,
  Siren,
} from "lucide-react";
import { Badge, StatusBadge } from "@h-mobility/ui";

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  onDetailClick?: (task: Task) => void;
}

const TASK_ICONS: Record<string, typeof Settings> = {
  settings: Settings,
  "battery-charging": BatteryCharging,
  wrench: Wrench,
  "refresh-cw": RefreshCw,
};

export const TaskCard = ({ task, onClick, onDetailClick }: TaskCardProps) => {
  const isHighlighted = task.status === "IN_PROGRESS";
  const TaskIcon = TASK_ICONS[task.icon] ?? Settings;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={`group rounded-card border bg-surface shadow-card transition-shadow hover:shadow-raised active:scale-[0.99] cursor-pointer ${
        isHighlighted ? "border-brand-300 ring-1 ring-brand-200" : "border-line"
      }`}
    >
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <span className="text-xs font-semibold tabular-nums text-slate-500">{task.code}</span>
            {task.isEmergency ? (
              <Badge tone="danger">
                <Siren className="size-3" /> SOS
              </Badge>
            ) : null}
          </span>
          <StatusBadge status={task.status} label={task.statusText} className="shrink-0" />
        </div>

        <h3 className="mt-2 truncate text-base font-bold text-ink">{task.customerName}</h3>

        <div className="mt-2 space-y-1.5 text-[13px] text-slate-600">
          {task.time ? (
            <p className="flex items-center gap-2">
              <Clock className="size-4 shrink-0 text-slate-400" />
              <span className="tabular-nums">{task.time}</span>
            </p>
          ) : null}
          <p className="flex items-start gap-2">
            <MapPin className="mt-px size-4 shrink-0 text-slate-400" />
            <span className="line-clamp-2 leading-snug">{task.address}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5">
        <span className="flex min-w-0 items-center gap-2 text-[13px] font-medium text-slate-700">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <TaskIcon className="size-4" />
          </span>
          <span className="truncate">{task.serviceName}</span>
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDetailClick?.(task);
          }}
          className="-mr-2 flex shrink-0 items-center gap-0.5 rounded-lg px-2 py-1.5 text-[13px] font-semibold text-brand-700 transition-colors hover:bg-brand-50 cursor-pointer"
        >
          Chi tiết
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
};
