"use client";

import Image from "next/image";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { ArrowLeft, BatteryCharging, CalendarDays, ChevronRight, CircleDollarSign, Pencil, RotateCw, Star, Wrench } from "lucide-react";
import { HomeShell } from "@/components/home/home-shell";

export default function DeviceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [device, setDevice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { fetchApi } = await import("@/lib/api-client");
        const data = await fetchApi<any>(`/devices/${id}`);
        if (data) {
          setDevice({
            id: data.id,
            nickname: data.name || "Xe lăn thông minh",
            model: data.model || "Standard Model",
            serialNumber: data.serial_number || data.id,
            purchaseDate: data.purchase_date || "Chưa cung cấp",
            image: "/wheelchair.png",
            isDefault: false,
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
          <Image src={device.image} alt={device.nickname} fill sizes="(max-width: 720px) 100vw, 600px" />
        </div>

        <div className="device-detail-actions">
          <Link href={`/home/device/${device.id}/edit`} className="device-primary-button"><Pencil size={16} /> Sửa thông tin</Link>
          {!device.isDefault && <Link href={`/home/device/${device.id}/edit`} className="device-secondary-button"><Star size={16} /> Đặt làm mặc định</Link>}
          {device.isDefault && <div className="device-default-note"><Star size={15} fill="currentColor" /> Thiết bị mặc định</div>}
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
