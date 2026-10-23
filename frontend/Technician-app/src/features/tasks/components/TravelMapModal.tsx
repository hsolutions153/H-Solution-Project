"use client";

import React, { useEffect, useRef, useState } from "react";
import { Task, TaskStatus } from "@/types/task";
import { X, CirclePlay, MapPin, CheckCircle2, Phone, Stethoscope } from "lucide-react";
import { Button, StatusBadge } from "@h-mobility/ui";
import { getCachedPresence } from "@/lib/presence";

declare global {
  interface Window {
    mapboxgl?: any;
  }
}

interface TravelModalProps {
  task: Task;
  onClose: () => void;
  onStatusChange: (taskId: string, status: TaskStatus, statusText: string, backendStatus?: string) => void;
}

interface RouteData {
  distance_meters: number;
  duration_seconds: number;
  geometry: [number, number][];
  origin: [number, number];
  destination: [number, number];
}

const STATUS_LABEL: Partial<Record<TaskStatus, string>> = {
  WAITING_MOVE: "Chờ di chuyển",
  MOVING: "Đang di chuyển",
  ARRIVED: "Đã đến nơi",
};

function loadMapboxGL(): Promise<any> {
  if (window.mapboxgl) return Promise.resolve(window.mapboxgl);
  return new Promise((resolve, reject) => {
    const existing = document.getElementById("mapbox-gl-script") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(window.mapboxgl), { once: true });
      existing.addEventListener("error", () => reject(new Error("Không thể tải Mapbox.")), { once: true });
      return;
    }
    if (!document.getElementById("mapbox-gl-css")) {
      const stylesheet = document.createElement("link");
      stylesheet.id = "mapbox-gl-css";
      stylesheet.rel = "stylesheet";
      stylesheet.href = "https://api.mapbox.com/mapbox-gl-js/v3.33.0/mapbox-gl.css";
      document.head.appendChild(stylesheet);
    }
    const script = document.createElement("script");
    script.id = "mapbox-gl-script";
    script.src = "https://api.mapbox.com/mapbox-gl-js/v3.33.0/mapbox-gl.js";
    script.async = true;
    script.onload = () => resolve(window.mapboxgl);
    script.onerror = () => reject(new Error("Không thể tải Mapbox."));
    document.head.appendChild(script);
  });
}

