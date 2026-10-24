"use client";

import React, { useState } from "react";
import { Task } from "@/types/task";
import { ArrowRight, Camera, Check, Wrench, Cpu, XCircle, Info, ImagePlus, Plus, X, FileText, Sparkles, AlertCircle } from "lucide-react";
import { Button, cn } from "@h-mobility/ui";
import { ActionBar, Modal, ScreenHeader, SectionTitle, textareaClasses } from "@/components/ui";

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

  const REPAIR_OPTIONS = [
    { id: "FIX_NOW" as const, label: "Sửa được ngay", hint: "Xử lý tại chỗ", icon: Wrench },
    { id: "BRING_TO_WORKSHOP" as const, label: "Cần mang về xưởng", hint: "Cần dụng cụ hoặc linh kiện", icon: Cpu },
    { id: "CANT_FIX" as const, label: "Không thể sửa", hint: "Báo lại cho khách hàng", icon: XCircle },
  ];

  const handleSubmit = async () => {
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
  };

  const displayCode = task.code || (task as any).request_code || task.id || "";
  const formattedCode = displayCode ? (displayCode.startsWith("#") ? displayCode : `#${displayCode}`) : "";
  const displayService =
    task.serviceName ||
    (task as any).issue_type ||
    task.deviceInfo ||
    ((task as any).device ? `${(task as any).device.manufacturer || ""} ${(task as any).device.model_name || ""}`.trim() : "") ||
    "Dịch vụ sửa chữa";

  return (
    <div className="space-y-5 px-4 pt-4">
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

      <ScreenHeader
        title="Chẩn đoán"
        subtitle={formattedCode ? `Mã đơn ${formattedCode} · ${displayService}` : displayService}
        onBack={onBack}
      />

      <section className="space-y-2.5">
        <SectionTitle
          icon={<FileText />}
          action={
            note.trim().length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setNote("");
                  setNoteError(null);
                }}
                className="text-[13px] font-semibold text-slate-500 hover:text-rose-700 cursor-pointer"
              >
                Xóa nội dung
              </button>
            ) : null
          }
        >
          <label htmlFor="diagnostic-note">Kết quả chẩn đoán</label>
        </SectionTitle>
        <textarea
          id="diagnostic-note"
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            if (noteError && e.target.value.trim()) {
              setNoteError(null);
            }
          }}
          placeholder="Nguyên nhân hư hỏng và vấn đề phát sinh. Ví dụ: ắc quy chai phồng, sụt áp nhanh, cần thay cụm bình mới."
          rows={4}
          aria-invalid={noteError ? true : undefined}
          aria-describedby={noteError ? "diagnostic-note-error" : undefined}
          className={cn(
            textareaClasses,
            noteError && "border-rose-400 focus:border-rose-500 focus:ring-rose-100"
          )}
        />
        {noteError ? (
          <p id="diagnostic-note-error" className="flex items-center gap-1.5 text-xs font-medium text-rose-700">
            <AlertCircle className="size-3.5 shrink-0" />
            {noteError}
          </p>
        ) : note.trim().length > 0 ? (
          <p className="text-xs text-slate-500 tabular-nums">{note.trim().length} ký tự</p>
        ) : null}

        <div className="pt-1">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <Sparkles className="size-3.5 text-brand-600" />
            Chọn nhanh lỗi thường gặp
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              "Ắc quy chai / sụt áp",
              "Hỏng bộ điều khiển (IC)",
              "Mòn lốp / nổ xăm",
              "Đứt dây phanh / kẹt phanh",
              "Hỏng cần lái Joystick / tay ga",
              "Động cơ kêu / kẹt trục",
            ].map((tag) => {
              const added = note.includes(tag);
              return (
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
                    setNoteError(null);
                  }}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors active:scale-95 cursor-pointer",
                    added
                      ? "border-brand-300 bg-brand-50 text-brand-800"
                      : "border-line bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50"
                  )}
                >
                  {added ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="space-y-2.5">
        <SectionTitle icon={<Wrench />}>Khả năng sửa chữa</SectionTitle>
        <div role="radiogroup" className="space-y-2">
          {REPAIR_OPTIONS.map((opt) => {
            const selected = repairType === opt.id;
            const danger = opt.id === "CANT_FIX";
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setRepairType(opt.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-card border bg-white p-3 text-left transition-colors cursor-pointer",
                  selected
                    ? danger
                      ? "border-rose-400 bg-rose-50 ring-1 ring-rose-200"
                      : "border-brand-500 bg-brand-50 ring-1 ring-brand-200"
                    : "border-line hover:bg-slate-50"
                )}
              >
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-control",
                    danger ? "bg-rose-100 text-rose-700" : "bg-brand-100 text-brand-700"
                  )}
                >
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink">{opt.label}</span>
                  <span className="block text-xs text-slate-500">{opt.hint}</span>
                </span>
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                    selected ? (danger ? "border-rose-600 bg-rose-600" : "border-brand-600 bg-brand-600") : "border-slate-300"
                  )}
                  aria-hidden
                >
                  {selected ? <Check className="size-3 text-white" strokeWidth={3} /> : null}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-2.5">
        <SectionTitle
          icon={<Camera />}
          action={<span className="text-xs text-slate-500">Trước khi sửa chữa</span>}
        >
          Ảnh hiện trạng
        </SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          {images.map((imgSrc, index) => (
            <div key={index} className="relative aspect-square overflow-hidden rounded-control border border-line bg-slate-100">
              <img
                src={imgSrc}
                className="size-full object-cover"
                alt={`Ảnh hiện trạng ${index + 1}`}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/images/s1.jpg";
                }}
              />
              <button
                type="button"
                onClick={() => handleRemoveImage(index)}
                aria-label={`Xóa ảnh ${index + 1}`}
                className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full bg-brand-950/70 text-white transition-colors hover:bg-brand-950 cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setShowImagePickerModal(true)}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-control border-2 border-dashed border-slate-300 bg-white text-slate-600 transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700 cursor-pointer"
          >
            <Camera className="size-5" />
            <span className="text-xs font-semibold">Thêm ảnh</span>
          </button>
        </div>
      </section>

      <p className="flex items-start gap-2.5 rounded-card bg-slate-100 p-3.5 text-[13px] leading-relaxed text-slate-600">
        <Info className="mt-0.5 size-4 shrink-0 text-brand-600" />
        Cần chuẩn bị linh kiện thay thế nếu chuyển về xưởng hoặc tiến hành báo giá trực tiếp.
      </p>

      <ActionBar className="grid grid-cols-[1fr_2fr] gap-2.5">
        <Button size="lg" variant="secondary" onClick={onBack} disabled={isUploading}>
          Hủy
        </Button>
        <Button size="lg" onClick={handleSubmit} loading={isUploading}>
          {isUploading ? "Đang tải ảnh..." : "Tiếp tục báo giá"}
          {!isUploading && <ArrowRight className="size-5" />}
        </Button>
      </ActionBar>

      <Modal
        open={showImagePickerModal}
        onClose={() => setShowImagePickerModal(false)}
        variant="sheet"
        title="Thêm ảnh hiện trạng"
      >
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              setShowImagePickerModal(false);
              document.getElementById("cameraInput")?.click();
            }}
            className="flex w-full items-center gap-3 rounded-control bg-brand-50 px-4 py-3.5 text-left text-sm font-semibold text-brand-800 transition-colors hover:bg-brand-100 cursor-pointer"
          >
            <Camera className="size-5" />
            Chụp ảnh bằng camera
          </button>
          <button
            type="button"
            onClick={() => {
              setShowImagePickerModal(false);
              document.getElementById("galleryInput")?.click();
            }}
            className="flex w-full items-center gap-3 rounded-control bg-slate-100 px-4 py-3.5 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200 cursor-pointer"
          >
            <ImagePlus className="size-5" />
            Chọn ảnh từ thư viện
          </button>
        </div>
      </Modal>
    </div>
  );
};
