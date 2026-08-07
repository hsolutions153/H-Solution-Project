"use client";

import React, { useState, useEffect } from "react";
import { Task, TaskStatus } from "@/types/task";
import { TravelMapModal } from "./components/TravelMapModal";
import { DiagnosticScreen } from "./components/DiagnosticScreen";
import { CreateQuoteScreen } from "./components/CreateQuoteScreen";
import { QuoteStatusScreen } from "./components/QuoteStatusScreen";
import { RepairScreen } from "./components/RepairScreen"; // <-- 1. Import RepairScreen tại đây
import {
  ArrowLeft,
  Users,
  Phone,
  Smartphone,
  Accessibility,
  Navigation,
  Bike,
  CheckCircle2,
} from "lucide-react";

interface TaskDetailScreenProps {
  task: Task | null;
  onBack: () => void;
  onUpdateStatus: (
    taskId: string,
    status: TaskStatus,
    statusText: string,
  ) => void;
}

export const TaskDetailScreen = ({
  task,
  onBack,
  onUpdateStatus,
}: TaskDetailScreenProps) => {
  const [isTravelModalOpen, setIsTravelModalOpen] = useState(false);

  // Quản lý các bước con khi ở trạng thái IN_PROGRESS
  const [subStep, setSubStep] = useState<"DIAGNOSTIC" | "QUOTE" | "QUOTE_STATUS" | "REPAIR">(() => {
    return (
      (sessionStorage.getItem("subStep") as any) ||
      "DIAGNOSTIC"
    );
  });

  // Lưu trữ subStep vào sessionStorage
  useEffect(() => {
    sessionStorage.setItem("subStep", subStep);
  }, [subStep]);

  // Lưu trữ dữ liệu chẩn đoán
  const [diagnosticData, setDiagnosticData] = useState<any>(() => {
    const saved = sessionStorage.getItem("diagnosticData");
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (diagnosticData) {
      sessionStorage.setItem("diagnosticData", JSON.stringify(diagnosticData));
    }
  }, [diagnosticData]);

  // Lưu trữ dữ liệu báo giá
  const [quoteData, setQuoteData] = useState<any>(() => {
    const saved = sessionStorage.getItem("quoteData");
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (quoteData) {
      sessionStorage.setItem("quoteData", JSON.stringify(quoteData));
    }
  }, [quoteData]);

  const handleStatusChange = (
    taskId: string,
    status: TaskStatus,
    statusText: string,
  ) => {
    onUpdateStatus(taskId, status, statusText);
  };

  if (!task) return null;

  // Khi đang ở trạng thái IN_PROGRESS, điều phối hiển thị các bước con
  if (task.status === "IN_PROGRESS") {
    // 1. Màn hình Tạo báo giá
    if (subStep === "QUOTE") {
      return (
        <CreateQuoteScreen
          task={task}
          diagnosticData={diagnosticData}
          onBack={() => setSubStep("DIAGNOSTIC")}
          onSubmitQuote={(data) => {
            console.log("Dữ liệu báo giá:", data);
            setQuoteData(data);
            
            if (data.status === "SENT") {
              onUpdateStatus(task.id, "IN_PROGRESS", "Đã gửi báo giá");
              setSubStep("QUOTE_STATUS");
            } else {
              alert("Đã lưu nháp báo giá thành công!");
            }
          }}
        />
      );
    }

    // 2. Màn hình Trạng thái báo giá (Chờ khách duyệt & Bắt đầu sửa chữa)
    if (subStep === "QUOTE_STATUS") {
      return (
        <QuoteStatusScreen
          task={task}
          onBack={() => setSubStep("QUOTE")}
          onViewDetailQuote={() => setSubStep("QUOTE")}
          onContinueRepair={() => setSubStep("REPAIR")} // Chuyển sang màn hình Sửa chữa & Hoàn tất
        />
      );
    }

    // 3. Màn hình Sửa chữa & Hoàn tất (Đã cập nhật tích hợp RepairScreen)
    if (subStep === "REPAIR") {
      return (
        <RepairScreen
          task={task}
          onBack={() => setSubStep("QUOTE_STATUS")}
          onComplete={() => {
            // Cập nhật trạng thái hoàn thành công việc
            onUpdateStatus(task.id, "COMPLETED", "Hoàn thành");
            // Xóa bộ nhớ subStep tạm thời
            sessionStorage.removeItem("subStep");
            // Quay về danh sách hoặc màn hình chi tiết chính
            onBack();
          }}
        />
      );
    }

    // Mặc định: Màn hình Chẩn đoán
    return (
      <DiagnosticScreen
        task={task}
        onBack={() => {
          onUpdateStatus(task.id, "ARRIVED", "Đã đến nơi");
        }}
        onSubmitDiagnostic={(data) => {
          console.log("Dữ liệu chẩn đoán đã lưu:", data);
          setDiagnosticData(data);
          setSubStep("QUOTE");
        }}
      />
    );
  }

  return (
    <div className="p-4 pb-28 space-y-4">
      {/* Hàng 1: Nút Quay lại - Trạng thái - ID */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-bold text-sky-800 hover:underline flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Quay lại
        </button>

        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-700">
          <Users className="w-3 h-3" />
          {task.statusText}
        </span>

        <span className="text-[11px] font-semibold text-slate-400">
          ID: {task.code || `FS-290${task.id}`}
        </span>
      </div>

      {/* Khách hàng */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Khách hàng
          </p>

          <h3 className="text-sm font-bold text-slate-900 mt-0.5">
            {task.customerName}
          </h3>

          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
            <Smartphone className="w-3 h-3 text-slate-400" /> {task.customerPhone || "090 123 4567"}
          </p>
        </div>

        <a
          href={`tel:${task.customerPhone || "0901234567"}`}
          className="w-10 h-10 bg-sky-800 rounded-xl flex items-center justify-center text-white cursor-pointer hover:bg-sky-900 transition-colors"
        >
          <Phone className="w-4 h-4" />
        </a>
      </div>

      {/* Thiết bị */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Thiết bị & Lỗi
          </p>

          <div className="flex gap-3 mt-2">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-sky-800">
              <Accessibility className="w-5 h-5" />
            </div>

            <div>
              <h4 className="text-xs font-bold">Xe lăn điện Karma</h4>

              <p className="text-[11px] text-slate-500">{task.serviceName}</p>
            </div>
          </div>
        </div>

        <hr className="border-gray-100" />

        <div>
          <p className="text-[11px] font-bold mb-1">Mô tả chi tiết</p>

          <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
            Bánh xe bị kẹt cứng không di chuyển được, xích xe có dấu hiệu bị
            lệch và rỉ sét nặng sau khi va chạm. Khách hàng yêu cầu kiểm tra
            và thay thế phụ tùng gấp.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl overflow-hidden h-24">
              <img
                src="/images/s1.jpg"
                className="w-full h-full object-cover"
                alt=""
              />
            </div>

            <div className="relative rounded-xl overflow-hidden h-24">
              <img
                src="/images/s2.jpg"
                className="w-full h-full object-cover"
                alt=""
              />

              <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-xs font-bold">
                +2 ảnh
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bản đồ */}
      <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 relative shadow-xs">
        <div className="relative h-36 w-full overflow-hidden bg-slate-100">
          <div className="absolute inset-0 w-full h-full pointer-events-none scale-105">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1862.2937046228108!2d105.82894155000001!3d21.00916975!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3135ac8008dbd905%3A0x100650bea845689e!2zMTIgUC4gQ2jDuWEgQuG7mWMsIEtpbSBMacOqbiwgSMOgIE7hu5lpLCBWaeG7h3QgTmFt!5e0!3m2!1svi!2s!4v1784825224350!5m2!1svi!2s"
              className="w-full h-[150%] -top-[25%] relative border-0"
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>

          <div className="absolute top-0.3 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-xl shadow-md border border-gray-100 pointer-events-none text-center z-10">
            <p className="text-[11px] font-bold text-slate-800 whitespace-nowrap">
              {task.address.split(",")[0]}
            </p>
            <p className="text-[9px] text-slate-500 whitespace-nowrap">
              {task.address.split(",").slice(1).join(",").trim()}
            </p>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45 border-r border-b border-gray-100"></div>
          </div>

          <button
            onClick={() =>
              window.open(
                `https://maps.google.com/?q=${encodeURIComponent(task.address)}`,
                "_blank",
              )
            }
            className="absolute bottom-2 right-2 bg-sky-800 hover:bg-sky-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-md transition-colors z-10"
          >
            <Navigation className="w-3.5 h-3.5" />
            Chỉ đường
          </button>
        </div>
      </div>

      {/* Nút hành động tương ứng theo từng trạng thái */}
      {task.status === "PENDING" && (
        <button
          onClick={() => {
            onUpdateStatus(task.id, "WAITING_MOVE", "Chờ di chuyển");
            setIsTravelModalOpen(true);
          }}
          className="w-full py-3 bg-sky-800 hover:bg-sky-900 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
        >
          <Bike className="w-4 h-4" />
          Xác nhận di chuyển
        </button>
      )}

      {(task.status === "WAITING_MOVE" || task.status === "MOVING") && (
        <button
          onClick={() => setIsTravelModalOpen(true)}
          className="w-full py-3 bg-sky-800 hover:bg-sky-900 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
        >
          <Bike className="w-4 h-4" />
          {task.status === "WAITING_MOVE" ? "Tiếp tục di chuyển" : "Tiếp tục hành trình"}
        </button>
      )}

      {task.status === "ARRIVED" && (
        <button
          onClick={() => {
            onUpdateStatus(task.id, "IN_PROGRESS", "Đang thực hiện");
            setSubStep("DIAGNOSTIC");
          }}
          className="w-full py-3 bg-green-600 hover:bg-green-700 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
        >
          <CheckCircle2 className="w-4 h-4" />
          Bắt đầu công việc
        </button>
      )}

      {isTravelModalOpen && (
        <TravelMapModal
          task={task}
          onClose={() => setIsTravelModalOpen(false)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
};