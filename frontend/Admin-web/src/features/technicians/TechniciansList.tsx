"use client";

import type { OrderRecord } from "@/features/orders/OrderDetailModal";
import type { Technician } from "@/types/api";
import { errorMessage } from "@/types/api";

import { Pagination } from "@/components/common/Pagination";
import {
Activity,
BarChart3,
Calendar,
CheckCircle2,
Clock,
DollarSign,
Eye,
FileText,
Layers,
LayoutGrid,
Mail,
Pencil,
Phone,
RefreshCw,
Search,
ShieldAlert,
Star,
Table,
Trash2,
TrendingUp,
UserPlus,
Wrench,
X,
XCircle
} from "lucide-react";
import { useEffect,useMemo,useState } from "react";
import { CreateTechnicianModal } from "./CreateTechnicianModal";
import { DeleteTechnicianModal } from "./DeleteTechnicianModal";
import { EditTechnicianModal } from "./EditTechnicianModal";
import { ViewTechnicianModal } from "./ViewTechnicianModal";

type TimeRange = "TODAY" | "MONTH" | "YEAR" | "ALL";

export const TechniciansList = () => {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [allOrders, setAllOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [timeRange, setTimeRange] = useState<TimeRange>("MONTH");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // View Mode: 'table' (dạng bảng) hoặc 'grid' (dạng lưới)
  const [viewMode, setViewMode] = useState<"table" | "grid">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin_technicians_view_mode");
      if (saved === "grid" || saved === "table") return saved;
    }
    return "table";
  });

  // Phân trang cho Dạng Bảng (10 bản ghi 1 trang)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals Quản lý KTV ở Dạng Bảng
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewingTech, setViewingTech] = useState<Technician | null>(null);
  const [editingTech, setEditingTech] = useState<Technician | null>(null);
  const [deletingTech, setDeletingTech] = useState<Technician | null>(null);
  const [togglingOnlineId, setTogglingOnlineId] = useState<string | null>(null);

  // KYC Review Modal State
  const [selectedKycTech, setSelectedKycTech] = useState<Technician | null>(null);
  const [kycLoading, setKycLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Stats Detail Modal State (Dạng lưới)
  const [detailStatsTech, setDetailStatsTech] = useState<(Technician & { stats: NonNullable<Technician["stats"]> }) | null>(null);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const handleViewModeChange = (mode: "table" | "grid") => {
    setViewMode(mode);
    try {
      localStorage.setItem("admin_technicians_view_mode", mode);
    } catch {}
  };

  const fetchTechniciansAndOrders = async () => {
    setLoading(true);
    try {
      const { fetchApi, fetchApiPages } = await import("@/lib/api-client");
      const [techRes, ordersRes] = await Promise.allSettled([
        fetchApi<Technician[]>("/technicians"),
        fetchApiPages<OrderRecord>("/orders"),
      ]);

      const techList =
        techRes.status === "fulfilled"
          ? Array.isArray(techRes.value)
            ? techRes.value
            : []
          : [];

      const rawOrders = ordersRes.status === "fulfilled" ? ordersRes.value : null;
      const ordersList = Array.isArray(rawOrders?.items)
        ? rawOrders.items
        : Array.isArray(rawOrders)
        ? rawOrders
        : [];

      setTechnicians(techList);
      setAllOrders(ordersList);
    } catch (err: unknown) {
      console.warn("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(fetchTechniciansAndOrders);
  }, []);


  const handleShowToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleToggleOnline = async (tech: Technician) => {
    const techId = tech.user_id || tech.id || "";
    if (togglingOnlineId === techId) return;
    const nextStatus = !tech.is_online;
    setTogglingOnlineId(techId);
    try {
      const { fetchApi } = await import("@/lib/api-client");
      await fetchApi(`/technicians/${techId}`, {
        method: "PATCH",
        body: JSON.stringify({ is_online: nextStatus }),
      });
      handleShowToast(
        `Đã chuyển trạng thái KTV ${tech.full_name || tech.user?.full_name || "thợ"} sang ${
          nextStatus ? "Online (Nhận đơn)" : "Offline"
        }!`
      );
      fetchTechniciansAndOrders();
    } catch (err: unknown) {
      alert(errorMessage(err, "Lỗi khi cập nhật trạng thái"));
    } finally {
      setTogglingOnlineId(null);
    }
  };

  const handleReviewKyc = async (
    techId: string,
    status: "APPROVED" | "REJECTED"
  ) => {
    setKycLoading(true);
    try {
      const { fetchApi } = await import("@/lib/api-client");
      await fetchApi(`/technicians/${techId}/kyc`, {
        method: "PATCH",
        body: JSON.stringify({
          kyc_status: status,
          kyc_note: status === "REJECTED" ? rejectionReason : null,
        }),
      });

      handleShowToast(
        `Đã ${status === "APPROVED" ? "phê duyệt" : "từ chối"} hồ sơ KYC!`
      );
      setSelectedKycTech(null);
      setRejectionReason("");
      fetchTechniciansAndOrders();
    } catch (err: unknown) {
      alert(errorMessage(err, "Lỗi khi duyệt KYC"));
    } finally {
      setKycLoading(false);
    }
  };

  // Helper so sánh mốc thời gian ngày / tháng / năm
  const isSameDay = (dateStr?: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const t = new Date();
    return (
      d.getDate() === t.getDate() &&
      d.getMonth() === t.getMonth() &&
      d.getFullYear() === t.getFullYear()
    );
  };

  const isSameMonth = (dateStr?: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const t = new Date();
    return (
      d.getMonth() === t.getMonth() &&
      d.getFullYear() === t.getFullYear()
    );
  };

  const isSameYear = (dateStr?: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const t = new Date();
    return d.getFullYear() === t.getFullYear();
  };

  // Tính toán số liệu thống kê Ngày / Tháng / Năm cho từng KTV
  const techStatsMap = useMemo(() => {
    const map: Record<
      string,
      {
        todayOrders: number;
        todayRevenue: number;
        monthOrders: number;
        monthRevenue: number;
        yearOrders: number;
        yearRevenue: number;
        allOrders: number;
        allRevenue: number;
        orderList: OrderRecord[];
      }
    > = {};

    technicians.forEach((tech) => {
      const statsObj = {
        todayOrders: 0,
        todayRevenue: 0,
        monthOrders: 0,
        monthRevenue: 0,
        yearOrders: 0,
        yearRevenue: 0,
        allOrders: 0,
        allRevenue: 0,
        orderList: [] as OrderRecord[],
      };
      if (tech.user_id) map[tech.user_id] = statsObj;
      if (tech.id && !map[tech.id]) map[tech.id] = statsObj;
    });

    allOrders.forEach((order) => {
      const tId = order.technician_id || order.technician?.id || order.technician?.user_id;
      if (!tId || !map[tId]) return;

      map[tId].orderList.push(order);

      const isCompleted =
        order.status === "COMPLETED" ||
        order.status === "DONE" ||
        order.status === "PAID";
      if (!isCompleted) return;

      const cost =
        Number(order.total_amount ?? order.actual_cost ?? 0);

      const dateStr = order.completed_at || order.updated_at || order.created_at;

      map[tId].allOrders += 1;
      map[tId].allRevenue += cost;

      if (isSameDay(dateStr)) {
        map[tId].todayOrders += 1;
        map[tId].todayRevenue += cost;
      }
      if (isSameMonth(dateStr)) {
        map[tId].monthOrders += 1;
        map[tId].monthRevenue += cost;
      }
      if (isSameYear(dateStr)) {
        map[tId].yearOrders += 1;
        map[tId].yearRevenue += cost;
      }
    });

    return map;
  }, [technicians, allOrders]);

  // Thống kê tổng hợp toàn đội ngũ theo Mốc thời gian chọn
  const overallTotals = useMemo(() => {
    let totalRev = 0;
    let totalOrd = 0;

    allOrders.forEach((order) => {
      const isCompleted =
        order.status === "COMPLETED" ||
        order.status === "DONE" ||
        order.status === "PAID";
      if (!isCompleted) return;

      const cost =
        Number(order.total_amount ?? order.actual_cost ?? 0);
      const dateStr = order.completed_at || order.updated_at || order.created_at;

      if (timeRange === "TODAY") {
        if (isSameDay(dateStr)) {
          totalRev += cost;
          totalOrd += 1;
        }
      } else if (timeRange === "MONTH") {
        if (isSameMonth(dateStr)) {
          totalRev += cost;
          totalOrd += 1;
        }
      } else if (timeRange === "YEAR") {
        if (isSameYear(dateStr)) {
          totalRev += cost;
          totalOrd += 1;
        }
      } else {
        totalRev += cost;
        totalOrd += 1;
      }
    });

    return { totalRev, totalOrd };
  }, [allOrders, timeRange]);

  const filteredTechs = technicians.filter((t) => {
    const name = (t.full_name || t.user?.full_name || t.name || "").toLowerCase();
    const phone = (t.phone || t.user?.phone || "").toLowerCase();
    const email = (t.email || t.user?.email || "").toLowerCase();
    const spec = (t.specialization || "").toLowerCase();
    const query = searchTerm.toLowerCase();

    const matchesSearch =
      name.includes(query) ||
      phone.includes(query) ||
      email.includes(query) ||
      spec.includes(query);

    const matchesFilter =
      statusFilter === "ALL" ||
      (statusFilter === "ONLINE" && t.is_online) ||
      (statusFilter === "OFFLINE" && !t.is_online) ||
      (statusFilter === "KYC_PENDING" && t.kyc_status === "PENDING");

    return matchesSearch && matchesFilter;
  });

  // Phân trang dữ liệu dạng bảng
  const totalItems = filteredTechs.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedTechs = filteredTechs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="p-6 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-brand-500/30 flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Header & Thanh trượt Dạng Bảng / Dạng Lưới */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Quản lý Đội ngũ Kỹ thuật viên
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {viewMode === "grid"
              ? "Theo dõi tổng hợp đơn hoàn thành, doanh thu tích lũy theo Ngày, Tháng và Năm"
              : `Quản lý danh sách, hồ sơ và phân quyền của ${technicians.length} kỹ thuật viên`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Thanh trượt hiển thị Dạng Bảng / Dạng Lưới */}
          <div className="relative flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 select-none">
            <div
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-xs transition-all duration-200 ease-out pointer-events-none ${
                viewMode === "grid" ? "left-[calc(50%+2px)]" : "left-1"
              }`}
            />
            <button
              type="button"
              onClick={() => handleViewModeChange("table")}
              className={`relative z-10 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer w-28 ${
                viewMode === "table" ? "text-brand-950 font-black" : "text-slate-500 hover:text-slate-800"
              }`}
              title="Chuyển sang hiển thị dạng bảng thông tin"
            >
              <Table className="w-3.5 h-3.5" />
              <span>Dạng bảng</span>
            </button>
            <button
              type="button"
              onClick={() => handleViewModeChange("grid")}
              className={`relative z-10 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer w-28 ${
                viewMode === "grid" ? "text-brand-950 font-black" : "text-slate-500 hover:text-slate-800"
              }`}
              title="Chuyển sang hiển thị dạng lưới & doanh số"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Dạng lưới</span>
            </button>
          </div>

          <button
            onClick={fetchTechniciansAndOrders}
            disabled={loading}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition cursor-pointer"
            title="Làm mới"
            aria-label="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          {/* Nút Thêm KTV mới (ở chế độ Dạng bảng) */}
          {viewMode === "table" && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-brand-900 hover:bg-brand-950 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-sm transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4 stroke-[2.5]" />
              <span>Thêm kỹ thuật viên</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. CHẾ ĐỘ DẠNG BẢNG (TABLE VIEW - QUẢN LÝ THÔNG TIN KỸ THUẬT VIÊN)       */}
      {/* ========================================================================= */}
      {viewMode === "table" ? (
        <div className="space-y-6">
          {/* Search & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 min-w-[260px]">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                placeholder="Tìm theo tên thợ, số điện thoại, email, chuyên môn..."
                className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-800"
              />
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => { setStatusFilter("ALL"); setCurrentPage(1); }}
                className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                  statusFilter === "ALL"
                    ? "bg-white text-slate-900 shadow-xs font-black"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Tất cả ({technicians.length})
              </button>
              <button
                onClick={() => { setStatusFilter("ONLINE"); setCurrentPage(1); }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                  statusFilter === "ONLINE"
                    ? "bg-white text-slate-900 shadow-xs font-black"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <span className="size-2 rounded-full bg-emerald-500" aria-hidden />
                Online ({technicians.filter((t) => t.is_online).length})
              </button>
              <button
                onClick={() => { setStatusFilter("OFFLINE"); setCurrentPage(1); }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                  statusFilter === "OFFLINE"
                    ? "bg-white text-slate-900 shadow-xs font-black"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <span className="size-2 rounded-full bg-slate-400" aria-hidden />
                Offline ({technicians.filter((t) => !t.is_online).length})
              </button>
              <button
                onClick={() => { setStatusFilter("KYC_PENDING"); setCurrentPage(1); }}
                className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                  statusFilter === "KYC_PENDING"
                    ? "bg-white text-slate-900 shadow-xs font-black"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Chờ duyệt KYC ({technicians.filter((t) => t.kyc_status === "PENDING").length})
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-400 tracking-wider uppercase border-b border-slate-200">
                    <th className="py-3.5 px-4">Mã KTV</th>
                    <th className="py-3.5 px-4">Kỹ thuật viên</th>
                    <th className="py-3.5 px-4">Chuyên môn & Kinh nghiệm</th>
                    <th className="py-3.5 px-4">Trạng thái hoạt động</th>
                    <th className="py-3.5 px-4">Xác thực KYC</th>
                    <th className="py-3.5 px-4">Đánh giá & Đơn làm</th>
                    <th className="py-3.5 px-4 text-center">Chức năng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-800" />
                        Đang tải danh sách kỹ thuật viên...
                      </td>
                    </tr>
                  ) : paginatedTechs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                        Không tìm thấy kỹ thuật viên nào.
                      </td>
                    </tr>
                  ) : (
                    paginatedTechs.map((tech) => {
                      const techId = tech.user_id || tech.id || "";
                      const name =
                        tech.full_name || tech.user?.full_name || tech.name || "Kỹ thuật viên";
                      const phone = tech.phone || tech.user?.phone;
                      const email = tech.email || tech.user?.email;
                      const initial = name.charAt(0).toUpperCase();
                      const stats = techStatsMap[techId] || { allOrders: 0 };
                      const totalDone = tech.total_jobs_done || stats.allOrders || 0;

                      return (
                        <tr key={techId} className="hover:bg-slate-50/80 transition group">
                          {/* Mã KTV */}
                          <td className="py-3.5 px-4 font-mono text-xs text-slate-500 font-bold">
                            {techId}
                          </td>

                          {/* Kỹ thuật viên (Avatar, Tên, Liên hệ) */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-brand-900 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                {initial}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 text-sm">
                                  {name}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                  {phone && (
                                    <span className="flex items-center gap-1">
                                      <Phone className="w-3 h-3 text-slate-400" />
                                      {phone}
                                    </span>
                                  )}
                                  {email && (
                                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                                      <Mail className="w-3 h-3 text-slate-400" />
                                      {email}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Chuyên môn & Kinh nghiệm */}
                          <td className="py-3.5 px-4 max-w-[220px]">
                            <div className="font-semibold text-slate-800 text-xs truncate">
                              {tech.specialization || "Kỹ thuật viên Sửa chữa H-Solution"}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {tech.experience_years || 1} năm KN ·{" "}
                              <span className="font-semibold text-brand-800">
                                {tech.skills === "BOTH"
                                  ? "Scooter & Xe hỗ trợ"
                                  : tech.skills === "SCOOTER"
                                  ? "Scooter điện"
                                  : "Xe hỗ trợ"}
                              </span>
                            </div>
                          </td>

                          {/* Trạng thái hoạt động (Công tắc Toggle Switch) */}
                          <td className="py-3.5 px-4">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={Boolean(tech.is_online)}
                              disabled={togglingOnlineId === techId}
                              onClick={() => handleToggleOnline(tech)}
                              className="inline-flex items-center gap-2 cursor-pointer select-none group focus:outline-none disabled:opacity-50"
                              title={
                                tech.is_online
                                  ? "Bấm để chuyển sang Offline"
                                  : "Bấm để bật Online sẵn sàng nhận đơn"
                              }
                            >
                              <span
                                className={`relative inline-flex h-5.5 w-10 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out border-2 border-transparent ${
                                  tech.is_online ? "bg-emerald-500" : "bg-slate-300"
                                }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                    tech.is_online ? "translate-x-4.5" : "translate-x-0"
                                  }`}
                                />
                              </span>
                              <span
                                className={`text-xs font-bold transition-colors ${
                                  tech.is_online ? "text-emerald-700" : "text-slate-400"
                                }`}
                              >
                                {togglingOnlineId === techId
                                  ? "..."
                                  : tech.is_online
                                  ? "Online"
                                  : "Offline"}
                              </span>
                            </button>
                          </td>

                          {/* Xác thực KYC */}
                          <td className="py-3.5 px-4">
                            {tech.kyc_status === "APPROVED" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                                <CheckCircle2 className="w-3 h-3" /> Đã duyệt
                              </span>
                            ) : tech.kyc_status === "PENDING" ? (
                              <button
                                type="button"
                                onClick={() => setSelectedKycTech(tech)}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition cursor-pointer whitespace-nowrap"
                                title="Bấm để xét duyệt KYC"
                              >
                                <Clock className="w-3 h-3" /> Chờ duyệt
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
                                <XCircle className="w-3 h-3" /> Từ chối
                              </span>
                            )}
                          </td>

                          {/* Đánh giá & Đơn làm */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1 text-xs font-bold text-amber-600">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              <span>{Number(tech.rating_avg || 5.0).toFixed(1)}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Hoàn thành: <b>{totalDone}</b> đơn
                            </div>
                          </td>

                          {/* Chức năng: Xem, Sửa, Xóa */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Xem */}
                              <button
                                type="button"
                                onClick={() => setViewingTech(tech)}
                                className="w-8 h-8 rounded-xl flex items-center justify-center border border-brand-200 bg-brand-50 text-brand-800 hover:bg-brand-100 hover:text-brand-950 transition cursor-pointer shadow-2xs"
                                title="Xem chi tiết hồ sơ kỹ thuật viên"
                                aria-label="Xem chi tiết"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Sửa */}
                              <button
                                type="button"
                                onClick={() => setEditingTech(tech)}
                                className="w-8 h-8 rounded-xl flex items-center justify-center border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-900 transition cursor-pointer shadow-2xs"
                                title="Chỉnh sửa thông tin kỹ thuật viên"
                                aria-label="Chỉnh sửa"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>

                              {/* Xóa */}
                              <button
                                type="button"
                                onClick={() => setDeletingTech(tech)}
                                className="w-8 h-8 rounded-xl flex items-center justify-center border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-800 transition cursor-pointer shadow-2xs"
                                title="Xóa kỹ thuật viên"
                                aria-label="Xóa kỹ thuật viên"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              pageSizeOptions={[10, 20, 50]}
              totalItems={totalItems}
              itemUnitText="kỹ thuật viên"
              onPageChange={(page) => setCurrentPage(page)}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* 2. CHẾ ĐỘ DẠNG LƯỚI (GRID VIEW - BẢNG TỔNG HỢP DOANH THU & THẺ KTV)       */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* TOP KPI CARDS: TỔNG HỢP THEO NGÀY / THÁNG / NĂM */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-brand-50 text-brand-900 rounded-xl font-bold">
                  <BarChart3 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    Bảng Tổng Hợp Doanh Thu & Năng Suất Kỹ Thuật Viên
                  </h3>
                  <p className="text-xs text-slate-500">
                    Xem số liệu tổng hợp toàn đội ngũ theo chu kỳ thời gian
                  </p>
                </div>
              </div>

              {/* Mốc thời gian Tabs */}
              <div className="flex bg-slate-100 p-1 rounded-2xl text-xs font-bold">
                <button
                  onClick={() => setTimeRange("TODAY")}
                  className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                    timeRange === "TODAY"
                      ? "bg-white text-brand-700 shadow-xs font-black"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Hôm nay (Ngày)
                </button>
                <button
                  onClick={() => setTimeRange("MONTH")}
                  className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                    timeRange === "MONTH"
                      ? "bg-white text-brand-700 shadow-xs font-black"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Tháng {currentMonth}/{currentYear}
                </button>
                <button
                  onClick={() => setTimeRange("YEAR")}
                  className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                    timeRange === "YEAR"
                      ? "bg-white text-brand-700 shadow-xs font-black"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  Năm {currentYear}
                </button>
                <button
                  onClick={() => setTimeRange("ALL")}
                  className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                    timeRange === "ALL"
                      ? "bg-white text-brand-700 shadow-xs font-black"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  Tất cả thời gian
                </button>
              </div>
            </div>

            {/* 4 Cards Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-brand-50/80 to-brand-50/40 border border-brand-100 flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-sm">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase text-brand-900/70 block tracking-wider">
                    Tổng Doanh Thu (
                    {timeRange === "TODAY"
                      ? "Hôm nay"
                      : timeRange === "MONTH"
                      ? `Tháng ${currentMonth}`
                      : timeRange === "YEAR"
                      ? `Năm ${currentYear}`
                      : "Toàn bộ"}
                    )
                  </span>
                  <span className="text-xl font-black text-brand-950">
                    {overallTotals.totalRev.toLocaleString("vi-VN")} đ
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-brand-50/40 border border-emerald-100 flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                  <Wrench className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase text-emerald-900/70 block tracking-wider">
                    Đơn Hoàn Thành
                  </span>
                  <span className="text-xl font-black text-emerald-950">
                    {overallTotals.totalOrd} đơn
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-brand-50/80 to-pink-50/40 border border-brand-100 flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-sm">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase text-brand-900/70 block tracking-wider">
                    Đang Hoạt Động (Online)
                  </span>
                  <span className="text-xl font-black text-brand-950">
                    {technicians.filter((t) => t.is_online).length} / {technicians.length} thợ
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/80 to-amber-50/40 border border-amber-100 flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
                  <Star className="w-6 h-6 fill-white" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase text-amber-900/70 block tracking-wider">
                    Đánh Giá Trung Bình
                  </span>
                  <span className="flex items-center gap-1.5 text-xl font-black text-amber-950">
                    5.0 <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> (Xuất sắc)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 min-w-[260px]">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                placeholder="Tìm theo tên thợ, số điện thoại, chuyên môn..."
                className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-800"
              />
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => { setStatusFilter("ALL"); setCurrentPage(1); }}
                className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                  statusFilter === "ALL"
                    ? "bg-white text-slate-900 shadow-xs font-black"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Tất cả ({technicians.length})
              </button>
              <button
                onClick={() => { setStatusFilter("ONLINE"); setCurrentPage(1); }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                  statusFilter === "ONLINE"
                    ? "bg-white text-slate-900 shadow-xs font-black"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <span className="size-2 rounded-full bg-emerald-500" aria-hidden />
                Online ({technicians.filter((t) => t.is_online).length})
              </button>
              <button
                onClick={() => { setStatusFilter("OFFLINE"); setCurrentPage(1); }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                  statusFilter === "OFFLINE"
                    ? "bg-white text-slate-900 shadow-xs font-black"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <span className="size-2 rounded-full bg-slate-400" aria-hidden />
                Offline ({technicians.filter((t) => !t.is_online).length})
              </button>
              <button
                onClick={() => { setStatusFilter("KYC_PENDING"); setCurrentPage(1); }}
                className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                  statusFilter === "KYC_PENDING"
                    ? "bg-white text-slate-900 shadow-xs font-black"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Chờ duyệt KYC ({technicians.filter((t) => t.kyc_status === "PENDING").length})
              </button>
            </div>
          </div>

          {/* Grid Cards for each Technician */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {loading ? (
              <div className="col-span-full py-16 text-center text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-brand-800" />
                Đang tải dữ liệu và tính toán doanh số kỹ thuật viên...
              </div>
            ) : filteredTechs.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-400 font-medium">
                Không tìm thấy kỹ thuật viên nào phù hợp.
              </div>
            ) : (
              filteredTechs.map((tech) => {
                const techId = tech.user_id || tech.id || "";
                const name = tech.full_name || tech.user?.full_name || tech.name || "Kỹ thuật viên";
                const phone = tech.phone || tech.user?.phone || "Chưa có SĐT";
                const isApproved = tech.kyc_status === "APPROVED";
                const stats = techStatsMap[techId] || {
                  todayOrders: 0,
                  todayRevenue: 0,
                  monthOrders: 0,
                  monthRevenue: 0,
                  yearOrders: 0,
                  yearRevenue: 0,
                  allOrders: 0,
                  allRevenue: 0,
                  orderList: [],
                };

                return (
                  <div
                    key={techId}
                    className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-brand-200 transition group"
                  >
                    <div>
                      {/* Top Badge */}
                      <div className="flex items-center justify-between mb-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                            tech.is_online
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              tech.is_online ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                            }`}
                          />
                          {tech.is_online ? "Sẵn sàng nhận đơn" : "Đang ngoại tuyến"}
                        </span>

                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${
                            isApproved
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : tech.kyc_status === "PENDING" || !tech.kyc_status
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-rose-50 text-rose-600 border-rose-200"
                          }`}
                        >
                          {isApproved ? "KYC đã duyệt" : tech.kyc_status === "PENDING" || !tech.kyc_status ? "KYC chờ duyệt" : "KYC bị từ chối"}
                        </span>
                      </div>

                      {/* Info & Avatar */}
                      <div className="flex items-center gap-3.5 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-brand-900 text-white font-black text-base flex items-center justify-center shrink-0 shadow-sm">
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-base group-hover:text-brand-600 transition">
                            {name}
                          </h4>
                          <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{phone}</span>
                          </div>
                        </div>
                      </div>

                      {/* Chi tiết chuyên môn */}
                      <div className="space-y-1.5 text-xs border-t border-slate-100 pt-3 mb-4">
                        <div className="flex justify-between text-slate-600">
                          <span className="text-slate-400">Chuyên môn:</span>
                          <span className="font-semibold text-slate-800 text-right max-w-[190px] truncate">
                            {tech.specialization || "Kỹ thuật viên Sửa chữa H-Solution"}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span className="text-slate-400">Kinh nghiệm:</span>
                          <span className="font-semibold text-slate-800">
                            {tech.experience_years || 3} năm
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span className="text-slate-400">Đánh giá:</span>
                          <span className="font-bold text-amber-600 flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            {Number(tech.rating_avg || 5.0).toFixed(1)} ({stats.allOrders || 0} lượt)
                          </span>
                        </div>
                      </div>

                      {/* Doanh số & Năng suất (Dạng thẻ KPI) */}
                      <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 mb-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase text-slate-500">
                            Doanh thu (
                            {timeRange === "TODAY"
                              ? "Hôm nay"
                              : timeRange === "MONTH"
                              ? `Tháng ${currentMonth}`
                              : timeRange === "YEAR"
                              ? `Năm ${currentYear}`
                              : "Tất cả"}
                            )
                          </span>
                          <span className="text-sm font-black text-brand-900">
                            {(timeRange === "TODAY"
                              ? stats.todayRevenue
                              : timeRange === "MONTH"
                              ? stats.monthRevenue
                              : timeRange === "YEAR"
                              ? stats.yearRevenue
                              : stats.allRevenue
                            ).toLocaleString("vi-VN")}{" "}
                            đ
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Số đơn hoàn thành:</span>
                          <span className="font-black text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-md">
                            {timeRange === "TODAY"
                              ? stats.todayOrders
                              : timeRange === "MONTH"
                              ? stats.monthOrders
                              : timeRange === "YEAR"
                              ? stats.yearOrders
                              : stats.allOrders}{" "}
                            đơn
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 flex items-center gap-2">
                      {!isApproved && (
                        <button
                          onClick={() => setSelectedKycTech(tech)}
                          className="flex-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                          <span>Duyệt KYC</span>
                        </button>
                      )}

                      <button
                        onClick={() => setDetailStatsTech({ ...tech, stats })}
                        className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        <span>Xem số liệu chi tiết</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MODALS CHỨC NĂNG DẠNG BẢNG: THÊM, XEM, SỬA, XÓA                        */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <CreateTechnicianModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={(msg) => {
            handleShowToast(msg);
            fetchTechniciansAndOrders();
          }}
        />
      )}

      {viewingTech && (
        <ViewTechnicianModal
          technician={viewingTech}
          onClose={() => setViewingTech(null)}
        />
      )}

      {editingTech && (
        <EditTechnicianModal
          technician={editingTech}
          onClose={() => setEditingTech(null)}
          onSuccess={(msg) => {
            handleShowToast(msg);
            fetchTechniciansAndOrders();
          }}
        />
      )}

      {deletingTech && (
        <DeleteTechnicianModal
          technician={deletingTech}
          onClose={() => setDeletingTech(null)}
          onSuccess={(msg) => {
            handleShowToast(msg);
            fetchTechniciansAndOrders();
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* 4. MODALS PHỤ CỦA GRID VIEW: BÁO CÁO CHI TIẾT & DUYỆT KYC                 */}
      {/* ========================================================================= */}
      {/* Detail Stats Modal */}
      {detailStatsTech && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-start">
              <div>
                <span className="text-xs font-bold tracking-wider text-brand-400 uppercase">
                  Báo cáo hiệu suất kỹ thuật viên
                </span>
                <h3 className="text-xl font-black mt-1">
                  {detailStatsTech.full_name || detailStatsTech.name}
                </h3>
              </div>
              <button
                onClick={() => setDetailStatsTech(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* 3 Chu kỳ so sánh */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                  <span className="text-[11px] font-bold text-slate-400 uppercase block">
                    Hôm nay
                  </span>
                  <span className="text-lg font-black text-slate-900 block mt-1">
                    {detailStatsTech.stats.todayOrders} đơn
                  </span>
                  <span className="text-xs font-bold text-brand-900 block">
                    {detailStatsTech.stats.todayRevenue.toLocaleString("vi-VN")} đ
                  </span>
                </div>

                <div className="p-3.5 bg-brand-50/50 border border-brand-200/80 rounded-2xl text-center">
                  <span className="text-[11px] font-bold text-brand-800 uppercase block">
                    Tháng {currentMonth}
                  </span>
                  <span className="text-lg font-black text-brand-950 block mt-1">
                    {detailStatsTech.stats.monthOrders} đơn
                  </span>
                  <span className="text-xs font-bold text-brand-900 block">
                    {detailStatsTech.stats.monthRevenue.toLocaleString("vi-VN")} đ
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                  <span className="text-[11px] font-bold text-slate-400 uppercase block">
                    Toàn thời gian
                  </span>
                  <span className="text-lg font-black text-slate-900 block mt-1">
                    {detailStatsTech.stats.allOrders} đơn
                  </span>
                  <span className="text-xs font-bold text-emerald-700 block">
                    {detailStatsTech.stats.allRevenue.toLocaleString("vi-VN")} đ
                  </span>
                </div>
              </div>

              {/* Lịch sử đơn hàng gần nhất */}
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-500 mb-2 tracking-wider">
                  Đơn hàng gần đây ({detailStatsTech.stats.orderList.length})
                </h4>
                {detailStatsTech.stats.orderList.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs italic bg-slate-50 rounded-2xl border border-slate-100">
                    Chưa có đơn hàng nào được ghi nhận cho kỹ thuật viên này.
                  </div>
                ) : (
                  <div className="max-h-56 overflow-y-auto space-y-2 border border-slate-100 rounded-2xl p-2">
                    {detailStatsTech.stats.orderList.slice(0, 10).map((ord: OrderRecord) => (
                      <div
                        key={ord.id}
                        className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/60 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-900">
                            #{ord.request_code || ord.id?.substring(0, 8)}
                          </span>
                          <span className="text-slate-500 ml-2">
                            {ord.customer?.full_name || ord.customer_name || "Khách hàng"}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-brand-900 block">
                            {(ord.total_amount || 350000).toLocaleString("vi-VN")} đ
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {ord.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setDetailStatsTech(null)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Đóng báo cáo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KYC Review Modal */}
      {selectedKycTech && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-start">
              <div>
                <span className="text-xs font-bold tracking-wider text-brand-400 uppercase">
                  Xác thực danh tính
                </span>
                <h3 className="text-xl font-black mt-1">Duyệt Hồ Sơ Kỹ Thuật Viên</h3>
              </div>
              <button
                onClick={() => setSelectedKycTech(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-sm">
                <div className="font-bold text-slate-900 text-base">
                  {selectedKycTech.full_name || selectedKycTech.name}
                </div>
                <div className="text-xs text-slate-600">
                  Số CCCD / Định danh:{" "}
                  <span className="font-mono font-bold">
                    {selectedKycTech.identity_number || selectedKycTech.id_card_number || "112345678901"}
                  </span>
                </div>
                <div className="text-xs text-slate-600">
                  Trạng thái KYC hiện tại:{" "}
                  <span className="font-bold text-brand-900">
                    {selectedKycTech.kyc_status || "PENDING"}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Lý do từ chối (nếu có)
                </label>
                <input
                  type="text"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="VD: Ảnh CCCD mờ, chứng chỉ hết hạn..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    handleReviewKyc(selectedKycTech.user_id || selectedKycTech.id || "", "REJECTED")
                  }
                  disabled={kycLoading}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Từ chối</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleReviewKyc(selectedKycTech.user_id || selectedKycTech.id || "", "APPROVED")
                  }
                  disabled={kycLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Phê duyệt KYC</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
