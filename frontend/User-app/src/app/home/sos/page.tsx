"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { fileToStoredImage } from "@/utils/image-data";

type SosStep = "PROBLEM" | "DETAILS" | "CAMERA" | "LOCATION" | "CALLING" | "TECHNICIAN";
type SosIssue = "battery" | "controller" | "wheel" | "motor" | "frame" | "other";

const ISSUE_OPTIONS: Array<{ id: SosIssue; label: string; icon: string }> = [
  { id: "battery", label: "Pin", icon: "battery_alert" },
  { id: "controller", label: "Bộ điều khiển", icon: "tune" },
  { id: "wheel", label: "Bánh xe", icon: "tire_repair" },
  { id: "motor", label: "Động cơ", icon: "bolt" },
  { id: "frame", label: "Khung/Phanh", icon: "do_not_disturb_on" },
  { id: "other", label: "Khác", icon: "build_circle" },
];

export default function SosPage() {
  const router = useRouter();
  const [step, setStep] = useState<SosStep>("PROBLEM");

  const [selectedIssue, setSelectedIssue] = useState<SosIssue | null>(null);
  const [problemDetails, setProblemDetails] = useState("");
  const [province, setProvince] = useState("");
  const [ward, setWard] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [uploadedPhotos, setUploadedPhotos] = useState<File[]>([]);
  const [formError, setFormError] = useState("");
  const [cameraFlash, setCameraFlash] = useState(false);

  const [connectingDots, setConnectingDots] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected">("connecting");
  const [smsStatus, setSmsStatus] = useState<"pending" | "sending" | "sent">("pending");
  const [technicianEta, setTechnicianEta] = useState("~8 phút");

  const dotsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoPreviewsRef = useRef<string[]>([]);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  useEffect(() => {
    if (step === "CALLING") {
      dotsTimerRef.current = setInterval(() => {
        setConnectingDots((prev) => (prev.length >= 3 ? "" : `${prev}.`));
      }, 500);

      const smsTimer = setTimeout(() => setSmsStatus("sending"), 2000);
      const smsSentTimer = setTimeout(() => setSmsStatus("sent"), 4000);
      const connectTimer = setTimeout(() => setConnectionStatus("connected"), 5000);
      const moveToTechnicianTimer = setTimeout(() => setStep("TECHNICIAN"), 7000);

      return () => {
        if (dotsTimerRef.current) clearInterval(dotsTimerRef.current);
        clearTimeout(smsTimer);
        clearTimeout(smsSentTimer);
        clearTimeout(connectTimer);
        clearTimeout(moveToTechnicianTimer);
      };
    }

    return () => {
      if (dotsTimerRef.current) clearInterval(dotsTimerRef.current);
    };
  }, [step]);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
  }, []);

  const stopCamera = (resetReady = true) => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (resetReady) setCameraReady(false);
  };

  useEffect(() => {
    if (step !== "CAMERA") return;

    let cancelled = false;

    const startCamera = async () => {
      setCameraError("");

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Thiết bị này không hỗ trợ camera. Hãy chọn ảnh từ thư viện.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraReady(true);
        }
      } catch {
        setCameraError("Không thể truy cập camera. Vui lòng cấp quyền hoặc chọn ảnh từ thư viện.");
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      stopCamera(false);
    };
  }, [step]);

  useEffect(() => {
    photoPreviewsRef.current = photoPreviews;
  }, [photoPreviews]);

  useEffect(() => {
    return () => {
      photoPreviewsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const addPhoto = (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setUploadedPhotos((prev) => [...prev, file].slice(0, 4));
    setPhotoPreviews((prev) => {
      const next = [...prev, previewUrl];
      if (next.length > 4) {
        next.slice(0, next.length - 4).forEach((url) => URL.revokeObjectURL(url));
      }
      return next.slice(0, 4);
    });
  };

  const removePhoto = (index: number) => {
    setPhotoPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
    setUploadedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSelectIssue = (issue: SosIssue) => {
    setSelectedIssue(issue);
    setFormError("");
  };

  const handleContinueFromProblem = () => {
    if (!selectedIssue) {
      setFormError("Vui lòng chọn một nhóm sự cố để tiếp tục.");
      return;
    }
    setFormError("");
    setStep("CAMERA");
  };

  const handleContinueFromDetails = () => {
    if (problemDetails.trim().length < 10) {
      setFormError("Vui lòng mô tả sự cố ít nhất 10 ký tự.");
      return;
    }
    setFormError("");
    setStep("LOCATION");
  };

  const handleCaptureFromCamera = () => {
    const video = videoRef.current;
    if (!video || !cameraReady || video.videoWidth === 0) {
      setFormError("Camera chưa sẵn sàng. Vui lòng chờ hoặc chọn ảnh từ thư viện.");
      return;
    }

    setFormError("");
    setCameraFlash(true);

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setCameraFlash(false);
      return;
    }

    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraFlash(false);
          return;
        }

        const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
        addPhoto(file);

        transitionTimerRef.current = setTimeout(() => {
          setCameraFlash(false);
          setStep("DETAILS");
        }, 220);
      },
      "image/jpeg",
      0.92
    );
  };

  const handleLibrarySelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    files.forEach((file) => {
      if (file.type.startsWith("image/")) {
        addPhoto(file);
      }
    });
    event.target.value = "";
    if (files.length > 0) {
      setStep("DETAILS");
    }
  };

  const handleContinueFromLocation = async () => {
    if (!province.trim() || !ward.trim() || !streetAddress.trim()) {
      setFormError("Vui lòng nhập đầy đủ tỉnh/thành phố, phường/xã và số nhà – tên đường.");
      return;
    }

    setFormError("");
    setConnectionStatus("connecting");
    setSmsStatus("pending");
    setConnectingDots("");
    setTechnicianEta("~8 phút");
    setStep("CALLING");

    try {
      const images = await Promise.all(uploadedPhotos.map(fileToStoredImage));
      await fetch("/api/sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: selectedIssue,
          details: problemDetails,
          address: [streetAddress.trim(), ward.trim(), province.trim()].join(", "),
          locationMethod: "manual",
          images,
        }),
      });
    } catch (err) {
      console.error("Failed to register SOS request", err);
    }
  };

  const handleCancel = () => {
    router.push("/home");
  };

  const selectedIssueLabel = ISSUE_OPTIONS.find((issue) => issue.id === selectedIssue)?.label || "Chưa xác định";
  const canContinueDetails = problemDetails.trim().length >= 10;
  const fullAddress = [streetAddress.trim(), ward.trim(), province.trim()].filter(Boolean).join(", ");
  const canContinueLocation = Boolean(province.trim() && ward.trim() && streetAddress.trim());

  return (
    <div className="sos-flow-page">
      <header className="sos-flow-header">
        <div className="sos-flow-header-main">
          <button type="button" className="sos-flow-back-btn" onClick={handleCancel} aria-label="Quay về trang chủ">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="sos-flow-logo">
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="3" fill="#0D2137" />
              <line x1="14" y1="2" x2="14" y2="26" stroke="#0D2137" strokeWidth="2" strokeLinecap="round" />
              <line x1="2" y1="14" x2="26" y2="14" stroke="#0D2137" strokeWidth="2" strokeLinecap="round" />
              <line x1="5.5" y1="5.5" x2="22.5" y2="22.5" stroke="#0D2137" strokeWidth="2" strokeLinecap="round" />
              <line x1="22.5" y1="5.5" x2="5.5" y2="22.5" stroke="#0D2137" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="sos-flow-logo-text">GLACIER</span>
          </div>
        </div>
        {(step === "CALLING" || step === "TECHNICIAN") && (
          <div className="sos-flow-header-badge">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>emergency</span>
            SOS
          </div>
        )}
      </header>

      {step === "PROBLEM" && (
        <section className="sos-step-panel">
          <div className="sos-step-head">
            <p className="sos-step-kicker">CHỌN SỰ CỐ</p>
            <h1 className="sos-step-title">Xe của bạn đang gặp vấn đề gì?</h1>
          </div>

          <div className="sos-issue-grid">
            {ISSUE_OPTIONS.map((issue) => (
              <button
                key={issue.id}
                type="button"
                className={`sos-issue-card ${selectedIssue === issue.id ? "sos-issue-card--active" : ""}`}
                onClick={() => handleSelectIssue(issue.id)}
              >
                <span className="material-symbols-outlined">{issue.icon}</span>
                <span>{issue.label}</span>
              </button>
            ))}
          </div>

          {formError && <p className="sos-form-error">{formError}</p>}
          <p className="sos-step-note">Chọn một nhóm sự cố để tiếp tục.</p>
          <button className="sos-manual-submit" onClick={handleContinueFromProblem}>Tiếp tục</button>
        </section>
      )}

      {step === "DETAILS" && (
        <section className="sos-step-panel">
          <div className="sos-step-head sos-step-head--left">
            <h2 className="sos-section-title">Chi tiết sự cố</h2>
            <p className="sos-section-desc">
              Hãy mô tả tình trạng xe để kỹ thuật viên chuẩn bị đúng linh kiện.
            </p>
          </div>

          <div className="sos-textarea-wrap">
            <textarea
              className="sos-detail-textarea"
              maxLength={500}
              value={problemDetails}
              onChange={(e) => {
                setProblemDetails(e.target.value);
                setFormError("");
              }}
              placeholder="Ví dụ: Tay phanh bên trái bị lỏng và không ăn khi bóp..."
            />
            <span className="sos-counter">{problemDetails.length} / 500</span>
          </div>

          <h2 className="sos-section-title">Ảnh đã chụp</h2>
          <p className="sos-section-desc">Ảnh sẽ được chia sẻ bảo mật với kỹ thuật viên được phân công.</p>

          <div className="sos-photo-row">
            <button type="button" className="sos-photo-add" onClick={() => setStep("CAMERA")}>
              <span className="material-symbols-outlined">add_a_photo</span>
              Thêm ảnh
            </button>

            {photoPreviews.slice(0, 2).map((preview, index) => (
              <div className="sos-photo-thumb" key={`${preview}-${index}`}>
                <Image src={preview} alt="Ảnh sự cố" width={96} height={74} unoptimized />
                <button type="button" onClick={() => removePhoto(index)}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            ))}

            <div className="sos-photo-empty">
              <span className="material-symbols-outlined">image</span>
            </div>
          </div>

          <div className="sos-tip-box">
            Mô tả và hình ảnh của bạn chỉ được chia sẻ bảo mật với kỹ thuật viên được phân công.
          </div>

          {formError && <p className="sos-form-error">{formError}</p>}
          <div className="sos-inline-actions">
            <button type="button" className="sos-ghost-btn" onClick={() => setStep("CAMERA")}>Quay lại</button>
            <button type="button" className="sos-manual-submit" disabled={!canContinueDetails} onClick={handleContinueFromDetails}>
              Tiếp tục
            </button>
          </div>
        </section>
      )}

      {step === "CAMERA" && (
        <section className="sos-step-panel sos-camera-panel">
          {cameraFlash && <div className="sos-camera-flash" />}
          <h2 className="sos-camera-title">Chụp ảnh tình trạng xe</h2>
          <p className="sos-camera-desc">Hãy chụp khu vực cần sửa để chúng tôi hỗ trợ bạn tốt nhất.</p>

          <div className="sos-camera-frame">
            <video
              ref={videoRef}
              className="sos-camera-video"
              autoPlay
              playsInline
              muted
            />
            {!cameraReady && (
              <Image
                src="/wheelchair.png"
                alt="camera fallback"
                fill
                sizes="(max-width: 480px) 100vw, 480px"
                className="sos-camera-fallback"
              />
            )}
            <div className="sos-camera-focus" />
            <button type="button" className="sos-camera-mute" aria-label="Tắt micrô">
              <span className="material-symbols-outlined">mic_off</span>
            </button>
            {cameraError && (
              <div className="sos-camera-error">
                <span className="material-symbols-outlined">videocam_off</span>
                <p>{cameraError}</p>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="sos-camera-file-input"
            onChange={handleLibrarySelect}
          />

          <div className="sos-camera-actions">
            <button
              type="button"
              className="sos-camera-side-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              Thư viện
            </button>
            <button
              type="button"
              className="sos-camera-capture"
              onClick={handleCaptureFromCamera}
              disabled={!cameraReady}
              aria-label="Chụp ảnh"
            >
              <span className="material-symbols-outlined">photo_camera</span>
            </button>
            <button type="button" className="sos-camera-side-btn" onClick={() => setStep("DETAILS")}>Bỏ qua</button>
          </div>
        </section>
      )}

      {step === "LOCATION" && (
        <section className="sos-step-panel sos-location-select-panel">
          <div className="sos-location-select-card">
            <h2>Địa điểm cần hỗ trợ</h2>
            <p>Nhập đầy đủ địa chỉ để nhân viên SOS có thể đến đúng nơi.</p>

            <div className="booking-address-form">
              <label htmlFor="sos-province">
                <span>Tỉnh / Thành phố <b>*</b></span>
                <div className="booking-address-input">
                  <span className="material-symbols-outlined">location_city</span>
                  <input
                    id="sos-province"
                    type="text"
                    value={province}
                    onChange={(event) => {
                      setProvince(event.target.value);
                      setFormError("");
                    }}
                    placeholder="Ví dụ: Thành phố Hồ Chí Minh"
                    autoComplete="address-level1"
                    autoFocus
                  />
                </div>
              </label>
              <label htmlFor="sos-ward">
                <span>Phường / Xã <b>*</b></span>
                <div className="booking-address-input">
                  <span className="material-symbols-outlined">holiday_village</span>
                  <input
                    id="sos-ward"
                    type="text"
                    value={ward}
                    onChange={(event) => {
                      setWard(event.target.value);
                      setFormError("");
                    }}
                    placeholder="Ví dụ: Phường Bến Nghé"
                    autoComplete="address-level3"
                  />
                </div>
              </label>
              <label htmlFor="sos-street-address">
                <span>Số nhà – tên đường <b>*</b></span>
                <div className="booking-address-input">
                  <span className="material-symbols-outlined">home</span>
                  <input
                    id="sos-street-address"
                    type="text"
                    value={streetAddress}
                    onChange={(event) => {
                      setStreetAddress(event.target.value);
                      setFormError("");
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
                  <strong>Địa chỉ hỗ trợ SOS</strong>
                  <p>{fullAddress}</p>
                </div>
              </div>
            )}

            {formError && <p className="sos-form-error">{formError}</p>}

            <button className="sos-manual-submit" disabled={!canContinueLocation} onClick={handleContinueFromLocation}>
              Tiếp tục
            </button>

            <button className="sos-cancel-link" onClick={handleCancel}>
              Hủy yêu cầu khẩn cấp
            </button>
          </div>
        </section>
      )}

      {step === "CALLING" && (
        <section className="sos-calling-step">
          <div className="sos-signal-container">
            <div className="sos-signal-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="#1565C0">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
            </div>
          </div>

          <h2 className="sos-calling-title">Đang gọi cứu hộ{connectingDots}</h2>
          <p className="sos-calling-desc">Địa chỉ của bạn đã được xác nhận.</p>

          <div className="sos-status-cards">
            <div className={`sos-status-card sos-status-card--connection ${connectionStatus === "connected" ? "sos-status-card--done" : ""}`}>
              <div className="sos-status-card-icon">
                <span className="material-symbols-outlined">bolt</span>
              </div>
              <div>
                <div className="sos-status-card-label">ĐANG KẾT NỐI</div>
                <div className="sos-status-card-text">Đang gọi trung tâm hỗ trợ gần nhất...</div>
              </div>
            </div>

            <div className={`sos-status-card sos-status-card--sms ${smsStatus === "sent" ? "sos-status-card--done" : ""}`}>
              <div className="sos-status-card-icon">
                <span className="material-symbols-outlined">sms</span>
              </div>
              <div>
                <div className="sos-status-card-label">THÔNG BÁO</div>
                <div className="sos-status-card-text">Chúng tôi đang gửi tin nhắn SMS xác nhận.</div>
              </div>
            </div>
          </div>

          <button className="sos-cancel-btn" onClick={handleCancel}>
            <span className="material-symbols-outlined">cancel</span>
            Hủy yêu cầu
          </button>

          <div className="sos-location-card">
            <h3 className="sos-location-card-title">
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>location_on</span>
              Địa chỉ của bạn
            </h3>
            <div className="sos-map-container">
              <div className="sos-map-mock">
                <Image
                  src="/wheelchair.png"
                  alt="location preview"
                  width={420}
                  height={150}
                  className="sos-location-preview-img"
                />
              </div>
              <div className="sos-map-address-badge">
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#1565C0" }}>place</span>
                <span>{fullAddress}</span>
              </div>
            </div>
          </div>

          <div className="sos-safety-section">
            <h3 className="sos-safety-title">
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#1565C0" }}>shield</span>
              Hướng dẫn an toàn
            </h3>
            <ul className="sos-safety-list">
              <li>
                <span className="material-symbols-outlined sos-safety-check">check_circle</span>
                Di chuyển xe vào lề đường hoặc vị trí an toàn nhất có thể.
              </li>
              <li>
                <span className="material-symbols-outlined sos-safety-check">check_circle</span>
                Bật đèn cảnh báo nguy hiểm nếu có.
              </li>
              <li>
                <span className="material-symbols-outlined sos-safety-check">check_circle</span>
                Giữ điện thoại luôn bật để nhận cuộc gọi từ dịch vụ cứu hộ.
              </li>
            </ul>
          </div>

          <div className="sos-bottom-info">
            <div className="sos-info-item">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>battery_5_bar</span>
              Pin: 85%
            </div>
            <div className="sos-info-item">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>signal_cellular_alt</span>
              Sóng: Tốt
            </div>
          </div>
        </section>
      )}

      {step === "TECHNICIAN" && (
        <section className="sos-step-panel sos-tech-panel">
          <div className="sos-tech-found">ĐÃ TÌM THẤY KỸ THUẬT VIÊN</div>
          <h2 className="sos-tech-title">Kỹ thuật viên đang chờ bạn xác nhận</h2>

          <article className="sos-tech-card">
            <div className="sos-tech-avatar">
              <span className="material-symbols-outlined">person</span>
            </div>
            <h3>Nguyễn Văn A</h3>
            <p>Chuyên gia bảo trì xe lăn điện</p>

            <div className="sos-tech-meta">
              <span>4.9 (128 reviews)</span>
              <span>Đã xác minh</span>
            </div>

            <div className="sos-tech-stats">
              <div>
                <span>KINH NGHIỆM</span>
                <strong>8 năm</strong>
              </div>
              <div>
                <span>KHOẢNG CÁCH</span>
                <strong>1.2 km</strong>
              </div>
              <div>
                <span>THỜI GIAN</span>
                <strong>{technicianEta}</strong>
              </div>
            </div>
          </article>

          <div className="sos-tech-issue-card">
            <Image src="/wheelchair.png" alt="issue" width={48} height={48} />
            <div>
              <strong>Sự cố {selectedIssueLabel.toLowerCase()}</strong>
              <p>Hệ thống đã ghi nhận sự cố và chuyển thông tin cho kỹ thuật viên.</p>
            </div>
          </div>

          <div className="sos-tech-actions">
            <button type="button" className="sos-tech-decline" onClick={handleCancel}>Từ chối</button>
            <button type="button" className="sos-tech-confirm" onClick={() => router.push("/home/history")}>Xác nhận</button>
          </div>
        </section>
      )}
    </div>
  );
}
