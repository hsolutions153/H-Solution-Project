"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { HomeShell } from "@/components/home/home-shell";

export default function HomePage() {
  const router = useRouter();
  const [device, setDevice] = useState<{
    name: string;
    model: string;
    image: string;
  } | null>(null);

  useEffect(() => {
    async function loadPrimaryDevice() {
      try {
        const { fetchApi } = await import("@/lib/api-client");
        const list = await fetchApi<any[]>("/devices");
        if (Array.isArray(list) && list.length > 0) {
          const item = list.find((d: any) => d.is_default) || list[0];
          const hasCustomNotes = item.notes && !item.notes.includes(":") && item.notes.length < 50;
          const brand = item.manufacturer && item.manufacturer !== "Generic" ? item.manufacturer : "";
          const modelName = item.model_name || item.model || "";

          // Tên thiết bị (Tên gợi nhớ độc lập, không tự động ghép model vào tên)
          let displayName = item.nickname || item.name || (hasCustomNotes ? item.notes : "");
          if (!displayName) {
            displayName = "Xe máy điện";
          }

          setDevice({
            name: displayName,
            model: modelName || "Xe máy điện",
            image: item.image_url || "/electric-scooter.jpg",
          });
        }
      } catch {}
    }
    loadPrimaryDevice();
  }, []);

  return (
    <HomeShell activeNav="home" mainClassName="home-content--dashboard">
      <div className="home-col-left">
        {/* SOS Section */}
        <section className="sos-section">
          <div className="sos-outer">
            <button
              className="sos-button"
              onClick={() => router.push("/home/sos")}
              aria-label="Nút gọi trợ giúp khẩn cấp SOS"
            >
              <div className="sos-icon">
                {/* Medical asterisk */}
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="20" y="4" width="8" height="40" rx="4" fill="white"/>
                  <rect x="4" y="20" width="40" height="8" rx="4" fill="white"/>
                  <rect x="8.69" y="13.03" width="8" height="30" rx="4" transform="rotate(-45 8.69 13.03)" fill="white"/>
                  <rect x="13.03" y="34.24" width="8" height="30" rx="4" transform="rotate(-135 13.03 34.24)" fill="white"/>
                </svg>
              </div>
              <span className="sos-text">SOS</span>
              <span className="sos-subtext">TRỢ GIÚP 1 CHẠM</span>
            </button>
          </div>
          <p className="sos-hint">Chạm để nhận trợ giúp khẩn cấp</p>
        </section>

        {/* Status Card */}
        <section className="status-card">
          <div className="status-icon">
            <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M16 3L5.5 7.2V14.8C5.5 21.3 9.9 26.8 16 29C22.1 26.8 26.5 21.3 26.5 14.8V7.2L16 3Z" fill="#00607D"/>
              <path d="M11.5 15.8L14.6 18.9L20.9 12.6" stroke="#A7E7EF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="status-info">
            <span className="status-title">Tất cả hệ thống hoạt động bình thường</span>
            <span className="status-subtitle">Kiểm tra gần nhất: 12/05/2026</span>
          </div>
        </section>
      </div>

      <div className="home-col-right">
        {/* Book Repair Button */}
        <button className="book-repair-btn" onClick={() => router.push("/home/booking")}>
          <div className="book-repair-left">
            <span className="material-symbols-outlined book-repair-icon">business_center</span>
            <span className="book-repair-text">Đặt lịch sửa chữa</span>
          </div>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8.59 16.59L13.17 12L8.59 7.41L10 6L16 12L10 18L8.59 16.59Z" fill="white"/>
          </svg>
        </button>

        {/* My Vehicle Card */}
        {device ? (
          <section className="chair-card" onClick={() => router.push("/home/device")} style={{ cursor: "pointer" }}>
            <div className="chair-card-image">
              <Image
                src={device.image || "/electric-scooter.jpg"}
                alt={device.name || "Xe máy điện của tôi"}
                width={1024}
                height={1024}
                unoptimized
              />
              <div className="chair-label">
                <span className="chair-name">{device.name}</span>
                <span className="chair-model">{device.model}</span>
              </div>
            </div>
            <div className="chair-card-info">
              <div className="battery-section">
                <div className="battery-icon-row">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15.67 4H14V2H10V4H8.33C7.6 4 7 4.6 7 5.33V20.67C7 21.4 7.6 22 8.33 22H15.67C16.4 22 17 21.4 17 20.67V5.33C17 4.6 16.4 4 15.67 4Z" fill="#0D2137"/>
                  </svg>
                  <span className="battery-percent">82%</span>
                </div>
                <span className="battery-label">Pin</span>
                <span className="battery-range">Còn khoảng 19 km</span>
              </div>
            </div>
          </section>
        ) : (
          <section
            className="chair-card"
            onClick={() => router.push("/home/device/new")}
            style={{
              cursor: "pointer",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              border: "1.5px dashed #b8dbe5",
              background: "#f7fbfc",
              borderRadius: "16px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: "15px", fontWeight: 700, color: "#113e50" }}>
                Chưa có phương tiện
              </span>
              <span style={{ fontSize: "12px", color: "#6f828a" }}>
                Đăng ký xe máy điện để theo dõi &amp; nhận hỗ trợ cứu hộ
              </span>
            </div>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "8px 14px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #077da1, #05678a)",
                color: "white",
                fontSize: "12px",
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              + Thêm xe
            </span>
          </section>
        )}

        {/* Repair History */}
        <button className="repair-history-btn" onClick={() => router.push("/home/history")}>
          <div className="repair-history-left">
            <span className="material-symbols-outlined repair-history-icon">history</span>
            <span className="repair-history-text">Lịch sử sửa chữa</span>
          </div>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 5L21 12L14 19" stroke="#0D2137" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </HomeShell>
  );
}
