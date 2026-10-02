"use client";

import React, { useState, useEffect } from "react";
import { HistoryTask } from "@/types/task";
import {
  Search,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  FileText,
  RotateCw,
} from "lucide-react";

interface TaskHistoryScreenProps {
  newCompletedTask?: HistoryTask | null;
}

export const TaskHistoryScreen: React.FC<TaskHistoryScreenProps> = ({
  newCompletedTask,
}) => {
  const [historyList, setHistoryList] = useState<HistoryTask[]>(() => {
    return newCompletedTask ? [newCompletedTask] : [];
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadCompletedTasks() {
      try {
        setLoading(true);
        const { fetchApi } = await import("@/lib/api-client");
        const res = await fetchApi<any>("/repair-requests/technician/me?page=1&limit=50");
        if (res && Array.isArray(res.items)) {
          const completedFromApi: HistoryTask[] = res.items
            .filter((item: any) => item.status === "COMPLETED" || item.status === "completed")
            .map((item: any) => {
              const effectiveTotal = Number(item.total_amount ?? item.quote?.estimated_price ?? item.quote?.total_amount ?? 0);

              const cust = item.customer || {};
              const dev = item.device || {};
              const d = item.completed_at || item.created_at ? new Date(item.completed_at || item.created_at) : new Date();

              return {
                id: item.id,
                code: item.request_code || item.id,
                date: d.toLocaleDateString("vi-VN"),
                time: d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
                serviceType: item.is_sos ? "Cứu hộ khẩn cấp (SOS)" : `Sửa chữa ${item.issue_type || "thiết bị"}`,
                customerName: cust.full_name || item.customer_name || "Khách hàng",
                deviceInfo: dev.model_name ? `${dev.manufacturer || ""} ${dev.model_name}` : `Xe lăn điện ${dev.device_type || ""}`,
                address: item.location_address || cust.address || "Địa chỉ không xác định",
                type: item.is_sos ? "repair" : "maintenance",
                diagnosis: item.issue_description || "Kiểm tra và xử lý theo yêu cầu khách hàng.",
                solution: item.quote?.diagnosis_note || "Đã hoàn thành sửa chữa & kiểm tra thiết bị.",
                images: {
                  before: (() => {
                    if (!Array.isArray(item.images)) return "";
                    const found = item.images.find((img: any) => img.image_type === "BEFORE_REPAIR" || img.type === "BEFORE_REPAIR");
                    if (found) return found.image_url || found.url || "";
                    return typeof item.images[0] === "string" ? item.images[0] : item.images[0]?.image_url || "";
                  })(),
                  after: (() => {
                    if (!Array.isArray(item.images)) return "";
                    const found = item.images.find((img: any) => img.image_type === "AFTER_REPAIR" || img.type === "AFTER_REPAIR");
                    if (found) return found.image_url || found.url || "";
                    return typeof item.images[1] === "string" ? item.images[1] : item.images[1]?.image_url || "";
                  })(),
                },
                totalAmount: effectiveTotal,
              };
            });

          if (isMounted) {
            if (newCompletedTask) {
              const filtered = completedFromApi.filter((t) => t.id !== newCompletedTask.id && t.code !== newCompletedTask.code);
              setHistoryList([newCompletedTask, ...filtered]);
            } else {
              setHistoryList(completedFromApi);
            }
          }
        }
      } catch (err) {
        console.warn("Lỗi tải lịch sử công việc KTV:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadCompletedTasks();
    return () => {
      isMounted = false;
    };
  }, [newCompletedTask]);

  const [activeTab, setActiveTab] = useState<"all" | "this_month" | "maintenance" | "repair">("all");
  const [expandedId, setExpandedId] = useState<string | null>(
    newCompletedTask ? newCompletedTask.id : null
  );
  const [searchTerm, setSearchTerm] = useState<string>("");

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // Lọc danh sách công việc
  const filteredList = historyList.filter((item) => {
    const matchesSearch =
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.customerName.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === "maintenance") return item.type === "maintenance";
    if (activeTab === "repair") return item.type === "repair";
    return true;
  });

  return (
    <div className="max-w-md mx-auto bg-slate-50 min-h-screen pb-20 font-sans border-x border-slate-100">
      <div className="p-4 space-y-4">
        <h1 className="text-lg font-bold text-slate-800">Lịch sử công việc</h1>

        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 flex items-center gap-2 shadow-sm">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Tìm theo Mã công việc hoặc Tên khách hàng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs bg-transparent focus:outline-none text-slate-700"
            />
          </div>
          <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 cursor-pointer shadow-sm">
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3.5 py-1.5 rounded-xl font-medium transition-colors shrink-0 ${
              activeTab === "all"
                ? "bg-brand-400 text-white font-semibold"
                : "bg-slate-200/60 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setActiveTab("this_month")}
            className={`px-3.5 py-1.5 rounded-xl font-medium transition-colors shrink-0 ${
              activeTab === "this_month"
                ? "bg-brand-400 text-white font-semibold"
                : "bg-slate-200/60 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Tháng này
          </button>
          <button
            onClick={() => setActiveTab("maintenance")}
            className={`px-3.5 py-1.5 rounded-xl font-medium transition-colors shrink-0 ${
              activeTab === "maintenance"
                ? "bg-brand-400 text-white font-semibold"
                : "bg-slate-200/60 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Bảo trì
          </button>
          <button
            onClick={() => setActiveTab("repair")}
            className={`px-3.5 py-1.5 rounded-xl font-medium transition-colors shrink-0 ${
              activeTab === "repair"
                ? "bg-brand-400 text-white font-semibold"
                : "bg-slate-200/60 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Sửa chữa
          </button>
        </div>

        {loading ? (
          <div className="py-14 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2.5">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            <p className="font-medium text-slate-500">Đang tải lịch sử công việc...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-12 px-6 bg-white rounded-2xl border border-slate-100 text-center space-y-2 shadow-2xs">
            <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <FileText className="w-5 h-5" />
            </div>
            <p className="font-bold text-slate-700 text-sm">Chưa có công việc nào hoàn thành</p>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              Các đơn hàng sửa chữa sau khi bạn hoàn tất và nghiệm thu sẽ được hiển thị tại đây.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredList.map((item) => {
              const isExpanded = expandedId === item.id;

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all"
                >
                  <div
                    onClick={() => toggleExpand(item.id)}
                    className="p-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-brand-600">
                        #{item.code}{" "}
                        <span className="text-slate-400 font-normal">
                          • {item.date} • {item.time}
                        </span>
                      </span>
                      <span className="px-2.5 py-0.5 bg-brand-100 text-brand-700 font-semibold text-[11px] rounded-full">
                        {item.serviceType}
                      </span>
                    </div>

                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm">
                          {item.customerName}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {item.deviceInfo}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {item.address}
                        </p>
                      </div>
                      <button className="text-slate-400 p-1">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50/30 space-y-3 text-xs">
                      {item.diagnosis && (
                        <div>
                          <p className="font-bold text-brand-900 mb-0.5">
                            Chẩn đoán
                          </p>
                          <p className="text-slate-600 leading-relaxed">
                            {item.diagnosis}
                          </p>
                        </div>
                      )}

                      {item.solution && (
                        <div>
                          <p className="font-bold text-brand-900 mb-0.5">
                            Nội dung xử lý
                          </p>
                          <p className="text-slate-600 leading-relaxed">
                            {item.solution}
                          </p>
                        </div>
                      )}

                      {(item.images?.before || item.images?.after) && (
                        <div>
                          <p className="font-bold text-brand-900 mb-1.5">
                            Hình ảnh thực tế
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {item.images.before && (
                              <div className="relative rounded-xl overflow-hidden h-24 bg-slate-200 border border-slate-200">
                                <img
                                  src={item.images.before}
                                  alt="Trước khi làm"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = "/images/s1.jpg";
                                  }}
                                />
                                <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-medium">
                                  Trước khi làm
                                </span>
                              </div>
                            )}
                            {item.images.after && (
                              <div className="relative rounded-xl overflow-hidden h-24 bg-slate-200 border border-slate-200">
                                <img
                                  src={item.images.after}
                                  alt="Sau khi làm"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = "/images/s1.jpg";
                                  }}
                                />
                                <span className="absolute bottom-1 left-1 bg-brand-600/80 text-white text-[9px] px-1.5 py-0.5 rounded font-medium">
                                  Sau khi làm
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                        <div>
                          <p className="text-[10px] text-slate-400 font-semibold uppercase">
                            Tổng cộng
                          </p>
                          <p className="text-sm font-bold text-slate-900">
                            {item.totalAmount.toLocaleString("vi-VN")} VND
                          </p>
                        </div>

                        <button className="flex items-center gap-1 text-brand-700 font-semibold text-xs hover:underline">
                          <FileText className="w-3.5 h-3.5" /> Xem hóa đơn
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!loading && filteredList.length > 0 && (
          <div className="pt-2 flex justify-center">
            <button className="py-2.5 px-6 bg-slate-200/70 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors">
              <RotateCw className="w-3.5 h-3.5" /> Tải thêm công việc
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
