"use client";

import React, { useEffect, useState } from "react";
import { Task, TaskStatus } from "@/types/task";
import Image from "next/image";
import { X, CirclePlay, MapPin, CheckCircle2, Phone, Navigation2, Stethoscope } from "lucide-react";
import { Button, StatusBadge } from "@h-mobility/ui";

interface TravelModalProps {
  task: Task;
  onClose: () => void;
  onStatusChange: (
    taskId: string,
    status: TaskStatus,
    statusText: string,
    backendStatus?: string
  ) => void;
}

const STATUS_LABEL: Partial<Record<TaskStatus, string>> = {
  WAITING_MOVE: "Chờ di chuyển",
  MOVING: "Đang di chuyển",
  ARRIVED: "Đã đến nơi",
};

export const TravelMapModal: React.FC<TravelModalProps> = ({
  task,
  onClose,
  onStatusChange,
}) => {
  const [status, setStatus] = useState<TaskStatus>(task.status);

  useEffect(() => {
    setStatus(task.status);
  }, [task.status]);

  const handleNextStep = () => {
    if (status === "WAITING_MOVE") {
      const nextStatus: TaskStatus = "MOVING";
      setStatus(nextStatus);
      onStatusChange(task.id, nextStatus, "Đang di chuyển", "EN_ROUTE");
    } else if (status === "MOVING") {
      const nextStatus: TaskStatus = "ARRIVED";
      setStatus(nextStatus);
      onStatusChange(task.id, nextStatus, "Đã đến nơi", "ARRIVED");
    } else if (status === "ARRIVED") {
      const nextStatus: TaskStatus = "DIAGNOSING";
      setStatus(nextStatus);
      onStatusChange(task.id, nextStatus, "Đang chẩn đoán", "DIAGNOSING");
      onClose();
    }
  };

  return (
    <div className="anim-overlay fixed inset-0 z-50 flex flex-col bg-white" role="dialog" aria-modal="true" aria-label="Bản đồ di chuyển">
      <div className="relative flex-1 overflow-hidden bg-slate-100">
        <Image src="/images/roadmap.jpg" alt="Bản đồ hành trình" fill priority className="object-cover" />

        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng bản đồ"
          className="absolute top-[calc(1rem+env(safe-area-inset-top))] right-4 z-10 flex size-11 items-center justify-center rounded-full bg-white text-slate-700 shadow-raised transition-colors hover:bg-slate-50 cursor-pointer"
        >
          <X className="size-5" />
        </button>

        <div className="absolute bottom-[25%] left-[57%] z-10 flex -translate-x-1/2 translate-y-1/2 flex-col items-center">
          <span className="mb-1 whitespace-nowrap rounded-lg bg-brand-950 px-2 py-1 text-xs font-semibold text-white shadow-raised">
            Vị trí của bạn
          </span>
          <span className="flex size-9 items-center justify-center rounded-full border-[3px] border-white bg-brand-600 text-white shadow-raised">
            <Navigation2 className="size-4 fill-current" />
          </span>
        </div>

        <div className="absolute top-[15%] left-[33%] z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
          <span className="mb-1 max-w-40 truncate whitespace-nowrap rounded-lg bg-white px-2 py-1 text-xs font-semibold text-ink shadow-raised">
            {task.customerName}
          </span>
          <span className="flex size-9 items-center justify-center rounded-full border-[3px] border-white bg-rose-600 text-white shadow-raised">
            <MapPin className="size-4" />
          </span>
        </div>
      </div>

      <div className="anim-sheet relative -mt-6 space-y-4 rounded-t-sheet bg-white px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-nav">
        <div className="mx-auto h-1 w-10 rounded-full bg-slate-200" aria-hidden />

        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold tabular-nums text-slate-500">{task.code}</span>
          {STATUS_LABEL[status] ? (
            <StatusBadge status={status} label={STATUS_LABEL[status]} />
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-bold text-ink">{task.customerName}</h3>
            <p className="mt-0.5 flex items-start gap-1.5 text-[13px] text-slate-600">
              <MapPin className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
              <span className="line-clamp-2">{task.address}</span>
            </p>
          </div>
          {task.customerPhone ? (
            <a
              href={`tel:${task.customerPhone}`}
              aria-label={`Gọi ${task.customerName}`}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 transition-colors hover:bg-brand-100"
            >
              <Phone className="size-5" />
            </a>
          ) : null}
        </div>

        {status === "WAITING_MOVE" && (
          <Button size="lg" fullWidth icon={<CirclePlay className="size-5" />} onClick={handleNextStep}>
            Bắt đầu di chuyển
          </Button>
        )}

        {status === "MOVING" && (
          <Button size="lg" fullWidth icon={<CheckCircle2 className="size-5" />} onClick={handleNextStep}>
            Đã đến nơi
          </Button>
        )}

        {status === "ARRIVED" && (
          <Button
            size="lg"
            fullWidth
            icon={<Stethoscope className="size-5" />}
            onClick={() => {
              onStatusChange(task.id, "DIAGNOSING", "Đang chẩn đoán", "DIAGNOSING");
              onClose();
            }}
          >
            Bắt đầu công việc
          </Button>
        )}
      </div>
    </div>
  );
};
