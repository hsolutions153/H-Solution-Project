"use client";

import { SkeletonList } from "@/components/ui";
import { HistoryTask } from "@/types/task";
import { Badge,Button,Card,EmptyState,cn,inputClasses } from "@h-mobility/ui";
import { ChevronDown,FileText,MapPin,RotateCw,Search } from "lucide-react";
import React,{ useEffect,useState } from "react";

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
        const { fetchApiPages } = await import("@/lib/api-client");
        const res = await fetchApiPages<any>("/repair-requests/technician/me?page=1&limit=50");
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

  const FILTERS: { id: typeof activeTab; label: string }[] = [
    { id: "all", label: "Tất cả" },
    { id: "this_month", label: "Tháng này" },
    { id: "maintenance", label: "Bảo trì" },
    { id: "repair", label: "Sửa chữa" },
  ];

  return (
    <div className="space-y-4 px-4 pt-4 pb-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-bold text-ink">Lịch sử công việc</h1>
        {!loading ? (
          <span className="text-xs font-medium text-slate-500 tabular-nums">{filteredList.length} công việc</span>
        ) : null}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          aria-label="Tìm công việc"
          placeholder="Mã công việc hoặc tên khách hàng"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={cn(inputClasses, "pl-10")}
        />
      </div>

      <div className="scroll-area -mx-4 flex gap-2 overflow-x-auto px-4" role="tablist">
        {FILTERS.map((f) => {
          const active = activeTab === f.id;
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(f.id)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-1.5 text-[13px] transition-colors cursor-pointer",
                active
                  ? "border-brand-600 bg-brand-600 font-semibold text-white"
                  : "border-line bg-white font-medium text-slate-700 hover:bg-slate-50"
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <SkeletonList count={4} className="h-24" />
      ) : filteredList.length === 0 ? (
        <EmptyState
          icon={<FileText />}
          title={searchTerm ? "Không tìm thấy công việc" : "Chưa có công việc hoàn thành"}
          description={
            searchTerm
              ? "Thử tìm bằng mã công việc hoặc tên khách hàng khác."
              : "Đơn sửa chữa sau khi hoàn tất và nghiệm thu sẽ hiện ở đây."
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredList.map((item) => {
            const isExpanded = expandedId === item.id;

            return (
              <Card key={item.id} padded={false} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleExpand(item.id)}
                  aria-expanded={isExpanded}
                  className="flex w-full p-4 text-left transition-colors hover:bg-slate-50/60 cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold tabular-nums text-slate-500">
                        #{item.code} · {item.date} {item.time}
                      </span>
                      <ChevronDown
                        className={cn("size-5 shrink-0 text-slate-400 transition-transform", isExpanded && "rotate-180")}
                      />
                    </div>
                    <h3 className="mt-1 truncate text-base font-bold text-ink">{item.customerName}</h3>
                    <p className="mt-0.5 truncate text-[13px] text-slate-600">{item.deviceInfo}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <Badge tone={item.type === "repair" ? "brand" : "neutral"} className="min-w-0 max-w-[60%]">
                        <span className="min-w-0 truncate">{item.serviceType}</span>
                      </Badge>
                      <span className="text-sm font-bold tabular-nums text-ink">
                        {item.totalAmount.toLocaleString("vi-VN")} đ
                      </span>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="space-y-4 border-t border-line bg-slate-50/60 p-4">
                    <p className="flex items-start gap-1.5 text-[13px] text-slate-600">
                      <MapPin className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
                      {item.address}
                    </p>

                    {item.diagnosis && (
                      <div>
                        <p className="text-sm font-semibold text-ink">Chẩn đoán</p>
                        <p className="mt-0.5 text-sm leading-relaxed text-slate-600">
                          {item.diagnosis.replace(/\[Hẹn:[^\]]*\]/, "").trim()}
                        </p>
                      </div>
                    )}

                    {item.solution && (
                      <div>
                        <p className="text-sm font-semibold text-ink">Nội dung xử lý</p>
                        <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{item.solution}</p>
                      </div>
                    )}

                    {(item.images?.before || item.images?.after) && (
                      <div className="grid grid-cols-2 gap-2">
                        {item.images.before && (
                          <figure>
                            <div className="aspect-[4/3] overflow-hidden rounded-control border border-line bg-slate-100">
                              <img
                                src={item.images.before}
                                alt="Trước khi sửa"
                                className="size-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "/images/s1.jpg";
                                }}
                              />
                            </div>
                            <figcaption className="mt-1 text-xs text-slate-500">Trước khi sửa</figcaption>
                          </figure>
                        )}
                        {item.images.after && (
                          <figure>
                            <div className="aspect-[4/3] overflow-hidden rounded-control border border-line bg-slate-100">
                              <img
                                src={item.images.after}
                                alt="Sau khi sửa"
                                className="size-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "/images/s1.jpg";
                                }}
                              />
                            </div>
                            <figcaption className="mt-1 text-xs text-slate-500">Sau khi sửa</figcaption>
                          </figure>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t border-line pt-3">
                      <div>
                        <p className="text-xs text-slate-500">Tổng cộng</p>
                        <p className="text-base font-bold tabular-nums text-ink">
                          {item.totalAmount.toLocaleString("vi-VN")} đ
                        </p>
                      </div>
                      <Button size="sm" variant="secondary" icon={<FileText className="size-4" />}>
                        Xem hóa đơn
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {!loading && filteredList.length > 0 && (
        <div className="flex justify-center pt-1">
          <Button variant="ghost" icon={<RotateCw className="size-4" />}>
            Tải thêm
          </Button>
        </div>
      )}
    </div>
  );
};
