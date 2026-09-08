"use client";

import { use, useEffect, useState } from "react";
import { HomeShell } from "@/components/home/home-shell";
import { DeviceForm } from "@/components/home/device-form";
import type { Device } from "@/types/device";

export default function EditDevicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [device, setDevice] = useState<Device | null>(null);
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
            purchaseDate: data.purchase_date || "",
            macAddress: data.notes || "AA:BB:CC:DD:EE:FF",
            image: "/wheelchair.png",
            isDefault: false,
          });
        }
      } catch {
        setDevice({
          id: String(id),
          nickname: "Xe lăn thông minh Karma KP-80",
          model: "Karma Power Pro",
          serialNumber: String(id),
          purchaseDate: "15/01/2026",
          macAddress: "AA:BB:CC:DD:EE:FF",
          image: "/wheelchair.png",
          isDefault: true,
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  return (
    <HomeShell activeNav="device" hideHeader mainClassName="device-page-content">
      {loading ? (
        <div className="device-loading">Đang tải thông tin thiết bị...</div>
      ) : (
        <DeviceForm device={device || undefined} />
      )}
    </HomeShell>
  );
}
