"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";

type RepairStatus = "completed" | "cancelled" | "in_progress";

interface RepairHistoryItem {
  id: string;
  orderCode: string;
  title: string;
  dateTime: string;
  rawCreatedAt?: string;
  status: RepairStatus;
  rawStatus?: string;
  total: number;
  vehicleModel?: string;
  technicianName?: string;
  issueType?: string;
  isSos?: boolean;
  location?: string;
}

type FilterTab = "all" | "this_month" | "completed";

export function getServiceTitle(isSos: boolean, issueType?: string, description?: string): string {
  if (isSos) return "Cứu hộ khẩn cấp 24/7 (SOS)";
  const t = (issueType || "").toUpperCase();
  switch (t) {
    case "BATTERY":
    case "PIN":
      return "Bảo dưỡng & Phục hồi Pin LFP";
    case "TIRE":
    case "WHEEL":
    case "LOP":
      return "Sửa chữa & Thay thế Lốp xe";
    case "MOTOR":
    case "DONG_CO":
      return "Kiểm tra & Sửa chữa Động cơ";
    case "BRAKE":
    case "PHANH":
      return "Bảo dưỡng Hệ thống Phanh";
    case "CONTROLLER":
    case "ECU":
      return "Xử lý Lỗi Bộ điều khiển (ECU)";
    case "ELECTRICAL":
    case "DIEN":
      return "Hệ thống Điện & Đèn còi";
    case "MAINTENANCE":
    case "BAO_DUONG":
      return "Bảo dưỡng định kỳ Xe điện";
    case "OTHER":
    case "KHAC":
    default:
      if (description && description.trim().length > 3) {
        const clean = description.trim();
        return clean.length > 40 ? clean.slice(0, 40) + "..." : clean;
      }
      return "Bảo trì & Sửa chữa Xe máy điện";
  }
}

function getStyleForService(title: string, isSos?: boolean) {
  const tile = (icon: string) => ({ icon, gradient: "var(--color-brand-50)", shadow: "none", color: "var(--color-brand-700)" });
  if (isSos) return { icon: "e911_emergency", gradient: "#fff1f2", shadow: "none", color: "#e11d48" };
  const t = title.toLowerCase();
  if (t.includes("pin") || t.includes("battery") || t.includes("lfp")) return tile("battery_charging_full");
  if (t.includes("lốp") || t.includes("bánh") || t.includes("tire") || t.includes("wheel")) return tile("settings");
  if (t.includes("động cơ") || t.includes("motor")) return tile("electric_moped");
  if (t.includes("phanh") || t.includes("brake")) return tile("build_circle");
  if (t.includes("ecu") || t.includes("điều khiển") || t.includes("điện")) return tile("memory");
  return tile("handyman");
}

function getStatusBadge(status: RepairStatus, rawStatus?: string) {
  const s = (rawStatus || status || "").toUpperCase();

  switch (s) {
    case "PENDING":
    case "REQUESTED":
      return { label: "Chờ phân công KTV", className: "rh-badge--pending", dotClass: "rh-dot--pulse-amber" };
    case "CONFIRMED":
      return { label: "Đã tiếp nhận yêu cầu", className: "rh-badge--info", dotClass: "rh-dot--pulse-blue" };
    case "ASSIGNED":
      return { label: "Đã phân công KTV", className: "rh-badge--info", dotClass: "rh-dot--pulse-blue" };
    case "ACCEPTED":
      return { label: "KTV đã nhận đơn", className: "rh-badge--info", dotClass: "rh-dot--pulse-blue" };
    case "EN_ROUTE":
      return { label: "KTV đang di chuyển", className: "rh-badge--info", dotClass: "rh-dot--pulse-blue" };
    case "ARRIVED":
      return { label: "KTV đã tới nơi", className: "rh-badge--info", dotClass: "rh-dot--pulse-blue" };
    case "DIAGNOSING":
      return { label: "Đang chẩn đoán lỗi", className: "rh-badge--info", dotClass: "rh-dot--pulse-blue" };
    case "DIAGNOSED":
      return { label: "Đã có kết quả kiểm tra", className: "rh-badge--info", dotClass: "rh-dot--pulse-blue" };
    case "WAITING_FOR_APPROVAL":
    case "ESTIMATE_SUBMITTED":
      return { label: "Chờ duyệt báo giá", className: "rh-badge--pending", dotClass: "rh-dot--pulse-amber" };
    case "ESTIMATE_APPROVED":
      return { label: "Đã duyệt báo giá", className: "rh-badge--info", dotClass: "rh-dot--pulse-blue" };
    case "ESTIMATE_REJECTED":
      return { label: "Đã từ chối báo giá", className: "rh-badge--pending", dotClass: "rh-dot--pulse-amber" };
    case "REPAIRING":
      return { label: "Đang sửa chữa", className: "rh-badge--info", dotClass: "rh-dot--pulse-blue" };
    case "COMPLETED":
    case "PAID":
      return { label: "Hoàn thành", className: "rh-badge--completed", dotClass: "rh-dot--green" };
    case "CANCELLED":
    case "REJECTED":
      return { label: "Đã hủy", className: "rh-badge--cancelled", dotClass: "rh-dot--gray" };
    default:
      return { label: "Đang xử lý", className: "rh-badge--info", dotClass: "rh-dot--pulse-blue" };
  }
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("vi-VN") + " ₫";
}

