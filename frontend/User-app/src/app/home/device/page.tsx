"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MoreHorizontal, Plus, SlidersHorizontal } from "lucide-react";
import { HomeShell } from "@/components/home/home-shell";
import type { Device } from "@/types/device";

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDevices = useCallback(async () => {
    try {
      const { fetchApi } = await import("@/lib/api-client");
      const list = await fetchApi<any[]>("/devices");
      if (Array.isArray(list) && list.length > 0) {
        const formatted: Device[] = list.map((item) => ({
          id: item.id,
          nickname: item.name || item.nickname || "Xe lăn thông minh",
          model: item.model || "Standard Model",
          serialNumber: item.serial_number || item.serialNumber || item.id,
          purchaseDate: item.purchase_date || item.purchaseDate || "",
          macAddress: item.notes || "AA:BB:CC:DD:EE:FF",
          image: "/wheelchair.png",
          isDefault: false,
        }));
        setDevices(formatted);
      } else {
        setDevices([
          {
            id: "dev-default",
            nickname: "Xe lăn điện Karma KP-80",
            model: "Model Karma Pro",
            serialNumber: "SN-8829-VN",
            purchaseDate: "15/01/2026",
            macAddress: "AA:BB:CC:11:22:33",
            image: "/wheelchair.png",
            isDefault: true,
          },
        ]);
      }
    } catch {
      // Fallback an toàn khi offline hoặc chưa kết nối
      setDevices([
        {
          id: "dev-default",
          nickname: "Xe lăn điện Karma KP-80",
          model: "Model Karma Pro",
          serialNumber: "SN-8829-VN",
          purchaseDate: "15/01/2026",
          macAddress: "AA:BB:CC:11:22:33",
          image: "/wheelchair.png",
          isDefault: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const makeDefault = async (id: string) => {
    setDevices((current) =>
      current.map((d) => ({ ...d, isDefault: d.id === id })),
    );
  };

  return (
    <HomeShell activeNav="device" title="Glacier Mobility" mainClassName="device-page-content">
      <div className="device-list-page">
        <div className="device-heading-row">
          <div>
            <p className="device-eyebrow">Thiết bị đã kết nối</p>
            <h1>Thiết bị của tôi</h1>
            <p className="device-intro">Quản lý và theo dõi các thiết bị hỗ trợ di chuyển đã kết nối.</p>
          </div>
          <span className="device-count">{devices.length} thiết bị</span>
        </div>

        {loading ? (
          <div className="device-loading">Đang tải thiết bị…</div>
        ) : (
          <div className="device-grid">
            {devices.map((device) => (
              <article className="device-card" key={device.id}>
                <Link href={`/home/device/${device.id}`} className="device-image-wrap">
                  {device.isDefault && <span className="device-badge">Mặc định</span>}
                  <Image src={device.image} alt={device.nickname} fill sizes="(max-width: 720px) 100vw, 380px" className="device-image" />
                </Link>
                <div className="device-card-body">
                  <div className="device-card-title-row">
                    <div>
                      <h2>{device.nickname}</h2>
                      <p>{device.model} · ID: {device.serialNumber}</p>
                    </div>
                    <span className="device-status"><i /> Đã kết nối</span>
                  </div>
                  <div className="device-card-actions">
                    <Link href={`/home/device/${device.id}`} className="device-primary-button">Quản lý</Link>
                    <button className="device-icon-button" onClick={() => void makeDefault(device.id)} aria-label="Đặt làm thiết bị mặc định" title="Đặt làm mặc định">
                      {device.isDefault ? <SlidersHorizontal size={18} /> : <MoreHorizontal size={19} />}
                    </button>
                  </div>
                </div>
              </article>
            ))}

            <Link className="device-register-card" href="/home/device/new">
              <span className="device-register-icon"><Plus size={24} /></span>
              <strong>Đăng ký thiết bị mới</strong>
              <span>Kết nối một thiết bị hỗ trợ di chuyển Glacier mới</span>
            </Link>
          </div>
        )}
      </div>
      <Link href="/home/device/new" className="device-fab" aria-label="Thêm thiết bị mới"><Plus size={24} /></Link>
    </HomeShell>
  );
}
