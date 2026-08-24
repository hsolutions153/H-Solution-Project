'use client';

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Printer, Edit3 } from "lucide-react";

import { CustomerInfoCard } from "@/features/repair-requests/components/RepairDetail/CustomerInfoCard";
import { RepairTimeline, TimelineItem, RepairStepKey } from "@/features/repair-requests/components/RepairDetail/RepairTimeline";
import { RepairImages } from "@/features/repair-requests/components/RepairDetail/RepairImages";
import { RepairQuoteTable } from "@/features/repair-requests/components/RepairDetail/RepairQuoteTable";

// Import types và data từ file repairOption của bạn
import { RepairStatus } from "@/types/repairRequest";
import { MOCK_REPAIR_LIST } from "@/constants/repairOptions"; // 👈 Thay đường dẫn này đúng với vị trí file repairOption của bạn

const STATUS_ORDER: RepairStatus[] = [
  "PENDING",
  "AWAITING_RECEIPT",
  "EN_ROUTE",
  "ARRIVED",
  "DIAGNOSING",
  "ESTIMATE_SUBMITTED",
  "WAITING_FOR_APPROVAL",
  "IN_PROGRESS",
  "COMPLETED",
];

const TIMELINE_STEPS: { key: RepairStepKey; title: string }[] = [
  { key: "PENDING_CONFIRM", title: "Chờ xác nhận" },
  { key: "AWAITING_RECEIPT", title: "Chờ tiếp nhận" },
  { key: "IN_TRANSIT", title: "Di chuyển" },
  { key: "ARRIVED", title: "Đã đến nơi" },
  { key: "DIAGNOSING", title: "Chẩn đoán" },
  { key: "QUOTATION_SENT", title: "Gửi bảng báo giá" },
  { key: "APPROVAL_PENDING", title: "Chờ phê duyệt" },
  { key: "REPAIRING", title: "Sửa chữa" },
  { key: "COMPLETED", title: "Hoàn thành" },
];

const generateTimeline = (currentStatus: RepairStatus, techName?: string): TimelineItem[] => {
  const activeIndex = STATUS_ORDER.indexOf(currentStatus);

  return TIMELINE_STEPS.map((step, idx) => {
    let status: "completed" | "active" | "pending" | "rejected" = "pending";
    
    if (currentStatus === "ESTIMATE_REJECTED" && step.key === "APPROVAL_PENDING") {
      status = "rejected";
    } else if (idx < activeIndex || currentStatus === "COMPLETED") {
      status = "completed";
    } else if (idx === activeIndex) {
      status = "active";
    }

    let note = "";
    if (step.key === "AWAITING_RECEIPT" && techName) {
      note = `KTV ${techName} đã nhận đơn`;
    }

    return {
      key: step.key,
      title: step.title,
      time: idx <= activeIndex ? "24/10/2023 - 08:00" : undefined,
      status,
      note,
      action: step.key === "AWAITING_RECEIPT" ? "Đổi KTV" : step.key === "QUOTATION_SENT" ? "Xem báo giá" : undefined,
      approvalStatus: step.key === "APPROVAL_PENDING" && idx >= 6 ? (currentStatus === "ESTIMATE_REJECTED" ? "REJECTED" : "APPROVED") : undefined,
    };
  });
};

export default function RepairDetailPage() {
  const params = useParams();
  const requestId = (params?.id as string) || "1";

  const list = Array.isArray(MOCK_REPAIR_LIST) ? MOCK_REPAIR_LIST : [];
  
  // So sánh chuẩn xác ID số (9) hoặc Mã JOB (JOB-8769)
  const item = list.find(
    (r) => String(r.id) === String(requestId) || String(r.code).toLowerCase() === String(requestId).toLowerCase()
  );

  if (!item) {
    return <div className="p-8 text-center text-slate-500 font-medium">Không tìm thấy thông tin đơn hàng #{requestId}</div>;
  }

  const safeIssueDescription = item.issueDescription || "Không có thông tin mô tả lỗi";

  const diagnoses = [
    { part: "Thành phần chính", status: safeIssueDescription, isError: true },
    { part: "Nguồn điện & Jack cắm", status: "Kiểm tra bình thường", isError: false },
  ];

  const detailData = {
    ...item,
    issueDescription: safeIssueDescription,
    phone: "+84 901 234 567",
    secondaryPhone: item.priority === "SOS" ? "+84 908 765 432 (Khẩn cấp)" : "",
    email: `${item.customerName?.toLowerCase().replace(/\s+/g, '') || "khachhang"}@example.com`,
    serialNumber: `SN-${item.code?.replace('JOB-', '') || '0000'}-2023`,
    quoteStatus: item.status === "ESTIMATE_APPROVED" || item.status === "IN_PROGRESS" || item.status === "COMPLETED" ? "Đã duyệt" : "Chờ duyệt",
    diagnoses,
    services: [
      { name: "Linh kiện thay thế chính hãng", price: 1200000 },
      { name: "Chi phí kiểm tra & Sửa chữa", price: 250000 },
    ],
    note: "Kiểm tra vận hành kỹ trước khi bàn giao cho khách.",
  };

  const timeline = generateTimeline(detailData.status, detailData.technician);

  return (
    <div className="p-8 bg-slate-50 min-h-screen text-slate-700 text-xs font-medium space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-slate-400">
            <Link href="/repair-requests" className="hover:text-slate-600 flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Yêu cầu
            </Link>
            <span>/</span>
            <span className="text-slate-600 font-bold">Chi tiết #{detailData.code}</span>
          </div>
          <h1 className="text-xl font-bold text-sky-950">Chi tiết phiếu sửa chữa</h1>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-1.5 border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 rounded-xl font-bold text-slate-600 transition shadow-sm cursor-pointer">
            <Printer className="w-4 h-4" /> In phiếu
          </button>
          <button className="flex items-center gap-1.5 bg-sky-900 hover:bg-sky-950 text-white px-4 py-2 rounded-xl font-bold transition shadow-sm cursor-pointer">
            <Edit3 className="w-4 h-4" /> Chỉnh sửa
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5">
          <CustomerInfoCard
            customerName={detailData.customerName}
            phone={detailData.phone}
            secondaryPhone={detailData.secondaryPhone}
            email={detailData.email}
            deviceModel={detailData.device}
            serialNumber={detailData.serialNumber}
            issueDescription={detailData.issueDescription}
          />
        </div>
        <div className="lg:col-span-7">
          <RepairTimeline timeline={timeline} />
        </div>
      </div>

      <RepairImages address={detailData.address} />

      <RepairQuoteTable
        quoteStatus={detailData.quoteStatus}
        diagnoses={detailData.diagnoses}
        services={detailData.services}
        note={detailData.note}
      />
    </div>
  );
}