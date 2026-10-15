"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/* ────────────────────────────────────────────
   Slide data for E-Mobi Care
   ──────────────────────────────────────────── */
const slides = [
  {
    tag: "⚡ Nền tảng chuyên biệt xe máy điện",
    icon: "electric_moped",
    title: "Chào mừng đến với\nH-Mobility Care",
    subtitle: "Hệ sinh thái cứu hộ khẩn cấp & dịch vụ chăm sóc toàn diện cho xe máy điện số 1 Việt Nam.",
    features: ["100% Xe máy điện", "KTV chuyên nghiệp", "Hỗ trợ toàn quốc"],
    gradient: "linear-gradient(135deg, #0a2540 0%, #114567 40%, #156495 100%)",
    accentColor: "#00f2fe",
  },
  {
    tag: "🚨 Cứu hộ khẩn cấp 24/7",
    icon: "e911_emergency",
    title: "Cứu hộ SOS 24/7\nCó mặt chỉ sau vài phút",
    subtitle: "Hết pin, thủng lốp hay hỏng động cơ giữa đường? 1 chạm duy nhất, kỹ thuật viên H-Mobility Care sẽ lập tức tiếp ứng.",
    features: ["Định vị 1 chạm", "Trực chiến 24/7", "Đến tận nơi siêu tốc"],
    gradient: "linear-gradient(135deg, #4a0000 0%, #7f1d1d 40%, #b91c1c 100%)",
    accentColor: "#ff9999",
  },
  {
    tag: "🔧 Bảo dưỡng chuyên nghiệp",
    icon: "home_repair_service",
    title: "Sửa chữa & Bảo dưỡng\nChuyên sâu tận nhà",
    subtitle: "Chăm sóc khối pin, động cơ, phanh và hệ thống điện. Báo giá minh bạch, 100% linh kiện chính hãng.",
    features: ["Đặt hẹn tiện lợi", "Linh kiện chính hãng", "Minh bạch chi phí"],
    gradient: "linear-gradient(135deg, #063828 0%, #046a4e 40%, #0d9488 100%)",
    accentColor: "#5eead4",
  },
  {
    tag: "🔋 Quản lý xe & pin thông minh",
    icon: "battery_charging_full",
    title: "Chăm sóc khối pin\nAn tâm trên mọi nẻo đường",
    subtitle: "Giám sát chu kỳ pin LFP, nhắc lịch bảo dưỡng định kỳ và bảo vệ hành trình xe máy điện cùng H-Mobility Care.",
    features: ["Chuyên sâu pin LFP", "Nhắc lịch bảo dưỡng", "Bảo hành dài hạn"],
    gradient: "linear-gradient(135deg, #0f3a56 0%, #156495 40%, #4896c4 100%)",
    accentColor: "#b2d5ea",
  },
];

/* ────────────────────────────────────────────
   Floating particle component
   ──────────────────────────────────────────── */
