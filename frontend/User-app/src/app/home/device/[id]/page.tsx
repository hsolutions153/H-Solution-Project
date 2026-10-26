"use client";

import { DeleteConfirmModal } from "@/components/home/delete-confirm-modal";
import { HomeShell } from "@/components/home/home-shell";
import { PageHeader } from "@/components/home/page-header";
import { DeviceDetailSkeleton } from "@/components/motion/skeleton";
import { useReveal } from "@/components/motion/use-reveal";
import { Badge } from "@h-mobility/ui";
import { BatteryCharging,CalendarDays,ChevronRight,CircleDollarSign,Pencil,RotateCw,Star,Trash2,Wrench } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use,useEffect,useState } from "react";
import { showAppNotice } from "@/components/common/app-notice";

export default function DeviceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [device, setDevice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isSettingDefault, setIsSettingDefault] = useState(false);
  const revealRef = useReveal([loading], ":scope > *");

  const handleMakeDefault = async () => {
    setIsSettingDefault(true);
    try {
      const { fetchApi } = await import("@/lib/api-client");
      await fetchApi(`/devices/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_default: true }),
      });
      setDevice((d: any) => ({ ...d, isDefault: true }));
    } catch (err: any) {
      showAppNotice(err.message || "Không thể đặt làm thiết bị mặc định.");
    } finally {
      setIsSettingDefault(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!device) return;
    setIsDeleting(true);
    try {
      const { fetchApi } = await import("@/lib/api-client");
      await fetchApi(`/devices/${device.id}`, { method: "DELETE" });
      setShowDeleteModal(false);
      router.push("/home/device");
      router.refresh();
    } catch (err: any) {
      showAppNotice(err.message || "Không thể xóa thiết bị. Vui lòng thử lại.");
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    async function load() {
      try {
        const { fetchApi } = await import("@/lib/api-client");
        const data = await fetchApi<any>(`/devices/${id}`);
        if (data) {
          const hasCustomNotes = data.notes && !data.notes.includes(":") && data.notes.length < 50;
          const modelName = data.model_name || data.model || "";

          // Tên thiết bị (Tên gợi nhớ độc lập, không tự động ghép model vào tên)
          let displayName = data.nickname || data.name || (hasCustomNotes ? data.notes : "");
          if (!displayName) {
            displayName = "Xe máy điện";
          }

          let formattedDate = data.purchase_date || data.purchaseDate || "Chưa cung cấp";
          if (formattedDate && /^\d{4}-\d{2}-\d{2}$/.test(formattedDate)) {
            const [y, m, d] = formattedDate.split("-");
            formattedDate = `${d}/${m}/${y}`;
          }

          setDevice({
            id: data.id,
            nickname: displayName,
            deviceType: data.device_type || "SCOOTER",
            manufacturer: data.manufacturer || "",
            model: modelName || "Xe máy điện",
            serialNumber: data.serial_number || data.id,
            batteryType: data.battery_type || data.batteryType || "LFP",
            manufacturingYear: data.manufacturing_year || data.manufacturingYear || undefined,
            purchaseDate: formattedDate,
            image: data.image_url || "/electric-scooter.jpg",
            isDefault: Boolean(data.is_default),
            maintenance: [],
          });
        }
      } catch {
        setDevice({
          id: String(id),
          nickname: "Xe VinFast Evo 200",
          model: "Evo 200",
          manufacturer: "VinFast",
          serialNumber: String(id),
          batteryType: "LFP",
          manufacturingYear: 2024,
          purchaseDate: "15/01/2026",
          image: "/electric-scooter.jpg",
          isDefault: true,
          maintenance: [],
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <HomeShell activeNav="device" hideHeader mainClassName="device-page-content">
        <DeviceDetailSkeleton />
      </HomeShell>
    );
  }

  if (!device) {
    return (
      <HomeShell activeNav="device" title="Chi tiết xe" mainClassName="device-page-content">
        <div className="device-detail-page">Không tìm thấy phương tiện.</div>
      </HomeShell>
    );
  }

  return (
    <HomeShell activeNav="device" hideHeader mainClassName="device-page-content">
      <div className="device-detail-page" ref={revealRef}>
        <div className="device-detail-heading">
          <PageHeader
            title={device.nickname}
            subtitle={`${device.manufacturer ? `${device.manufacturer} ${device.model}` : device.model} · Biển số ${device.serialNumber}`}
            backHref="/home/device"
            trailing={device.isDefault ? <Badge tone="brand">Mặc định</Badge> : null}
          />
        </div>

        <div className="device-hero">
          <Image
            src={device.image}
            alt={device.nickname}
            fill
            sizes="(max-width: 720px) 100vw, 600px"
            className="device-detail-image"
            unoptimized
          />
        </div>

        <div className="device-detail-actions">
          <Link href={`/home/device/${device.id}/edit`} className="device-primary-button">
            <Pencil size={16} /> Sửa thông tin xe
          </Link>
          {!device.isDefault && (
            <button
              type="button"
              className="device-secondary-button"
              onClick={() => void handleMakeDefault()}
              disabled={isSettingDefault}
            >
              <Star size={16} /> {isSettingDefault ? "Đang đặt..." : "Đặt làm xe mặc định"}
            </button>
          )}
          {device.isDefault && (
            <div className="device-default-note">
              <Star size={15} fill="currentColor" /> Phương tiện mặc định
            </div>
          )}
          <button
            type="button"
            className="device-danger-button"
            onClick={handleDelete}
            disabled={isDeleting}
            title="Xóa phương tiện"
          >
            <Trash2 size={16} /> {isDeleting ? "Đang xóa…" : "Xóa xe này"}
          </button>
        </div>

        <div className="device-stats">
          <div>
            <BatteryCharging />
            <span>
              <small>Loại pin trang bị</small>
              <strong>{device.batteryType || "Pin LFP"}</strong>
            </span>
          </div>
          <div>
            <CalendarDays />
            <span>
              <small>Năm SX / Ngày mua</small>
              <strong>{device.manufacturingYear ? `Năm ${device.manufacturingYear}` : device.purchaseDate}</strong>
            </span>
          </div>
          <div>
            <RotateCw />
            <span>
              <small>Dịch vụ hỗ trợ</small>
              <strong>Cứu hộ & Sửa chữa</strong>
            </span>
          </div>
        </div>

        <section className="maintenance-section">
          <div className="maintenance-title"><h2>Lịch sử bảo trì</h2><Link href="/home/history">Xem tất cả <ChevronRight size={15} /></Link></div>
          <div className="maintenance-list">
            {device.maintenance && device.maintenance.length ? device.maintenance.map((item: any, index: number) => (
              <article key={item.id}>
                <span className="maintenance-icon">{index === 1 ? <BatteryCharging size={18} /> : index === 2 ? <RotateCw size={18} /> : <Wrench size={18} />}</span>
                <div><h3>{item.title}</h3><p>{item.description} · {item.date}</p></div>
                <div className="maintenance-price"><strong>{item.price}</strong><small>{item.status === "completed" ? "Hoàn thành" : "Đã lên lịch"}</small></div>
              </article>
            )) : <div className="maintenance-empty"><CircleDollarSign size={24} /><span>Chưa có lịch sử bảo trì.</span></div>}
          </div>
        </section>
      </div>

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        deviceName={device.nickname || device.model || "Xe máy điện"}
        serialNumber={device.serialNumber}
        loading={isDeleting}
      />
    </HomeShell>
  );
}
