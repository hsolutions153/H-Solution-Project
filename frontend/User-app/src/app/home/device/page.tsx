"use client";

import { DeleteConfirmModal } from "@/components/home/delete-confirm-modal";
import { HomeShell } from "@/components/home/home-shell";
import { DeviceListSkeleton } from "@/components/motion/skeleton";
import { useReveal } from "@/components/motion/use-reveal";
import type { Device } from "@/types/device";
import { Bike,LoaderCircle,Plus,Star,Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback,useEffect,useState } from "react";

export default function DevicesPage() {
  const router = useRouter();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);
  const revealRef = useReveal([loading, devices.length]);

  const loadDevices = useCallback(async () => {
    try {
      const { fetchApi } = await import("@/lib/api-client");
      const list = await fetchApi<any[]>("/devices");
      if (Array.isArray(list)) {
        const formatted: Device[] = list.map((item) => {
          const hasCustomNotes = item.notes && !item.notes.includes(":") && item.notes.length < 50;
          const modelName = item.model_name || item.model || "";

          // Tên thiết bị (Tên gợi nhớ độc lập, không tự động ghép model vào tên)
          let displayName = item.nickname || item.name || (hasCustomNotes ? item.notes : "");
          if (!displayName) {
            displayName = "Xe máy điện";
          }

          let formattedDate = item.purchase_date || item.purchaseDate || "";
          if (formattedDate && /^\d{4}-\d{2}-\d{2}$/.test(formattedDate)) {
            const [y, m, d] = formattedDate.split("-");
            formattedDate = `${d}/${m}/${y}`;
          }

          return {
            id: item.id,
            nickname: displayName,
            deviceType: item.device_type || "SCOOTER",
            manufacturer: item.manufacturer || "",
            model: modelName || "Xe máy điện",
            serialNumber: item.serial_number || item.serialNumber || item.id,
            batteryType: item.battery_type || item.batteryType || "LFP",
            manufacturingYear: item.manufacturing_year || item.manufacturingYear || undefined,
            purchaseDate: formattedDate,
            macAddress: item.notes || "AA:BB:CC:DD:EE:FF",
            image: item.image_url || "/electric-scooter.jpg",
            isDefault: Boolean(item.is_default),
          };
        });
        setDevices(formatted);
      } else {
        setDevices([]);
      }
    } catch {
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const makeDefault = async (id: string) => {
    const previous = devices;
    setDevices((current) => current.map((d) => ({ ...d, isDefault: d.id === id })));
    try {
      const { fetchApi } = await import("@/lib/api-client");
      await fetchApi<any>(`/devices/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_default: true }),
      });
    } catch {
      setDevices(previous);
    }
  };

  const deleteDevice = (device: Device) => {
    setDeviceToDelete(device);
  };

  const confirmDeleteDevice = async () => {
    if (!deviceToDelete) return;
    const target = deviceToDelete;
    setDeletingId(target.id);
    const previous = devices;
    setDevices((current) => current.filter((d) => d.id !== target.id));
    try {
      const { fetchApi } = await import("@/lib/api-client");
      await fetchApi(`/devices/${target.id}`, { method: "DELETE" });
      setDeviceToDelete(null);
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Không thể xóa phương tiện. Vui lòng thử lại.");
      setDevices(previous);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <HomeShell activeNav="device" mainClassName="device-page-content">
      <div className="device-list-page" ref={revealRef}>
        <div className="device-heading-row">
          <div>
            <h1>Xe của tôi</h1>
            <p className="device-intro">Xe đã đăng ký để đặt lịch sửa chữa và gọi cứu hộ.</p>
          </div>
          <span className="device-count">{devices.length} phương tiện</span>
        </div>

        {loading ? (
          <DeviceListSkeleton />
        ) : devices.length === 0 ? (
          <div className="device-empty-state" data-reveal>
            <div className="device-empty-icon">
              <Bike size={44} />
            </div>
            <h2>Chưa có phương tiện nào</h2>
            <p>
              Tài khoản của bạn hiện chưa có xe máy điện nào được liên kết. Hãy đăng ký phương tiện để dễ dàng nhận hỗ trợ cứu hộ khẩn cấp SOS và đặt lịch bảo dưỡng.
            </p>
            <Link href="/home/device/new" className="device-primary-button device-empty-action">
              <Plus size={18} /> Đăng ký phương tiện ngay
            </Link>
          </div>
        ) : (
          <div className="device-grid">
            {devices.map((device) => (
              <article className="device-card" key={device.id} data-reveal>
                <Link href={`/home/device/${device.id}`} className="device-image-wrap">
                  {device.isDefault && <span className="device-badge">Mặc định</span>}
                  <Image src={device.image} alt={device.nickname} fill sizes="(max-width: 720px) 100vw, 380px" className="device-image" unoptimized />
                </Link>
                <div className="device-card-body">
                  <div className="device-card-title-row">
                    <div>
                      <h2>{device.nickname}</h2>
                      <p>
                        {device.manufacturer ? `${device.manufacturer} ${device.model}` : device.model} · ID: <b>{device.serialNumber}</b>
                      </p>
                      <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
                        <span className="vp-battery-badge" style={{ fontSize: "10px", padding: "2px 6px" }}>
                          Pin: {device.batteryType || "LFP"}
                        </span>
                        {device.manufacturingYear && (
                          <span className="vp-type-badge" style={{ fontSize: "10px", padding: "2px 6px" }}>
                            Đời {device.manufacturingYear}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="device-card-actions">
                    <Link href={`/home/device/${device.id}`} className="device-primary-button">Chi tiết & Quản lý</Link>
                    <button
                      type="button"
                      className="device-icon-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void makeDefault(device.id);
                      }}
                      aria-label="Đặt làm thiết bị mặc định"
                      title={device.isDefault ? "Phương tiện mặc định" : "Đặt làm xe mặc định"}
                      style={device.isDefault ? { color: "#ca8a04", background: "#fef9c3", borderColor: "#fde047" } : undefined}
                    >
                      <Star size={18} fill={device.isDefault ? "currentColor" : "none"} />
                    </button>
                    <button
                      type="button"
                      className="device-icon-button device-delete-icon-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDevice(device);
                      }}
                      disabled={deletingId === device.id}
                      aria-label={`Xóa xe ${device.nickname}`}
                      title="Xóa xe này"
                    >
                      {deletingId === device.id ? <LoaderCircle size={18} className="device-upload-spinner" /> : <Trash2 size={18} />}
                    </button>
                  </div>
                </div>
              </article>
            ))}

            <Link className="device-register-card" href="/home/device/new" data-reveal>
              <span className="device-register-icon"><Plus size={24} /></span>
              <strong>Đăng ký phương tiện mới</strong>
              <span>Thêm xe máy điện để dễ dàng nhận hỗ trợ cứu hộ khẩn cấp & bảo trì từ H-Mobility Care</span>
            </Link>
          </div>
        )}
      </div>
      <Link href="/home/device/new" className="device-fab" aria-label="Thêm thiết bị mới"><Plus size={24} /></Link>
      <DeleteConfirmModal
        isOpen={Boolean(deviceToDelete)}
        onClose={() => setDeviceToDelete(null)}
        onConfirm={confirmDeleteDevice}
        deviceName={deviceToDelete?.nickname || deviceToDelete?.model || "Xe máy điện"}
        serialNumber={deviceToDelete?.serialNumber}
        loading={Boolean(deletingId)}
      />
    </HomeShell>
  );
}
