"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Search,
  ChevronRight,
  ArrowLeft,
  Bike,
  Battery,
  CheckCircle2,
  Sparkles,
  PlusCircle,
  HelpCircle,
} from "lucide-react";
import {
  VEHICLE_BRANDS,
  BATTERY_TYPE_OPTIONS,
  type VehicleBrandItem,
  type VehicleModelItem,
} from "@/constants/vehicle-data";

export interface SelectedVehicleResult {
  manufacturer: string;
  model: string;
  batteryType: string;
  deviceType: "SCOOTER";
}

interface VehiclePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (result: SelectedVehicleResult) => void;
  currentManufacturer?: string;
  currentModel?: string;
}

type Step = "SELECT_BRAND" | "SELECT_MODEL" | "CUSTOM_BRAND" | "CUSTOM_MODEL";

export function VehiclePickerModal({
  isOpen,
  onClose,
  onSelect,
  currentManufacturer = "",
  currentModel = "",
}: VehiclePickerModalProps) {
  const [step, setStep] = useState<Step>("SELECT_BRAND");
  const [selectedBrand, setSelectedBrand] = useState<VehicleBrandItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // State cho việc nhập dòng xe "Khác"
  const [customBrandName, setCustomBrandName] = useState("");
  const [customModelName, setCustomModelName] = useState("");
  const [customBatteryType, setCustomBatteryType] = useState("LFP");
  const customDeviceType: "SCOOTER" = "SCOOTER";
  const [errorMsg, setErrorMsg] = useState("");

  // Lọc thương hiệu theo từ khóa
  const filteredBrands = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return VEHICLE_BRANDS;
    return VEHICLE_BRANDS.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.models.some((m) => m.model.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  // Lọc dòng xe theo từ khóa
  const filteredModels = useMemo(() => {
    if (!selectedBrand) return [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return selectedBrand.models;
    return selectedBrand.models.filter(
      (m) =>
        m.model.toLowerCase().includes(q) ||
        (m.description && m.description.toLowerCase().includes(q)) ||
        m.defaultBattery.toLowerCase().includes(q)
    );
  }, [selectedBrand, searchQuery]);

  if (!isOpen) return null;

  const handleSelectBrand = (brand: VehicleBrandItem) => {
    setSelectedBrand(brand);
    setSearchQuery("");
    setStep("SELECT_MODEL");
  };

  const handleSelectModel = (modelItem: VehicleModelItem) => {
    if (!selectedBrand) return;
    onSelect({
      manufacturer: selectedBrand.name,
      model: modelItem.model,
      batteryType: modelItem.defaultBattery,
      deviceType: modelItem.deviceType,
    });
    handleClose();
  };

  const handleStartCustomBrand = () => {
    setCustomBrandName(searchQuery.trim());
    setCustomModelName("");
    setCustomBatteryType("LFP");
    setErrorMsg("");
    setStep("CUSTOM_BRAND");
  };

  const handleStartCustomModel = () => {
    setCustomModelName(searchQuery.trim());
    setCustomBatteryType(
      selectedBrand?.models[0]?.defaultBattery || "LFP"
    );
    setErrorMsg("");
    setStep("CUSTOM_MODEL");
  };

  const handleConfirmCustomBrand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customBrandName.trim()) {
      setErrorMsg("Vui lòng nhập tên Thương hiệu/Hãng xe.");
      return;
    }
    if (!customModelName.trim()) {
      setErrorMsg("Vui lòng nhập tên Dòng xe/Mẫu xe.");
      return;
    }
    onSelect({
      manufacturer: customBrandName.trim(),
      model: customModelName.trim(),
      batteryType: customBatteryType,
      deviceType: customDeviceType,
    });
    handleClose();
  };

  const handleConfirmCustomModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBrand) return;
    if (!customModelName.trim()) {
      setErrorMsg("Vui lòng nhập tên Dòng xe.");
      return;
    }
    onSelect({
      manufacturer: selectedBrand.name,
      model: customModelName.trim(),
      batteryType: customBatteryType,
      deviceType: customDeviceType,
    });
    handleClose();
  };

  const handleClose = () => {
    setStep("SELECT_BRAND");
    setSelectedBrand(null);
    setSearchQuery("");
    setErrorMsg("");
    onClose();
  };

  const handleBack = () => {
    setErrorMsg("");
    if (step === "SELECT_MODEL") {
      setSelectedBrand(null);
      setSearchQuery("");
      setStep("SELECT_BRAND");
    } else if (step === "CUSTOM_MODEL") {
      setStep("SELECT_MODEL");
    } else if (step === "CUSTOM_BRAND") {
      setStep("SELECT_BRAND");
    }
  };

  return (
    <div className="vp-modal-overlay" onClick={handleClose}>
      <div className="vp-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="vp-modal-header">
          <div className="vp-header-left">
            {step !== "SELECT_BRAND" && (
              <button
                type="button"
                className="vp-back-btn"
                onClick={handleBack}
                aria-label="Quay lại bước trước"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div>
              <div className="vp-eyebrow">
                {step === "SELECT_BRAND" && "Bước 1 / 2 — Thương hiệu xe"}
                {step === "SELECT_MODEL" && `Bước 2 / 2 — Dòng xe ${selectedBrand?.name}`}
                {step === "CUSTOM_BRAND" && "Xác nhận nhập Thương hiệu & Dòng xe khác"}
                {step === "CUSTOM_MODEL" && `Xác nhận nhập Dòng xe khác cho ${selectedBrand?.name}`}
              </div>
              <h3 className="vp-modal-title">
                {step === "SELECT_BRAND" && "Chọn Hãng / Thương hiệu"}
                {step === "SELECT_MODEL" && `Chọn dòng xe ${selectedBrand?.name}`}
                {step === "CUSTOM_BRAND" && "Nhập xe ngoài danh mục"}
                {step === "CUSTOM_MODEL" && "Nhập tên dòng xe tùy biến"}
              </h3>
            </div>
          </div>
          <button
            type="button"
            className="vp-close-btn"
            onClick={handleClose}
            aria-label="Đóng cửa sổ"
          >
            <X size={20} />
          </button>
        </div>

        {/* Thanh tìm kiếm (chỉ hiện ở các bước danh sách) */}
        {(step === "SELECT_BRAND" || step === "SELECT_MODEL") && (
          <div className="vp-search-wrap">
            <Search size={17} className="vp-search-icon" />
            <input
              type="text"
              className="vp-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                step === "SELECT_BRAND"
                  ? "Tìm thương hiệu (VinFast, Dat Bike, Yadea, Pega...)"
                  : `Tìm dòng xe ${selectedBrand?.name} (ví dụ: Evo 200, Feliz, Quantum...)`
              }
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                className="vp-clear-search"
                onClick={() => setSearchQuery("")}
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {/* Nội dung theo từng Step */}
        <div className="vp-modal-body">
          {/* BƯỚC 1: Chọn Thương hiệu */}
          {step === "SELECT_BRAND" && (
            <div className="vp-brands-step">
              <div className="vp-section-label">Thương hiệu phổ biến tại Việt Nam</div>
              <div className="vp-brands-grid">
                {filteredBrands.map((brand) => {
                  const isCurrent =
                    currentManufacturer.toLowerCase() === brand.name.toLowerCase();
                  return (
                    <button
                      key={brand.id}
                      type="button"
                      className={`vp-brand-card ${isCurrent ? "vp-brand-selected" : ""}`}
                      onClick={() => handleSelectBrand(brand)}
                    >
                      <div className="vp-brand-avatar">
                        {brand.logo ? (
                          <img
                            src={brand.logo}
                            alt={brand.name}
                            className="vp-brand-logo-img"
                          />
                        ) : (
                          <span className="vp-avatar-fallback">
                            {brand.name.substring(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="vp-brand-meta">
                        <strong>{brand.name}</strong>
                        <span>
                          {brand.models.length} dòng xe · {brand.country}
                        </span>
                      </div>
                      <ChevronRight size={16} className="vp-brand-arrow" />
                    </button>
                  );
                })}

                {/* Thẻ chọn Thương hiệu khác */}
                <button
                  type="button"
                  className="vp-brand-card vp-other-brand-card"
                  onClick={handleStartCustomBrand}
                >
                  <div className="vp-brand-avatar vp-avatar-other">
                    <PlusCircle size={20} />
                  </div>
                  <div className="vp-brand-meta">
                    <strong>Hãng khác / Tự nhập</strong>
                    <span>Không tìm thấy hãng xe trong danh sách</span>
                  </div>
                  <ChevronRight size={16} className="vp-brand-arrow" />
                </button>
              </div>

              {filteredBrands.length === 0 && (
                <div className="vp-empty-search">
                  <HelpCircle size={32} />
                  <p>
                    Không tìm thấy thương hiệu phù hợp với &quot;<b>{searchQuery}</b>&quot;
                  </p>
                  <button
                    type="button"
                    className="vp-primary-action-btn"
                    onClick={handleStartCustomBrand}
                  >
                    <PlusCircle size={16} /> Nhập &quot;{searchQuery}&quot; làm Hãng xe mới
                  </button>
                </div>
              )}
            </div>
          )}

          {/* BƯỚC 2: Chọn Dòng xe của Thương hiệu đã chọn */}
          {step === "SELECT_MODEL" && selectedBrand && (
            <div className="vp-models-step">
              <div className="vp-models-header-card">
                <div className="vp-brand-pill">
                  {selectedBrand.logo ? (
                    <img
                      src={selectedBrand.logo}
                      alt={selectedBrand.name}
                      className="vp-brand-pill-logo"
                    />
                  ) : (
                    <Bike size={15} />
                  )}
                  <span>Hãng: <b>{selectedBrand.name}</b></span>
                </div>
                <button
                  type="button"
                  className="vp-change-brand-link"
                  onClick={() => {
                    setSelectedBrand(null);
                    setStep("SELECT_BRAND");
                  }}
                >
                  Đổi hãng khác
                </button>
              </div>

              <div className="vp-models-list">
                {filteredModels.map((item, idx) => {
                  const isCurrent =
                    currentModel.toLowerCase() === item.model.toLowerCase();
                  return (
                    <button
                      key={idx}
                      type="button"
                      className={`vp-model-row ${isCurrent ? "vp-model-selected" : ""}`}
                      onClick={() => handleSelectModel(item)}
                    >
                      <div className="vp-model-info">
                        <div className="vp-model-title-line">
                          <strong>{item.model}</strong>
                          {isCurrent && (
                            <span className="vp-current-tag">Đang chọn</span>
                          )}
                        </div>
                        {item.description && (
                          <p className="vp-model-desc">{item.description}</p>
                        )}
                        <div className="vp-model-tags">
                          <span className="vp-battery-badge">
                            <Battery size={12} />
                            Pin: {item.defaultBattery}
                          </span>
                          <span className="vp-type-badge">
                            Xe máy điện
                          </span>
                        </div>
                      </div>
                      <CheckCircle2 size={18} className="vp-model-check" />
                    </button>
                  );
                })}

                {/* Mục chọn dòng xe khác của hãng này */}
                <button
                  type="button"
                  className="vp-model-row vp-other-model-row"
                  onClick={handleStartCustomModel}
                >
                  <div className="vp-model-info">
                    <strong>+ Dòng xe khác thuộc {selectedBrand.name}</strong>
                    <p className="vp-model-desc">
                      Tự nhập tên mẫu xe nếu phiên bản của bạn chưa có trong danh sách
                    </p>
                  </div>
                  <ChevronRight size={18} />
                </button>
              </div>

              {filteredModels.length === 0 && (
                <div className="vp-empty-search">
                  <HelpCircle size={32} />
                  <p>
                    Không tìm thấy mẫu xe &quot;<b>{searchQuery}</b>&quot; trong danh mục của {selectedBrand.name}
                  </p>
                  <button
                    type="button"
                    className="vp-primary-action-btn"
                    onClick={handleStartCustomModel}
                  >
                    <PlusCircle size={16} /> Nhập &quot;{searchQuery}&quot; làm Dòng xe mới
                  </button>
                </div>
              )}
            </div>
          )}

          {/* BƯỚC 3A: Xác nhận nhập Thương hiệu & Dòng xe "Khác" hoàn toàn */}
          {step === "CUSTOM_BRAND" && (
            <form onSubmit={handleConfirmCustomBrand} className="vp-custom-form">
              <div className="vp-notice-box">
                <Sparkles size={18} />
                <div>
                  <strong>Nhập thông tin xe theo thực tế</strong>
                  <p>
                    Bạn có thể tự do điền thông tin chính xác về Hãng, Mẫu xe và Loại pin để kỹ thuật viên nắm rõ khi hỗ trợ sửa chữa.
                  </p>
                </div>
              </div>

              {errorMsg && <div className="vp-form-error">{errorMsg}</div>}

              <div className="vp-form-field">
                <label>
                  <span>1. Thương hiệu / Hãng xe <i>*</i></span>
                  <input
                    type="text"
                    required
                    value={customBrandName}
                    onChange={(e) => setCustomBrandName(e.target.value)}
                    placeholder="VD: Sonik, Kazuki, Detech, Dibao..."
                    autoFocus
                  />
                </label>
              </div>

              <div className="vp-form-field">
                <label>
                  <span>2. Dòng xe / Model <i>*</i></span>
                  <input
                    type="text"
                    required
                    value={customModelName}
                    onChange={(e) => setCustomModelName(e.target.value)}
                    placeholder="VD: Super S, Classic, X-Men..."
                  />
                </label>
              </div>

              <div className="vp-form-field">
                <label>
                  <span>3. Loại pin xe điện đang dùng <i>*</i></span>
                  <select
                    value={customBatteryType}
                    onChange={(e) => setCustomBatteryType(e.target.value)}
                  >
                    {BATTERY_TYPE_OPTIONS.map((b) => (
                      <option key={b.value} value={b.value}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="vp-form-field">
                <label>
                  <span>4. Phân loại phương tiện</span>
                  <div className="vp-device-type-options">
                    <label className="vp-radio-chip active">
                      <input
                        type="radio"
                        name="customDeviceType"
                        value="SCOOTER"
                        checked
                        readOnly
                      />
                      Xe máy điện
                    </label>
                  </div>
                </label>
              </div>

              <div className="vp-form-actions">
                <button
                  type="button"
                  className="vp-cancel-btn"
                  onClick={handleBack}
                >
                  Quay lại
                </button>
                <button type="submit" className="vp-submit-btn">
                  <CheckCircle2 size={16} /> Xác nhận áp dụng xe này
                </button>
              </div>
            </form>
          )}

          {/* BƯỚC 3B: Xác nhận nhập Dòng xe "Khác" cho Hãng đã chọn */}
          {step === "CUSTOM_MODEL" && selectedBrand && (
            <form onSubmit={handleConfirmCustomModel} className="vp-custom-form">
              <div className="vp-notice-box">
                <Bike size={18} />
                <div>
                  <strong>Dòng xe tùy biến thuộc {selectedBrand.name}</strong>
                  <p>
                    Nhập tên dòng xe theo thực tế hoặc giấy đăng ký xe của bạn.
                  </p>
                </div>
              </div>

              {errorMsg && <div className="vp-form-error">{errorMsg}</div>}

              <div className="vp-form-field">
                <label>
                  <span>Hãng xe đã chọn</span>
                  <input
                    type="text"
                    disabled
                    value={selectedBrand.name}
                    className="vp-disabled-input"
                  />
                </label>
              </div>

              <div className="vp-form-field">
                <label>
                  <span>Tên dòng xe / Model thực tế <i>*</i></span>
                  <input
                    type="text"
                    required
                    value={customModelName}
                    onChange={(e) => setCustomModelName(e.target.value)}
                    placeholder={`VD: ${selectedBrand.name} Custom Edition, Đời mới...`}
                    autoFocus
                  />
                </label>
              </div>

              <div className="vp-form-field">
                <label>
                  <span>Loại pin trang bị <i>*</i></span>
                  <select
                    value={customBatteryType}
                    onChange={(e) => setCustomBatteryType(e.target.value)}
                  >
                    {BATTERY_TYPE_OPTIONS.map((b) => (
                      <option key={b.value} value={b.value}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="vp-form-actions">
                <button
                  type="button"
                  className="vp-cancel-btn"
                  onClick={handleBack}
                >
                  Quay lại
                </button>
                <button type="submit" className="vp-submit-btn">
                  <CheckCircle2 size={16} /> Xác nhận dòng xe {selectedBrand.name}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
