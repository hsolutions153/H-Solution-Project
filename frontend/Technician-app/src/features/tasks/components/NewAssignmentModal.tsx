'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Task } from '@/types/task';
import { MapPin, TriangleAlert, CalendarCheck, CarFront, CircleCheck, Timer } from 'lucide-react';
import { Button } from '@h-mobility/ui';
import { Modal } from '@/components/ui';

interface NewAssignmentModalProps {
  isOpen: boolean;
  task: Task | null;
  onClose: () => void;
  onAccept: (taskId: string) => void;
  onReject: (taskId: string) => void; // Trigger mở Modal Xác nhận Từ chối thủ công
  onTimeout?: (taskId: string) => void; // Tự động xử lý khi hết 2 phút
}

interface RouteEstimate {
  distance_meters: number;
  duration_seconds: number;
}

export const NewAssignmentModal = ({
  isOpen,
  task,
  onClose,
  onAccept,
  onReject,
  onTimeout,
}: NewAssignmentModalProps) => {
  const [timeLeft, setTimeLeft] = useState(120); // 2 phút đếm ngược
  const [route, setRoute] = useState<RouteEstimate | null>(null);
  const [routeError, setRouteError] = useState(false);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const taskId = task?.id;
  // Callback từ màn cha được tạo mới mỗi lần render (polling 3 giây/lần). Giữ
  // chúng trong ref để bộ đếm không bị reset về 2 phút sau mỗi lần render.
  const expireRef = useRef({ onReject, onTimeout });
  expireRef.current = { onReject, onTimeout };

  useEffect(() => {
    if (!isOpen || !taskId) return;

    // Reset về 2 phút (120 giây) mỗi lần nhận phân công mới (theo taskId)
    setTimeLeft(120);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          const { onReject: reject, onTimeout: timeout } = expireRef.current;
          if (timeout) {
            timeout(taskId);
          } else {
            reject(taskId);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, taskId]);

  useEffect(() => {
    if (!isOpen || !taskId) return;

    let cancelled = false;
    setRoute(null);
    setRouteError(false);
    setIsLoadingRoute(true);

    const loadRoute = async () => {
      try {
        const { fetchApi } = await import("@/lib/api-client");
        const result = await fetchApi<RouteEstimate>(`/repair-requests/${taskId}/route`);
        if (!cancelled) setRoute(result);
      } catch (error: any) {
        if (error?.status !== 403) {
          console.warn("Không thể tính lộ trình Mapbox:", error);
        }
        if (!cancelled) setRouteError(true);
      } finally {
        if (!cancelled) setIsLoadingRoute(false);
      }
    };

    loadRoute();
    return () => {
      cancelled = true;
    };
  }, [isOpen, taskId]);

  if (!isOpen || !task) return null;

  const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const seconds = String(timeLeft % 60).padStart(2, '0');
  const urgent = timeLeft <= 60;

  return (
    <Modal
      open
      onClose={onClose}
      variant="sheet"
      title={
        <span className="flex items-center gap-2.5">
          Yêu cầu mới
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-bold tabular-nums ${
              urgent ? 'bg-rose-50 text-rose-700' : 'bg-brand-50 text-brand-700'
            }`}
            aria-label={`Còn ${minutes} phút ${seconds} giây để phản hồi`}
          >
            <Timer className="size-4" />
            {minutes}:{seconds}
          </span>
        </span>
      }
    >
      <div className="divide-y divide-line">
        <div className="flex gap-3 pb-3.5">
          <MapPin className="mt-0.5 size-5 shrink-0 text-brand-600" />
          <div className="min-w-0">
            <p className="text-xs text-slate-500">Địa điểm khách hàng</p>
            <p className="mt-0.5 text-sm font-bold leading-snug text-ink">{task.address}</p>
            <p className="mt-0.5 text-[13px] text-slate-600">
              Khách hàng: <span className="font-semibold text-slate-800">{task.customerName}</span>
            </p>
          </div>
        </div>

        <div className="flex gap-3 py-3.5">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div className="min-w-0">
            <p className="text-xs text-slate-500">Lỗi dự kiến</p>
            <p className="mt-0.5 text-sm font-bold leading-snug text-ink">{task.serviceName}</p>
            {task.urgency && (
              <p className="mt-0.5 text-[13px] text-slate-600">
                Mức độ ưu tiên: <span className="font-bold text-rose-700">{task.urgency}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3 py-3.5">
          <CalendarCheck className="mt-0.5 size-5 shrink-0 text-brand-600" />
          <div className="min-w-0">
            <p className="text-xs text-slate-500">Thời gian yêu cầu</p>
            <p className="mt-0.5 text-sm font-bold text-ink tabular-nums">{task.requestedTime || task.time}</p>
          </div>
        </div>
      </div>

      <div className="mt-1 flex items-center justify-between gap-3 rounded-control bg-slate-100 px-3.5 py-3 text-[13px]">
        <span className="flex items-center gap-2 text-slate-600">
          <CarFront className="size-4 text-slate-500" />
          Khoảng cách <strong className="font-bold text-ink">{isLoadingRoute ? "Đang tính…" : route ? `${(route.distance_meters / 1000).toFixed(1)} km` : "Chưa có dữ liệu"}</strong>
        </span>
        <span className="font-semibold text-slate-700">{isLoadingRoute ? "" : route ? `~ ${Math.ceil(route.duration_seconds / 60)} phút di chuyển` : routeError ? "Không tính được lộ trình" : ""}</span>
      </div>

      <div className="mt-5 grid grid-cols-[1fr_2fr] gap-2.5">
        <Button size="lg" variant="secondary" onClick={() => onReject(task.id)}>
          Từ chối
        </Button>
        <Button size="lg" icon={<CircleCheck className="size-5" />} onClick={() => onAccept(task.id)}>
          Chấp nhận
        </Button>
      </div>
    </Modal>
  );
};
