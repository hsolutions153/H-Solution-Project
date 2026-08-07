"use client";

import React, { useEffect, useState } from "react";
import { Task, TaskStatus } from "@/types/task";
import Image from "next/image";
import {
  X,
  CirclePlay,
  MapPin,
  CheckCircle2,
  Phone,
  Smartphone,
} from "lucide-react";

interface TravelModalProps {
  task: Task;
  onClose: () => void;
  onStatusChange: (
    taskId: string,
    status: TaskStatus,
    statusText: string,
  ) => void;
}

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
      onStatusChange(task.id, nextStatus, "Đang di chuyển");
    } else if (status === "MOVING") {
      const nextStatus: TaskStatus = "ARRIVED";
      setStatus(nextStatus);
      onStatusChange(task.id, nextStatus, "Đã đến nơi");
    } else if (status === "ARRIVED") {
      // Khi đã ở trạng thái ARRIVED và bấm "Bắt đầu công việc"
      const nextStatus: TaskStatus = "PENDING";
      setStatus(nextStatus);
      onStatusChange(task.id, nextStatus, "Chờ thực hiện");
      onClose(); // Đóng modal để thợ tiến hành làm việc ở màn hình chi tiết
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative h-full w-full max-w-sm bg-white overflow-hidden shadow-lg flex flex-col">
        {/* 1. Map (chiếm không gian phía trên) */}
        <div className="relative flex-1 overflow-hidden bg-gray-100">
          <Image
            src="/images/roadmap.jpg"
            alt="Bản đồ hành trình"
            fill
            priority
            className="object-cover"
          />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white shadow hover:bg-gray-50 transition cursor-pointer"
          >
            <X className="w-5 h-5 text-slate-700" />
          </button>

          {/* Điểm định vị: Vị trí của thợ */}
          <div className="absolute bottom-[25%] left-[57%] z-10 flex flex-col items-center -translate-x-1/2 translate-y-1/2 animate-bounce">
            <div className="bg-sky-800 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md mb-1 whitespace-nowrap">
              Vị trí của bạn
            </div>
            <div className="w-7 h-7 rounded-full bg-sky-800 border-2 border-white shadow-lg flex items-center justify-center text-white">
              <MapPin className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Điểm định vị: Vị trí của khách hàng */}
          <div className="absolute top-[15%] left-[33%] z-10 flex flex-col items-center -translate-x-1/2 -translate-y-1/2">
            <div className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md mb-1 whitespace-nowrap">
              {task.customerName}
            </div>
            <div className="w-7 h-7 rounded-full bg-red-600 border-2 border-white shadow-lg flex items-center justify-center text-white animate-pulse">
              <span className="text-xs font-bold">📍</span>
            </div>
          </div>
        </div>

        {/* 2. Bottom Card chứa thông tin đơn & nút bấm */}
        <div className="bg-white border-t rounded-t-3xl shadow-lg p-4 space-y-3 pb-6">
          <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900">
                {task.code}
              </span>

              {status === "WAITING_MOVE" && (
                <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-600 text-xs font-medium">
                  Chờ di chuyển
                </span>
              )}

              {status === "MOVING" && (
                <span className="px-3 py-1 rounded-full bg-green-100 text-green-600 text-xs font-medium flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
                  Đang di chuyển
                </span>
              )}

              {status === "ARRIVED" && (
                <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-600 text-xs font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Đã đến nơi
                </span>
              )}
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-gray-200/60">
              <div>
                <p className="text-[11px] text-gray-400 font-medium">
                  Khách hàng
                </p>
                <h3 className="text-sm font-bold text-slate-800">
                  {task.customerName}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                  <Smartphone className="w-3 h-3 text-slate-400" />{" "}
                  {task.customerPhone || "Chưa có SĐT"}
                </p>
              </div>
              <a
                href={`tel:${task.customerPhone || ""}`}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-slate-600 transition cursor-pointer"
              >
                <Phone className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Button hành động */}
          {status === "WAITING_MOVE" && (
            <button
              onClick={handleNextStep}
              className="w-full rounded-xl bg-[#004976] py-3 text-xs font-semibold text-white hover:bg-[#00385b] transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <CirclePlay className="w-4 h-4" />
              Bắt đầu di chuyển
            </button>
          )}

          {status === "MOVING" && (
            <button
              onClick={handleNextStep}
              className="w-full rounded-xl bg-[#87d5fb] py-3 text-xs font-semibold text-[#004976] hover:bg-[#68c6f7] transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <MapPin className="w-4 h-4" />
              Đã đến nơi
            </button>
          )}

          {status === "ARRIVED" && (
            <button
              onClick={() => {
                onStatusChange(task.id, "IN_PROGRESS", "Đang thực hiện");
                onClose();
              }}
              className="w-full py-3 bg-green-600 hover:bg-green-700 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              Bắt đầu công việc
            </button>
          )}
        </div>
      </div>
    </div>
  );
};