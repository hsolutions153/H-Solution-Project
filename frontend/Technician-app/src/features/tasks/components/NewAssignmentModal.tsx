'use client';

import React, { useEffect, useState } from 'react';
import { Task } from '@/types/task';
import {
  BadgeAlert,
  MapPin,
  TriangleAlert,
  CalendarCheck,
  CarFront,
  CircleCheck,
  CircleX,
} from 'lucide-react';

interface NewAssignmentModalProps {
  isOpen: boolean;
  task: Task | null;
  onClose: () => void;
  onAccept: (taskId: string) => void;
  onReject: (taskId: string) => void; // Trigger mở Modal Xác nhận Từ chối thủ công
  onTimeout?: (taskId: string) => void; // Tự động xử lý khi hết 2 phút
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

  useEffect(() => {
    if (!isOpen || !task) return;

    // Reset về 2 phút (120 giây) mỗi lần nhận phân công mới
    setTimeLeft(120);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (onTimeout) {
            onTimeout(task.id);
          } else {
            onReject(task.id);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, task, onReject, onTimeout]);

  if (!isOpen || !task) return null;

  const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const seconds = String(timeLeft % 60).padStart(2, '0');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity">
      {/* Box Container Popup */}
      <div className="w-full max-w-xs bg-white rounded-2xl overflow-hidden shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">

        {/* Header */}
        <div className="bg-sky-800 text-white px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-base">
            <span className="p-1 bg-white/20 rounded-lg flex items-center justify-center">
              <BadgeAlert className="w-4 h-4 text-white" />
            </span>
            <span>Yêu cầu mới</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 text-lg font-semibold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Nội dung */}
        <div className="p-4 space-y-4 text-xs text-slate-700">

          {/* Địa điểm */}
          <div className="flex gap-3">
            <span className="text-sky-800 mt-0.5 flex-shrink-0">
              <MapPin className="w-4 h-4" />
            </span>

            <div>
              <p className="text-[11px] text-slate-400 font-semibold">
                Địa điểm khách hàng
              </p>

              <p className="font-bold text-slate-900 mt-0.5 leading-snug">
                {task.address}
              </p>

              <p className="text-[11px] text-slate-500 mt-0.5">
                Khách hàng:{' '}
                <span className="font-semibold text-slate-700">
                  {task.customerName}
                </span>
              </p>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Lỗi dự kiến */}
          <div className="flex gap-3">
            <span className="text-amber-500 mt-0.5 flex-shrink-0">
              <TriangleAlert className="w-4 h-4" />
            </span>

            <div>
              <p className="text-[11px] text-slate-400 font-semibold">
                Lỗi dự kiến
              </p>

              <p className="font-bold text-slate-900 mt-0.5 leading-snug">
                {task.serviceName}
              </p>

              {task.urgency && (
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Mức độ ưu tiên:{' '}
                  <span className="font-extrabold text-red-600">
                    {task.urgency}
                  </span>
                </p>
              )}
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Thời gian */}
          <div className="flex gap-3">
            <span className="text-sky-800 mt-0.5 flex-shrink-0">
              <CalendarCheck className="w-4 h-4" />
            </span>

            <div>
              <p className="text-[11px] text-slate-400 font-semibold">
                Thời gian yêu cầu
              </p>

              <p className="font-bold text-slate-900 mt-0.5">
                {task.requestedTime || task.time}
              </p>

              <p className="text-[11px] text-slate-500 mt-0.5">
                Thời gian phản hồi:{' '}
                <span
                  className={`font-bold ${
                    timeLeft <= 60 ? 'text-red-600' : 'text-sky-800'
                  }`}
                >
                  {minutes}:{seconds}
                </span>
              </p>
            </div>
          </div>

          {/* Khoảng cách */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sky-800 flex-shrink-0">
                <CarFront className="w-4 h-4" />
              </span>

              <span className="text-[11px] text-slate-600 font-medium">
                Khoảng cách:{' '}
                <strong className="text-slate-900">
                  {task.distance || '2.4 km'}
                </strong>
              </span>
            </div>

            <span className="text-[11px] font-bold text-slate-700">
              {task.travelTime || '~ 12 phút di chuyển'}
            </span>
          </div>

          {/* Buttons */}
          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={() => onAccept(task.id)}
              className="w-full py-2.5 bg-sky-800 hover:bg-sky-900 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CircleCheck className="w-4 h-4" />
              <span>Chấp nhận</span>
            </button>

            <button
              type="button"
              onClick={() => onReject(task.id)} // Bấm Từ chối -> Gọi handler mở RejectTaskModal
              className="w-full py-2.5 bg-white border border-gray-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CircleX className="w-4 h-4 text-slate-500" />
              <span>Từ chối</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};