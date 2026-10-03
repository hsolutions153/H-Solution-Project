"use client";

import React, { useState } from 'react';
import { Camera, QrCode, ArrowRight, Search, ChevronDown, Plus, MapPin, RefreshCw, X, Phone, UserRound, Wrench } from 'lucide-react';
import { Button, Card, Field } from '@h-mobility/ui';
import { ActionBar, ScreenHeader, SectionTitle, labelClasses, selectClasses, textareaClasses } from '@/components/ui';

interface CreateTaskScreenProps {
  onBack: () => void;
  onSubmitSuccess: () => void;
  onLogout?: () => void;
}

export const CreateTaskScreen: React.FC<CreateTaskScreenProps> = ({ onBack, onSubmitSuccess }) => {
  const [customerType, setCustomerType] = useState<'new' | 'old'>('new');
  
  // State form cho Khách hàng mới
  const [newFormData, setNewFormData] = useState({
    customerName: '',
    phone: '',
    address: '',
    deviceType: '',
    brandModel: '',
    serialNumber: '',
    description: '',
  });

  // State cho Khách hàng cũ
  const [selectedOldCustomer, setSelectedOldCustomer] = useState(true); // Giả lập đã chọn sẵn 1 khách hàng cũ
  const [isAddingNewDevice, setIsAddingNewDevice] = useState(false); // Quản lý trạng thái hiện/ẩn form thêm thiết bị mới cho KH cũ
  const [oldFormData, setOldFormData] = useState({
    searchKeyword: '',
    selectedDevice: 'Xe máy điện VinFast Feliz S - SN: VF12345',
    deviceType: 'Xe máy điện',
    brandModel: 'VinFast Feliz S',
    serialNumber: 'VF12345',
    description: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitSuccess();
  };

  const isNew = customerType === 'new';
  const device = isNew ? newFormData : oldFormData;
  const setDevice = (patch: Partial<Pick<typeof newFormData, 'deviceType' | 'brandModel' | 'serialNumber' | 'description'>>) =>
    isNew ? setNewFormData({ ...newFormData, ...patch }) : setOldFormData({ ...oldFormData, ...patch });

  return (
    <div className="space-y-5 px-4 pt-4">
      <ScreenHeader title="Tiếp nhận hiện trường" subtitle="Tạo phiếu cho khách gặp trực tiếp" onBack={onBack} />

      <form id="create-task-form" onSubmit={handleSubmit} className="space-y-5">
        <section className="space-y-3">
          <SectionTitle icon={<UserRound />}>Khách hàng</SectionTitle>

          <div role="radiogroup" className="grid grid-cols-2 gap-1 rounded-control bg-slate-200/70 p-1">
            {([
              ['new', 'Khách hàng mới'],
              ['old', 'Khách hàng cũ'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={customerType === value}
                onClick={() => setCustomerType(value)}
                className={`rounded-lg py-2 text-sm transition-colors cursor-pointer ${
                  customerType === value ? 'bg-white font-bold text-brand-700 shadow-card' : 'font-medium text-slate-600 hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {isNew ? (
            <Card className="space-y-4">
              <Field
                label="Tên khách hàng"
                type="text"
                autoComplete="name"
                placeholder="Họ và tên"
                value={newFormData.customerName}
                onChange={(e) => setNewFormData({ ...newFormData, customerName: e.target.value })}
              />
              <Field
                label="Số điện thoại"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="0901 234 567"
                icon={<Phone />}
                value={newFormData.phone}
                onChange={(e) => setNewFormData({ ...newFormData, phone: e.target.value })}
              />
              <Field
                label="Địa chỉ"
                type="text"
                autoComplete="street-address"
                placeholder="Số nhà, tên đường, phường"
                icon={<MapPin />}
                value={newFormData.address}
                onChange={(e) => setNewFormData({ ...newFormData, address: e.target.value })}
              />
            </Card>
          ) : (
            <Card className="space-y-4">
              <Field
                label="Tìm kiếm khách hàng"
                type="search"
                placeholder="Số điện thoại, tên hoặc mã KH"
                icon={<Search />}
                value={oldFormData.searchKeyword}
                onChange={(e) => setOldFormData({ ...oldFormData, searchKeyword: e.target.value })}
              />

              {selectedOldCustomer && (
                <div className="flex items-start gap-3 rounded-control border border-brand-200 bg-brand-50 p-3.5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-brand-700">
                    N
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-ink">Nguyễn Văn An</p>
                    <p className="text-[13px] text-slate-600 tabular-nums">0901234567</p>
                    <p className="mt-1 flex items-start gap-1 text-xs text-slate-500">
                      <MapPin className="mt-px size-3.5 shrink-0" />
                      45 Lê Lợi, Q. Hoàn Kiếm, Hà Nội
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedOldCustomer(false)}
                    className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-white cursor-pointer"
                  >
                    <RefreshCw className="size-3.5" /> Đổi
                  </button>
                </div>
              )}
            </Card>
          )}
        </section>

        <section className="space-y-3">
          <SectionTitle
            icon={<Wrench />}
            action={
              !isNew ? (
                <Button
                  size="sm"
                  variant="ghost"
                  icon={isAddingNewDevice ? <X className="size-4" /> : <Plus className="size-4" />}
                  onClick={() => setIsAddingNewDevice(!isAddingNewDevice)}
                >
                  {isAddingNewDevice ? 'Chọn thiết bị cũ' : 'Thiết bị mới'}
                </Button>
              ) : null
            }
          >
            Thiết bị & sự cố
          </SectionTitle>

          <Card className="space-y-4">
            {!isNew && !isAddingNewDevice && (
              <div className="space-y-1.5">
                <label htmlFor="saved-device" className={labelClasses}>Thiết bị đã lưu của khách</label>
                <div className="relative">
                  <select
                    id="saved-device"
                    value={oldFormData.selectedDevice}
                    onChange={(e) => setOldFormData({ ...oldFormData, selectedDevice: e.target.value })}
                    className={selectClasses}
                  >
                    <option>Xe máy điện VinFast Feliz S - SN: VF12345</option>
                    <option>Xe máy điện Dat Bike Quantum - SN: DB98765</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            )}

            {(isNew || isAddingNewDevice) && (
              <>
                {isAddingNewDevice && (
                  <p className="rounded-control bg-brand-50 px-3 py-2 text-[13px] font-medium text-brand-800">
                    Đang thêm thiết bị mới cho khách hàng này
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Loại thiết bị"
                    type="text"
                    placeholder="Xe máy điện"
                    value={device.deviceType}
                    onChange={(e) => setDevice({ deviceType: e.target.value })}
                  />
                  <Field
                    label="Hãng / model"
                    type="text"
                    placeholder="VinFast Evo 200"
                    value={device.brandModel}
                    onChange={(e) => setDevice({ brandModel: e.target.value })}
                  />
                </div>
                <Field
                  label="Số serial / số máy"
                  type="text"
                  placeholder="Nhập hoặc quét mã"
                  value={device.serialNumber}
                  onChange={(e) => setDevice({ serialNumber: e.target.value })}
                  trailing={
                    <button
                      type="button"
                      aria-label="Quét mã QR"
                      className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-brand-700 cursor-pointer"
                    >
                      <QrCode className="size-[18px]" />
                    </button>
                  }
                />
              </>
            )}

            <div className="space-y-1.5">
              <label htmlFor="issue-description" className={labelClasses}>Mô tả sự cố</label>
              <textarea
                id="issue-description"
                rows={3}
                placeholder="Tình trạng hư hỏng và yêu cầu của khách"
                value={device.description}
                onChange={(e) => setDevice({ description: e.target.value })}
                className={textareaClasses}
              />
            </div>

            <div className="space-y-1.5">
              <p className={labelClasses}>
                Ảnh hiện trạng <span className="font-normal text-slate-500">(tối thiểu 1 ảnh)</span>
              </p>
              <button
                type="button"
                className="flex w-full flex-col items-center justify-center gap-1 rounded-control border-2 border-dashed border-slate-300 bg-slate-50 py-5 text-slate-600 transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700 cursor-pointer"
              >
                <Camera className="size-6" />
                <span className="text-sm font-semibold">Chụp ảnh</span>
              </button>
            </div>
          </Card>
        </section>

        <ActionBar>
          <Button type="submit" size="lg" fullWidth>
            Tạo phiếu tiếp nhận
            <ArrowRight className="size-5" />
          </Button>
        </ActionBar>
      </form>
    </div>
  );
};
