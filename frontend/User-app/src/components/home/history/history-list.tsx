"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type RepairStatus = "completed" | "cancelled" | "in_progress";

interface RepairHistoryItem {
  id: string;
  orderCode: string;
  title: string;
  dateTime: string;
  status: RepairStatus;
  rawStatus?: string;
  total: number;
}

type FilterTab = "all" | "this_month" | "completed";

const filterTabs: { id: FilterTab; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "this_month", label: "Tháng này" },
  { id: "completed", label: "Hoàn thành" },
];

function getStatusBadge(status: RepairStatus, rawStatus?: string) {
  const s = (rawStatus || status || "").toUpperCase();

  switch (s) {
    case "PENDING":
    case "REQUESTED":
      return { label: "CHỜ PHÂN CÔNG KTV", className: "rh-status-badge--progress" };
    case "CONFIRMED":
      return { label: "ĐÃ TIẾP NHẬN", className: "rh-status-badge--progress" };
    case "ASSIGNED":
      return { label: "ĐÃ PHÂN CÔNG KTV", className: "rh-status-badge--progress" };
    case "ACCEPTED":
      return { label: "KTV ĐÃ NHẬN ĐƠN", className: "rh-status-badge--progress" };
    case "REJECTED":
      return { label: "KTV TỪ CHỐI ĐƠN", className: "rh-status-badge--cancelled" };
    case "EN_ROUTE":
      return { label: "KTV ĐANG TỚI", className: "rh-status-badge--progress" };
    case "ARRIVED":
      return { label: "KTV ĐÃ TỚI NƠI", className: "rh-status-badge--progress" };
    case "DIAGNOSING":
      return { label: "ĐANG CHẨN ĐOÁN", className: "rh-status-badge--progress" };
    case "DIAGNOSED":
      return { label: "ĐÃ CHẨN ĐOÁN", className: "rh-status-badge--progress" };
    case "WAITING_FOR_APPROVAL":
    case "ESTIMATE_SUBMITTED":
      return { label: "CHỜ DUYỆT BÁO GIÁ", className: "rh-status-badge--progress" };
    case "ESTIMATE_APPROVED":
      return { label: "ĐÃ DUYỆT BÁO GIÁ", className: "rh-status-badge--progress" };
    case "ESTIMATE_REJECTED":
      return { label: "TỪ CHỐI BÁO GIÁ", className: "rh-status-badge--cancelled" };
    case "REPAIRING":
      return { label: "ĐANG SỬA CHỮA", className: "rh-status-badge--progress" };
    case "COMPLETED":
    case "PAID":
      return { label: "HOÀN THÀNH", className: "rh-status-badge--completed" };
    case "CANCELLED":
      return { label: "ĐẢ HỦY", className: "rh-status-badge--cancelled" };
    default:
      return { label: "ĐANG XỬ LÝ", className: "rh-status-badge--progress" };
  }
}

function getStyleForService(title: string) {
  const t = title.toLowerCase();
  if (t.includes("emergency") || t.includes("rescue") || t.includes("cứu hộ") || t.includes("sos")) {
    return { icon: "emergency", bg: "#FEE2E2", color: "#DC2626" };
  }
  if (t.includes("battery") || t.includes("pin")) {
    return { icon: "battery_charging_full", bg: "#DBEAFE", color: "#1565C0" };
  }
  if (t.includes("wheel") || t.includes("bánh xe")) {
    return { icon: "settings", bg: "#E0F2FE", color: "#0284C7" };
  }
  if (t.includes("motor") || t.includes("động cơ")) {
    return { icon: "engineering", bg: "#FEF3C7", color: "#D97706" };
  }
  return { icon: "construction", bg: "#F3E8FF", color: "#7C3AED" };
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("vi-VN") + "đ";
}

