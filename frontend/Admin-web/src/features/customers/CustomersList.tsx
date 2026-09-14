"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  UserPlus,
  RefreshCw,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  Bike,
  Loader2,
  X,
} from "lucide-react";
import { CreateCustomerModal } from "./CreateCustomerModal";

interface CustomerItem {
  id: string;
  full_name?: string;
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  device_count?: number;
  total_devices?: number;
  is_active?: boolean;
}

interface CustomerApiResponse {
  items?: CustomerItem[];
  total?: number;
  page?: number;
  limit?: number;
}

interface CustomerDeviceItem {
  id?: string;
  model_name?: string;
  device_type?: string;
  manufacturer?: string;
  serial_number?: string;
  battery_capacity?: string;
  status?: string;
}

export const CustomersList = () => {
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedCustomerForDevices, setSelectedCustomerForDevices] = useState<CustomerItem | null>(null);
  const [customerDevices, setCustomerDevices] = useState<CustomerDeviceItem[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { fetchApi } = await import("@/lib/api-client");
      const res = await fetchApi<CustomerApiResponse | CustomerItem[]>("/customers");
      const list = Array.isArray(res) ? res : res?.items ?? [];
      setCustomers(list);
    } catch (err: unknown) {
      console.warn("Error fetching customers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => {
      fetchCustomers();
    });
  }, []);

  useEffect(() => {
    let ignore = false;
    if (!selectedCustomerForDevices?.id) return;

    void Promise.resolve().then(() => {
      if (!ignore) {
        setLoadingDevices(true);
        setCustomerDevices([]);
      }
    });

    import("@/lib/api-client")
      .then(({ fetchApi }) =>
        fetchApi<CustomerDeviceItem[] | { items: CustomerDeviceItem[] }>(
          `/devices/customer/${selectedCustomerForDevices.id}`
        )
      )
      .then((data) => {
        if (!ignore) {
          const list = Array.isArray(data) ? data : data?.items || [];
          setCustomerDevices(list);
        }
      })
      .catch((err: unknown) => {
        console.warn("Failed to load customer devices:", err);
      })
      .finally(() => {
        if (!ignore) {
          setLoadingDevices(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [selectedCustomerForDevices?.id]);

  const handleShowToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleToggleStatus = async (customer: CustomerItem) => {
    const nextStatus = !customer.is_active;
    try {
      const { fetchApi } = await import("@/lib/api-client");
      await fetchApi(`/customers/${customer.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: nextStatus }),
      });
      handleShowToast(
        `Đã ${nextStatus ? "kích hoạt" : "vô hiệu hóa"} tài khoản ${
          customer.full_name || customer.name
        }!`
      );
      fetchCustomers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Lỗi khi cập nhật trạng thái");
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const name = (c.full_name || c.name || "").toLowerCase();
    const phone = (c.phone || "").toLowerCase();
    const email = (c.email || "").toLowerCase();
    const query = searchTerm.toLowerCase();
    return name.includes(query) || phone.includes(query) || email.includes(query);
  });

  return (
    <div className="p-6 space-y-6">
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-sky-500/30 flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">
            Quản lý Khách hàng
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Tổng cộng <b>{customers.length}</b> khách hàng đã đăng ký
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchCustomers}
            disabled={loading}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition cursor-pointer"
            title="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-sky-900 hover:bg-sky-950 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-sm transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4 stroke-[2.5]" />
            <span>Thêm khách hàng</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên khách hàng, số điện thoại, email..."
            className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-800"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-400 tracking-wider uppercase border-b border-slate-200">
                <th className="py-3.5 px-4">Mã KH</th>
                <th className="py-3.5 px-4">Khách hàng</th>
                <th className="py-3.5 px-4">Liên hệ</th>
                <th className="py-3.5 px-4">Địa chỉ</th>
                <th className="py-3.5 px-4">Số thiết bị</th>
                <th className="py-3.5 px-4">Trạng thái</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-800" />
                    Đang tải danh sách khách hàng...
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                    Không tìm thấy khách hàng nào.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-500 font-bold">
                      {c.id?.substring(0, 10)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {c.full_name || c.name || "Khách hàng"}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {c.phone || "---"}
                      </div>
                      {c.email && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                          <Mail className="w-3 h-3" />
                          {c.email}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 max-w-50 text-xs text-slate-600 truncate">
                      {c.address || "Chưa cập nhật"}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-bold text-sky-900">
                      <button
                        type="button"
                        onClick={() => setSelectedCustomerForDevices(c)}
                        className="hover:underline flex items-center gap-1.5 cursor-pointer font-bold text-sky-900 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-100 transition"
                        title="Bấm để xem chi tiết danh sách thiết bị"
                      >
                        <Bike className="w-3.5 h-3.5 text-sky-700" />
                        <span>{c.device_count || 0} thiết bị</span>
                      </button>
                    </td>
                    <td className="py-3.5 px-4">
                      {c.is_active !== false ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                          <XCircle className="w-3 h-3" /> Bị khóa
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleStatus(c)}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition text-xs font-bold cursor-pointer"
                        title={c.is_active !== false ? "Khóa tài khoản" : "Mở khóa"}
                      >
                        {c.is_active !== false ? "Khóa" : "Kích hoạt"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <CreateCustomerModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={(msg) => {
            handleShowToast(msg);
            fetchCustomers();
          }}
        />
      )}

      {selectedCustomerForDevices && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden transform transition-all p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
                <Bike className="w-5 h-5 text-sky-800" />
                <span>
                  Thiết bị của {selectedCustomerForDevices.full_name || selectedCustomerForDevices.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomerForDevices(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto space-y-2.5">
              {loadingDevices ? (
                <div className="flex items-center justify-center gap-2 py-8 text-slate-400 text-sm">
                  <Loader2 className="w-5 h-5 animate-spin text-sky-800" />
                  <span>Đang tải danh sách thiết bị...</span>
                </div>
              ) : customerDevices.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm italic">
                  Khách hàng này chưa có thiết bị nào được ghi nhận.
                </div>
              ) : (
                customerDevices.map((dev: CustomerDeviceItem, idx: number) => (
                  <div
                    key={dev.id || idx}
                    className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-slate-900">
                        {dev.model_name || dev.device_type || "Thiết bị không tên"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {dev.manufacturer ? `Hãng: ${dev.manufacturer} · ` : ""}
                        {dev.serial_number ? `SN: ${dev.serial_number}` : ""}
                      </p>
                      {dev.battery_capacity && (
                        <p className="text-[11px] text-slate-400">
                          Dung lượng pin: {dev.battery_capacity}
                        </p>
                      )}
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {dev.status === "ACTIVE" ? "Hoạt động" : dev.status || "Hoạt động"}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedCustomerForDevices(null)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
