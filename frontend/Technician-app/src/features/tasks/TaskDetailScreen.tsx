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
  Calendar,
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
    // Với đơn đặt lịch hẹn (không phải SOS khẩn cấp), nếu chưa chọn bước nào khác thì mặc định vào màn hình Sửa chữa & Báo giá
    const activeSubStep = !task.isEmergency && subStep === "DIAGNOSTIC" ? "REPAIR" : subStep;

    // 1. Màn hình Tạo báo giá
    if (activeSubStep === "QUOTE") {
      return (
        <CreateQuoteScreen
          task={task}
          diagnosticData={diagnosticData}
          onBack={() => setSubStep(task.isEmergency ? "DIAGNOSTIC" : "REPAIR")}
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
    if (activeSubStep === "QUOTE_STATUS") {
      return (
        <QuoteStatusScreen
          task={task}
          onBack={() => setSubStep("QUOTE")}
          onViewDetailQuote={() => setSubStep("QUOTE")}
          onContinueRepair={() => setSubStep("REPAIR")}
        />
      );
    }

    // 3. Màn hình Sửa chữa & Hoàn tất (RepairScreen)
    if (activeSubStep === "REPAIR") {
      return (
        <RepairScreen
          task={task}
          onBack={() => {
            if (task.isEmergency) {
              setSubStep("QUOTE_STATUS");
            } else {
              onBack();
            }
          }}
          onComplete={() => {
            onUpdateStatus(task.id, "COMPLETED", "Hoàn thành");
            sessionStorage.removeItem("subStep");
            onBack();
          }}
        />
      );
    }

    // Mặc định: Màn hình Chẩn đoán (cho đơn SOS)
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
            {task.customerName && !/^[0-9A-F]{8,12}$/i.test(task.customerName) && !/^(USR|TCH|DEV|ADM)\d+$/i.test(task.customerName)
              ? task.customerName
              : "Khách hàng"}
          </h3>

          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
            <Smartphone className="w-3.5 h-3.5 text-slate-400" />{" "}
            {task.customerPhone || "0912 345 678"}
          </p>
        </div>

        <a
          href={`tel:${task.customerPhone || "0912345678"}`}
          className="w-10 h-10 bg-sky-800 rounded-xl flex items-center justify-center text-white cursor-pointer hover:bg-sky-900 transition-colors shadow-sm"
          title="Gọi cho khách hàng"
        >
          <Phone className="w-4 h-4" />
        </a>
      </div>

      {/* Khung giờ đặt lịch */}
      <div className="bg-gradient-to-r from-sky-50 to-blue-50/60 rounded-2xl p-3.5 border border-sky-100 flex items-center gap-3">
        <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-sky-800 shadow-xs border border-sky-100 shrink-0">
          <Calendar className="w-4 h-4" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-sky-800 uppercase tracking-wider">
            Thời gian & Khung giờ đặt
          </p>
          <p className="text-xs font-bold text-slate-800 mt-0.5">
            {task.bookingDate} {" "}
            <span className="text-sky-700">
              {task.bookingSlot || task.requestedTime || task.time || ""}
            </span>
          </p>
        </div>
      </div>

      {/* Thiết bị */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Thiết bị & Lỗi
          </p>

          <div className="flex gap-3 mt-2">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-sky-800 shrink-0">
              <Accessibility className="w-5 h-5" />
            </div>

            <div>
              <h4 className="text-xs font-bold">{task.deviceInfo || "Thiết bị sửa chữa"}</h4>
              <p className="text-[11px] text-slate-500">{task.serviceName}</p>
            </div>
          </div>
        </div>

        <hr className="border-gray-100" />

        <div>
          <p className="text-[11px] font-bold mb-1">Mô tả chi tiết từ khách hàng</p>

          <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
            {task.description || "Khách hàng không để lại ghi chú chi tiết."}
          </p>

          {task.images && task.images.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Hình ảnh đính kèm ({task.images.length} ảnh)
              </p>
              <div className="grid grid-cols-2 gap-2">
                {task.images.slice(0, 4).map((imgUrl, idx) => (
                  <div key={idx} className="rounded-xl overflow-hidden h-24 border border-slate-100 bg-slate-50 relative">
                    <img
                      src={imgUrl}
                      className="w-full h-full object-cover"
                      alt={`Ảnh sự cố ${idx + 1}`}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/images/s1.jpg";
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center">
              <p className="text-[11px] text-slate-400 italic">Chưa có ảnh đính kèm từ khách hàng</p>
            </div>
          )}
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

      {/* Nút hành động tương ứng theo từng loại đơn và trạng thái */}
      {!task.isEmergency ? (
        // ==================== ĐƠN ĐẶT LỊCH HẸN TRƯỚC ====================
        task.status === "WAITING_ACCEPT" ? (
          <button
            onClick={() => {
              onUpdateStatus(task.id, "PENDING", "Đã xác nhận lịch");
              import("@/lib/api-client").then(({ fetchApi }) => {
                fetchApi(`/repair-requests/${task.id}/status`, {
                  method: "PATCH",
                  body: JSON.stringify({ status: "ACCEPTED" }),
                }).catch(() => {});
              });
            }}
            className="w-full py-3 bg-sky-800 hover:bg-sky-900 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4" />
            Xác nhận lịch hẹn
          </button>
        ) : task.status !== "COMPLETED" && task.status !== "CANCELLED" ? (
          <button
            onClick={() => {
              onUpdateStatus(task.id, "IN_PROGRESS", "Đang sửa chữa");
              setSubStep("REPAIR");
              import("@/lib/api-client").then(({ fetchApi }) => {
                fetchApi(`/repair-requests/${task.id}/status`, {
                  method: "PATCH",
                  body: JSON.stringify({ status: "REPAIRING" }),
                }).catch(() => {});
              });
            }}
            className="w-full py-3 bg-[#005288] hover:bg-sky-900 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
          >
            <CheckCircle2 className="w-4 h-4" />
            Đến nơi & Bắt đầu sửa chữa (Báo giá)
          </button>
        ) : null
      ) : (
        // ==================== ĐƠN CỨU HỘ KHẨN CẤP (SOS) ====================
        <>
          {task.status === "WAITING_ACCEPT" && (
            <button
              onClick={() => {
                onUpdateStatus(task.id, "PENDING", "Tiếp nhận đơn");
                import("@/lib/api-client").then(({ fetchApi }) => {
                  fetchApi(`/repair-requests/${task.id}/status`, {
                    method: "PATCH",
                    body: JSON.stringify({ status: "ACCEPTED" }),
                  }).catch(() => {});
                });
              }}
              className="w-full py-3 bg-sky-800 hover:bg-sky-900 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              Tiếp nhận đơn cứu hộ
            </button>
          )}

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
        </>
      )}
    </div>
  );
};