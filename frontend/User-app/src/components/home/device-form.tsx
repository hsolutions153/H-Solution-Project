"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useRef, useState } from "react";
import { ArrowLeft, Camera, LoaderCircle, Save, Star, Trash2 } from "lucide-react";
import type { Device } from "@/types/device";

type Props = { device?: Device };

export function DeviceForm({ device }: Props) {
  const router = useRouter();
  const isEditing = Boolean(device);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    nickname: device?.nickname ?? "",
    deviceType: device?.deviceType ?? "",
    manufacturer: device?.manufacturer ?? "",
    model: device?.model ?? "",
    serialNumber: device?.serialNumber ?? "",
    purchaseDate: device?.purchaseDate ?? "",
    macAddress: device?.macAddress ?? "",
    isDefault: device?.isDefault ?? false,
    image: device?.image && device.image !== "/wheelchair.png" ? device.image : "",
  });
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState("");

  const KNOWN_MODELS: Record<string, { manufacturer: string; deviceType: string }> = {
    "Polaris X1": { manufacturer: "Glacier Mobility", deviceType: "SCOOTER" },
    "Glacier Z2": { manufacturer: "Glacier Mobility", deviceType: "WHEELCHAIR" },
    "Quantum X3": { manufacturer: "Quantum", deviceType: "WHEELCHAIR" },
    "Ergo 125": { manufacturer: "Karma Medical", deviceType: "WHEELCHAIR" },
    "Vento S": { manufacturer: "VinFast", deviceType: "SCOOTER" },
  };

  const update = (key: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));

  const handleModelChange = (modelName: string) => {
    setForm((current) => {
      const updated = { ...current, model: modelName };
      const matched = KNOWN_MODELS[modelName];
      if (matched) {
        if (!current.manufacturer.trim()) updated.manufacturer = matched.manufacturer;
        if (!current.deviceType) updated.deviceType = matched.deviceType;
      }
      return updated;
    });
  };

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.");
      return;
    }
    setUploadingImage(true);
    setError("");
    try {
      const { fetchApi } = await import("@/lib/api-client");
      const body = new FormData();
      body.append("file", file);
      const data = await fetchApi<{ image_url: string }>("/devices/images", { method: "POST", body });
      update("image", data.image_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải ảnh lên.");
    } finally {
      setUploadingImage(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { fetchApi } = await import("@/lib/api-client");
      const payload: Record<string, unknown> = {
        device_type: form.deviceType,
        manufacturer: form.manufacturer.trim(),
        model_name: form.model.trim(),
      };
      if (form.serialNumber.trim()) payload.serial_number = form.serialNumber.trim();
      if (form.nickname.trim()) {
        payload.notes = form.nickname.trim();
      } else if (form.macAddress.trim()) {
        payload.notes = form.macAddress.trim();
      } else {
        payload.notes = null;
      }
      if (form.purchaseDate) payload.purchase_date = form.purchaseDate;
      if (form.image) payload.image_url = form.image;
      payload.is_default = form.isDefault;

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
        {/* 1. Ảnh thiết bị (Đồng nhất cho cả Thêm mới và Chỉnh sửa) */}
        <div className="device-upload-container">
          <label className="device-upload-label">
            <span>Ảnh thiết bị</span>
          </label>
          <input
            ref={imageInputRef}
            className="device-file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageChange}
          />
          <button
            type="button"
            className="device-upload"
            disabled={uploadingImage}
            onClick={() => imageInputRef.current?.click()}
          >
            {uploadingImage ? (
              <>
                <LoaderCircle size={25} className="device-upload-spinner" />
                <strong>Đang tải ảnh lên...</strong>
              </>
            ) : form.image ? (
              <div className="device-upload-active">
                <div className="device-upload-preview">
                  <Image src={form.image} alt="Ảnh thiết bị" fill sizes="80px" unoptimized />
                </div>
                <div className="device-upload-info">
                  <strong>Đổi ảnh khác</strong>
                  <span>Nhấn để chọn ảnh mới từ thiết bị (JPG, PNG, WebP)</span>
                </div>
              </div>
            ) : (
              <>
                <Camera size={25} />
                <strong>Tải lên hoặc chụp ảnh thiết bị</strong>
                <span>Không bắt buộc · JPG, PNG hoặc WebP</span>
              </>
            )}
          </button>
        </div>

        {/* 2. Tên gợi nhớ */}
        <label>
          <span>Tên gợi nhớ</span>
          <input required value={form.nickname} onChange={(e) => update("nickname", e.target.value)} placeholder="Ví dụ: Xe đi làm, Xe của Ba" />
        </label>

        {/* 3. Loại thiết bị */}
        <label>
          <span>Loại thiết bị</span>
          <select required value={form.deviceType} onChange={(e) => update("deviceType", e.target.value)}>
            <option value="">Chọn loại thiết bị</option>
            <option value="WHEELCHAIR">Xe lăn điện</option>
            <option value="SCOOTER">Xe scooter điện</option>
          </select>
        </label>

        {/* 4. Hãng sản xuất */}
        <label>
          <span>Hãng sản xuất</span>
          <input required maxLength={100} value={form.manufacturer} onChange={(e) => update("manufacturer", e.target.value)} placeholder="Ví dụ: Glacier Mobility, Karma, VinFast" />
        </label>

        {/* 5. Mẫu thiết bị */}
        <label>
          <span>Mẫu thiết bị</span>
          <input
            required
            list="popular-models"
            value={form.model}
            onChange={(e) => handleModelChange(e.target.value)}
            placeholder="Nhập hoặc chọn mẫu (ví dụ: Polaris X1, Glacier Z2, Ergo 125...)"
          />
          <datalist id="popular-models">
            <option value="Polaris X1">Polaris X1 (Scooter - Glacier)</option>
            <option value="Glacier Z2">Glacier Z2 (Xe lăn - Glacier)</option>
            <option value="Quantum X3">Quantum X3 (Xe lăn - Quantum)</option>
            <option value="Ergo 125">Ergo 125 (Xe lăn - Karma Medical)</option>
            <option value="Vento S">Vento S (Scooter - VinFast)</option>
            <option value="Karu 8">Karu 8 (Scooter)</option>
            <option value="Ninebot Max">Ninebot Max (Scooter)</option>
          </datalist>
          <small>Bạn có thể chọn mẫu gợi ý hoặc tự do gõ tên mẫu thiết bị theo thực tế.</small>
        </label>

        {/* 6. Số sê-ri (Cho phép sửa ở cả 2 chế độ) */}
        <label>
          <span>Số sê-ri</span>
          <input value={form.serialNumber} onChange={(e) => update("serialNumber", e.target.value)} placeholder="Ví dụ: QM-8842-X3" />
          <small>Số sê-ri nằm trên khung đế, gần trục bánh sau (nếu có).</small>
        </label>

        {/* 7. Ngày mua */}
        <label>
          <span>Ngày mua</span>
          <input type="date" value={form.purchaseDate} onChange={(e) => update("purchaseDate", e.target.value)} />
        </label>

        {/* 8. Thiết bị mặc định (Đồng nhất cho cả Thêm mới và Sửa) */}
        <div className="device-settings-panel">
          <label className="device-switch-row">
            <span className="device-setting-icon"><Star size={18} /></span>
            <span><strong>Thiết bị mặc định</strong><small>Ưu tiên thiết bị này khi khởi động ứng dụng</small></span>
            <input type="checkbox" checked={form.isDefault} onChange={(e) => update("isDefault", e.target.checked)} />
          </label>
        </div>

        {error && <p className="device-form-error">{error}</p>}

        <button className="device-save-button" disabled={saving || uploadingImage}>
          {isEditing ? <Save size={18} /> : <span className="round-plus">+</span>}
          {saving ? "Đang lưu…" : isEditing ? "Lưu thay đổi" : "Thêm thiết bị"}
        </button>

        {isEditing && (
          <button type="button" className="device-delete-button" onClick={() => void remove()}>
            <Trash2 size={17} /> Xóa thiết bị
          </button>
        )}
        <button type="button" className="device-cancel" onClick={() => router.back()}>
          Hủy
        </button>
      </form>
    </div>
  );
}
