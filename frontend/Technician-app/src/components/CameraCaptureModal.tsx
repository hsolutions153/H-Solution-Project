"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, X } from "lucide-react";
import { Modal } from "@/components/ui";

export function CameraCaptureModal({
  open,
  title,
  onClose,
  onCapture,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  onCapture: (file: File) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError("");

    navigator.mediaDevices?.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setError("Không thể mở camera. Hãy cấp quyền camera và dùng HTTPS hoặc localhost."));

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [open]);

  const close = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    onClose();
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      onCapture(new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" }));
      close();
    }, "image/jpeg", 0.9);
  };

  return (
    <Modal open={open} onClose={close} title={title}>
      <div className="space-y-3">
        {error ? (
          <div className="rounded-control bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className="aspect-video w-full rounded-control bg-black object-cover" />
        )}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={close} className="flex items-center justify-center gap-2 rounded-control bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
            <X className="size-4" /> Hủy
          </button>
          <button type="button" onClick={capture} disabled={Boolean(error)} className="flex items-center justify-center gap-2 rounded-control bg-brand-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
            <Check className="size-4" /> Chụp ảnh
          </button>
        </div>
        {!error ? <p className="flex items-center gap-1.5 text-xs text-slate-500"><Camera className="size-3.5" /> Camera đang hoạt động trên thiết bị này.</p> : null}
      </div>
    </Modal>
  );
}