function FloatingParticles({ color }: { color: string }) {
  return (
    <div className="onboarding-particles" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <span
          key={i}
          className="onboarding-particle"
          style={{
            "--delay": `${i * 0.7}s`,
            "--x": `${15 + i * 14}%`,
            "--size": `${4 + (i % 3) * 3}px`,
            background: color,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────
   Main Onboarding Page - E-Mobi Care
   ──────────────────────────────────────────── */
export default function OnboardingPage() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [isAnimating, setIsAnimating] = useState(false);

  const goTo = useCallback(
    (index: number) => {
      if (isAnimating || index === current) return;
      setDirection(index > current ? "next" : "prev");
      setIsAnimating(true);
      setCurrent(index);
      setTimeout(() => setIsAnimating(false), 600);
    },
    [current, isAnimating]
  );

  const next = useCallback(() => {
    if (current < slides.length - 1) {
      goTo(current + 1);
    } else {
      router.push("/login");
    }
  }, [current, goTo, router]);

  const prev = useCallback(() => {
    if (current > 0) goTo(current - 1);
  }, [current, goTo]);

  /* Swipe support */
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) next();
      else prev();
    }
    setTouchStart(null);
  };

  const slide = slides[current];
  const isLast = current === slides.length - 1;

  return (
    <div
      className="onboarding-root onboarding-root--visible"
      style={{ background: slide.gradient }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <FloatingParticles color={slide.accentColor} />

      <div className="onboarding-ring onboarding-ring--1" aria-hidden="true" />
      <div className="onboarding-ring onboarding-ring--2" aria-hidden="true" />

      <header className="onboarding-top-bar">
        <div className="onboarding-brand-badge">
          <div className="onboarding-brand-icon-wrap">
            <span className="material-symbols-outlined onboarding-brand-icon">bolt</span>
          </div>
          <span className="onboarding-brand-text">H-Mobility Care</span>
        </div>

        {!isLast && (
          <Link href="/login" className="onboarding-skip">
            Bỏ qua
          </Link>
        )}
      </header>

      <main className="onboarding-content">
        <div
          className={`onboarding-icon-wrap ${isAnimating
              ? direction === "next"
                ? "onboarding-slide-enter-next"
                : "onboarding-slide-enter-prev"
              : ""
            }`}
          key={`icon-${current}`}
        >
          <div
            className="onboarding-icon-circle"
            style={{ boxShadow: `0 0 60px ${slide.accentColor}45` }}
          >
            <span
              className="material-symbols-outlined onboarding-icon"
              style={{ color: slide.accentColor }}
            >
              {slide.icon}
            </span>
          </div>
        </div>

        <div
          className={`onboarding-text ${isAnimating
              ? direction === "next"
                ? "onboarding-slide-enter-next"
                : "onboarding-slide-enter-prev"
              : ""
            }`}
          key={`text-${current}`}
        >
          <div
            className="onboarding-tag-chip"
            style={{ color: slide.accentColor, borderColor: `${slide.accentColor}40` }}
          >
            <span>{slide.tag}</span>
          </div>

          <h1 className="onboarding-title">
            {slide.title.split("\n").map((line, i) => (
              <React.Fragment key={i}>
                {i > 0 && <br />}
                {line}
              </React.Fragment>
            ))}
          </h1>
          <p className="onboarding-subtitle">{slide.subtitle}</p>

          <div className="onboarding-features-row">
            {slide.features.map((feat, idx) => (
              <span key={idx} className="onboarding-feature-pill">
                <span
                  className="material-symbols-outlined"
                  style={{ color: slide.accentColor }}
                >
                  check_circle
                </span>
                {feat}
              </span>
            ))}
          </div>
        </div>
      </main>

      <footer className="onboarding-bottom">
        <div className="onboarding-dots">
          {slides.map((_, i) => (
            <button
              key={i}
              className={`onboarding-dot ${i === current ? "onboarding-dot--active" : ""}`}
              onClick={() => goTo(i)}
              aria-label={`Trang ${i + 1}`}
              style={
                i === current
                  ? { background: slide.accentColor, boxShadow: `0 0 12px ${slide.accentColor}80` }
                  : undefined
              }
            />
          ))}
        </div>

        <Link
          href="/login"
          className="onboarding-cta"
          onClick={(e) => {
            if (!isLast) {
              e.preventDefault();
              next();
            }
          }}
        >
          <span className="onboarding-cta-text">
            {isLast ? "Bắt đầu cùng H-Mobility Care" : "Tiếp tục"}
          </span>
          <span className="material-symbols-outlined onboarding-cta-arrow">
            {isLast ? "arrow_forward" : "arrow_forward"}
          </span>
        </Link>

        <p className="onboarding-login-hint">
          Đã có tài khoản?{" "}
          <Link href="/login" className="onboarding-login-link">
            Đăng nhập
          </Link>
        </p>
      </footer>
    </div>
  );
}
