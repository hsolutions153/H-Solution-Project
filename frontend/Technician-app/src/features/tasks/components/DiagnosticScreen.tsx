"use client";

import React, { useState } from "react";
import { Task } from "@/types/task";
import { ArrowLeft, Camera, Wrench, Cpu, XCircle, Info, Plus, X, FileText, Sparkles, AlertCircle } from "lucide-react";

interface DiagnosticScreenProps {
  task: Task;
  onBack: () => void;
  onSubmitDiagnostic: (
    diagnosticData: { note: string; repairType: string; images: string[] },
    updatedTask?: any
  ) => void;
}

export const DiagnosticScreen: React.FC<DiagnosticScreenProps> = ({
  task,
  onBack,
  onSubmitDiagnostic,
}) => {
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [repairType, setRepairType] = useState<"FIX_NOW" | "BRING_TO_WORKSHOP" | "CANT_FIX">("FIX_NOW");
  
  const [images, setImages] = useState<string[]>(() => {
    if (Array.isArray((task as any)?.images) && (task as any).images.length > 0) {
      const existing = (task as any).images
        .filter((img: any) => img.image_type === "BEFORE_REPAIR" || img.type === "BEFORE_REPAIR")
        .map((img: any) => img.image_url || img.url);
      if (existing.length > 0) return existing;
    }
    return [];
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const [showImagePickerModal, setShowImagePickerModal] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const imageUrl = URL.createObjectURL(file);
      setImages((prev) => [...prev, imageUrl]);
      setImageFiles((prev) => [...prev, file]);
    }
    setShowImagePickerModal(false);
    e.target.value = "";
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, index) => index !== indexToRemove));
    setImageFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className="p-4 pb-28 space-y-4 relative">
      <input
        type="file"
        id="cameraInput"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      <input
        type="file"
        id="galleryInput"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-bold text-sky-800 hover:underline flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Đăng ký Chẩn đoán
        </button>
      </div>

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

      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-100 flex items-center justify-center text-sky-800 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-900 block leading-tight">
                Nội dung chẩn đoán kỹ thuật
              </label>
              <span className="text-[10px] text-slate-500 font-medium">
                Nguyên nhân hư hỏng & phát sinh thực tế
              </span>
            </div>
          </div>
          {note.trim().length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                {note.trim().length} ký tự
              </span>
              <button
                type="button"
                onClick={() => {
                  setNote("");
                  setNoteError(null);
                }}
                className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
              >
                Xóa
              </button>
            </div>
          )}
        </div>

        <div className="relative">
          <textarea
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              if (noteError && e.target.value.trim()) {
                setNoteError(null);
              }
            }}
            placeholder="Nhập chi tiết lỗi kiểm tra được và các vấn đề phát sinh (ví dụ: Bình ắc quy bị chai phồng, sụt áp nhanh; cần thay cụm bình mới)..."
            rows={4}
            className={`w-full p-3.5 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 placeholder:font-normal bg-slate-50 border-2 ${
              noteError
                ? "border-red-500 bg-red-50/20"
                : "border-slate-200 focus:border-sky-800 focus:bg-white"
            } rounded-xl focus:outline-none focus:ring-3 focus:ring-sky-800/10 transition-all resize-none leading-relaxed`}
          />
          {noteError && (
            <p className="text-[11px] text-red-600 font-semibold mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {noteError}
            </p>
          )}
        </div>

        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Gợi ý chẩn đoán nhanh:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              "Ắc quy chai / sụt áp",
              "Hỏng bộ điều khiển (IC)",
              "Mòn lốp / nổ xăm",
              "Đứt dây phanh / kẹt phanh",
              "Hỏng cần lái Joystick / tay ga",
              "Động cơ kêu / kẹt trục",
            ].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  setNote((prev) => {
                    const trimmed = prev.trim();
                    if (!trimmed) return tag;
                    if (trimmed.includes(tag)) return trimmed;
                    return `${trimmed}, ${tag}`;
                  });
                }}
                className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 hover:bg-sky-50 hover:text-sky-900 hover:border-sky-300 border border-slate-200 text-slate-700 rounded-lg transition-all cursor-pointer active:scale-95 shadow-2xs"
              >
                + {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold text-slate-800">Đánh giá khả năng sửa chữa</p>

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

      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-800">Chụp ảnh hiện trạng</p>
            <p className="text-[10px] text-slate-400">Trước khi thực hiện sửa chữa</p>
          </div>
          <button
            type="button"
            onClick={() => document.getElementById("cameraInput")?.click()}
            className="bg-sky-900 hover:bg-sky-950 text-white px-3 py-2 rounded-xl text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition"
          >
            <Camera className="w-3.5 h-3.5" />
            Chụp ảnh
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {images.map((imgSrc, index) => (
            <div key={index} className="rounded-xl overflow-hidden h-20 border border-gray-100 relative group">
              <img
                src={imgSrc}
                className="w-full h-full object-cover"
                alt="Hiện trạng"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/images/s1.jpg";
                }}
              />
              <button
                type="button"
                onClick={() => handleRemoveImage(index)}
                className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full opacity-80 hover:opacity-100 transition cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          <div
            onClick={() => setShowImagePickerModal(true)}
            className="rounded-xl border-2 border-dashed border-gray-200 h-20 flex flex-col items-center justify-center text-slate-400 hover:border-sky-800 hover:text-sky-800 cursor-pointer transition bg-gray-50/50"
          >
            <Plus className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-bold">Thêm ảnh</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-100 rounded-2xl p-3 flex items-start gap-2 text-slate-600">
        <Info className="w-4 h-4 text-sky-800 shrink-0 mt-0.5" />
        <p className="text-[11px] leading-relaxed">
          Cần chuẩn bị linh kiện thay thế nếu chuyển về xưởng hoặc tiến hành báo giá trực tiếp.
        </p>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={isUploading}
          className="flex-1 py-3 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-slate-700 font-bold text-xs cursor-pointer shadow-xs disabled:opacity-50"
        >
          Hủy bỏ
        </button>
        <button
          type="button"
          disabled={isUploading}
          onClick={async () => {
            if (!note.trim()) {
              setNoteError("Vui lòng nhập nội dung chẩn đoán trước khi tiếp tục.");
              return;
            }

            setIsUploading(true);
            let finalImages = [...images];
            let updatedTaskResponse: any = null;

            if (task?.id && imageFiles.length > 0) {
              try {
                const { fetchApi } = await import("@/lib/api-client");
                for (const file of imageFiles) {
                  try {
                    const formData = new FormData();
                    formData.append("file", file);
                    const res = await fetchApi<any>(
                      `/repair-requests/${task.id}/diagnostic-images`,
                      {
                        method: "POST",
                        body: formData,
                      }
                    );
                    updatedTaskResponse = res;
                    if (res?.images && Array.isArray(res.images)) {
                      const beforeImgs = res.images
                        .filter(
                          (img: any) =>
                            img.image_type === "BEFORE_REPAIR" ||
                            img.type === "BEFORE_REPAIR"
                        )
                        .map((img: any) => img.image_url || img.url);
                      if (beforeImgs.length > 0) {
                        finalImages = beforeImgs;
                      }
                    }
                  } catch (uploadErr) {
                    console.error("Lỗi khi upload ảnh chẩn đoán:", uploadErr);
                  }
                }
              } catch (err) {
                console.error("Lỗi kết nối khi tải ảnh chẩn đoán:", err);
              } finally {
                setIsUploading(false);
              }
            } else {
              setIsUploading(false);
            }

            onSubmitDiagnostic(
              { note, repairType, images: finalImages },
              updatedTaskResponse
            );
          }}
          className="flex-1 py-3 bg-sky-900 hover:bg-sky-950 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer shadow-sm disabled:opacity-50"
        >
          {isUploading ? (
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
              Đang tải ảnh lên...
            </span>
          ) : (
            <span>Lưu & Tiếp tục báo giá ➔</span>
          )}
        </button>
      </div>

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