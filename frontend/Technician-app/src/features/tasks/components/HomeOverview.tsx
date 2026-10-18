"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ChevronRight, ClipboardList, Siren, Star, Wallet } from "lucide-react";
import { Card, EmptyState, StatusBadge } from "@h-mobility/ui";
import type { Task } from "@/types/task";

interface TechnicianSummary {
  fullName: string;
  isOnline: boolean;
  rating: number | null;
  jobsDone: number | null;
}

const OPEN_STATUSES = new Set([
  "WAITING_ACCEPT",
  "PENDING",
  "IN_PROGRESS",
  "WAITING_MOVE",
  "MOVING",
  "ARRIVED",
  "WAITING_CONFIRM",
  "DIAGNOSING",
  "WAITING_FOR_APPROVAL",
  "ESTIMATE_APPROVED",
  "ESTIMATE_REJECTED",
  "REPAIRING",
]);

function greeting(hour: number) {
  if (hour < 11) return "Chào buổi sáng";
  if (hour < 13) return "Chào buổi trưa";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

const givenName = (fullName: string) => fullName.trim().split(/\s+/).pop() ?? fullName;

interface HomeOverviewProps {
  tasks: Task[];
  onOpenTask: (task: Task) => void;
  onViewAll: () => void;
}

export function HomeOverview({ tasks, onOpenTask, onViewAll }: HomeOverviewProps) {
  const [summary, setSummary] = useState<TechnicianSummary | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { fetchApi, getUserInfo } = await import("@/lib/api-client");
      const cachedName = getUserInfo()?.name || "Kỹ thuật viên";
      try {
        const me = await fetchApi<any>("/technicians/me");
        if (!alive) return;
        setSummary({
          fullName: me?.user?.full_name || cachedName,
          isOnline: me?.is_online === true,
          rating: me?.rating_avg != null ? Number(me.rating_avg) : null,
          jobsDone: me?.total_jobs_done != null ? Number(me.total_jobs_done) : null,
        });
      } catch {
        if (alive) setSummary({ fullName: cachedName, isOnline: false, rating: null, jobsDone: null });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const stats = useMemo(() => {
    const open = tasks.filter((t) => OPEN_STATUSES.has(t.status));
    const completed = tasks.filter((t) => t.status === "COMPLETED");
    // Ưu tiên công việc mới chờ xác nhận lên đầu
    const upcoming = [...open].sort(
      (a, b) => Number(b.status === "WAITING_ACCEPT") - Number(a.status === "WAITING_ACCEPT"),
    );
    return {
      upcoming,
      waiting: tasks.filter((t) => t.status === "WAITING_ACCEPT" || t.status === "PENDING").length,
      sos: open.filter((t) => t.isEmergency).length,
      completed: completed.length,
      revenue: completed.reduce((sum, t) => sum + Number(t.totalAmount || 0), 0),
    };
  }, [tasks]);

  return (
    <div className="space-y-4 px-4 pt-1">
      <section className="relative isolate overflow-hidden rounded-card bg-brand-950 text-white shadow-card">
        <Image src="/images/s1.jpg" alt="" fill priority sizes="430px" className="-z-10 object-cover object-right opacity-80" />
        <div className="absolute inset-0 -z-10 bg-linear-to-r from-brand-950 via-brand-950/85 to-brand-950/10" aria-hidden />
        <div className="max-w-[70%] px-4 py-5">
          {summary ? (
            <h1 className="text-xl font-bold leading-tight">
              {greeting(new Date().getHours())}, {givenName(summary.fullName)}
            </h1>
          ) : (
            <div className="h-6 w-40 animate-pulse rounded-md bg-white/20" aria-hidden />
          )}
          <p className="mt-1.5 text-[13px] leading-relaxed text-brand-100">
            Đội kỹ thuật H-Mobility Care sửa chữa và cứu hộ xe tận nơi.
          </p>
          <span
            className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
              summary?.isOnline === false ? "bg-white/15 text-brand-100" : "bg-emerald-500/20 text-emerald-200"
            }`}
          >
            <span
              className={`size-2 rounded-full ${summary?.isOnline === false ? "bg-slate-400" : "bg-emerald-400"}`}
              aria-hidden
            />
            {summary?.isOnline === false ? "Đang ngoại tuyến" : "Đang nhận việc"}
          </span>
        </div>
      </section>

      <section aria-label="Thống kê công việc" className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onViewAll}
          className="row-span-2 flex min-h-50 flex-col justify-between rounded-card bg-brand-600 p-4 text-left text-white shadow-card transition-[background-color,transform] hover:bg-brand-700 active:scale-[0.98] cursor-pointer"
        >
          <span className="flex size-10 items-center justify-center rounded-control bg-white/15">
            <ClipboardList className="size-5" />
          </span>
          <span>
            <span className="block text-4xl font-bold leading-none tabular-nums">{stats.upcoming.length}</span>
            <span className="mt-1.5 block text-base font-bold">Việc cần xử lý</span>
            <span className="mt-1 block text-xs text-brand-100">
              {stats.waiting} chờ bắt đầu{stats.sos ? `, ${stats.sos} SOS` : ""}
            </span>
          </span>
        </button>

        <StatTile
          icon={<Star className="size-4 fill-amber-400 text-amber-400" />}
          iconClass="bg-amber-50"
          label="Đánh giá"
          value={summary ? (summary.rating != null ? summary.rating.toFixed(1) : "Chưa có") : null}
          unit={summary?.rating != null ? "/ 5" : undefined}
        />
        <StatTile
          icon={<Wallet className="size-4" />}
          iconClass="bg-brand-50 text-brand-700"
          label="Doanh thu"
          value={summary ? `${stats.revenue.toLocaleString("vi-VN")} đ` : null}
          note={summary ? `${summary.jobsDone ?? stats.completed} ca hoàn thành` : undefined}
        />
      </section>

      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Việc cần làm</h2>
          {stats.upcoming.length ? (
            <button
              type="button"
              onClick={onViewAll}
              className="flex items-center text-[13px] font-semibold text-brand-700 hover:underline cursor-pointer"
            >
              Xem tất cả <ChevronRight className="size-4" />
            </button>
          ) : null}
        </div>

        {stats.upcoming.length === 0 ? (
          <EmptyState
            icon={<ClipboardList />}
            title="Chưa có việc cần làm"
            description="Yêu cầu mới được phân công cho bạn sẽ hiện ở đây."
          />
        ) : (
          <Card padded={false} className="divide-y divide-line">
            {stats.upcoming.slice(0, 3).map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => onOpenTask(task)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 cursor-pointer"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                    {task.isEmergency ? <Siren className="size-3.5 shrink-0 text-rose-600" aria-label="SOS" /> : null}
                    <span className="truncate">{task.customerName}</span>
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {task.serviceName}
                    {task.time ? ` · ${task.time}` : ""}
                  </p>
                </div>
                <StatusBadge status={task.status} label={task.statusText} className="shrink-0" />
              </button>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}

function StatTile({
  icon,
  iconClass,
  label,
  value,
  unit,
  note,
}: {
  icon: React.ReactNode;
  iconClass: string;
  label: string;
  value: string | null;
  unit?: string;
  note?: string;
}) {
  return (
    <div className="rounded-card border border-line bg-surface p-3.5 shadow-card">
      <span className={`flex size-8 items-center justify-center rounded-lg ${iconClass}`}>{icon}</span>
      <p className="mt-2.5 text-xs text-slate-500">{label}</p>
      {value === null ? (
        <div className="mt-1 h-6 w-16 animate-pulse rounded-md bg-slate-200" aria-hidden />
      ) : (
        <p className="truncate text-base font-bold leading-tight tabular-nums text-ink">
          {value}
          {unit ? <span className="text-xs font-medium text-slate-500"> {unit}</span> : null}
        </p>
      )}
      {note ? <p className="mt-0.5 truncate text-xs text-slate-500">{note}</p> : null}
    </div>
  );
}
