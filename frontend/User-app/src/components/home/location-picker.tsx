"use client";

import { useEffect, useRef, useState } from "react";

interface LocationPickerProps {
  latitude: number;
  longitude: number;
  onChange: (location: { latitude: number; longitude: number; address?: string; ward?: string; province?: string }) => void;
}

export function LocationPicker({ latitude, longitude, onChange }: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { fetchApi } = await import("@/lib/api-client");
      const tokenResponse = await fetchApi<{ access_token: string }>("/repair-requests/map-token");
      if (cancelled || !containerRef.current) return;

      if (!document.getElementById("user-mapbox-gl-css")) {
        const css = document.createElement("link");
        css.id = "user-mapbox-gl-css";
        css.rel = "stylesheet";
        css.href = "https://api.mapbox.com/mapbox-gl-js/v3.33.0/mapbox-gl.css";
        document.head.appendChild(css);
      }
      const existing = (window as any).mapboxgl;
      if (!existing) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://api.mapbox.com/mapbox-gl-js/v3.33.0/mapbox-gl.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Không thể tải bản đồ."));
          document.head.appendChild(script);
        });
      }
      const mapbox = (window as any).mapboxgl;
      mapbox.accessToken = tokenResponse.access_token;
      const map = new mapbox.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [longitude, latitude],
        zoom: 15,
      });
      map.addControl(new mapbox.NavigationControl(), "top-right");
      const marker = new mapbox.Marker({ color: "#0f75ad", draggable: true })
        .setLngLat([longitude, latitude])
        .addTo(map);
      const update = async (lngLat: any) => {
        const nextLat = Number(lngLat.lat);
        const nextLng = Number(lngLat.lng);
        try {
          const address = await fetchApi<any>(`/repair-requests/reverse-geocode?latitude=${nextLat}&longitude=${nextLng}`);
          onChangeRef.current({ latitude: nextLat, longitude: nextLng, ...address });
        } catch {
          onChangeRef.current({ latitude: nextLat, longitude: nextLng });
        }
      };
      marker.on("dragend", () => update(marker.getLngLat()));
      map.on("click", (event: any) => {
        marker.setLngLat(event.lngLat);
        void update(event.lngLat);
      });
      mapRef.current = map;
      markerRef.current = marker;
      setReady(true);
    };
    load().catch(() => undefined);
    return () => {
      cancelled = true;
      markerRef.current?.remove();
      mapRef.current?.remove();
      markerRef.current = null;
      mapRef.current = null;
    };
    // Khởi tạo bản đồ Mapbox 1 lần duy nhất khi mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
      <div ref={containerRef} className="h-56 w-full" aria-label="Bản đồ chọn vị trí sửa chữa" />
      <p className="px-3 py-2 text-xs text-slate-600">{ready ? "Chạm vào bản đồ hoặc kéo ghim để chọn vị trí chính xác." : "Đang tải bản đồ…"}</p>
    </div>
  );
}
