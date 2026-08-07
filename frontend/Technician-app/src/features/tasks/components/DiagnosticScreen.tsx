"use client";

import React, { useState } from "react";
import { Task } from "@/types/task";
import { ArrowLeft, Camera, Wrench, Cpu, XCircle, Info, Plus, X } from "lucide-react";

interface DiagnosticScreenProps {
  task: Task;
  onBack: () => void;
  // Truyền kèm diagnosticData khi chuyển bước sang màn hình báo giá
  onSubmitDiagnostic: (diagnosticData: { note: string; repairType: string; images: string[] }) => void;
}

export const DiagnosticScreen: React.FC<DiagnosticScreenProps> = ({
  task,
  onBack,
  onSubmitDiagnostic,
}) => {
  const [note, setNote] = useState("");
  const [repairType, setRepairType] = useState<"FIX_NOW" | "BRING_TO_WORKSHOP" | "CANT_FIX">("FIX_NOW");
  
  // Quản lý danh sách ảnh (khởi tạo có sẵn 1 ảnh mẫu)
  const [images, setImages] = useState<string[]>(["/images/s1.jpg"]);

  // State điều khiển hiển thị bảng chọn (Thư viện hay Camera) khi bấm "+ Thêm ảnh"
  const [showImagePickerModal, setShowImagePickerModal] = useState(false);

  // Hàm xử lý khi chọn/chụp file ảnh xong
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const imageUrl = URL.createObjectURL(file);
      setImages((prev) => [...prev, imageUrl]);
    }
    setShowImagePickerModal(false);
  };

  // Hàm xóa ảnh
  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className="p-4 pb-28 space-y-4 relative">
      {/* Input ẩn cho Camera trực tiếp */}
      <input
        type="file"
        id="cameraInput"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Input ẩn cho Thư viện ảnh */}
      <input
        type="file"
        id="galleryInput"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Tiêu đề trang */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-bold text-sky-800 hover:underline flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Đăng ký Chẩn đoán
        </button>
      </div>

      {/* Thông tin đơn hàng */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-1">
        <p className="text-[10px] text-slate-400 font-medium">
          MA ĐƠN: {task.code || `#JOB-2904`}
        </p>
        <h3 className="text-xs font-bold text-slate-800">
          {task.serviceName || `Sửa chữa thiết bị y tế / Xe lăn`}
        </h3>
        <p className="text-[11px] text-slate-500">
          Ghi nhận kết quả kiểm tra và đánh giá tình trạng thiết bị.
        </p>
      </div>

      {/* Nội dung chẩn đoán */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-2">
        <label className="text-xs font-bold text-slate-800 block">
          Nội dung chẩn đoán (Nguyên nhân & Vấn đề mới)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Nhập chi tiết lỗi và các vấn đề phát sinh..."
          className="w-full h-24 p-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-sky-800 resize-none"
        />
      </div>

      {/* Đánh giá khả năng sửa chữa */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-slate-800">Đánh giá khả năng sửa chữa</p>

        {/* Option 1 */}
        <div
          onClick={() => setRepairType("FIX_NOW")}
          className={`p-3 rounded-2xl border flex items-center gap-3 cursor-pointer transition ${
            repairType === "FIX_NOW"
              ? "bg-sky-50 border-sky-400 text-sky-900 shadow-xs"
              : "bg-white border-gray-100 text-slate-700 hover:bg-gray-50"
          }`}
        >
          <div className="w-8 h-8 rounded-xl bg-sky-100 flex items-center justify-center text-sky-800">
            <Wrench className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold">Sửa được ngay</span>
        </div>

        {/* Option 2 */}
        <div
          onClick={() => setRepairType("BRING_TO_WORKSHOP")}
          className={`p-3 rounded-2xl border flex items-center gap-3 cursor-pointer transition ${
            repairType === "BRING_TO_WORKSHOP"
              ? "bg-sky-50 border-sky-400 text-sky-900 shadow-xs"
              : "bg-white border-gray-100 text-slate-700 hover:bg-gray-50"
          }`}
        >
          <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-slate-700">
            <Cpu className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold">Cần mang về xưởng</span>
        </div>

        {/* Option 3 */}
        <div
          onClick={() => setRepairType("CANT_FIX")}
          className={`p-3 rounded-2xl border flex items-center gap-3 cursor-pointer transition ${
            repairType === "CANT_FIX"
              ? "bg-red-50 border-red-300 text-red-900 shadow-xs"
              : "bg-white border-gray-100 text-slate-700 hover:bg-gray-50"
          }`}
        >
          <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
            <XCircle className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold">Không thể sửa</span>
        </div>
      </div>

      {/* Chụp ảnh hiện trạng */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-800">Chụp ảnh hiện trạng</p>
            <p className="text-[10px] text-slate-400">Trước khi thực hiện sửa chữa</p>
          </div>
          {/* Nút chụp ảnh nhanh bằng Camera trực tiếp */}
          <button
            type="button"
            onClick={() => document.getElementById("cameraInput")?.click()}
            className="bg-sky-900 hover:bg-sky-950 text-white px-3 py-2 rounded-xl text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition"
          >
            <Camera className="w-3.5 h-3.5" />
            Chụp ảnh
          </button>
        </div>

        {/* Danh sách ảnh hiển thị */}
        <div className="grid grid-cols-2 gap-2">
          {images.map((imgSrc, index) => (
            <div key={index} className="rounded-xl overflow-hidden h-20 border border-gray-100 relative group">
              <img src={imgSrc} className="w-full h-full object-cover" alt="Hiện trạng" />
              <button
                type="button"
                onClick={() => handleRemoveImage(index)}
                className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full opacity-80 hover:opacity-100 transition cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          {/* Ô Thêm ảnh: Bấm vào sẽ mở Popup lựa chọn */}
          <div
            onClick={() => setShowImagePickerModal(true)}
            className="rounded-xl border-2 border-dashed border-gray-200 h-20 flex flex-col items-center justify-center text-slate-400 hover:border-sky-800 hover:text-sky-800 cursor-pointer transition bg-gray-50/50"
          >
            <Plus className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-bold">Thêm ảnh</span>
          </div>
        </div>
      </div>

      {/* Ghi chú phụ */}
      <div className="bg-slate-100 rounded-2xl p-3 flex items-start gap-2 text-slate-600">
        <Info className="w-4 h-4 text-sky-800 shrink-0 mt-0.5" />
        <p className="text-[11px] leading-relaxed">
          Cần chuẩn bị linh kiện thay thế nếu chuyển về xưởng hoặc tiến hành báo giá trực tiếp.
        </p>
      </div>

      {/* Buttons hành động dưới cùng */}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-slate-700 font-bold text-xs cursor-pointer shadow-xs"
        >
          Hủy bỏ
        </button>
        <button
          type="button"
          onClick={() => onSubmitDiagnostic({ note, repairType, images })}
          className="flex-1 py-3 bg-sky-900 hover:bg-sky-950 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer shadow-sm"
        >
          Lưu & Tiếp tục báo giá ➔
        </button>
      </div>

      {/* POPUP TÙY CHỌN KHI BẤM "+ THÊM ẢNH" */}
      {showImagePickerModal && (
        <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="bg-white w-full max-w-xs rounded-3xl p-4 shadow-xl space-y-3 animate-slide-up">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="text-xs font-bold text-slate-800">Thêm hình ảnh hiện trạng</h4>
              <button
                type="button"
                onClick={() => setShowImagePickerModal(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {/* Lựa chọn 1: Bật Camera */}
              <button
                type="button"
                onClick={() => {
                  setShowImagePickerModal(false);
                  document.getElementById("cameraInput")?.click();
                }}
                className="w-full py-2.5 px-3 bg-sky-50 hover:bg-sky-100 text-sky-900 rounded-xl text-xs font-bold flex items-center gap-2.5 transition cursor-pointer"
              >
                <Camera className="w-4 h-4 text-sky-800" />
                Bật Camera chụp trực tiếp
              </button>

              {/* Lựa chọn 2: Chọn từ Thư viện */}
              <button
                type="button"
                onClick={() => {
                  setShowImagePickerModal(false);
                  document.getElementById("galleryInput")?.click();
                }}
                className="w-full py-2.5 px-3 bg-gray-50 hover:bg-gray-100 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2.5 transition cursor-pointer"
              >
                <Plus className="w-4 h-4 text-slate-500" />
                Chọn ảnh từ thư viện thiết bị
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};