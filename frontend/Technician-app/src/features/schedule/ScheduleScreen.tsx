"use client";

import { mapApiTask, parseAppointment } from "@/features/tasks/mapApiTask";
import type { Task } from "@/types/task";
import { Card, EmptyState, StatusBadge } from "@h-mobility/ui";
import {
  Calendar as CalendarIcon,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  MapPin,
  Phone,
  RefreshCw,
  Siren,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

/** Requests that no longer need the technician to show up. */
const CLOSED_STATUSES = new Set(["COMPLETED", "CANCELLED", "REJECTED", "ESTIMATE_REJECTED"]);
const REFRESH_MS = 30_000;
const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

interface ProcessedItem {
  task: Task;
  day: Date | null;
  slot: string | null;
  isEmergency: boolean;
  dateKey: string | null;
}

interface ScheduleScreenProps {
  /** Opens the job in the task flow (detail screen on the Home tab). */
  onOpenTask: (task: Task) => void;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const dayDiff = (a: Date, b: Date) => Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86_400_000);

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayLabel(day: Date, today: Date): string {
  const date = day.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  const diff = dayDiff(day, today);
  if (diff === 0) return `Hôm nay, ${date}`;
  if (diff === 1) return `Ngày mai, ${date}`;
  if (diff === -1) return `Hôm qua, ${date}`;
  const weekday = day.toLocaleDateString("vi-VN", { weekday: "long" });
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${date}`;
}

function SlotColumn({ item, today }: { item: ProcessedItem; today: Date }) {
  if (item.task.isEmergency) {
    return (
      <span className="flex flex-col items-center text-rose-600">
        <Siren className="size-5 animate-pulse" />
        <span className="mt-0.5 text-[11px] font-bold">SOS</span>
      </span>
    );
  }
  return (
    <span className="flex flex-col items-center">
      <span className="text-base font-bold leading-none text-ink tabular-nums">{item.slot ?? "--:--"}</span>
      {item.day && dayDiff(item.day, today) < 0 ? (
        <span className="mt-1 text-[10px] font-semibold text-rose-600">Quá hẹn</span>
      ) : null}
    </span>
  );
}

export function ScheduleScreen({ onOpenTask }: ScheduleScreenProps) {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Today reference
  const today = useMemo(() => startOfDay(new Date()), []);

  // Calendar month state & selected date
  const [currentMonth, setCurrentMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => startOfDay(new Date()));
  const [viewMode, setViewMode] = useState<"day" | "month">("day");
  const [isSosExpanded, setIsSosExpanded] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const { fetchApi, getAuthToken } = await import("@/lib/api-client");
      if (!getAuthToken()) {
        setRefreshing(false);
        return;
      }
      const res = await fetchApi<{ items: unknown[] }>("/repair-requests/technician/me?limit=50");
      setTasks(Array.isArray(res?.items) ? res.items.map(mapApiTask) : []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải lịch hẹn.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const interval = setInterval(load, REFRESH_MS);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [load]);

  // Process all tasks into structured schedule items
  const { allItems, activeSosTasks, tasksByDateKey } = useMemo(() => {
    const allItems: ProcessedItem[] = [];
    const activeSosTasks: ProcessedItem[] = [];
    const tasksByDateKey = new Map<string, { sos: ProcessedItem[]; regular: ProcessedItem[] }>();

    if (!tasks) return { allItems, activeSosTasks, tasksByDateKey };

    for (const task of tasks) {
      if (CLOSED_STATUSES.has(task.rawStatus ?? "")) continue;

      const isEmergency = Boolean(task.isEmergency);
      let day: Date | null = null;
      let slot: string | null = null;

      if (isEmergency) {
        day = task.createdAt ? startOfDay(new Date(task.createdAt)) : today;
      } else {
        const parsed = parseAppointment(task);
        day = parsed.day;
        slot = parsed.slot;
      }

      const dateKey = day ? toDateKey(day) : null;
      const item: ProcessedItem = { task, day, slot, isEmergency, dateKey };
      allItems.push(item);

      if (isEmergency) {
        activeSosTasks.push(item);
      }

      if (dateKey) {
        const bucket = tasksByDateKey.get(dateKey) ?? { sos: [], regular: [] };
        if (isEmergency) {
          bucket.sos.push(item);
        } else {
          bucket.regular.push(item);
        }
        tasksByDateKey.set(dateKey, bucket);
      }
    }

    return { allItems, activeSosTasks, tasksByDateKey };
  }, [tasks, today]);

  // Calendar grid builder for current month
  const calendarGrid = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    // Convert Sunday (0) to 6, Monday (1) to 0
    const startPadding = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: {
      date: Date;
      dayNumber: number;
      inCurrentMonth: boolean;
      isToday: boolean;
      dateKey: string;
      hasSos: boolean;
      hasRegular: boolean;
      count: number;
    }[] = [];

    // Pad days from previous month
    for (let i = startPadding - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, daysInPrevMonth - i);
      const key = toDateKey(d);
      const data = tasksByDateKey.get(key);
      cells.push({
        date: d,
        dayNumber: d.getDate(),
        inCurrentMonth: false,
        isToday: dayDiff(d, today) === 0,
        dateKey: key,
        hasSos: (data?.sos.length ?? 0) > 0,
        hasRegular: (data?.regular.length ?? 0) > 0,
        count: (data?.sos.length ?? 0) + (data?.regular.length ?? 0),
      });
    }

    // Days in current month
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const key = toDateKey(d);
      const data = tasksByDateKey.get(key);
      cells.push({
        date: d,
        dayNumber: day,
        inCurrentMonth: true,
        isToday: dayDiff(d, today) === 0,
        dateKey: key,
        hasSos: (data?.sos.length ?? 0) > 0,
        hasRegular: (data?.regular.length ?? 0) > 0,
        count: (data?.sos.length ?? 0) + (data?.regular.length ?? 0),
      });
    }

    // Pad days for next month to finish the grid row
    const totalCells = Math.ceil(cells.length / 7) * 7;
    const nextPadding = totalCells - cells.length;
    for (let day = 1; day <= nextPadding; day++) {
      const d = new Date(year, month + 1, day);
      const key = toDateKey(d);
      const data = tasksByDateKey.get(key);
      cells.push({
        date: d,
        dayNumber: day,
        inCurrentMonth: false,
        isToday: dayDiff(d, today) === 0,
        dateKey: key,
        hasSos: (data?.sos.length ?? 0) > 0,
        hasRegular: (data?.regular.length ?? 0) > 0,
        count: (data?.sos.length ?? 0) + (data?.regular.length ?? 0),
      });
    }

    return cells;
  }, [currentMonth, tasksByDateKey, today]);

  // Tasks for current month
  const monthRegularTasks = useMemo(() => {
    const curYear = currentMonth.getFullYear();
    const curMonth = currentMonth.getMonth();
    return allItems
      .filter((item) => {
        if (item.isEmergency) return false;
        if (!item.day) return true; // Include unscheduled
        return item.day.getFullYear() === curYear && item.day.getMonth() === curMonth;
      })
      .sort((a, b) => {
        if (!a.day && !b.day) return 0;
        if (!a.day) return 1;
        if (!b.day) return -1;
        const diff = a.day.getTime() - b.day.getTime();
        if (diff !== 0) return diff;
        return (a.slot ?? "99:99").localeCompare(b.slot ?? "99:99");
      });
  }, [allItems, currentMonth]);

  // Tasks for currently selected date
  const selectedDateTasks = useMemo(() => {
    if (!selectedDate) return [];
    const key = toDateKey(selectedDate);
    const regular = tasksByDateKey.get(key)?.regular ?? [];
    return [...regular].sort((a, b) => (a.slot ?? "99:99").localeCompare(b.slot ?? "99:99"));
  }, [selectedDate, tasksByDateKey]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleGoToday = () => {
    setCurrentMonth(startOfMonth(today));
    setSelectedDate(today);
    setViewMode("day");
  };

  const handleSelectCell = (cell: (typeof calendarGrid)[0]) => {
    setSelectedDate(cell.date);
    setViewMode("day");
    if (!cell.inCurrentMonth) {
      setCurrentMonth(startOfMonth(cell.date));
    }
  };

  const selectedDateKey = selectedDate ? toDateKey(selectedDate) : null;
  const isViewingCurrentMonth =
    currentMonth.getFullYear() === today.getFullYear() && currentMonth.getMonth() === today.getMonth();
  const isTodayActive = isViewingCurrentMonth && selectedDate && dayDiff(selectedDate, today) === 0;

  return (
    <div className="space-y-4 p-4">
      {/* ── Page Header ── */}
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-ink">Lịch hẹn</h2>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleGoToday}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer shadow-xs transition-colors ${
                isTodayActive
                  ? "border-brand-200 bg-brand-50 text-brand-700 font-bold"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
              }`}
              title="Quay lại ngày hôm nay"
            >
              <CalendarIcon className={`size-3.5 ${isTodayActive ? "text-brand-600" : "text-slate-400"}`} />
              <span>Hôm nay</span>
            </button>
            <button
              type="button"
              onClick={load}
              disabled={refreshing}
              className="flex size-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 cursor-pointer disabled:cursor-wait shadow-xs transition-colors"
              aria-label="Làm mới lịch hẹn"
              title="Làm mới lịch hẹn"
            >
              <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-500 leading-normal">
          {tasks === null
            ? "Đang tải dữ liệu..."
            : `${allItems.length} công việc đang chờ bạn (${activeSosTasks.length} SOS, ${allItems.length - activeSosTasks.length} lịch hẹn)`}
        </p>
      </div>

      {/* ── Mini Month Calendar Grid ── */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
        {/* Month Header Controller */}
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer transition-colors"
            aria-label="Tháng trước"
          >
            <ChevronLeft className="size-4" />
          </button>

          <span className="text-sm font-bold text-ink">
            Tháng {currentMonth.getMonth() + 1}, {currentMonth.getFullYear()}
          </span>

          <button
            type="button"
            onClick={handleNextMonth}
            className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer transition-colors"
            aria-label="Tháng sau"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        {/* Weekday Labels */}
        <div className="mb-1.5 grid grid-cols-7 text-center">
          {WEEKDAYS.map((wd) => (
            <span key={wd} className="text-[11px] font-semibold text-slate-400">
              {wd}
            </span>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarGrid.map((cell) => {
            const isSelected = selectedDateKey === cell.dateKey;
            return (
              <button
                key={cell.dateKey}
                type="button"
                onClick={() => handleSelectCell(cell)}
                className={`relative flex h-10 w-full flex-col items-center justify-center rounded-xl text-xs transition-all cursor-pointer ${
                  isSelected
                    ? "bg-brand-600 font-bold text-white shadow-xs shadow-brand-500/30"
                    : cell.isToday
                    ? "border-2 border-brand-500 bg-brand-50/50 font-bold text-brand-800"
                    : cell.inCurrentMonth
                    ? "font-medium text-slate-700 hover:bg-slate-100"
                    : "text-slate-300 hover:bg-slate-50"
                }`}
              >
                <span>{cell.dayNumber}</span>

                {/* Dot Indicators */}
                <div className="mt-0.5 flex items-center justify-center gap-0.5">
                  {cell.hasSos && (
                    <span
                      className={`size-1.5 rounded-full ${
                        isSelected ? "bg-white" : "bg-rose-500 animate-pulse"
                      }`}
                      title="Có đơn SOS khẩn cấp"
                    />
                  )}
                  {cell.hasRegular && (
                    <span
                      className={`size-1.5 rounded-full ${isSelected ? "bg-white/80" : "bg-brand-500"}`}
                      title="Có lịch hẹn"
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* View Mode Switcher / Filter Pills */}
        <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-3">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setViewMode("day")}
              className={`rounded-full px-3 py-1 text-xs font-semibold cursor-pointer transition-colors ${
                viewMode === "day"
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              }`}
            >
              <CalendarIcon className="mr-1 inline-block size-3 -translate-y-px" />
              {selectedDate ? dayLabel(selectedDate, today).split(",")[0] : "Ngày đã chọn"}
            </button>
            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={`rounded-full px-3 py-1 text-xs font-semibold cursor-pointer transition-colors ${
                viewMode === "month"
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              }`}
            >
              Cả tháng ({monthRegularTasks.length})
            </button>
          </div>

          <span className="text-[11px] text-slate-400">
            {viewMode === "day" && selectedDate
              ? `${selectedDateTasks.length} việc ngày này`
              : `Tháng ${currentMonth.getMonth() + 1}`}
          </span>
        </div>
      </div>

      {/* ── Error & Loading States ── */}
      {error && tasks === null ? (
        <EmptyState
          icon={<CalendarDays />}
          title="Không tải được lịch hẹn"
          description={error}
          action={
            <button
              type="button"
              onClick={load}
              className="text-sm font-semibold text-brand-700 hover:underline cursor-pointer"
            >
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
      ) : (
        <>
          {/* ── PRIORITY 1: EMERGENCY SOS SECTION (Ghim ưu tiên cao nhất) ── */}
          {activeSosTasks.length > 0 && (
            (() => {
              const MAX_VISIBLE = 2;
              const hasMore = activeSosTasks.length > MAX_VISIBLE;
              const visibleTasks = isSosExpanded || !hasMore
                ? activeSosTasks
                : activeSosTasks.slice(0, MAX_VISIBLE);

              return (
                <section className="space-y-2.5 rounded-2xl border border-rose-200 bg-rose-50/50 p-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => hasMore && setIsSosExpanded((prev) => !prev)}
                      className={`flex items-center gap-1.5 text-rose-700 ${hasMore ? "cursor-pointer" : "cursor-default"}`}
                      title={hasMore ? (isSosExpanded ? "Thu gọn danh sách" : "Mở rộng danh sách") : undefined}
                    >
                      <Siren className="size-4 animate-bounce text-rose-600 shrink-0" />
                      <h3 className="text-xs font-bold uppercase tracking-wide">
                        Cứu hộ khẩn cấp ({activeSosTasks.length})
                      </h3>
                      {hasMore && (
                        <span className="text-rose-600 ml-0.5">
                          {isSosExpanded ? (
                            <ChevronUp className="size-3.5" />
                          ) : (
                            <ChevronDown className="size-3.5" />
                          )}
                        </span>
                      )}
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700 whitespace-nowrap">
                        Ưu tiên xử lý ngay
                      </span>
                      {hasMore && (
                        <button
                          type="button"
                          onClick={() => setIsSosExpanded((prev) => !prev)}
                          className="text-[11px] font-bold text-rose-600 hover:text-rose-800 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          {isSosExpanded ? "Thu gọn" : `+${activeSosTasks.length - MAX_VISIBLE}`}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {visibleTasks.map((item) => (
                      <Card
                        key={item.task.id}
                        padded={false}
                        interactive
                        className="flex items-stretch border-rose-200/80 bg-white"
                      >
                        <div className="flex w-16 shrink-0 items-center justify-center border-r border-rose-100 bg-rose-50/40">
                          <SlotColumn item={item} today={today} />
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenTask(item.task)}
                          className="min-w-0 flex-1 p-3 text-left cursor-pointer"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="truncate text-sm font-bold text-ink">{item.task.customerName}</span>
                            <StatusBadge status={item.task.rawStatus ?? item.task.status} className="shrink-0" />
                          </div>
                          <p className="mt-0.5 truncate text-xs font-semibold text-rose-600">{item.task.serviceName}</p>
                          <p className="mt-1 flex items-start gap-1 text-xs text-slate-500">
                            <MapPin className="mt-px size-3.5 shrink-0 text-slate-400" />
                            <span className="line-clamp-2">{item.task.address}</span>
                          </p>
                        </button>
                        <div className="flex flex-col items-center justify-center gap-1 pr-2">
                          {item.task.customerPhone ? (
                            <a
                              href={`tel:${item.task.customerPhone}`}
                              className="flex size-9 items-center justify-center rounded-full bg-rose-100 text-rose-700 hover:bg-rose-200 cursor-pointer"
                              aria-label={`Gọi ${item.task.customerName}`}
                            >
                              <Phone className="size-4" />
                            </a>
                          ) : null}
                          <ChevronRight className="size-4 text-slate-400" aria-hidden />
                        </div>
                      </Card>
                    ))}
                  </div>

                  {hasMore && (
                    <button
                      type="button"
                      onClick={() => setIsSosExpanded((prev) => !prev)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-rose-200/80 bg-white py-2 text-xs font-bold text-rose-700 shadow-2xs transition-all hover:bg-rose-100/60 cursor-pointer"
                    >
                      {isSosExpanded ? (
                        <>
                          <span>Thu gọn danh sách</span>
                          <ChevronUp className="size-3.5" />
                        </>
                      ) : (
                        <>
                          <span>Xem thêm {activeSosTasks.length - MAX_VISIBLE} đơn cứu hộ khác</span>
                          <ChevronDown className="size-3.5" />
                        </>
                      )}
                    </button>
                  )}
                </section>
              );
            })()
          )}

          {/* ── PRIORITY 2: SCHEDULED TASKS ── */}
          {viewMode === "day" && selectedDate ? (
            /* ── VIEW BY SELECTED DAY ── */
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700">
                  Lịch hẹn: {dayLabel(selectedDate, today)} ({selectedDateTasks.length})
                </h3>
                {selectedDateTasks.length > 0 && (
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="size-3" /> Sắp xếp theo giờ
                  </span>
                )}
              </div>

              {selectedDateTasks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white/60 p-6 text-center">
                  <CalendarDays className="mx-auto size-8 text-slate-300" />
                  <p className="mt-2 text-sm font-semibold text-slate-600">
                    Không có lịch hẹn vào {dayLabel(selectedDate, today).toLowerCase()}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Bạn có thể chọn ngày có dấu chấm trên lịch hoặc xem cả tháng.
                  </p>
                  <button
                    type="button"
                    onClick={() => setViewMode("month")}
                    className="mt-3 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 cursor-pointer"
                  >
                    Xem tất cả trong tháng ({monthRegularTasks.length})
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {selectedDateTasks.map((item) => (
                    <Card key={item.task.id} padded={false} interactive className="flex items-stretch">
                      <div className="flex w-16 shrink-0 items-center justify-center border-r border-line bg-slate-50/50">
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
                          <MapPin className="mt-px size-3.5 shrink-0 text-slate-400" />
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
                </div>
              )}
            </section>
          ) : (
            /* ── VIEW BY WHOLE MONTH ── */
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700">
                  Tất cả lịch hẹn Tháng {currentMonth.getMonth() + 1} ({monthRegularTasks.length})
                </h3>
                {selectedDate && (
                  <button
                    type="button"
                    onClick={() => setViewMode("day")}
                    className="text-xs font-semibold text-brand-700 hover:underline cursor-pointer"
                  >
                    Xem theo ngày
                  </button>
                )}
              </div>

              {monthRegularTasks.length === 0 ? (
                <EmptyState
                  icon={<CalendarDays />}
                  title="Chưa có lịch hẹn trong tháng này"
                  description={`Không có yêu cầu đặt lịch nào rơi vào Tháng ${currentMonth.getMonth() + 1}/${currentMonth.getFullYear()}.`}
                />
              ) : (
                <div className="space-y-2.5">
                  {monthRegularTasks.map((item) => (
                    <Card key={item.task.id} padded={false} interactive className="flex items-stretch">
                      <div className="flex w-16 shrink-0 flex-col items-center justify-center border-r border-line bg-slate-50/50 px-1 text-center">
                        <SlotColumn item={item} today={today} />
                        {item.day && (
                          <span className="mt-1 text-[10px] font-medium text-slate-500">
                            {item.day.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                          </span>
                        )}
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
                          <MapPin className="mt-px size-3.5 shrink-0 text-slate-400" />
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
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
