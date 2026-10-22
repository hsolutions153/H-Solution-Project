"use client";

import { use, useEffect, useState } from "react";
import { HomeShell } from "@/components/home/home-shell";
import { DeviceForm } from "@/components/home/device-form";
import type { Device } from "@/types/device";
import { DeviceDetailSkeleton } from "@/components/motion/skeleton";

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
            batteryType: data.battery_type || data.batteryType || "LFP",
            manufacturingYear: data.manufacturing_year || data.manufacturingYear || undefined,
            purchaseDate: data.purchase_date || "",
            macAddress: data.notes || "",
            image: data.image_url || "/electric-scooter.jpg",
            isDefault: Boolean(data.is_default),
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
          macAddress: "AA:BB:CC:DD:EE:FF",
          image: "/electric-scooter.jpg",
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
        <DeviceDetailSkeleton label="Đang tải thông tin thiết bị..." />
      ) : (
        <DeviceForm device={device || undefined} />
      )}
    </HomeShell>
  );
}
