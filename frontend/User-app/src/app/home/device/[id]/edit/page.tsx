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
          const hasCustomNotes = data.notes && !data.notes.includes(":") && data.notes.length < 50;
          const brand = data.manufacturer && data.manufacturer !== "Generic" ? data.manufacturer : "";
          const modelName = data.model_name || data.model || "";

          // Tên gợi nhớ trong form chỉ lấy tên người dùng đã lưu, không tự động gắn brand/model
          const customNickname = data.nickname || (hasCustomNotes ? data.notes : "");

          setDevice({
            id: data.id,
            nickname: customNickname,
            deviceType: data.device_type || "",
            manufacturer: brand || data.manufacturer || "",
            model: modelName,
            serialNumber: data.serial_number || data.id,
            purchaseDate: data.purchase_date || "",
            macAddress: data.notes || "",
            image: data.image_url || "/wheelchair.png",
            isDefault: Boolean(data.is_default),
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
