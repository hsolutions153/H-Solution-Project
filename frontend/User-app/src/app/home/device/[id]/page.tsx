"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { ArrowLeft, BatteryCharging, CalendarDays, ChevronRight, CircleDollarSign, Pencil, RotateCw, Star, Trash2, Wrench } from "lucide-react";
import { HomeShell } from "@/components/home/home-shell";

export default function DeviceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [device, setDevice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSettingDefault, setIsSettingDefault] = useState(false);

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
      alert(err.message || "Không thể đặt làm thiết bị mặc định.");
    } finally {
      setIsSettingDefault(false);
    }
  };

  const handleDelete = async () => {
    if (!device) return;
    const confirmDelete = window.confirm(
      `Bạn có chắc chắn muốn xóa "${device.nickname}" không? Thao tác này không thể hoàn tác.`
    );
    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      const { fetchApi } = await import("@/lib/api-client");
      await fetchApi(`/devices/${device.id}`, { method: "DELETE" });
      router.push("/home/device");
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Không thể xóa thiết bị. Vui lòng thử lại.");
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
          const brand = data.manufacturer && data.manufacturer !== "Generic" ? data.manufacturer : "";
          const modelName = data.model_name || data.model || "";

          // Tên thiết bị (Tên gợi nhớ độc lập, không tự động ghép model vào tên)
          let displayName = data.nickname || data.name || (hasCustomNotes ? data.notes : "");
          if (!displayName) {
            displayName = data.device_type === "SCOOTER" ? "Xe scooter điện" : "Xe lăn điện";
          }

          let formattedDate = data.purchase_date || data.purchaseDate || "Chưa cung cấp";
          if (formattedDate && /^\d{4}-\d{2}-\d{2}$/.test(formattedDate)) {
            const [y, m, d] = formattedDate.split("-");
            formattedDate = `${d}/${m}/${y}`;
          }

          setDevice({
            id: data.id,
            nickname: displayName,
            deviceType: data.device_type || "WHEELCHAIR",
            manufacturer: data.manufacturer || "",
            model: modelName || (data.device_type === "SCOOTER" ? "Scooter" : "Xe lăn"),
            serialNumber: data.serial_number || data.id,
            purchaseDate: formattedDate,
            image: data.image_url || "/wheelchair.png",
            isDefault: Boolean(data.is_default),
            maintenance: [],
          });
        }
      } catch {
        setDevice({
          id: String(id),
          nickname: "Xe lăn thông minh Karma KP-80",
          model: "Karma Power Pro",
          serialNumber: String(id),
          purchaseDate: "15/01/2026",
          image: "/wheelchair.png",
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
      <HomeShell activeNav="device" title="Glacier Mobility" mainClassName="device-page-content">
        <div className="device-loading">Đang tải thông tin thiết bị...</div>
      </HomeShell>
    );
  }

  if (!device) {
    return (
      <HomeShell activeNav="device" title="Glacier Mobility" mainClassName="device-page-content">
        <div className="device-detail-page">Không tìm thấy thiết bị.</div>
      </HomeShell>
    );
  }

  return (
    <HomeShell activeNav="device" title="Glacier Mobility" mainClassName="device-page-content">
      <div className="device-detail-page">
        <div className="device-detail-back"><Link href="/home/device"><ArrowLeft size={19} /> Thiết bị của tôi</Link></div>
        <div className="device-detail-heading">
          <div><p className="device-eyebrow">Chi tiết thiết bị</p><h1>{device.nickname}</h1><p>{device.model} · Số sê-ri: {device.serialNumber}</p></div>
          <span className="device-status"><i /> Đã kết nối</span>
        </div>

        <div className="device-hero">
          <Image src={device.image} alt={device.nickname} fill sizes="(max-width: 720px) 100vw, 600px" unoptimized />
        </div>

        <div className="device-detail-actions">
          <Link href={`/home/device/${device.id}/edit`} className="device-primary-button">
            <Pencil size={16} /> Sửa thông tin
          </Link>
          {!device.isDefault && (
            <button
              type="button"
              className="device-secondary-button"
              onClick={() => void handleMakeDefault()}
              disabled={isSettingDefault}
            >
              <Star size={16} /> {isSettingDefault ? "Đang đặt..." : "Đặt làm mặc định"}
            </button>
          )}
          {device.isDefault && (
            <div className="device-default-note">
              <Star size={15} fill="currentColor" /> Thiết bị mặc định
            </div>
          )}
          <button
            type="button"
            className="device-danger-button"
            onClick={handleDelete}
            disabled={isDeleting}
            title="Xóa thiết bị"
          >
            <Trash2 size={16} /> {isDeleting ? "Đang xóa…" : "Xóa thiết bị"}
          </button>
        </div>

        <div className="device-stats">
          <div><BatteryCharging /><span><small>Tình trạng pin</small><strong>94%</strong></span></div>
          <div><CalendarDays /><span><small>Ngày mua</small><strong>{device.purchaseDate}</strong></span></div>
          <div><RotateCw /><span><small>Đồng bộ gần nhất</small><strong>Vừa xong</strong></span></div>
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
    </HomeShell>
  );
}
