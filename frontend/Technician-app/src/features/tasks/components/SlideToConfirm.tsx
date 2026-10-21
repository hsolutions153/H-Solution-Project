"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { CheckCircle2, ChevronsRight, RefreshCw } from "lucide-react";

interface SlideToConfirmProps {
  onConfirm: () => void;
  isConfirming?: boolean;
  isSuccess?: boolean;
  disabled?: boolean;
  title?: string;
  confirmedText?: string;
  disabledText?: string;
}

export const SlideToConfirm: React.FC<SlideToConfirmProps> = ({
  onConfirm,
  isConfirming = false,
  isSuccess = false,
  disabled = false,
  title = "Xác nhận thanh toán",
  confirmedText = "Đã xác nhận",
  disabledText = "Chưa thể xác nhận",
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  const [isConfirmed, setIsConfirmed] = useState(false);
  const isDraggingRef = useRef(false);
  const maxOffsetRef = useRef(0);
  const currentOffsetRef = useRef(0);
  const startXRef = useRef(0);
  const confirmedRef = useRef(false);

  // Cập nhật hiệu ứng trượt trực tiếp trên DOM để tối ưu hiệu năng mượt mà
  const updateVisuals = useCallback((offset: number, animate: boolean) => {
    const thumb = thumbRef.current;
    const fill = fillRef.current;
    const label = labelRef.current;
    const max = maxOffsetRef.current || 1;
    const progress = Math.min(1, Math.max(0, offset / max));

    const transition = animate
      ? "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)"
      : "none";

    if (thumb) {
      thumb.style.transition = transition;
      thumb.style.transform = `translate3d(${offset}px, 0, 0)`;
    }
    if (fill) {
      fill.style.transition = transition;
      if (offset <= 0 && !isConfirming && !confirmedRef.current) {
        fill.style.width = "0px";
        fill.style.opacity = "0";
      } else {
        fill.style.width = `calc(${offset}px + 44px)`;
        fill.style.opacity = "1";
      }
    }
    if (label) {
      if (progress > 0.5 || isConfirming || confirmedRef.current) {
        label.style.color = "#ffffff";
        label.style.textShadow = "0 1px 2px rgba(0,0,0,0.25)";
      } else {
        label.style.color = "#475569";
        label.style.textShadow = "none";
      }
    }
  }, [isConfirming]);

  const updateMetrics = useCallback(() => {
    if (trackRef.current && thumbRef.current) {
      const trackW = trackRef.current.clientWidth;
      const thumbW = thumbRef.current.clientWidth;
      const max = Math.max(0, trackW - thumbW - 8);
      maxOffsetRef.current = max;
      if (confirmedRef.current || isConfirming || isSuccess) {
        currentOffsetRef.current = max;
        updateVisuals(max, false);
      }
    }
  }, [isConfirming, isSuccess, updateVisuals]);

  useEffect(() => {
    updateMetrics();
    window.addEventListener("resize", updateMetrics);
    return () => window.removeEventListener("resize", updateMetrics);
  }, [updateMetrics]);

  useEffect(() => {
    if (isSuccess) {
      setIsConfirmed(true);
      confirmedRef.current = true;
      if (maxOffsetRef.current > 0) {
        currentOffsetRef.current = maxOffsetRef.current;
        updateVisuals(maxOffsetRef.current, true);
      }
    } else if (!isConfirming && !isSuccess) {
      setIsConfirmed(false);
      confirmedRef.current = false;
      currentOffsetRef.current = 0;
      updateVisuals(0, true);
    }
  }, [isSuccess, isConfirming, updateVisuals]);

  const triggerConfirm = () => {
    if (confirmedRef.current || isConfirming || disabled) return;
    confirmedRef.current = true;
    setIsConfirmed(true);
    currentOffsetRef.current = maxOffsetRef.current;
    updateVisuals(maxOffsetRef.current, true);
    onConfirm();
  };

  const resetToStart = () => {
    currentOffsetRef.current = 0;
    updateVisuals(0, true);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || isConfirming || confirmedRef.current || maxOffsetRef.current <= 0) return;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    isDraggingRef.current = true;

    const trackRect = trackRef.current?.getBoundingClientRect();
    if (!trackRect) return;

    const clickX = e.clientX - trackRect.left - 4;
    const thumbW = thumbRef.current?.clientWidth || 48;
    const targetOffset = Math.min(maxOffsetRef.current, Math.max(0, clickX - thumbW / 2));

    // Nhấn nhanh vào phía bên phải để kích hoạt xác nhận
    if (clickX >= trackRect.width * 0.72) {
      triggerConfirm();
      return;
    }

    currentOffsetRef.current = targetOffset;
    startXRef.current = e.clientX - targetOffset;
    updateVisuals(targetOffset, false);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || disabled || isConfirming || confirmedRef.current) return;

    const nextOffset = Math.min(maxOffsetRef.current, Math.max(0, e.clientX - startXRef.current));
    currentOffsetRef.current = nextOffset;
    updateVisuals(nextOffset, false);

    // Tự động xác nhận khi trượt quá 85%
    if (nextOffset >= maxOffsetRef.current * 0.85) {
      isDraggingRef.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      triggerConfirm();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    if (currentOffsetRef.current >= maxOffsetRef.current * 0.7) {
      triggerConfirm();
    } else {
      resetToStart();
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    resetToStart();
  };

  return (
    <div className="space-y-1.5 select-none">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-slate-700">
          {title}
        </span>
        <span className="text-[11px] font-medium text-emerald-700">
          {isConfirming ? "Đang xử lý..." : isConfirmed ? "Đã xong" : disabled ? "" : "Gạt để xác nhận"}
        </span>
      </div>

      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        style={{ touchAction: "none" }}
        aria-disabled={disabled || undefined}
        className={`relative h-14 w-full select-none rounded-full border-2 p-1 overflow-hidden transition-colors duration-200 ${
          isConfirmed || isConfirming
            ? "border-emerald-500 bg-emerald-50 shadow-inner cursor-pointer"
            : disabled
            ? "border-slate-200 bg-slate-50 cursor-not-allowed opacity-60"
            : "border-slate-300 bg-slate-100 hover:border-slate-400 cursor-pointer"
        }`}
      >
        <div
          ref={fillRef}
          className="absolute inset-y-1 left-1 rounded-full bg-linear-to-r from-emerald-500 to-emerald-600 pointer-events-none"
          style={{
            width: isConfirmed || isConfirming ? "calc(100% - 8px)" : "0px",
            opacity: isConfirmed || isConfirming ? 1 : 0,
          }}
        />

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-12 z-0">
          <span
            ref={labelRef}
            className="text-xs font-bold transition-colors duration-150 truncate tracking-wide text-slate-600"
          >
            {isConfirming ? (
              <span className="text-white drop-shadow-xs">Đang xử lý...</span>
            ) : isConfirmed ? (
              <span className="text-white drop-shadow-xs">{confirmedText}</span>
            ) : disabled ? (
              disabledText
            ) : (
              "Gạt để xác nhận"
            )}
          </span>
        </div>

        <div
          ref={thumbRef}
          style={{
            transform: "translate3d(0, 0, 0)",
            touchAction: "none",
          }}
          className="absolute top-1 bottom-1 w-11 h-11 flex items-center justify-center rounded-full bg-white shadow-md border border-slate-200 z-10 cursor-grab active:cursor-grabbing hover:scale-102"
        >
          {isConfirming ? (
            <RefreshCw className="size-4.5 animate-spin text-emerald-600" />
          ) : isConfirmed ? (
            <CheckCircle2 className="size-5 text-emerald-600" />
          ) : (
            <ChevronsRight className="size-5 text-emerald-600" />
          )}
        </div>
      </div>
    </div>
  );
};
