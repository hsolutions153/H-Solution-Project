"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/* ────────────────────────────────────────────
   Slide data
   ──────────────────────────────────────────── */
const slides = [
  {
    icon: "accessible",
    title: "Chào mừng đến với\nH-solutions",
    subtitle: "Hệ thống sửa chữa xe lăn thông minh & xe ga tốc độ thấp",
    gradient: "linear-gradient(135deg, #004e9f 0%, #0066cc 40%, #0088ff 100%)",
    accentColor: "#7af2f2",
  },
  {
    icon: "build",
    title: "Đặt lịch sửa chữa\nnhanh chóng",
    subtitle: "Chỉ cần vài bước đơn giản, kỹ thuật viên sẽ đến tận nơi hỗ trợ bạn",
    gradient: "linear-gradient(135deg, #005c5c 0%, #006a6a 40%, #008888 100%)",
    accentColor: "#aac7ff",
  },
  {
    icon: "sos",
    title: "SOS khẩn cấp\n1 chạm",
    subtitle: "Kết nối ngay với đội ngũ hỗ trợ trong tình huống khẩn cấp",
    gradient: "linear-gradient(135deg, #8b1a1a 0%, #c62828 40%, #ef5350 100%)",
    accentColor: "#ffdad6",
  },
  {
    icon: "monitoring",
    title: "Theo dõi\ntình trạng xe",
    subtitle: "Giám sát pin, vị trí và lịch sử bảo trì xe lăn của bạn",
    gradient: "linear-gradient(135deg, #1a237e 0%, #283593 40%, #3f51b5 100%)",
    accentColor: "#d7e3ff",
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
   Main Onboarding Page
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
      {/* Floating particles */}
      <FloatingParticles color={slide.accentColor} />

      {/* Decorative rings */}
      <div className="onboarding-ring onboarding-ring--1" aria-hidden="true" />
      <div className="onboarding-ring onboarding-ring--2" aria-hidden="true" />

      {/* Skip button */}
      {!isLast && (
        <Link
          href="/login"
          className="onboarding-skip"
        >
          Bỏ qua
        </Link>
      )}

      {/* ── Main content ── */}
      <div className="onboarding-content">
        {/* Icon badge */}
        <div
          className={`onboarding-icon-wrap ${
            isAnimating
              ? direction === "next"
                ? "onboarding-slide-enter-next"
                : "onboarding-slide-enter-prev"
              : ""
          }`}
          key={`icon-${current}`}
        >
          <div
            className="onboarding-icon-circle"
            style={{ boxShadow: `0 0 60px ${slide.accentColor}40` }}
          >
            <span
              className="material-symbols-outlined onboarding-icon"
              style={{ color: slide.accentColor }}
            >
              {slide.icon}
            </span>
          </div>
        </div>

        {/* Text */}
        <div
          className={`onboarding-text ${
            isAnimating
              ? direction === "next"
                ? "onboarding-slide-enter-next"
                : "onboarding-slide-enter-prev"
              : ""
          }`}
          key={`text-${current}`}
        >
          <h1 className="onboarding-title">
            {slide.title.split("\n").map((line, i) => (
              <React.Fragment key={i}>
                {i > 0 && <br />}
                {line}
              </React.Fragment>
            ))}
          </h1>
          <p className="onboarding-subtitle">{slide.subtitle}</p>
        </div>
      </div>

      {/* ── Bottom controls ── */}
      <div className="onboarding-bottom">
        {/* Dot indicators */}
        <div className="onboarding-dots">
          {slides.map((_, i) => (
            <button
              key={i}
              className={`onboarding-dot ${i === current ? "onboarding-dot--active" : ""}`}
              onClick={() => goTo(i)}
              aria-label={`Trang ${i + 1}`}
              style={
                i === current
                  ? { background: slide.accentColor }
                  : undefined
              }
            />
          ))}
        </div>

        {/* CTA Button */}
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
            {isLast ? "Bắt đầu ngay" : "Tiếp tục"}
          </span>
          <span className="material-symbols-outlined onboarding-cta-arrow">
            {isLast ? "login" : "arrow_forward"}
          </span>
        </Link>

        {/* Already have account */}
        <p className="onboarding-login-hint">
          Đã có tài khoản?{" "}
          <Link
            href="/login"
            className="onboarding-login-link"
          >
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
