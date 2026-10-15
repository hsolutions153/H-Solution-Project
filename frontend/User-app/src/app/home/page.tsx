"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bike, CalendarPlus, ChevronRight, Clock3, Plus, ShieldCheck, Siren, Wrench } from "lucide-react";
import { Card, EmptyState, StatusBadge } from "@h-mobility/ui";
import { HomeShell } from "@/components/home/home-shell";
import { getServiceTitle } from "@/components/home/history/history-list";

interface PrimaryDevice {
  name: string;
  model: string;
}

interface RecentRequest {
  id: string;
  code: string;
  title: string;
  status: string;
  createdAt: Date | null;
  isSos: boolean;
}

function greeting(hour: number) {
  if (hour < 11) return "Chào buổi sáng";
  if (hour < 13) return "Chào buổi trưa";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

/** Vietnamese names put the given name last: "Phạm Thị Hương" -> "Hương". */
const givenName = (fullName: string) => fullName.trim().split(/\s+/).pop() ?? fullName;

const formatDate = (d: Date | null) =>
  d ? d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }) : "";

/**
 * Customer home. Same layout as the Technician-app home (hero, 1 tall + 2 small
 * tiles, short list), plus the one-tap SOS button customers rely on.
 */
export default function HomePage() {
  const [name, setName] = useState<string | null>(null);
  const [device, setDevice] = useState<PrimaryDevice | null | undefined>(undefined);
  const [requests, setRequests] = useState<RecentRequest[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { fetchApi, getUserInfo } = await import("@/lib/api-client");
      setName(givenName(getUserInfo()?.name || "bạn"));

      const [devices, reqs] = await Promise.allSettled([
        fetchApi<any[]>("/devices"),
        fetchApi<{ items?: any[] }>("/repair-requests/me?page=1&limit=5"),
      ]);
      if (!alive) return;

      if (devices.status === "fulfilled" && Array.isArray(devices.value) && devices.value.length > 0) {
        const item = devices.value.find((d: any) => d.is_default) || devices.value[0];
        const hasCustomNotes = item.notes && !item.notes.includes(":") && item.notes.length < 50;
        setDevice({
          name: item.nickname || item.name || (hasCustomNotes ? item.notes : "") || "Xe máy điện",
          model: [item.manufacturer !== "Generic" ? item.manufacturer : "", item.model_name || item.model]
            .filter(Boolean)
            .join(" ") || "Xe máy điện",
        });
      } else {
        setDevice(null);
      }

      const items = reqs.status === "fulfilled" && Array.isArray(reqs.value?.items) ? reqs.value.items : [];
      setRequests(
        items.map((item: any) => ({
          id: item.id,
          code: item.request_code || item.id,
          title: getServiceTitle(Boolean(item.is_sos), item.issue_type, item.issue_description),
          status: String(item.status || "REQUESTED").toUpperCase(),
          createdAt: item.created_at ? new Date(item.created_at) : null,
          isSos: Boolean(item.is_sos),
        })),
      );
    })();
    return () => {
      alive = false;
    };
  }, []);

  const completedCount = requests?.filter((r) => r.status === "COMPLETED").length ?? 0;

  return (
    <HomeShell activeNav="home">
      <div className="mx-auto w-full max-w-[480px] space-y-4 pb-4">
        <section className="relative isolate overflow-hidden rounded-card bg-brand-950 text-white shadow-card">
          <Image src="/repair-photo-1.png" alt="" fill priority sizes="480px" className="-z-10 object-cover object-right opacity-80" />
          <div className="absolute inset-0 -z-10 bg-linear-to-r from-brand-950 via-brand-950/85 to-brand-950/10" aria-hidden />
          <div className="max-w-[70%] px-4 py-5">
            {name ? (
              <h1 className="text-xl font-bold leading-tight">
                {greeting(new Date().getHours())}, {name}
              </h1>
            ) : (
              <div className="h-6 w-40 animate-pulse rounded-md bg-white/20" aria-hidden />
            )}
            <p className="mt-1.5 text-[13px] leading-relaxed text-brand-100">
              Kỹ thuật viên H-Mobility Care đến tận nơi khi xe gặp sự cố.
            </p>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-brand-100">
              <ShieldCheck className="size-3.5" />
              Cứu hộ 24/7
            </span>
          </div>
        </section>

        <section className="sos-section">
          <div className="sos-outer">
            <Link href="/home/sos" className="sos-button" aria-label="Nút gọi trợ giúp khẩn cấp SOS">
              <div className="sos-icon">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <rect x="20" y="4" width="8" height="40" rx="4" fill="white" />
                  <rect x="4" y="20" width="40" height="8" rx="4" fill="white" />
                  <rect x="8.69" y="13.03" width="8" height="30" rx="4" transform="rotate(-45 8.69 13.03)" fill="white" />
                  <rect x="13.03" y="34.24" width="8" height="30" rx="4" transform="rotate(-135 13.03 34.24)" fill="white" />
                </svg>
              </div>
              <span className="sos-text">SOS</span>
              <span className="sos-subtext">Trợ giúp 1 chạm</span>
            </Link>
          </div>
          <p className="sos-hint">Chạm để nhận trợ giúp khẩn cấp</p>
        </section>

        <section aria-label="Lối tắt" className="grid grid-cols-2 gap-3">
          <Link
            href="/home/booking"
            className="row-span-2 flex min-h-[200px] flex-col justify-between rounded-card bg-brand-600 p-4 text-white shadow-card transition-[background-color,transform] hover:bg-brand-700 active:scale-[0.98]"
          >
            <span className="flex size-10 items-center justify-center rounded-control bg-white/15">
              <CalendarPlus className="size-5" />
            </span>
            <span>
              <span className="block text-base font-bold leading-tight">Đặt lịch sửa chữa</span>
              <span className="mt-1 block text-xs text-brand-100">Chọn giờ, kỹ thuật viên đến tận nhà</span>
            </span>
          </Link>

          <ShortcutTile
            href={device === null ? "/home/device/new" : "/home/device"}
            icon={device === null ? <Plus className="size-4" /> : <Bike className="size-4" />}
            label="Xe của tôi"
            value={device === undefined ? null : device ? device.name : "Thêm xe"}
            note={device ? device.model : device === null ? "Để gọi cứu hộ nhanh hơn" : undefined}
          />
          <ShortcutTile
            href="/home/history"
            icon={<Clock3 className="size-4" />}
            label="Lịch sử sửa chữa"
            value={requests === null ? null : String(completedCount)}
            unit="đơn"
            note="đã hoàn thành"
          />
        </section>

        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Yêu cầu gần đây</h2>
            {requests?.length ? (
              <Link href="/home/history" className="flex items-center text-[13px] font-semibold text-brand-700 hover:underline">
                Xem tất cả <ChevronRight className="size-4" />
              </Link>
            ) : null}
          </div>

          {requests === null ? (
            <div className="space-y-2" aria-hidden>
              {[0, 1].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-card bg-slate-200/70" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <EmptyState
              icon={<Wrench />}
              title="Chưa có yêu cầu nào"
              description="Khi bạn đặt lịch hoặc gọi cứu hộ, yêu cầu sẽ hiện ở đây."
            />
          ) : (
            <Card padded={false} className="divide-y divide-line">
              {requests.slice(0, 3).map((r) => (
                <Link
                  key={r.id}
                  href={`/home/history/${r.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                      {r.isSos ? <Siren className="size-3.5 shrink-0 text-rose-600" aria-label="SOS" /> : null}
                      <span className="truncate">{r.title}</span>
                    </p>
                    <p className="truncate text-xs text-slate-500 tabular-nums">
                      #{r.code}
                      {r.createdAt ? ` · ${formatDate(r.createdAt)}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={r.status} className="shrink-0" />
                </Link>
              ))}
            </Card>
          )}
        </section>
      </div>
    </HomeShell>
  );
}

/** Small home tile, same shape as the Technician-app stat tiles. */
function ShortcutTile({
  href,
  icon,
  label,
  value,
  unit,
  note,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: string | null;
  unit?: string;
  note?: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-card border border-line bg-surface p-3.5 shadow-card transition-shadow hover:shadow-raised"
    >
      <span className="flex size-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">{icon}</span>
      <p className="mt-2.5 text-xs text-slate-500">{label}</p>
      {value === null ? (
        <div className="mt-1 h-6 w-16 animate-pulse rounded-md bg-slate-200" aria-hidden />
      ) : (
        <p className="truncate text-base font-bold leading-tight text-ink">
          {value}
          {unit ? <span className="text-xs font-medium text-slate-500"> {unit}</span> : null}
        </p>
      )}
      {note ? <p className="mt-0.5 truncate text-xs text-slate-500">{note}</p> : null}
    </Link>
  );
}