// Bộ nhớ đệm module phục vụ tải tức thì Stale-While-Revalidate
let memoryHistoryCache: RepairHistoryItem[] | null = null;

export function HistoryList() {
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Khởi tạo ngay từ bộ nhớ đệm (hiển thị tức thì 0ms)
  const [allRequests, setAllRequests] = useState<RepairHistoryItem[]>(() => {
    if (memoryHistoryCache && memoryHistoryCache.length > 0) return memoryHistoryCache;
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem("emobi_history_cache");
        if (saved) return JSON.parse(saved);
      } catch { }
    }
    return [];
  });

  const [loading, setLoading] = useState<boolean>(() => {
    if (memoryHistoryCache && memoryHistoryCache.length > 0) return false;
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem("emobi_history_cache");
        if (saved) return false;
      } catch { }
    }
    return true;
  });

  const isFetchingRef = useRef(false);

  // Tải dữ liệu ngầm khi chuyển bộ lọc hoặc tìm kiếm
  const fetchHistory = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const { fetchApiPages } = await import("@/lib/api-client");
      const res = await fetchApiPages<any>("/repair-requests/me");
      const items = res?.items || [];
      const mapped: RepairHistoryItem[] = items.map((item: any) => {
        let status: RepairStatus = "in_progress";
        const st = (item.status || "").toUpperCase();
        if (st === "COMPLETED" || st === "PAID") status = "completed";
        else if (st === "CANCELLED" || st === "REJECTED") status = "cancelled";

        const isSos = Boolean(item.is_sos);
        const title = getServiceTitle(isSos, item.issue_type, item.issue_description);
        const vehicleModel = item.device?.model_name || item.device?.manufacturer || "";
        const technicianName = item.technician?.name || "";

        const location = item.location_address || "";

        return {
          id: item.id,
          orderCode: item.request_code || item.id,
          title,
          dateTime: item.created_at
            ? new Date(item.created_at).toLocaleDateString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
            : "N/A",
          rawCreatedAt: item.created_at || "",
          status,
          rawStatus: item.status,
          vehicleModel,
          technicianName,
          issueType: item.issue_type,
          isSos,
          location,
          total: Number(item.total_amount ?? item.quote?.estimated_price ?? 0),
        };
      });

      setAllRequests(mapped);
      memoryHistoryCache = mapped;
      try {
        sessionStorage.setItem("emobi_history_cache", JSON.stringify(mapped));
      } catch { }
    } catch (err) {
      console.warn("Lỗi tải lịch sử sửa chữa:", err);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, []);

  // Thăm dò dữ liệu ngầm mỗi 10s (tự dừng khi chuyển tab)
  useEffect(() => {
    fetchHistory();

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      fetchHistory();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchHistory]);

  // Số lượng đơn theo từng tab
  const tabCounts = useMemo(() => {
    const all = allRequests.length;
    const completed = allRequests.filter((i) => i.status === "completed").length;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const thisMonth = allRequests.filter((i) => {
      if (!i.rawCreatedAt) return true;
      const d = new Date(i.rawCreatedAt);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;
    return { all, completed, this_month: thisMonth };
  }, [allRequests]);

  // Lọc dữ liệu trong bộ nhớ theo từ khóa và bộ lọc
  const filteredData = useMemo(() => {
    let result = allRequests;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.orderCode.toLowerCase().includes(q) ||
          (i.vehicleModel && i.vehicleModel.toLowerCase().includes(q)),
      );
    }
    if (activeFilter === "completed") {
      result = result.filter((i) => i.status === "completed");
    } else if (activeFilter === "this_month") {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      result = result.filter((i) => {
        if (!i.rawCreatedAt) return true;
        const d = new Date(i.rawCreatedAt);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
    }
    return result;
  }, [allRequests, searchQuery, activeFilter]);

  return (
    <div className="rh-container">
      <div className="rh-page-header">
        <h1 className="rh-page-title">Lịch sử sửa chữa & cứu hộ</h1>
        <p className="rh-page-subtitle">Theo dõi & quản lý các yêu cầu bảo dưỡng xe máy điện</p>
      </div>

      <div className="rh-search-bar">
        <span className="material-symbols-outlined rh-search-icon">search</span>
        <input
          type="text"
          className="rh-search-input"
          placeholder="Tìm theo dịch vụ, mã đơn hoặc dòng xe..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          id="history-search"
        />
        {searchQuery && (
          <button
            type="button"
            className="rh-search-clear"
            onClick={() => setSearchQuery("")}
            aria-label="Xóa tìm kiếm"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              close
            </span>
          </button>
        )}
      </div>

      <div className="rh-filter-tabs">
        <button
          className={`rh-filter-tab ${activeFilter === "all" ? "rh-filter-tab--active" : ""}`}
          onClick={() => setActiveFilter("all")}
          id="filter-all"
        >
          <span>Tất cả</span>
          <span className="rh-tab-badge">{tabCounts.all}</span>
        </button>
        <button
          className={`rh-filter-tab ${activeFilter === "this_month" ? "rh-filter-tab--active" : ""}`}
          onClick={() => setActiveFilter("this_month")}
          id="filter-this_month"
        >
          <span>Tháng này</span>
          <span className="rh-tab-badge">{tabCounts.this_month}</span>
        </button>
        <button
          className={`rh-filter-tab ${activeFilter === "completed" ? "rh-filter-tab--active" : ""}`}
          onClick={() => setActiveFilter("completed")}
          id="filter-completed"
        >
          <span>Hoàn thành</span>
          <span className="rh-tab-badge">{tabCounts.completed}</span>
        </button>
      </div>

      <div className="rh-cards-list">
        {loading && allRequests.length === 0 ? (
          <div className="rh-skeleton-list">
            {[1, 2, 3].map((n) => (
              <div key={n} className="rh-card rh-skeleton-card">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px" }}>
                  <div className="rh-skeleton-box" style={{ width: "90px", height: "18px", borderRadius: "6px" }} />
                  <div className="rh-skeleton-box" style={{ width: "120px", height: "22px", borderRadius: "99px" }} />
                </div>
                <div style={{ display: "flex", gap: "14px", alignItems: "center", marginBottom: "16px" }}>
                  <div className="rh-skeleton-box" style={{ width: "48px", height: "48px", borderRadius: "14px", flexShrink: 0 }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div className="rh-skeleton-box" style={{ width: "75%", height: "16px" }} />
                    <div className="rh-skeleton-box" style={{ width: "45%", height: "13px" }} />
                  </div>
                </div>
                <div className="rh-skeleton-box" style={{ width: "100%", height: "1px", margin: "14px 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div className="rh-skeleton-box" style={{ width: "110px", height: "24px" }} />
                  <div className="rh-skeleton-box" style={{ width: "85px", height: "32px", borderRadius: "99px" }} />
                </div>
              </div>
            ))}
          </div>
        ) : filteredData.length === 0 ? (
          <div className="rh-empty-state">
            <h3 className="rh-empty-title">Không tìm thấy lịch sử nào</h3>
            <p className="rh-empty-desc">
              {searchQuery ? "Thử tìm kiếm với từ khóa khác" : "Bạn chưa có đơn sửa chữa hoặc cứu hộ nào"}
            </p>
          </div>
        ) : (
          filteredData.map((item, index) => {
            const badge = getStatusBadge(item.status, item.rawStatus);
            const style = getStyleForService(item.title, item.isSos);
            return (
              <div
                key={item.id}
                className="rh-card"
                style={{ animationDelay: `${index * 0.04}s` }}
              >
                <div className="rh-card-meta-bar">
                  <div className="rh-card-meta-left">
                    <span className="rh-order-code">
                      #{item.orderCode.length > 12 ? item.orderCode.slice(-8).toUpperCase() : item.orderCode.toUpperCase()}
                    </span>
                    {item.vehicleModel && (
                      <span className="rh-vehicle-tag">
                        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                          electric_moped
                        </span>
                        {item.vehicleModel}
                      </span>
                    )}
                  </div>
                  <div className={`rh-status-pill ${badge.className}`}>
                    <span className={`rh-status-dot ${badge.dotClass}`} />
                    <span>{badge.label}</span>
                  </div>
                </div>

                <div className="rh-card-body">
                  <div
                    className="rh-service-icon"
                    style={{ background: style.gradient, boxShadow: style.shadow }}
                  >
                    <span className="material-symbols-outlined" style={{ color: style.color, fontSize: 24 }}>
                      {style.icon}
                    </span>
                  </div>

                  <div className="rh-service-details">
                    <h3 className="rh-service-title">{item.title}</h3>

                    <div className="rh-service-meta-row">
                      <span className="rh-datetime-badge">
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                          schedule
                        </span>
                        {item.dateTime}
                      </span>

                      {item.technicianName && (
                        <span className="rh-technician-badge">
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                            engineering
                          </span>
                          {item.technicianName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rh-card-divider" />

                <div className="rh-card-footer">
                  <div className="rh-price-group">
                    <span className="rh-price-label">Tổng chi phí</span>
                    {item.total > 0 ? (
                      <span className="rh-price-amount">{formatCurrency(item.total)}</span>
                    ) : item.status === "completed" ? (
                      <span className="rh-price-free">Miễn phí kiểm tra</span>
                    ) : (
                      <span className="rh-price-pending">Đang cập nhật báo giá</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {(item.status === "completed" || item.rawStatus === "COMPLETED" || item.rawStatus === "PAID") && (
                      <Link
                        href={`/home/history/${item.id}#rating`}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition shadow-2xs"
                        title="Đánh giá kỹ thuật viên"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#D97706" }}>star</span>
                        <span>Đánh giá KTV</span>
                      </Link>
                    )}

                    <Link
                      href={`/home/history/${item.id}`}
                      className="rh-action-btn"
                    >
                      <span>Chi tiết</span>
                      <span className="material-symbols-outlined rh-action-arrow">
                        arrow_forward
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

