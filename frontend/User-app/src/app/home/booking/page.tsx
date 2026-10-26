"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { fileToStoredImage } from "@/utils/image-data";
import { HomeShell } from "@/components/home/home-shell";
import { PageHeader } from "@/components/home/page-header";
import { getCurrentLocation, type CurrentLocation } from "@/lib/location";
import { LocationPicker } from "@/components/home/location-picker";
import { showAppNotice } from "@/components/common/app-notice";

type BookingStep = "PROBLEM" | "CAMERA" | "DETAILS" | "LOCATION" | "SCHEDULE" | "SUCCESS";
type Issue = "battery" | "controller" | "wheel" | "motor" | "frame" | "other";

const ISSUE_OPTIONS: Array<{ id: Issue; label: string; icon: string }> = [
  { id: "battery", label: "Pin / Nguồn", icon: "battery_alert" },
  { id: "controller", label: "Bộ điều khiển", icon: "tune" },
  { id: "wheel", label: "Bánh xe", icon: "tire_repair" },
  { id: "motor", label: "Động cơ", icon: "bolt" },
  { id: "frame", label: "Khung / Phanh", icon: "do_not_disturb_on" },
  { id: "other", label: "Vấn đề khác", icon: "build_circle" },
];

const TIME_GROUPS = [
  {
    label: "Buổi sáng",
    slots: [
      { id: "08:00", label: "08:00 - 09:00" },
      { id: "09:00", label: "09:00 - 10:00" },
      { id: "10:00", label: "10:00 - 11:00" },
      { id: "11:00", label: "11:00 - 12:00" },
    ],
  },
  {
    label: "Buổi chiều",
    slots: [
      { id: "13:30", label: "13:30 - 14:30" },
      { id: "14:30", label: "14:30 - 15:30" },
      { id: "15:30", label: "15:30 - 16:30" },
      { id: "16:30", label: "16:30 - 17:30" },
    ],
  },
];

const STEP_ORDER: BookingStep[] = ["PROBLEM", "CAMERA", "DETAILS", "LOCATION", "SCHEDULE"];
const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const MONTHS = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];

function slotDateTime(date: Date, slotId: string) {
  const [hours, minutes] = slotId.split(":").map(Number);
  const result = new Date(date);
  result.setHours(hours || 0, minutes || 0, 0, 0);
  return result;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getCalendarDays(viewDate: Date) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { date, inMonth: date.getMonth() === month };
  });
}