export function HistoryList() {
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [historyData, setHistoryData] = useState<RepairHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchHistory() {
      try {
        const { fetchApi } = await import("@/lib/api-client");
        const res = await fetchApi<any>("/repair-requests/me?page=1&limit=50");
        const items = res?.items || [];
        const mapped: RepairHistoryItem[] = items.map((item: any) => {
          let status: RepairStatus = "in_progress";
          if (item.status === "completed") status = "completed";
          else if (item.status === "cancelled") status = "cancelled";

          return {
            id: item.id,
            orderCode: item.request_code || item.id,
            title: item.is_sos
              ? "Cứu hộ khẩn cấp (SOS)"
              : `Sửa chữa ${item.issue_type || "thiết bị"}`,
            dateTime: item.created_at
              ? new Date(item.created_at).toLocaleDateString("vi-VN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "N/A",
            status,
            rawStatus: item.status,
            total: item.total_amount
              ? Number(item.total_amount)
              : item.quote?.estimated_price
                ? Number(item.quote.estimated_price)
                : 0,
          };
        });

        let filtered = mapped;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          filtered = filtered.filter(
            (i) =>
              i.title.toLowerCase().includes(q) ||
              i.orderCode.toLowerCase().includes(q),
          );
        }
        if (activeFilter === "completed") {
          filtered = filtered.filter((i) => i.status === "completed");
        }

        if (isMounted) {
          setHistoryData(filtered);
        }
      } catch (err) {
        console.warn("Failed to fetch history:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchHistory();
    const interval = setInterval(fetchHistory, 4000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeFilter, searchQuery]);

  return (
    <div className="rh-container">
      {/* Header */}
      <div className="rh-page-header">
        <h1 className="rh-page-title">Lịch sử sửa chữa</h1>
      </div>

      {/* Search */}
      <div className="rh-search-bar">
        <span className="material-symbols-outlined rh-search-icon">search</span>
        <input
          type="text"
          className="rh-search-input"
          placeholder="Tìm dịch vụ hoặc mã đơn..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          id="history-search"
        />
      </div>

      {/* Filter Tabs */}
      <div className="rh-filter-tabs">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            className={`rh-filter-tab ${activeFilter === tab.id ? "rh-filter-tab--active" : ""}`}
            onClick={() => setActiveFilter(tab.id)}
            id={`filter-${tab.id}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* History Cards */}
      <div className="rh-cards-list">
        {loading ? (
          <div className="rh-empty-state">
            <div className="rh-loading-spinner" />
            <p>Đang tải lịch sử...</p>
          </div>
        ) : historyData.map((item, index) => {
          const badge = getStatusBadge(item.status, item.rawStatus);
          const style = getStyleForService(item.title);
          return (
            <div
              key={item.id}
              className="rh-card"
              style={{ animationDelay: `${index * 0.04}s` }}
            >
              <div className="rh-card-top">
                <div className="rh-card-service">
                  <div
                    className="rh-card-icon"
                    style={{ background: style.bg }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ color: style.color, fontSize: 22 }}
                    >
                      {style.icon}
                    </span>
                  </div>
                  <div className="rh-card-info">
                    <span className="rh-card-title">{item.title}</span>
                    <span className="rh-card-datetime">
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                        calendar_today
                      </span>
                      {item.dateTime}
                    </span>
                  </div>
                </div>
                <span className={`rh-status-badge ${badge.className}`}>
                  {badge.label}
                </span>
              </div>

              <div className="rh-card-bottom">
                <div className="rh-card-cost">
                  <span className="rh-cost-label">CHI PHÍ</span>
                  <span className="rh-cost-value">
                    {item.total > 0
                      ? formatCurrency(item.total)
                      : ["COMPLETED", "PAID"].includes(item.rawStatus?.toUpperCase() || "")
                        ? formatCurrency(item.total || 0)
                        : "Chờ KTV báo giá"}
                  </span>
                </div>
                <Link
                  href={`/home/history/${item.id}`}
                  className="rh-view-details-btn"
                  id={`view-detail-${item.id}`}
                >
                  Xem chi tiết
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    chevron_right
                  </span>
                </Link>
              </div>
            </div>
          );
        })}

        {!loading && historyData.length === 0 && (
          <div className="rh-empty-state">
            <span className="material-symbols-outlined" style={{ fontSize: 48, color: "#cbd5e1" }}>
              search_off
            </span>
            <p>Không tìm thấy lịch sử sửa chữa</p>
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="rh-footer-hint">
        {!loading && <div className="rh-loading-spinner" style={{ animationPlayState: "paused" }} />}
        <span>Hiển thị lịch sử trong 8 tháng gần nhất</span>
      </div>
    </div>
  );
}
