"use client";

import { DeleteConfirmModal } from "@/components/home/delete-confirm-modal";
import {
VehiclePickerModal,
type SelectedVehicleResult,
} from "@/components/home/vehicle-picker-modal";
import { BATTERY_TYPE_OPTIONS } from "@/constants/vehicle-data";
import type { Device } from "@/types/device";
import {
ArrowLeft,
Bike,
Camera,
LoaderCircle,
Save,
Search,
Sparkles,
Star,
Trash2
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChangeEvent,FormEvent,useRef,useState } from "react";

type Props = { device?: Device };

export function DeviceForm({ device }: Props) {
  const router = useRouter();
  const isEditing = Boolean(device);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Modal chọn dòng xe & Modal xác nhận xóa
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    nickname: device?.nickname ?? "",
    deviceType: device?.deviceType ?? "SCOOTER",
    manufacturer: device?.manufacturer ?? "",
    model: device?.model ?? "",
    serialNumber: device?.serialNumber ?? "",
    batteryType: device?.batteryType ?? "LFP",
    manufacturingYear: device?.manufacturingYear ? String(device.manufacturingYear) : "",
    purchaseDate: device?.purchaseDate ?? "",
    macAddress: device?.macAddress ?? "",
    isDefault: device?.isDefault ?? false,
    image:
      device?.image &&
      device.image !== "/wheelchair.png" &&
      device.image !== "/electric-scooter.jpg"
        ? device.image
        : "",
  });

  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState("");

  const update = (key: keyof typeof form, value: string | boolean) =>
    setForm((current) => ({ ...current, [key]: value }));

  // Xử lý khi chọn xe từ Modal chọn dòng xe (Thương hiệu -> Dòng xe / Khác)
  const handleVehicleSelected = (result: SelectedVehicleResult) => {
    setForm((current) => {
      const updated = {
        ...current,
        manufacturer: result.manufacturer,
        model: result.model,
        batteryType: result.batteryType,
        deviceType: result.deviceType,
      };
      // Tự động gợi ý tên xe nếu chưa đặt
      if (!current.nickname.trim() || current.nickname.startsWith("Xe ")) {
        updated.nickname = `Xe ${result.manufacturer} ${result.model}`;
      }
      return updated;
    });
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    update("image", "");
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError("Dung lượng ảnh không được vượt quá 10MB.");
      return;
    }

    const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/jpg", "image/pjpeg"];
    const ext = file.name.split(".").pop()?.toLowerCase();
    const isAllowed =
      allowedMimes.includes(file.type.toLowerCase()) ||
      ["jpg", "jpeg", "png", "webp"].includes(ext || "");

    if (!isAllowed) {
      setError("Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.");
      return;
    }

    setUploadingImage(true);
    setError("");
    try {
      const { fetchApi } = await import("@/lib/api-client");
      const body = new FormData();
      body.append("file", file);
      const data = await fetchApi<{ image_url: string }>("/devices/images", {
        method: "POST",
        body,
      });
      update("image", data.image_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải ảnh lên.");
    } finally {
      setUploadingImage(false);
    }
  };


  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.manufacturer.trim() || !form.model.trim()) {
      setError("Vui lòng chọn hoặc nhập Thương hiệu và Dòng xe.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const { fetchApi } = await import("@/lib/api-client");

      // Cấu trúc dữ liệu xe máy điện phục vụ sửa chữa
      const payload: Record<string, unknown> = {
        device_type: form.deviceType || "SCOOTER",
        manufacturer: form.manufacturer.trim(),
        model_name: form.model.trim(),
        battery_type: form.batteryType.trim() || undefined,
      };

      if (form.manufacturingYear.trim()) {
        const yearNum = parseInt(form.manufacturingYear.trim(), 10);
        if (!isNaN(yearNum)) {
          payload.manufacturing_year = yearNum;
        }
      }

      if (form.serialNumber.trim()) {
        payload.serial_number = form.serialNumber.trim();
      }

      if (form.nickname.trim()) {
        payload.notes = form.nickname.trim();
      } else if (form.macAddress.trim()) {
        payload.notes = form.macAddress.trim();
      } else {
        payload.notes = null;
      }

      if (form.purchaseDate) payload.purchase_date = form.purchaseDate;
      payload.image_url = form.image ? form.image : (isEditing ? null : undefined);
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
      setError(err.message || "Không thể lưu thông tin xe.");
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    setIsDeleteModalOpen(true);
  };

  const confirmRemove = async () => {
    if (!device) return;
    setDeleting(true);
    try {
      const { fetchApi } = await import("@/lib/api-client");
      await fetchApi(`/devices/${device.id}`, { method: "DELETE" });
      setIsDeleteModalOpen(false);
      router.push("/home/device");
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Không thể xóa xe.");
    } finally {
      setDeleting(false);
    }
  };

  // Danh sách năm sản xuất từ 2018 đến hiện tại + 1
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: currentYear - 2017 }, (_, i) => currentYear + 1 - i);

  return (
    <div className="device-form-page">
      <div className="device-subheader">
        <button onClick={() => router.back()} aria-label="Quay lại">
          <ArrowLeft size={20} />
        </button>
        <h1>{isEditing ? "Chỉnh sửa thông tin xe" : "Đăng ký xe mới"}</h1>
        <span />
      </div>

      <form onSubmit={submit} className="device-form">
        <div className="device-upload-container">
          <label className="device-upload-label">
            <span>Ảnh chụp phương tiện / xe</span>
          </label>
          <input
            ref={imageInputRef}
            className="device-file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/jpg"
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
                <span>Vui lòng đợi giây lát</span>
              </>
            ) : form.image ? (
              <div className="device-upload-active">
                <div className="device-upload-preview">
                  <Image
                    src={form.image}
                    alt="Ảnh xe"
                    fill
                    sizes="80px"
                    unoptimized
                  />
                </div>
                <div className="device-upload-info">
                  <strong>Đổi ảnh khác</strong>
                  <span>Nhấn để chọn ảnh mới từ thiết bị (JPG, PNG, WebP)</span>
                  <button
                    type="button"
                    className="device-upload-remove-btn"
                    onClick={handleRemoveImage}
                  >
                    <Trash2 size={12} /> Xóa ảnh này
                  </button>
                </div>
              </div>
            ) : (
              <>
                <Camera size={25} />
                <strong>Tải lên hoặc chụp ảnh xe</strong>
                <span>Không bắt buộc · Giúp kỹ thuật viên dễ dàng nhận diện</span>
              </>
            )}
          </button>
        </div>

        <div className="vp-models-header-card" style={{ marginBottom: 20 }}>
          <div className="vp-brand-pill">
            <Sparkles size={16} />
            <span>
              <b>Chọn nhanh xe từ danh mục:</b> VinFast, Dat Bike, Yadea, Honda...
            </span>
          </div>
          <button
            type="button"
            className="device-picker-open-btn"
            onClick={() => setIsPickerOpen(true)}
          >
            <Search size={14} /> Chọn dòng xe
          </button>
        </div>

        <div className="device-form-grid-2">
          <label>
            <span>
              1. Thương hiệu (Hãng xe) <b style={{ color: "#d13b4c" }}>*</b>
            </span>
            <input
              required
              maxLength={100}
              value={form.manufacturer}
              onChange={(e) => update("manufacturer", e.target.value)}
              placeholder="VD: VinFast, Dat Bike, Yadea..."
            />
          </label>

          <label>
            <span>
              2. Dòng xe / Model <b style={{ color: "#d13b4c" }}>*</b>
            </span>
            <div className="device-picker-trigger-row">
              <input
                required
                maxLength={100}
                value={form.model}
                onChange={(e) => update("model", e.target.value)}
                placeholder="VD: Evo 200, Feliz S, Quantum..."
              />
              <button
                type="button"
                className="device-picker-open-btn"
                onClick={() => setIsPickerOpen(true)}
                title="Mở danh sách Thương hiệu -> Dòng xe"
              >
                <Bike size={14} /> Chọn
              </button>
            </div>
          </label>
        </div>

        <div className="device-form-grid-2">
          <label>
            <span>
              3. ID xe / Số sê-ri / Biển số <b style={{ color: "#d13b4c" }}>*</b>
            </span>
            <input
              required
              value={form.serialNumber}
              onChange={(e) => update("serialNumber", e.target.value)}
              placeholder="VD: 29MD-12345 hoặc VF-88910"
            />
            <small>Số khung/máy hoặc biển số để kỹ thuật viên nhận diện khi sửa chữa.</small>
          </label>

          <label>
            <span>Phân loại phương tiện</span>
            <select
              value={form.deviceType}
              onChange={(e) => update("deviceType", e.target.value)}
            >
              <option value="SCOOTER">Xe máy điện</option>
            </select>
            <small>Hệ thống chuyên biệt cho dịch vụ xe máy điện.</small>
          </label>
        </div>

        <div className="device-form-grid-2">
          <label>
            <span>
              4. Loại pin của xe <b style={{ color: "#d13b4c" }}>*</b>
            </span>
            <select
              value={form.batteryType}
              onChange={(e) => update("batteryType", e.target.value)}
            >
              {BATTERY_TYPE_OPTIONS.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
            <small>Thông tin pin giúp chuẩn bị thiết bị đo đạc và linh kiện sửa chữa phù hợp.</small>
          </label>

          <label>
            <span>5. Năm sản xuất (Tùy chọn)</span>
            <select
              value={form.manufacturingYear}
              onChange={(e) => update("manufacturingYear", e.target.value)}
            >
              <option value="">Chưa xác định</option>
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  Năm {year}
                </option>
              ))}
            </select>
            <small>Giúp đánh giá đời xe và tình trạng khấu hao pin theo thời gian.</small>
          </label>
        </div>

        <div className="device-form-grid-2">
          <label>
            <span>Tên gợi nhớ</span>
            <input
              value={form.nickname}
              onChange={(e) => update("nickname", e.target.value)}
              placeholder="Ví dụ: Xe đi làm, Xe của Ba..."
            />
          </label>

          <label>
            <span>Ngày mua xe (nếu có)</span>
            <input
              type="date"
              value={form.purchaseDate}
              onChange={(e) => update("purchaseDate", e.target.value)}
            />
          </label>
        </div>

        <div className="device-settings-panel">
          <label className="device-switch-row">
            <span className="device-setting-icon">
              <Star size={18} />
            </span>
            <span>
              <strong>Phương tiện mặc định</strong>
              <small>Ưu tiên sử dụng xe này khi tạo yêu cầu cứu hộ & sửa chữa</small>
            </span>
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => update("isDefault", e.target.checked)}
            />
          </label>
        </div>

        {error && <p className="device-form-error">{error}</p>}

        <button className="device-save-button" disabled={saving || uploadingImage}>
          {isEditing ? <Save size={18} /> : <span className="round-plus">+</span>}
          {saving ? "Đang lưu…" : isEditing ? "Lưu thông tin xe" : "Xác nhận đăng ký xe"}
        </button>

        {isEditing && (
          <button
            type="button"
            className="device-delete-button"
            onClick={() => void remove()}
          >
            <Trash2 size={17} /> Xóa xe này
          </button>
        )}
        <button type="button" className="device-cancel" onClick={() => router.back()}>
          Hủy
        </button>
      </form>

      <VehiclePickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={handleVehicleSelected}
        currentManufacturer={form.manufacturer}
        currentModel={form.model}
      />

      {isEditing && (
        <DeleteConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={confirmRemove}
          deviceName={device?.nickname || device?.model || "Xe máy điện"}
          serialNumber={device?.serialNumber}
          loading={deleting}
        />
      )}
    </div>
  );
}
