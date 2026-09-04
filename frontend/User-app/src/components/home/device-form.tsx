"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowLeft, Camera, Save, Star, Trash2 } from "lucide-react";
import type { Device } from "@/types/device";

type Props = { device?: Device };

export function DeviceForm({ device }: Props) {
  const router = useRouter();
  const isEditing = Boolean(device);
  const [form, setForm] = useState({
    nickname: device?.nickname ?? "",
    model: device?.model ?? "",
    serialNumber: device?.serialNumber ?? "",
    purchaseDate: device?.purchaseDate ?? "",
    macAddress: device?.macAddress ?? "",
    isDefault: device?.isDefault ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const update = (key: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { fetchApi } = await import("@/lib/api-client");
      const payload = {
        name: form.nickname,
        model: form.model,
        serial_number: form.serialNumber,
        notes: form.macAddress,
      };

      if (isEditing) {
        await fetchApi<any>(`/devices/${device!.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi<any>("/devices", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      router.push("/home/device");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Không thể lưu thiết bị.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!device || !window.confirm(`Xóa ${device.nickname}? Thao tác này không thể hoàn tác.`)) return;
    try {
      const { fetchApi } = await import("@/lib/api-client");
      await fetchApi(`/devices/${device.id}`, { method: "DELETE" });
      router.push("/home/device");
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Không thể xóa thiết bị.");
    }
  };

  return (
    <div className="device-form-page">
      <div className="device-subheader">
        <button onClick={() => router.back()} aria-label="Quay lại"><ArrowLeft size={20} /></button>
        <h1>{isEditing ? "Sửa thiết bị" : "Thêm thiết bị mới"}</h1>
        <span />
      </div>

      <form onSubmit={submit} className="device-form">
        {isEditing && (
          <div className="device-avatar-wrap">
            <div className="device-avatar"><Image src={device!.image} alt="Ảnh thiết bị" fill sizes="96px" /></div>
            <span>Ảnh thiết bị</span>
          </div>
        )}

        <label>
          <span>Tên gợi nhớ</span>
          <input required value={form.nickname} onChange={(e) => update("nickname", e.target.value)} placeholder="Ví dụ: Xe đi làm" />
        </label>
        <label>
          <span>Chọn mẫu thiết bị</span>
          <select required value={form.model} onChange={(e) => update("model", e.target.value)}>
            <option value="">Chọn mẫu thiết bị</option>
            <option>Polaris X1</option>
            <option>Glacier Z2</option>
            <option>Quantum X3</option>
          </select>
        </label>
        <label>
          <span>Số sê-ri</span>
          <input required disabled={isEditing} value={form.serialNumber} onChange={(e) => update("serialNumber", e.target.value)} placeholder="Ví dụ: QM-8842-X3" />
          {!isEditing && <small>Số sê-ri nằm trên khung đế, gần trục bánh sau.</small>}
        </label>
        <label>
          <span>Ngày mua</span>
          <input type="date" value={form.purchaseDate} onChange={(e) => update("purchaseDate", e.target.value)} />
        </label>

        {!isEditing && (
          <button type="button" className="device-upload">
            <Camera size={25} /><strong>Tải lên hoặc chụp ảnh</strong><span>Không bắt buộc · JPG hoặc PNG</span>
          </button>
        )}

        {isEditing && (
          <div className="device-settings-panel">
            <label className="device-switch-row">
              <span className="device-setting-icon"><Star size={18} /></span>
              <span><strong>Thiết bị mặc định</strong><small>Ưu tiên thiết bị này khi khởi động</small></span>
              <input type="checkbox" checked={form.isDefault} onChange={(e) => update("isDefault", e.target.checked)} />
            </label>
            <div className="device-mac-row">
              <span className="device-setting-icon">⌁</span>
              <span><strong>Địa chỉ MAC</strong><small>{form.macAddress}</small></span>
            </div>
          </div>
        )}

        {error && <p className="device-form-error">{error}</p>}
        <button className="device-save-button" disabled={saving}>
          {isEditing ? <Save size={18} /> : <span className="round-plus">+</span>}
          {saving ? "Đang lưu…" : isEditing ? "Lưu thay đổi" : "Thêm thiết bị"}
        </button>

        {isEditing && <button type="button" className="device-delete-button" onClick={() => void remove()}><Trash2 size={17} /> Xóa thiết bị</button>}
        <button type="button" className="device-cancel" onClick={() => router.back()}>Hủy</button>
      </form>
    </div>
  );
}
