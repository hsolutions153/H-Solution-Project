"use client";

import React, { useState, useEffect, useRef } from "react";
import { Task, HistoryTask } from "@/types/task";
import {
  ArrowLeft,
  Play,
  Pause,
  Check,
  Plus,
  Minus,
  Camera,
  Settings,
  FileText,
  Info,
  Clock,
  MapPin,
  Trash2,
} from "lucide-react";

interface ComponentItem {
  id: string;
  name: string;
  warehouse: string;
  price: number;
  quantity: number;
}

interface RepairScreenProps {
  task?: Task;
  onBack: () => void;
  onComplete?: (completedData: HistoryTask) => void;
}

export const RepairScreen: React.FC<RepairScreenProps> = ({
  task,
  onBack,
  onComplete,
}) => {
  const [isStarted, setIsStarted] = useState<boolean>(false);
  const [seconds, setSeconds] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const [components, setComponents] = useState<ComponentItem[]>([
    {
      id: "1",
      name: "Bộ xích truyền động",
      warehouse: "KCN Quang Minh",
      price: 250000,
      quantity: 1,
    },
  ]);

  const [images, setImages] = useState<string[]>(["/images/s3.jpg"]);
  const [note, setNote] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isStarted && !isPaused) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isStarted, isPaused]);

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleToggleTimer = () => {
    if (!isStarted) {
      setIsStarted(true);
      setIsPaused(false);
    } else {
      setIsPaused(!isPaused);
    }
  };

  const handleQuantityChange = (id: string, delta: number) => {
    setComponents((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const imageUrl = URL.createObjectURL(files[0]);
      setImages((prev) => [...prev, imageUrl]);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const laborCost = 250000;
  const partsCost = components.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );
  const totalCost = laborCost + partsCost;

  // Xử lý đóng gói dữ liệu và gọi callback khi nhấn nút "Hoàn tất sửa chữa"
  const handleFinishRepair = () => {
    const now = new Date();
    const completedData: HistoryTask = {
      id: `hist-${Date.now()}`,
      code: task?.code || "JOB-8829",
      date: now.toLocaleDateString("vi-VN"),
      time: now.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      serviceType: task?.serviceName || "Kiểm tra bánh xe và hệ thống xích",
      customerName: task?.customerName || "Nguyễn Văn A",
      deviceInfo: task?.deviceInfo || "Xe lăn điện Karma KP-80",
      address:
        task?.address || "Số 12 Chùa Bộc, Quang Trung, Đống Đa, Hà Nội",
      type: "repair",
      diagnosis:
        "Bánh xe trước bị kẹt do trục bánh mòn, vòng bi có dấu hiệu hư hỏng.",
      solution:
        note ||
        "Thay bộ xích truyền động, căn chỉnh trục bánh và kiểm tra khả năng di chuyển sau sửa chữa.",
      images: {
        before: "/images/before-repair.jpg",
        after: images[0] || "/images/s3.jpg",
      },
      totalAmount: totalCost,
    };

    if (onComplete) {
      onComplete(completedData);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-slate-50 min-h-screen pb-10 flex flex-col justify-between border-x border-slate-100 font-sans">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="p-1 text-slate-600 hover:bg-slate-200 rounded-full cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold text-slate-800">
            Tiến trình sửa chữa & hoàn tất
          </h1>
        </div>

        {/* Thông tin đơn hàng */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              MÃ ĐƠN: #{task?.code || "JOB-8829"}
            </span>
            <span className="px-2.5 py-0.5 bg-sky-100 text-sky-700 font-semibold text-[11px] rounded-full">
              Khẩn cấp
            </span>
          </div>
          <h2 className="font-bold text-slate-900 text-base">
            {task?.serviceName || "Kiểm tra bánh xe và hệ thống xích"}
          </h2>
          <div className="flex items-start gap-1 text-xs text-slate-500">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span>
              {task?.address ||
                "Số 12 Chùa Bộc, Quang Trung, Đống Đa, Hà Nội"}
            </span>
          </div>
        </div>

        {/* Khối Bộ đếm giờ */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-[#005288]">
            <Clock className="w-6 h-6" />
            <span className="text-3xl font-bold font-mono tracking-wider">
              {formatTime(seconds)}
            </span>
          </div>

          <p className="text-xs text-slate-500">
            {isStarted
              ? isPaused
                ? "Thời gian sửa chữa đang tạm dừng"
                : "Đang ghi nhận thời gian sửa chữa thực tế"
              : "Bấm nút bên dưới để bắt đầu tính thời gian sửa chữa"}
          </p>

          <span
            className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${
              !isStarted
                ? "bg-slate-100 text-slate-500"
                : isPaused
                ? "bg-amber-50 text-amber-600"
                : "bg-emerald-50 text-emerald-600"
            }`}
          >
            {!isStarted
              ? "Chưa bắt đầu"
              : isPaused
              ? "Đang tạm dừng"
              : "Đang tính giờ"}
          </span>

          {/* Chỉ hiển thị nút ở khối này khi Chưa bắt đầu hoặc khi Đang tạm dừng */}
          {(!isStarted || isPaused) && (
            <button
              onClick={handleToggleTimer}
              className="w-full py-3 bg-[#005288] hover:bg-sky-900 text-white font-semibold rounded-xl text-sm transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              {!isStarted ? "Bắt đầu sửa chữa" : "Tiếp tục"}
            </button>
          )}
        </div>

        {/* Linh kiện sử dụng */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Settings className="w-4 h-4 text-slate-500" /> Linh kiện sử dụng
          </div>
          {components.map((item) => (
            <div
              key={item.id}
              className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between"
            >
              <div>
                <p className="font-bold text-sm text-slate-800">{item.name}</p>
                <p className="text-xs text-slate-400">Kho: {item.warehouse}</p>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  Đơn giá: {item.price.toLocaleString("vi-VN")} đ
                </p>
              </div>
              <div className="flex items-center gap-2 border border-slate-200 rounded-lg p-1 bg-slate-50">
                <button
                  onClick={() => handleQuantityChange(item.id, -1)}
                  className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-bold w-4 text-center">
                  {item.quantity}
                </span>
                <button
                  onClick={() => handleQuantityChange(item.id, 1)}
                  className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          <button className="w-full py-2.5 border border-dashed border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1 cursor-pointer transition-colors">
            <Plus className="w-4 h-4" /> Thêm linh kiện khác
          </button>
        </div>

        {/* Chụp ảnh sau khi sửa */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Camera className="w-4 h-4 text-slate-500" /> Chụp ảnh sau khi sửa
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fileInputRef}
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="h-28 border border-dashed border-slate-300 bg-white rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <Camera className="w-6 h-6 mb-1 text-slate-400" />
              <span className="text-xs font-medium">Chụp ảnh</span>
            </button>
            {images.map((img, idx) => (
              <div
                key={idx}
                className="h-28 rounded-2xl overflow-hidden border border-slate-200 relative bg-slate-100 group"
              >
                <img
                  src={img}
                  alt="Sau khi sửa"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => handleRemoveImage(idx)}
                  className="absolute top-1.5 right-1.5 p-1 bg-black/50 text-white rounded-full opacity-80 hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Ghi chú */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <FileText className="w-4 h-4 text-slate-500" /> Ghi chú / Nội dung
            sửa chữa thực tế
          </div>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nhập báo cáo ngắn về nội dung đã xử lý thực tế tại đây..."
            className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-1 focus:ring-sky-500 placeholder:text-slate-400"
          />
        </div>

        {/* Tổng chi phí thanh toán */}
        <div className="bg-sky-50 border border-sky-100 p-4 rounded-2xl space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-sky-900">
              Tổng chi phí thanh toán
            </span>
            <span className="text-base font-bold text-[#005288]">
              {totalCost.toLocaleString("vi-VN")} đ
            </span>
          </div>
          <div className="flex items-start gap-1.5 text-[11px] text-sky-700 leading-snug">
            <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <span>
              Chi phí này đã bao gồm linh kiện và nhân công theo báo giá đã được
              duyệt.
            </span>
          </div>
        </div>

        {/* Nút thao tác dưới cùng */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleToggleTimer}
            className="flex-1 py-3 border border-slate-300 bg-white hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            {!isStarted || isPaused ? (
              <>
                <Play className="w-4 h-4" /> Tiếp tục
              </>
            ) : (
              <>
                <Pause className="w-4 h-4" /> Tạm dừng
              </>
            )}
          </button>
          <button
            onClick={handleFinishRepair}
            className="flex-1 py-3 bg-[#005288] hover:bg-sky-900 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            Hoàn tất sửa chữa <Check className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};