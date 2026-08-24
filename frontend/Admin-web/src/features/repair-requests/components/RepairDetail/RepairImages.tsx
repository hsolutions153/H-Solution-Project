'use client';

import React, { useState } from "react";
import { MapPin, Image as ImageIcon, Camera, CheckCircle2, User, Eye } from "lucide-react";

interface RepairImagesProps {
  address: string;
  customerImages?: string[]; // Ảnh do khách hàng gửi
  beforeImages?: string[];   // Ảnh KTV chụp trước khi sửa
  afterImages?: string[];    // Ảnh KTV chụp sau khi sửa
}

export const RepairImages: React.FC<RepairImagesProps> = ({
  address,
  customerImages = [],
  beforeImages = [],
  afterImages = [],
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Component phụ render mảng ảnh hoặc trạng thái trống
  const renderImageGroup = (
    title: string,
    icon: React.ReactNode,
    images: string[],
    emptyText: string,
    badgeColor: string
  ) => {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-xs text-slate-700">
            {icon}
            <span>{title}</span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>
            {images.length} hình ảnh
          </span>
        </div>

        {images.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {images.map((imgUrl, index) => (
              <div
                key={index}
                onClick={() => setSelectedImage(imgUrl)}
                className="group relative h-24 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 cursor-pointer"
              >
                <img
                  src={imgUrl}
                  alt={`${title} - ${index + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                />
                <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <Eye className="w-5 h-5 text-white" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-20 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-slate-400 gap-2">
            <ImageIcon className="w-4 h-4 text-slate-300" />
            <span className="text-xs font-normal">{emptyText}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Cột trái: Hình ảnh hiện trạng 3 hàng */}
      <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Hình ảnh kiểm tra & Thi công
          </span>
        </div>

        {/* Hàng 1: Ảnh khách hàng gửi */}
        {renderImageGroup(
          "1. Ảnh sự cố từ Khách hàng",
          <User className="w-4 h-4 text-sky-800" />,
          customerImages,
          "Chưa có ảnh khách hàng tải lên",
          "bg-sky-50 text-sky-800"
        )}

        <hr className="border-slate-100" />

        {/* Hàng 2: Ảnh KTV chụp trước khi sửa */}
        {renderImageGroup(
          "2. Ảnh hiện trạng trước khi sửa (KTV)",
          <Camera className="w-4 h-4 text-amber-600" />,
          beforeImages,
          "KTV chưa tải lên ảnh hiện trạng ban đầu",
          "bg-amber-50 text-amber-700"
        )}

        <hr className="border-slate-100" />

        {/* Hàng 3: Ảnh KTV chụp sau khi sửa */}
        {renderImageGroup(
          "3. Ảnh kết quả sau khi nghiệm thu (KTV)",
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
          afterImages,
          "Chưa có ảnh kết quả hoàn thành",
          "bg-emerald-50 text-emerald-700"
        )}
      </div>

      {/* Cột phải: Bản đồ địa điểm */}
      <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
        {/* Header tích hợp luôn địa chỉ kế bên tiêu đề */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">
            Địa điểm tiếp nhận:
          </span>
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 truncate" title={address}>
            <MapPin className="w-4 h-4 text-sky-800 shrink-0" />
            <span className="truncate">{address || "Chưa có địa chỉ chi tiết"}</span>
          </span>
        </div>

        {/* Khung bản đồ chiếm toàn bộ chiều cao còn lại */}
        <div className="flex-1 min-h-[360px] bg-sky-50/40 rounded-xl border border-slate-200 relative overflow-hidden flex items-center justify-center">
          <div className="flex flex-col items-center p-4 text-center z-10">
            <MapPin className="w-9 h-9 text-sky-900 fill-sky-800 animate-bounce drop-shadow" />
            <span className="bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-md text-xs font-bold text-slate-700 mt-2 max-w-[280px] truncate border border-slate-100">
              {address}
            </span>
          </div>
        </div>
      </div>

      {/* Modal Lightbox Xem Ảnh Phóng To */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={selectedImage}
              alt="Phóng to"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};