export default function BookingPage() {
  const router = useRouter();
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const [step, setStep] = useState<BookingStep>("PROBLEM");
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [details, setDetails] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [province, setProvince] = useState("");
  const [ward, setWard] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [location, setLocation] = useState<CurrentLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const locationLoadedRef = useRef(false);
  const [selectedDate, setSelectedDate] = useState(today);
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedTime, setSelectedTime] = useState("09:00");
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());
  const [nowTick, setNowTick] = useState(() => new Date());
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderCode, setOrderCode] = useState("");
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);
  const [isCancellingBooking, setIsCancellingBooking] = useState(false);
  const [cancelBookingSuccess, setCancelBookingSuccess] = useState(false);
  const [showCancelBookingDialog, setShowCancelBookingDialog] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const calendarDays = useMemo(() => getCalendarDays(viewDate), [viewDate]);
  const selectedIssueLabel = ISSUE_OPTIONS.find((item) => item.id === selectedIssue)?.label ?? "";
  const selectedTimeLabel =
    TIME_GROUPS.flatMap((group) => group.slots).find((slot) => slot.id === selectedTime)?.label ?? selectedTime;
  const fullAddress = [streetAddress.trim(), ward.trim(), province.trim()].filter(Boolean).join(", ");

  const slotKey = (date: Date, slotId: string) => `${toDateKey(date)}|${slotId}`;
  const isSlotDisabled = (slotId: string) =>
    slotDateTime(selectedDate, slotId) < nowTick || bookedSlots.has(slotKey(selectedDate, slotId));
  const hasAvailableSlot = TIME_GROUPS.some((group) => group.slots.some((slot) => !isSlotDisabled(slot.id)));

  const fillCurrentLocation = async () => {
    setIsLocating(true);
    setError("");
    try {
      const { fetchApi } = await import("@/lib/api-client");
      const nextLocation = await getCurrentLocation(fetchApi);
      setLocation(nextLocation);
      setStreetAddress(nextLocation.address);
      setWard(nextLocation.ward);
      setProvince(nextLocation.province);
    } catch (locationError) {
      setError(locationError instanceof Error ? locationError.message : "Không thể lấy vị trí hiện tại.");
    } finally {
      setIsLocating(false);
    }
  };

  useEffect(() => {
    if (step !== "LOCATION" || locationLoadedRef.current) return;
    locationLoadedRef.current = true;
    void fillCurrentLocation();
  }, [step]);

  useEffect(() => {
    if (step !== "SCHEDULE") return;
    setNowTick(new Date());
    const id = setInterval(() => setNowTick(new Date()), 30000);
    return () => clearInterval(id);
  }, [step]);

  useEffect(() => {
    if (step !== "SCHEDULE") return;
    let cancelled = false;
    async function loadBookedSlots() {
      try {
        const { fetchApi } = await import("@/lib/api-client");
        const result = await fetchApi<{ items?: any[] }>("/repair-requests/me?limit=100");
        const next = new Set<string>();
        for (const item of result?.items || []) {
          if (["COMPLETED", "CANCELLED"].includes(String(item.status || "").toUpperCase())) continue;
          const match = String(item.issue_description || "").match(/\[Hẹn:\s*([^\]]+)\]/i);
          if (!match) continue;
          const text = match[1];
          const date = text.match(/\b(\d{4}-\d{2}-\d{2})\b/)?.[1];
          const time = text.match(/\b(\d{1,2}:\d{2})\b/)?.[1];
          if (date && time) next.add(`${date}|${time}`);
        }
        if (!cancelled) setBookedSlots(next);
      } catch {
        // Backend remains the source of truth and rejects a race condition.
      }
    }
    void loadBookedSlots();
    return () => {
      cancelled = true;
    };
  }, [step, selectedDate]);

  useEffect(() => {
    if (!isSlotDisabled(selectedTime)) return;
    const nextAvailable = TIME_GROUPS.flatMap((group) => group.slots).find((slot) => !isSlotDisabled(slot.id));
    setSelectedTime(nextAvailable ? nextAvailable.id : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, nowTick, bookedSlots]);

  useEffect(() => {
    if (step !== "CAMERA") return;

    let cancelled = false;
    const videoElement = videoRef.current;

    const startCamera = async () => {
      if (!window.isSecureContext && window.location.hostname !== "localhost") {
        setCameraError("Camera chỉ hoạt động trên kết nối HTTPS hoặc localhost.");
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Trình duyệt này không hỗ trợ camera trực tiếp.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoElement) {
          videoElement.srcObject = stream;
          await videoElement.play();
          setCameraReady(true);
        }
      } catch (cameraAccessError) {
        const message =
          cameraAccessError instanceof DOMException && cameraAccessError.name === "NotAllowedError"
            ? "Bạn chưa cấp quyền camera. Hãy cho phép quyền camera trong cài đặt trình duyệt rồi thử lại."
            : "Không thể mở camera thiết bị. Camera có thể đang được ứng dụng khác sử dụng.";
        setCameraError(message);
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoElement) videoElement.srcObject = null;
    };
  }, [step]);

  const goBack = () => {
    setError("");
    const currentIndex = STEP_ORDER.indexOf(step);
    if (step === "SUCCESS" || currentIndex <= 0) {
      router.push("/home");
      return;
    }
    const previousStep = STEP_ORDER[currentIndex - 1];
    if (previousStep === "CAMERA") {
      setCameraReady(false);
      setCameraError("");
    }
    setStep(previousStep);
  };

  const handlePhotos = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith("image/"));
    event.target.value = "";
    if (!files.length) return;

    try {
      const storedImages = await Promise.all(files.slice(0, 4).map(fileToStoredImage));
      setPhotos((current) => [...current, ...storedImages].slice(0, 4));
      setPhotoFiles((current) => [...current, ...files.slice(0, 4)].slice(0, 4));
      setStep("DETAILS");
    } catch (photoError) {
      setCameraError(photoError instanceof Error ? photoError.message : "Không thể xử lý ảnh đã chọn.");
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || !cameraReady || video.videoWidth === 0 || video.videoHeight === 0) {
      setCameraError("Camera chưa sẵn sàng. Vui lòng chờ một chút rồi thử lại.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError("Không thể xử lý ảnh từ camera.");
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraError("Không thể lưu ảnh vừa chụp.");
          return;
        }
        const file = new File([blob], `capture_${Date.now()}.jpg`, { type: "image/jpeg" });
        const url = canvas.toDataURL("image/jpeg", 0.82);
        setPhotos((current) => {
          if (current.length >= 4) {
            return [...current.slice(1), url];
          }
          return [...current, url];
        });
        setPhotoFiles((current) => {
          if (current.length >= 4) {
            return [...current.slice(1), file];
          }
          return [...current, file];
        });
        setStep("DETAILS");
      },
      "image/jpeg",
      0.9
    );
  };

  const removePhoto = (index: number) => {
    setPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index));
    setPhotoFiles((current) => current.filter((_, photoIndex) => photoIndex !== index));
  };

  const openCamera = () => {
    setCameraReady(false);
    setCameraError("");
    setStep("CAMERA");
  };

  const continueFromProblem = () => {
    if (!selectedIssue) {
      setError("Vui lòng chọn một nhóm sự cố.");
      return;
    }
    setError("");
    openCamera();
  };

  const continueFromDetails = () => {
    if (details.trim().length < 10) {
      setError("Vui lòng mô tả sự cố ít nhất 10 ký tự.");
      return;
    }
    setError("");
    setStep("LOCATION");
  };

  const continueFromLocation = () => {
    if (!location) {
      setError("Cần bật vị trí GPS để đặt lịch. Bạn vẫn có thể chỉnh lại địa chỉ sau khi vị trí được lấy.");
      return;
    }
    if (!province.trim() || !ward.trim() || !streetAddress.trim()) {
      setError("Vui lòng nhập đầy đủ tỉnh/thành phố, phường/xã và số nhà – tên đường.");
      return;
    }
    setError("");
    setStep("SCHEDULE");
  };

  const submitBooking = async () => {
    if (!selectedTime || isSlotDisabled(selectedTime)) {
      setError("Khung giờ đã chọn không còn khả dụng, vui lòng chọn lại.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      const { fetchApi } = await import("@/lib/api-client");
      const devices = await fetchApi<any[]>("/devices");
      const defaultDevice = (devices || []).find((item: any) => item.is_default === true || item.isDefault === true) || devices?.[0];
      if (!defaultDevice?.id) {
        throw new Error("Bạn chưa có thiết bị nào. Vui lòng thêm thiết bị trước khi đặt lịch.");
      }
      const deviceId = defaultDevice.id;

      const payload = {
        device_id: deviceId,
        issue_type: selectedIssue ? selectedIssue.toUpperCase() : "GENERAL",
        issue_description: details,
        location_address: fullAddress,
        is_sos: false,
        request_type: "NORMAL",
        latitude: location?.latitude,
        longitude: location?.longitude,
        images: [],
        booking_date: selectedDate ? toDateKey(selectedDate) : "TODAY",
        booking_slot: selectedTime,
      };

      const result = await fetchApi<any>("/repair-requests", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (result && result.id && photoFiles.length > 0) {
        try {
          await Promise.allSettled(
            photoFiles.map((photoFile) => {
              const formData = new FormData();
              formData.append("file", photoFile);
              return fetchApi(`/repair-requests/${result.id}/images`, {
                method: "POST",
                body: formData,
              });
            })
          );
        } catch (uploadErr) {
          console.warn("Lỗi tải lên hình ảnh đặt lịch:", uploadErr);
        }
      }

      setOrderCode(result.request_code || result.id || "REQ-SUCCESS");
      setCreatedRequestId(result.id || null);
      setStep("SUCCESS");
    } catch (submitError: any) {
      setError(submitError.message || "Không thể tạo lịch sửa chữa.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <HomeShell activeNav="wheelchair" hideHeader mainClassName="booking-home-content">
      <div className="sos-flow-page booking-flow-page">
        <header className="sos-flow-header">
          <PageHeader
            title="Đặt lịch sửa chữa"
            subtitle={step !== "SUCCESS" ? `Bước ${STEP_ORDER.indexOf(step) + 1}/${STEP_ORDER.length}` : "Đã gửi yêu cầu"}
            onBack={step !== "PROBLEM" ? goBack : undefined}
            backHref={step === "PROBLEM" ? "/home" : undefined}
          />
          {step !== "SUCCESS" && (
            <div className="booking-progress" aria-hidden>
              <span style={{ width: `${((STEP_ORDER.indexOf(step) + 1) / STEP_ORDER.length) * 100}%` }} />
            </div>
          )}
        </header>

        <input
          ref={galleryInputRef}
          className="sos-camera-file-input"
          type="file"
          accept="image/*"
          multiple
          onChange={handlePhotos}
        />

        {step === "PROBLEM" && (
          <section className="sos-step-panel">
            <div className="sos-step-head">
              <h1 className="sos-step-title">Xe máy điện của bạn đang gặp vấn đề gì?</h1>
            </div>
            <div className="sos-issue-grid">
              {ISSUE_OPTIONS.map((issue) => (
                <button
                  key={issue.id}
                  type="button"
                  className={`sos-issue-card ${selectedIssue === issue.id ? "sos-issue-card--active" : ""}`}
                aria-pressed={selectedIssue === issue.id}
                  onClick={() => {
                    setSelectedIssue(issue.id);
                    setError("");
                  }}
                >
                  <span className="material-symbols-outlined">{issue.icon}</span>
                  <span>{issue.label}</span>
                </button>
              ))}
            </div>
            {error && <p className="sos-form-error">{error}</p>}
            <p className="sos-step-note">Chọn nhóm sự cố để chúng tôi chuẩn bị hỗ trợ phù hợp.</p>
            <button type="button" className="sos-manual-submit" onClick={continueFromProblem}>Tiếp tục</button>
          </section>
        )}

        {step === "CAMERA" && (
          <section className="sos-step-panel sos-camera-panel booking-camera-panel">
            <h1 className="sos-camera-title">Chụp ảnh tình trạng xe</h1>
            <p className="sos-camera-desc">Đặt khu vực hư hỏng vào giữa khung hình rồi nhấn nút chụp.</p>
            <div className="sos-camera-frame booking-camera-frame">
              <video ref={videoRef} className="sos-camera-video" autoPlay playsInline muted />
              {!cameraReady && !cameraError && (
                <div className="booking-camera-loading">
                  <span className="booking-camera-spinner" />
                  <p>Đang mở camera...</p>
                </div>
              )}
              <div className="sos-camera-focus" />
              {cameraError && (
                <div className="sos-camera-error">
                  <span className="material-symbols-outlined">videocam_off</span>
                  <p>{cameraError}</p>
                </div>
              )}
            </div>
            <div className="sos-camera-actions">
              <button type="button" className="sos-camera-side-btn" onClick={() => galleryInputRef.current?.click()}>
                Chọn từ máy
              </button>
              <button
                type="button"
                className="sos-camera-capture"
                disabled={!cameraReady}
                onClick={capturePhoto}
                aria-label="Chụp ảnh"
              >
                <span className="material-symbols-outlined">photo_camera</span>
              </button>
              <button type="button" className="sos-camera-side-btn" onClick={() => setStep("DETAILS")}>
                Bỏ qua
              </button>
            </div>
          </section>
        )}

        {step === "DETAILS" && (
          <section className="sos-step-panel">
            <div className="sos-step-head sos-step-head--left">
              <h1 className="sos-step-title">Mô tả tình trạng xe</h1>
              <p className="sos-section-desc">Hãy mô tả dấu hiệu hoặc thời điểm sự cố xảy ra.</p>
            </div>
            <div className="sos-textarea-wrap">
              <textarea
                className="sos-detail-textarea"
                maxLength={500}
                value={details}
                onChange={(event) => {
                  setDetails(event.target.value);
                  setError("");
                }}
                placeholder="Ví dụ: Phanh bên trái bị lỏng và không ăn khi bóp..."
              />
              <span className="sos-counter">{details.length} / 500</span>
            </div>
            {photos.length > 0 && (
              <>
                <h2 className="sos-section-title">Ảnh đã thêm</h2>
                <div className="sos-photo-row booking-photo-row">
                  {photos.map((photo, index) => (
                    <div className="sos-photo-thumb" key={`photo-${index}`}>
                      <Image src={photo} alt={`Ảnh sự cố ${index + 1}`} width={96} height={74} unoptimized />
                      <button type="button" onClick={() => removePhoto(index)} aria-label="Xóa ảnh">
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </div>
                  ))}
                </div>
                {photos.length < 4 && (
                  <div className="booking-add-photo-actions">
                    <button type="button" onClick={openCamera}>
                      <span className="material-symbols-outlined">photo_camera</span>
                      Chụp thêm
                    </button>
                    <button type="button" onClick={() => galleryInputRef.current?.click()}>
                      <span className="material-symbols-outlined">photo_library</span>
                      Chọn từ máy
                    </button>
                  </div>
                )}
              </>
            )}
            {error && <p className="sos-form-error">{error}</p>}
            <div className="sos-inline-actions">
              <button type="button" className="sos-ghost-btn" onClick={goBack}>Quay lại</button>
              <button type="button" className="sos-manual-submit" onClick={continueFromDetails}>Tiếp tục</button>
            </div>
          </section>
        )}

        {step === "LOCATION" && (
          <section className="sos-step-panel sos-location-select-panel">
            <div className="sos-location-select-card">
              <h2>Địa điểm sửa chữa</h2>
              <p>Địa chỉ được tự điền theo GPS. Bạn có thể chỉnh lại trước khi đặt lịch.</p>
              <button type="button" className="sos-ghost-btn" onClick={fillCurrentLocation} disabled={isLocating}>
                {isLocating ? "Đang lấy vị trí…" : "Dùng vị trí hiện tại"}
              </button>
              <div className="booking-address-form">
                <label htmlFor="booking-province">
                  <span>Tỉnh / Thành phố <b>*</b></span>
                  <div className="booking-address-input">
                    <span className="material-symbols-outlined">location_city</span>
                    <input
                      id="booking-province"
                      type="text"
                      value={province}
                      onChange={(event) => {
                        setProvince(event.target.value);
                        setError("");
                      }}
                      placeholder="Ví dụ: Thành phố Hồ Chí Minh"
                      autoComplete="address-level1"
                    />
                  </div>
                </label>
                <label htmlFor="booking-ward">
                  <span>Phường / Xã <b>*</b></span>
                  <div className="booking-address-input">
                    <span className="material-symbols-outlined">holiday_village</span>
                    <input
                      id="booking-ward"
                      type="text"
                      value={ward}
                      onChange={(event) => {
                        setWard(event.target.value);
                        setError("");
                      }}
                      placeholder="Ví dụ: Phường Bến Nghé"
                      autoComplete="address-level3"
                    />
                  </div>
                </label>
                <label htmlFor="booking-street-address">
                  <span>Số nhà – tên đường <b>*</b></span>
                  <div className="booking-address-input">
                    <span className="material-symbols-outlined">home</span>
                    <input
                      id="booking-street-address"
                      type="text"
                      value={streetAddress}
                      onChange={(event) => {
                        setStreetAddress(event.target.value);
                        setError("");
                      }}
                      placeholder="Ví dụ: 123 Nguyễn Huệ"
                      autoComplete="street-address"
                    />
                  </div>
                </label>
              </div>
              {fullAddress && (
                <div className="booking-address-preview">
                  <span className="material-symbols-outlined">pin_drop</span>
                  <div>
                    <strong>Địa chỉ sửa chữa</strong>
                    <p>{fullAddress}</p>
                  </div>
                </div>
              )}
              {location && (
                <LocationPicker
                  latitude={location.latitude}
                  longitude={location.longitude}
                  onChange={(next) => {
                    setLocation((current) => current ? { ...current, ...next } : current);
                    if (next.address) setStreetAddress(next.address);
                    if (next.ward) setWard(next.ward);
                    if (next.province) setProvince(next.province);
                  }}
                />
              )}
              {error && <p className="sos-form-error">{error}</p>}
              <div className="sos-inline-actions">
                <button type="button" className="sos-ghost-btn" onClick={goBack}>Quay lại</button>
                <button type="button" className="sos-manual-submit" onClick={continueFromLocation}>Tiếp tục</button>
              </div>
            </div>
          </section>
        )}

        {step === "SCHEDULE" && (
          <section className="sos-step-panel booking-schedule-panel">
            <div className="sos-step-head sos-step-head--left">
              <h1 className="sos-step-title">Chọn ngày sửa chữa</h1>
              <p className="sos-section-desc">Chọn ngày và khung giờ phù hợp nhất với bạn.</p>
            </div>
            <div className="booking-calendar">
              <div className="booking-calendar-header">
                <button
                  type="button"
                  aria-label="Tháng trước"
                  onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <strong>{MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}</strong>
                <button
                  type="button"
                  aria-label="Tháng sau"
                  onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
              <div className="booking-calendar-weekdays">
                {WEEKDAYS.map((day) => <span key={day}>{day}</span>)}
              </div>
              <div className="booking-calendar-grid">
                {calendarDays.map(({ date, inMonth }) => {
                  const disabled = date < today;
                  const selected = toDateKey(date) === toDateKey(selectedDate);
                  return (
                    <button
                      type="button"
                      key={toDateKey(date)}
                      disabled={disabled}
                      className={`${!inMonth ? "is-outside" : ""} ${selected ? "is-selected" : ""}`}
                      onClick={() => setSelectedDate(date)}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="booking-time-section">
              <h2>Khung giờ</h2>
              <p>Chọn thời gian nhân viên có thể đến.</p>
              {!hasAvailableSlot && (
                <p className="booking-time-empty">Đã hết khung giờ nhận đơn hôm nay, vui lòng chọn ngày khác.</p>
              )}
              {TIME_GROUPS.map((group) => (
                <div className="booking-time-group" key={group.label}>
                  <span>{group.label}</span>
                  <div className="booking-time-grid">
                    {group.slots.map((slot) => {
                      const isBooked = bookedSlots.has(slotKey(selectedDate, slot.id));
                      const disabled = isSlotDisabled(slot.id);
                      return (
                        <button
                          type="button"
                          key={slot.id}
                          disabled={disabled}
                          className={selectedTime === slot.id ? "is-selected" : ""}
                          onClick={() => setSelectedTime(slot.id)}
                        >
                          {isBooked ? `${slot.label} (đã đặt)` : slot.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="booking-summary">
              <div className="booking-summary-icon">
                <span className="material-symbols-outlined">event_available</span>
              </div>
              <div className="booking-summary-content">
                <strong>Tóm tắt lịch hẹn</strong>
                <span>{selectedIssueLabel}</span>
                <dl>
                  <div><dt>Ngày:</dt><dd>{formatDate(selectedDate)}</dd></div>
                  <div><dt>Giờ:</dt><dd>{selectedTimeLabel}</dd></div>
                  <div><dt>Địa chỉ:</dt><dd>{fullAddress}</dd></div>
                </dl>
              </div>
            </div>
            <div className="booking-assignment-note">
              <span className="material-symbols-outlined">admin_panel_settings</span>
              <p><strong>Nhân viên sửa chữa sẽ được admin phân công sau.</strong> Bạn sẽ nhận thông tin khi việc phân công hoàn tất.</p>
            </div>
            {error && <p className="sos-form-error">{error}</p>}
            <div className="sos-inline-actions">
              <button type="button" className="sos-ghost-btn" onClick={goBack}>Quay lại</button>
              <button
                type="button"
                className="sos-manual-submit"
                disabled={isSubmitting || !selectedTime || isSlotDisabled(selectedTime)}
                onClick={submitBooking}
              >
                {isSubmitting ? "Đang xác nhận..." : "Xác nhận đặt lịch"}
              </button>
            </div>
          </section>
        )}

        {step === "SUCCESS" && (
          <section className="sos-step-panel booking-success">
            <div className={`booking-success-icon ${cancelBookingSuccess ? "bg-rose-100 text-rose-600" : ""}`}>
              <span className="material-symbols-outlined">{cancelBookingSuccess ? "close" : "check"}</span>
            </div>
            <h1>{cancelBookingSuccess ? "Đã hủy lịch hẹn" : "Đặt lịch thành công!"}</h1>
            <p>
              {cancelBookingSuccess ? (
                <>Lịch hẹn <strong>#{orderCode}</strong> đã được hủy theo yêu cầu của bạn.</>
              ) : (
                <>Yêu cầu của bạn đã được ghi nhận với mã <strong>#{orderCode}</strong>.</>
              )}
            </p>
            <div className="booking-success-card">
              <div><span>Sự cố</span><strong>{selectedIssueLabel}</strong></div>
              <div><span>Thời gian</span><strong>{formatDate(selectedDate)}<br />{selectedTimeLabel}</strong></div>
              <div>
                <span>Trạng thái</span>
                <strong className={cancelBookingSuccess ? "text-rose-600 font-bold" : "booking-pending-text"}>
                  {cancelBookingSuccess ? "Đã hủy" : "Chờ admin phân công"}
                </strong>
              </div>
            </div>
            <button
              type="button"
              className="sos-manual-submit"
              onClick={() => router.push(createdRequestId ? `/home/history/${createdRequestId}` : "/home/history")}
            >
              Xem chi tiết lịch hẹn
            </button>

            {!cancelBookingSuccess && createdRequestId && (
              <button
                type="button"
                disabled={isCancellingBooking}
                className="w-full py-3 mt-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                onClick={async () => {
                  setShowCancelBookingDialog(true);
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>cancel</span>
                {isCancellingBooking ? "Đang hủy lịch hẹn..." : "Hủy lịch hẹn này"}
              </button>
            )}

            {showCancelBookingDialog && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-5" role="presentation">
                <div className="w-full max-w-[24rem] rounded-2xl bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="cancel-booking-title">
                  <h2 id="cancel-booking-title" className="text-base font-bold text-ink">Hủy lịch hẹn?</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">Bạn có chắc chắn muốn hủy lịch hẹn sửa chữa này không?</p>
                  <div className="mt-5 flex gap-3">
                    <button type="button" className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700" disabled={isCancellingBooking} onClick={() => setShowCancelBookingDialog(false)}>Không</button>
                    <button
                      type="button"
                      className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                      disabled={isCancellingBooking}
                      onClick={async () => {
                  setIsCancellingBooking(true);
                  try {
                    const { fetchApi } = await import("@/lib/api-client");
                    await fetchApi(`/repair-requests/${createdRequestId}/status`, {
                      method: "PATCH",
                      body: JSON.stringify({
                        status: "CANCELLED",
                        cancel_reason: "Khách hàng hủy ngay sau khi đặt lịch",
                      }),
                    });
                    setCancelBookingSuccess(true);
                    setShowCancelBookingDialog(false);
                  } catch (err: any) {
                    showAppNotice(err.message || "Không thể hủy lịch hẹn. Vui lòng mở trang Chi tiết lịch hẹn để thực hiện.");
                  } finally {
                    setIsCancellingBooking(false);
                  }
                }}
              >
                      {isCancellingBooking ? "Đang hủy..." : "Hủy lịch hẹn"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <button type="button" className="sos-cancel-link" onClick={() => router.push("/home")}>
              Về trang chủ
            </button>
          </section>
        )}
      </div>
    </HomeShell>
  );
}
