"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronRight, MapPin, Phone, RefreshCw, Siren } from "lucide-react";
import { Card, EmptyState, StatusBadge } from "@h-mobility/ui";
import { mapApiTask, parseAppointment } from "@/features/tasks/mapApiTask";
import type { Task } from "@/types/task";

/** Requests that no longer need the technician to show up. */
const CLOSED_STATUSES = new Set(["COMPLETED", "CANCELLED", "REJECTED", "ESTIMATE_REJECTED"]);
const REFRESH_MS = 30_000;

interface ScheduleItem {
  task: Task;
  day: Date | null;
  slot: string | null;
}

interface ScheduleGroup {
  key: string;
  label: string;
  tone: "default" | "urgent" | "overdue";
  items: ScheduleItem[];
}

interface ScheduleScreenProps {
  /** Opens the job in the task flow (detail screen on the Home tab). */
  onOpenTask: (task: Task) => void;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const dayDiff = (a: Date, b: Date) => Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86_400_000);

function dayLabel(day: Date, today: Date): string {
  const date = day.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  const diff = dayDiff(day, today);
  if (diff === 0) return `Hôm nay, ${date}`;
  if (diff === 1) return `Ngày mai, ${date}`;
  const weekday = day.toLocaleDateString("vi-VN", { weekday: "long" });
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${date}`;
}

function groupSchedule(tasks: Task[], today: Date): ScheduleGroup[] {
  const sos: ScheduleItem[] = [];
  const overdue: ScheduleItem[] = [];
  const unscheduled: ScheduleItem[] = [];
  const byDay = new Map<string, ScheduleItem[]>();

  for (const task of tasks) {
    if (CLOSED_STATUSES.has(task.rawStatus ?? "")) continue;
    const { day, slot } = parseAppointment(task);
    const item = { task, day, slot };
    if (task.isEmergency) sos.push(item);
    else if (!day) unscheduled.push(item);
    else if (dayDiff(day, today) < 0) overdue.push(item);
    else {
      const key = startOfDay(day).toISOString();
      byDay.set(key, [...(byDay.get(key) ?? []), item]);
    }
  }

  const bySlot = (a: ScheduleItem, b: ScheduleItem) => (a.slot ?? "99:99").localeCompare(b.slot ?? "99:99");
  const groups: ScheduleGroup[] = [];
  if (sos.length) groups.push({ key: "sos", label: "Cứu hộ khẩn cấp", tone: "urgent", items: sos });
  if (overdue.length) {
    overdue.sort((a, b) => a.day!.getTime() - b.day!.getTime() || bySlot(a, b));
    groups.push({ key: "overdue", label: "Đã quá giờ hẹn", tone: "overdue", items: overdue });
  }
  [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([key, items]) =>
      groups.push({ key, label: dayLabel(new Date(key), today), tone: "default", items: items.sort(bySlot) }),
    );
  if (unscheduled.length) groups.push({ key: "none", label: "Chưa chọn giờ hẹn", tone: "default", items: unscheduled });
  return groups;
}

function SlotColumn({ item, today }: { item: ScheduleItem; today: Date }) {
  if (item.task.isEmergency) {
    return (
      <span className="flex flex-col items-center text-rose-600">
        <Siren className="size-5" />
        <span className="mt-0.5 text-[11px] font-bold">SOS</span>
      </span>
    );
  }
  return (
    <span className="flex flex-col items-center">
      <span className="text-base font-bold leading-none text-ink tabular-nums">{item.slot ?? "--:--"}</span>
      {item.day && dayDiff(item.day, today) < 0 ? (
        <span className="mt-1 text-[11px] font-semibold text-rose-600">
          {item.day.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
        </span>
      ) : null}
    </span>
  );
}

export function ScheduleScreen({ onOpenTask }: ScheduleScreenProps) {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const { fetchApi } = await import("@/lib/api-client");
      const res = await fetchApi<{ items?: unknown[] }>("/repair-requests/technician/me");
      setTasks(Array.isArray(res?.items) ? res.items.map(mapApiTask) : []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải lịch hẹn.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch plus a slow background refresh; state updates happen after the request resolves.
    const first = setTimeout(load, 0);
    const interval = setInterval(load, REFRESH_MS);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [load]);

  const today = useMemo(() => startOfDay(new Date()), []);
  const groups = useMemo(() => (tasks ? groupSchedule(tasks, today) : []), [tasks, today]);
  const total = groups.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <div className="space-y-5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink">Lịch hẹn</h2>
          <p className="mt-0.5 text-xs text-slate-600">
            {tasks === null ? "Đang tải..." : total ? `${total} công việc đang chờ bạn` : "Không có lịch hẹn nào"}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={refreshing}
          className="flex size-9 items-center justify-center rounded-control border border-line bg-white text-slate-600 hover:bg-slate-50 cursor-pointer disabled:cursor-wait"
          aria-label="Làm mới lịch hẹn"
        >
          <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && tasks === null ? (
        <EmptyState
          icon={<CalendarDays />}
          title="Không tải được lịch hẹn"
          description={error}
          action={
            <button type="button" onClick={load} className="text-sm font-semibold text-brand-700 hover:underline cursor-pointer">
              Thử lại
            </button>
          }
        />
      ) : tasks === null ? (
        <div className="space-y-3" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-card bg-slate-200/70" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<CalendarDays />}
          title="Chưa có lịch hẹn"
          description="Khi bạn nhận một yêu cầu sửa chữa, lịch hẹn với khách sẽ hiện ở đây."
        />
      ) : (
        groups.map((group) => (
          <section key={group.key} className="space-y-2.5">
            <h3
              className={`text-xs font-bold ${
                group.tone === "urgent" ? "text-rose-700" : group.tone === "overdue" ? "text-amber-800" : "text-slate-600"
              }`}
            >
              {group.label} ({group.items.length})
            </h3>
            {group.items.map((item) => (
              <Card key={item.task.id} padded={false} interactive className="flex items-stretch">
                <div className="flex w-16 shrink-0 items-center justify-center border-r border-line">
                  <SlotColumn item={item} today={today} />
                </div>
                <button
                  type="button"
                  onClick={() => onOpenTask(item.task)}
                  className="min-w-0 flex-1 p-3.5 text-left cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="truncate text-sm font-bold text-ink">{item.task.customerName}</span>
                    <StatusBadge status={item.task.rawStatus ?? item.task.status} className="shrink-0" />
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-600">{item.task.serviceName}</p>
                  <p className="mt-1.5 flex items-start gap-1 text-xs text-slate-500">
                    <MapPin className="mt-px size-3.5 shrink-0" />
                    <span className="line-clamp-2">{item.task.address}</span>
                  </p>
                </button>
                <div className="flex flex-col items-center justify-center gap-1 pr-2">
                  {item.task.customerPhone ? (
                    <a
                      href={`tel:${item.task.customerPhone}`}
                      className="flex size-9 items-center justify-center rounded-full bg-brand-50 text-brand-700 hover:bg-brand-100"
                      aria-label={`Gọi ${item.task.customerName}`}
                    >
                      <Phone className="size-4" />
                    </a>
                  ) : null}
                  <ChevronRight className="size-4 text-slate-400" aria-hidden />
                </div>
              </Card>
            ))}
          </section>
        ))
      )}
    </div>
  );
}