function buildStaticMapUrl(token: string, route: RouteData): string {
  const [originLng, originLat] = route.origin;
  const [destinationLng, destinationLat] = route.destination;
  const markers = `pin-s-a+1976ad(${originLng},${originLat}),pin-s-b+e11d48(${destinationLng},${destinationLat})`;
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${markers}/auto/800x800?padding=72&access_token=${encodeURIComponent(token)}`;
}

export const TravelMapModal: React.FC<TravelModalProps> = ({ task, onClose, onStatusChange }) => {
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [route, setRoute] = useState<RouteData | null>(null);
  const [mapToken, setMapToken] = useState("");
  const [mapError, setMapError] = useState("");
  const [mapReady, setMapReady] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => setStatus(task.status), [task.status]);

  useEffect(() => {
    let cancelled = false;
    const loadRoute = async () => {
      setMapError("");
      try {
        const { fetchApi } = await import("@/lib/api-client");
        const coordinates = await new Promise<GeolocationCoordinates>((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error("Thiết bị không hỗ trợ GPS."));
            return;
          }
          navigator.geolocation.getCurrentPosition(
            (position) => resolve(position.coords),
            () => reject(new Error("Hãy bật GPS để xem lộ trình đến khách hàng.")),
            { enableHighAccuracy: true, timeout: 15_000, maximumAge: 15_000 }
          );
        });
        await fetchApi("/technicians/me/presence", {
          method: "PATCH",
          body: JSON.stringify({
            // Mở bản đồ chỉ cập nhật GPS, không tự bật lại trạng thái offline.
            is_online: getCachedPresence() ?? true,
            last_latitude: coordinates.latitude,
            last_longitude: coordinates.longitude,
          }),
        });
        const nextRoute = await fetchApi<RouteData>(`/repair-requests/${task.id}/route`);
        if (!cancelled) {
          setRoute(nextRoute);
        }
      } catch (error: any) {
        if (!cancelled) {
          setMapError(
            error?.status === 403
              ? "Đơn đã được chuyển cho kỹ thuật viên khác hoặc không còn thuộc quyền xử lý của bạn."
              : error instanceof Error
                ? error.message
                : "Không thể tải lộ trình."
          );
        }
      }
    };
    loadRoute();
    return () => {
      cancelled = true;
    };
  }, [task.id, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    import("@/lib/api-client").then(({ fetchApi }) =>
      fetchApi<{ access_token: string }>("/repair-requests/map-token")
        .then((token) => {
          if (!cancelled) setMapToken(token.access_token);
        })
        .catch((error) => {
          if (!cancelled) setMapError(error instanceof Error ? error.message : "Không thể tải token bản đồ.");
        })
    );
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || !mapToken || !route) return;
    let disposed = false;
    let map: any;
    setMapReady(false);

    loadMapboxGL()
      .then((mapboxgl) => {
        if (disposed || !mapContainerRef.current || !mapboxgl) return;
        map = new mapboxgl.Map({
          accessToken: mapToken,
          container: mapContainerRef.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center: route.origin,
          zoom: 13,
        });
        map.on("error", (event: any) => {
          if (!disposed && event?.error) {
            setMapError("Mapbox không tải được nền bản đồ. Kiểm tra token và URL restrictions.");
          }
        });
        map.on("load", () => {
          if (disposed) return;
          map.resize();
          setMapReady(true);
          map.addSource("repair-route", {
            type: "geojson",
            data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: route.geometry } },
          });
          map.addLayer({
            id: "repair-route",
            type: "line",
            source: "repair-route",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": "#1976ad", "line-width": 6, "line-opacity": 0.9 },
          });
          new mapboxgl.Marker({ color: "#1d7aae" }).setLngLat(route.origin).setPopup(new mapboxgl.Popup().setText("Vị trí của bạn")).addTo(map);
          new mapboxgl.Marker({ color: "#e11d48" }).setLngLat(route.destination).setPopup(new mapboxgl.Popup().setText(task.customerName)).addTo(map);
          const bounds = new mapboxgl.LngLatBounds(route.origin, route.origin);
          route.geometry.forEach((coordinate) => bounds.extend(coordinate));
          map.fitBounds(bounds, { padding: 56, maxZoom: 15, duration: 0 });
        });
      })
      .catch((error) => {
        if (!disposed) setMapError(error instanceof Error ? error.message : "Không thể tải bản đồ.");
      });

    return () => {
      disposed = true;
      map?.remove();
    };
  }, [mapToken, route, task.customerName]);

  useEffect(() => {
    if (status !== "MOVING") return;
    let cancelled = false;
    const updatePosition = async () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { fetchApi } = await import("@/lib/api-client");
            await fetchApi("/technicians/me/presence", {
              method: "PATCH",
              body: JSON.stringify({
            // Chỉ nút Online/Offline mới đổi trạng thái nhận việc.
            is_online: getCachedPresence() ?? true,
                last_latitude: position.coords.latitude,
                last_longitude: position.coords.longitude,
              }),
            });
            if (!cancelled) setRefreshKey((key) => key + 1);
          } catch (error) {
            console.warn("Không thể cập nhật vị trí khi di chuyển:", error);
          }
        },
        () => undefined,
        { enableHighAccuracy: true, timeout: 15_000, maximumAge: 15_000 }
      );
    };
    updatePosition();
    // Khi đang di chuyển, cập nhật nhanh hơn để route và khoảng cách bám sát thực tế.
    const interval = window.setInterval(updatePosition, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [status]);

  const handleNextStep = () => {
    if (status === "WAITING_MOVE") {
      setStatus("MOVING");
      onStatusChange(task.id, "MOVING", "Đang di chuyển", "EN_ROUTE");
    } else if (status === "MOVING") {
      setStatus("ARRIVED");
      onStatusChange(task.id, "ARRIVED", "Đã đến nơi", "ARRIVED");
    } else if (status === "ARRIVED") {
      setStatus("DIAGNOSING");
      onStatusChange(task.id, "DIAGNOSING", "Đang chẩn đoán", "DIAGNOSING");
      onClose();
    }
  };

  return (
    <div className="anim-overlay fixed inset-0 z-50 flex flex-col bg-white" role="dialog" aria-modal="true" aria-label="Bản đồ di chuyển">
      <div className="relative flex-1 min-h-[280px] overflow-hidden bg-slate-200">
        {mapToken && route ? <img src={buildStaticMapUrl(mapToken, route)} alt="Bản đồ lộ trình" className="absolute inset-0 size-full object-cover" /> : null}
        <div ref={mapContainerRef} className="absolute inset-0" style={{ visibility: mapReady ? "visible" : "hidden" }} />
        {!route && !mapError ? <p className="absolute inset-0 grid place-items-center text-sm font-medium text-slate-600">Đang tải lộ trình…</p> : null}
        {mapError ? <p role="alert" className="absolute bottom-4 left-4 right-4 z-10 rounded-xl bg-white/95 px-3 py-2 text-center text-xs font-medium text-rose-700 shadow">{mapError}</p> : null}
        <button type="button" onClick={onClose} aria-label="Đóng bản đồ" className="absolute top-[calc(1rem+env(safe-area-inset-top))] right-4 z-10 flex size-11 items-center justify-center rounded-full bg-white text-slate-700 shadow-raised transition-colors hover:bg-slate-50 cursor-pointer">
          <X className="size-5" />
        </button>
      </div>

      <div className="anim-sheet relative -mt-6 space-y-4 rounded-t-sheet bg-white px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-nav">
        <div className="mx-auto h-1 w-10 rounded-full bg-slate-200" aria-hidden />
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold tabular-nums text-slate-500">{task.code}</span>
          {STATUS_LABEL[status] ? <StatusBadge status={status} label={STATUS_LABEL[status]} /> : null}
        </div>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-bold text-ink">{task.customerName}</h3>
            <p className="mt-0.5 flex items-start gap-1.5 text-[13px] text-slate-600"><MapPin className="mt-0.5 size-3.5 shrink-0 text-slate-400" /><span className="line-clamp-2">{task.address}</span></p>
            {route ? <p className="mt-1 text-xs font-semibold text-brand-700">{(route.distance_meters / 1000).toFixed(1)} km · ~{Math.ceil(route.duration_seconds / 60)} phút</p> : null}
          </div>
          {task.customerPhone ? <a href={`tel:${task.customerPhone}`} aria-label={`Gọi ${task.customerName}`} className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 transition-colors hover:bg-brand-100"><Phone className="size-5" /></a> : null}
        </div>
        {status === "WAITING_MOVE" && <Button size="lg" fullWidth icon={<CirclePlay className="size-5" />} onClick={handleNextStep}>Bắt đầu di chuyển</Button>}
        {status === "MOVING" && <Button size="lg" fullWidth icon={<CheckCircle2 className="size-5" />} onClick={handleNextStep}>Đã đến nơi</Button>}
        {status === "ARRIVED" && <Button size="lg" fullWidth icon={<Stethoscope className="size-5" />} onClick={handleNextStep}>Bắt đầu công việc</Button>}
        {!STATUS_LABEL[status] && (
          <>
            <p role="status" className="rounded-xl bg-amber-50 px-3 py-2 text-center text-[13px] font-medium text-amber-800">
              Đơn chưa ở bước di chuyển ({task.statusText}). Vui lòng quay lại chi tiết công việc để tiếp tục.
            </p>
            <Button size="lg" fullWidth variant="secondary" onClick={onClose}>Quay lại chi tiết</Button>
          </>
        )}
      </div>
    </div>
  );
};
