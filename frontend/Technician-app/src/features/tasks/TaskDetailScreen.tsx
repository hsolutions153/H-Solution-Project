import { useState, useEffect } from "react";
import { Task, TaskStatus, HistoryTask } from "@/types/task";
import { TravelMapModal } from "./components/TravelMapModal";
import { DiagnosticScreen } from "./components/DiagnosticScreen";
import { CreateQuoteScreen } from "./components/CreateQuoteScreen";
import { QuoteStatusScreen } from "./components/QuoteStatusScreen";
import { RepairScreen } from "./components/RepairScreen";
import { mapApiTask } from "./mapApiTask";
import { Button, Card, StatusBadge } from "@h-mobility/ui";
import { ActionBar, ScreenHeader } from "@/components/ui";
import { showAppNotice } from "@/components/AppNotice";
import { getCachedPresence } from "@/lib/presence";
import {
  MapPin,
  Stethoscope,
  Phone,
  Smartphone,
  Accessibility,
  Navigation,
  Bike,
  CheckCircle2,
  Calendar,
} from "lucide-react";

interface TaskDetailScreenProps {
  task: Task | null;
  onBack: () => void;
  onCompleteRepair?: (completedTask: HistoryTask) => void;
  onUpdateStatus: (
    taskId: string,
    status: TaskStatus,
    statusText: string,
    explicitBackendStatus?: string
  ) => void;
}

interface RoutePreviewData {
  origin: [number, number];
  destination: [number, number];
}

function RoutePreviewMap({ taskId }: { taskId: string }) {
  const [route, setRoute] = useState<RoutePreviewData | null>(null);
  const [mapToken, setMapToken] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const loadPreview = async () => {
      try {
        const { fetchApi } = await import("@/lib/api-client");
        const coordinates = await new Promise<GeolocationCoordinates>((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error("Thiết bị không hỗ trợ GPS."));
            return;
          }
          navigator.geolocation.getCurrentPosition(
            (position) => resolve(position.coords),
            () => reject(new Error("Hãy bật GPS để xem bản đồ lộ trình.")),
            { enableHighAccuracy: true, timeout: 15_000, maximumAge: 15_000 }
          );
        });
        await fetchApi("/technicians/me/presence", {
          method: "PATCH",
          body: JSON.stringify({
            // Mở bản đồ chỉ cập nhật GPS, không tự đổi trạng thái nhận việc.
            is_online: getCachedPresence() ?? true,
            last_latitude: coordinates.latitude,
            last_longitude: coordinates.longitude,
          }),
        });
        const [nextRoute, token] = await Promise.all([
          fetchApi<RoutePreviewData>(`/repair-requests/${taskId}/route`),
          fetchApi<{ access_token: string }>("/repair-requests/map-token"),
        ]);
        if (!cancelled) {
          setRoute(nextRoute);
          setMapToken(token.access_token);
        }
      } catch (previewError: any) {
        if (!cancelled) {
          setError(
            previewError?.status === 403
              ? "Đơn đã được chuyển cho kỹ thuật viên khác hoặc không còn thuộc quyền xử lý của bạn."
              : previewError instanceof Error
                ? previewError.message
                : "Không thể tải bản đồ lộ trình."
          );
        }
      }
    };
    void loadPreview();
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  if (error) return <p className="grid h-full place-items-center px-4 text-center text-xs text-rose-700">{error}</p>;
  if (!route || !mapToken) return <p className="grid h-full place-items-center text-xs text-slate-500">Đang tải bản đồ lộ trình…</p>;

  const [originLng, originLat] = route.origin;
  const [destinationLng, destinationLat] = route.destination;
  const markers = `pin-s-a+1976ad(${originLng},${originLat}),pin-s-b+e11d48(${destinationLng},${destinationLat})`;
  const mapUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${markers}/auto/800x320?padding=48&access_token=${encodeURIComponent(mapToken)}`;
  return <img src={mapUrl} className="size-full object-cover" alt="Bản đồ vị trí và lộ trình đến khách hàng" />;
}

export const TaskDetailScreen = ({
  task,
  onBack,
  onCompleteRepair,
  onUpdateStatus,
}: TaskDetailScreenProps) => {
  const [currentTask, setCurrentTask] = useState<Task | null>(task);

  useEffect(() => {
    if (task) setCurrentTask(task);
  }, [task]);

  useEffect(() => {
    if (currentTask) {
      sessionStorage.setItem("selectedTask", JSON.stringify(currentTask));
    }
  }, [currentTask]);

  const [isTravelModalOpen, setIsTravelModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  // Quản lý các bước con khi ở trạng thái IN_PROGRESS / DIAGNOSING / QUOTE
  const [subStep, setSubStep] = useState<"DIAGNOSTIC" | "QUOTE" | "QUOTE_STATUS" | "REPAIR">(() => {
    return (
      (sessionStorage.getItem("subStep") as any) ||
      "DIAGNOSTIC"
    );
  });

  // Lưu trữ subStep vào sessionStorage
  useEffect(() => {
    sessionStorage.setItem("subStep", subStep);
  }, [subStep]);

  // Lưu trữ dữ liệu chẩn đoán
  const [diagnosticData, setDiagnosticData] = useState<any>(() => {
    const saved = sessionStorage.getItem("diagnosticData");
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (diagnosticData) {
      sessionStorage.setItem("diagnosticData", JSON.stringify(diagnosticData));
    }
  }, [diagnosticData]);

  // Lưu trữ dữ liệu báo giá
  const [quoteData, setQuoteData] = useState<any>(() => {
    const saved = sessionStorage.getItem("quoteData");
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (quoteData) {
      sessionStorage.setItem("quoteData", JSON.stringify(quoteData));
    }
  }, [quoteData]);

  const handleStatusChange = (
    taskId: string,
    status: TaskStatus,
    statusText: string,
    explicitBackendStatus?: string
  ) => {
    onUpdateStatus(taskId, status, statusText, explicitBackendStatus);
  };

  if (!task) return null;
  const activeTask: Task = currentTask ?? task;

  // Khi đang ở trạng thái quy trình nghiệp vụ: DIAGNOSING, WAITING_FOR_APPROVAL, ESTIMATE_APPROVED, REPAIRING, IN_PROGRESS
  const isProcessStep = [
    "DIAGNOSING",
    "WAITING_FOR_APPROVAL",
    "ESTIMATE_APPROVED",
    "ESTIMATE_REJECTED",
    "REPAIRING",
    "IN_PROGRESS",
  ].includes(task.status);

  if (isProcessStep) {
    let activeSubStep = subStep;
    if (task.status === "DIAGNOSING") {
      activeSubStep = subStep === "QUOTE" ? "QUOTE" : "DIAGNOSTIC";
    } else if (task.status === "WAITING_FOR_APPROVAL" || task.status === "ESTIMATE_REJECTED") {
      activeSubStep = subStep === "QUOTE" ? "QUOTE" : "QUOTE_STATUS";
    } else if (task.status === "ESTIMATE_APPROVED") {
      activeSubStep = subStep === "REPAIR" ? "REPAIR" : subStep === "QUOTE" ? "QUOTE" : "QUOTE_STATUS";
    } else if (task.status === "REPAIRING") {
      activeSubStep = "REPAIR";
    }

    if (activeSubStep === "QUOTE") {
      return (
        <CreateQuoteScreen
          task={activeTask}
          diagnosticData={diagnosticData}
          onBack={() => {
            if (
              activeTask.status === "WAITING_FOR_APPROVAL" ||
              activeTask.status === "ESTIMATE_APPROVED" ||
              activeTask.status === "ESTIMATE_REJECTED"
            ) {
              setSubStep("QUOTE_STATUS");
            } else {
              setSubStep("DIAGNOSTIC");
            }
          }}
          onSubmitQuote={(data) => {
            setQuoteData(data);

            if (data.status === "SENT") {
              onUpdateStatus(activeTask.id, "WAITING_FOR_APPROVAL", "Đã gửi báo giá", "WAITING_FOR_APPROVAL");
              setSubStep("QUOTE_STATUS");
            } else {
              showAppNotice("Đã lưu nháp báo giá thành công!");
            }
          }}
        />
      );
    }

    if (activeSubStep === "QUOTE_STATUS") {
      return (
        <QuoteStatusScreen
          task={activeTask}
          isApproved={activeTask.status === "ESTIMATE_APPROVED" || activeTask.quote?.status === "ACCEPTED"}
          onBack={onBack}
          onViewDetailQuote={() => setSubStep("QUOTE")}
          onContinueRepair={() => {
            onUpdateStatus(activeTask.id, "REPAIRING", "Đang sửa chữa", "REPAIRING");
            setSubStep("REPAIR");
          }}
        />
      );
    }

    if (activeSubStep === "REPAIR") {
      return (
        <RepairScreen
          task={activeTask}
          onBack={() => {
            if (activeTask.status === "ESTIMATE_APPROVED" || activeTask.status === "WAITING_FOR_APPROVAL") {
              setSubStep("QUOTE_STATUS");
            } else {
              onBack();
            }
          }}
          onComplete={(completedData) => {
            sessionStorage.removeItem("subStep");
            if (onCompleteRepair) {
              onCompleteRepair(completedData);
            }
            onBack();
          }}
          onSupplementaryQuoteCreated={() => {
            onUpdateStatus(activeTask.id, "WAITING_FOR_APPROVAL", "Chờ phê duyệt", "WAITING_FOR_APPROVAL");
            setSubStep("QUOTE_STATUS");
          }}
        />
      );
    }

    return (
      <DiagnosticScreen
        task={activeTask}
        onBack={onBack}
        onSubmitDiagnostic={(data, updatedTask) => {
          setDiagnosticData(data);
          if (updatedTask) {
            const mapped = updatedTask.serviceName && updatedTask.code ? updatedTask : mapApiTask(updatedTask);
            setCurrentTask((prev) => {
              if (!prev) return mapped;
              return {
                ...prev,
                ...mapped,
                images: mapped.images && mapped.images.length > 0 ? mapped.images : (data.images?.length ? data.images : prev.images),
              };
            });
          }
          setSubStep("QUOTE");
        }}
      />
    );
  }

  const customerName =
    task.customerName && !/^[0-9A-F]{8,12}$/i.test(task.customerName) && !/^(USR|TCH|DEV|ADM)\d+$/i.test(task.customerName)
      ? task.customerName
      : "Khách hàng";
  const [addressLine, ...addressRest] = (task.address || "").split(",");
  const slot = task.bookingSlot || task.requestedTime || task.time || "";
  const slotText = task.bookingDate && slot.startsWith(task.bookingDate) ? slot.slice(task.bookingDate.length).trim() : slot;
  const bookingDateText = /^\d{4}-\d{2}-\d{2}$/.test(task.bookingDate || "")
    ? new Date(`${task.bookingDate}T00:00:00`).toLocaleDateString("vi-VN")
    : task.bookingDate;
  const scheduledStart = !task.isEmergency
    && /^\d{4}-\d{2}-\d{2}$/.test(task.bookingDate || "")
    && /^\d{1,2}:\d{2}$/.test(task.bookingSlot || "")
    ? new Date(`${task.bookingDate}T${task.bookingSlot}:00+07:00`)
    : null;
  const travelStart = scheduledStart ? new Date(scheduledStart.getTime() - 30 * 60 * 1000) : null;
  const canStartTravel = !travelStart || currentTime >= travelStart;
  const travelStartLabel = travelStart?.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const description = task.description?.replace(/\[Hẹn:[^\]]*\]/, "").trim();
  const hasAction = ["WAITING_ACCEPT", "PENDING", "WAITING_MOVE", "MOVING", "ARRIVED"].includes(activeTask.status);

  return (
    <div className="space-y-4 px-4 pt-4">
      <ScreenHeader
        title="Chi tiết công việc"
        subtitle={`Mã đơn ${task.code || (task as any).request_code || task.id}`}
        onBack={onBack}
        trailing={<StatusBadge status={task.status} label={task.statusText} />}
      />

      <Card className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-base font-bold text-brand-700">
          {customerName.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-500">Khách hàng</p>
          <h3 className="truncate text-base font-bold text-ink">{customerName}</h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-slate-600 tabular-nums">
            <Smartphone className="size-3.5 text-slate-400" />
            {task.customerPhone || "Chưa có SĐT"}
          </p>
        </div>
        {task.customerPhone ? (
          <a
            href={`tel:${task.customerPhone}`}
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white transition-colors hover:bg-brand-700 active:scale-95"
            aria-label={`Gọi ${customerName}`}
          >
            <Phone className="size-5" />
          </a>
        ) : null}
      </Card>

      <div className="flex items-center gap-3 rounded-card border border-brand-100 bg-brand-50 p-3.5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-white text-brand-700">
          <Calendar className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-brand-800">Lịch hẹn</p>
          <p className="mt-0.5 text-sm font-bold text-ink tabular-nums">
            {bookingDateText}{" "}
            <span className="text-brand-700">{slotText}</span>
          </p>
        </div>
      </div>

      <Card className="space-y-4">
        <div className="flex gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-control bg-slate-100 text-brand-700">
            <Accessibility className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-slate-500">Thiết bị & lỗi</p>
            <h4 className="text-sm font-bold text-ink">{task.deviceInfo || "Thiết bị sửa chữa"}</h4>
            <p className="text-[13px] text-slate-600">{task.serviceName}</p>
          </div>
        </div>

        <div className="border-t border-line pt-4">
          <p className="text-sm font-semibold text-ink">Mô tả từ khách hàng</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            {description || "Khách hàng không để lại ghi chú chi tiết."}
          </p>
        </div>

        {task.images && task.images.length > 0 ? (
          <div>
            <p className="mb-2 text-xs text-slate-500">Ảnh đính kèm ({task.images.length})</p>
            <div className="grid grid-cols-2 gap-2">
              {task.images.slice(0, 4).map((imgUrl, idx) => (
                <div key={idx} className="relative aspect-4/3 overflow-hidden rounded-control border border-line bg-slate-100">
                  <img
                    src={imgUrl}
                    className="size-full object-cover"
                    alt={`Ảnh sự cố ${idx + 1}`}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/images/s1.jpg";
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="rounded-control border border-dashed border-slate-300 bg-slate-50 p-3 text-center text-[13px] text-slate-500">
            Khách hàng chưa đính kèm ảnh
          </p>
        )}
      </Card>

      <Card padded={false} className="overflow-hidden">
        <div className="relative h-40 w-full overflow-hidden bg-slate-100">
          <RoutePreviewMap taskId={task.id} />
        </div>
        <div className="flex items-center gap-3 p-3.5">
          <MapPin className="size-5 shrink-0 text-brand-600" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{addressLine}</p>
            {addressRest.length ? (
              <p className="truncate text-xs text-slate-500">{addressRest.join(",").trim()}</p>
            ) : null}
          </div>
          <Button
            size="sm"
            variant="secondary"
            icon={<Navigation className="size-4" />}
            onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(task.address || "")}`, "_blank")}
          >
            Chỉ đường
          </Button>
        </div>
      </Card>

      {hasAction ? (
        <ActionBar>
          {activeTask.status === "WAITING_ACCEPT" && (
            <Button
              size="lg"
              fullWidth
              icon={<CheckCircle2 className="size-5" />}
              onClick={() => {
                onUpdateStatus(task.id, "PENDING", task.isEmergency ? "Tiếp nhận đơn" : "Đã xác nhận lịch", "ACCEPTED");
              }}
            >
              {task.isEmergency ? "Tiếp nhận đơn cứu hộ" : "Xác nhận lịch hẹn"}
            </Button>
          )}

          {(activeTask.status === "PENDING" || activeTask.status === "WAITING_MOVE") && (
            <Button
              size="lg"
              fullWidth
              icon={<Bike className="size-5" />}
              disabled={!canStartTravel}
              onClick={() => {
                if (!canStartTravel) return;
                setIsTravelModalOpen(true);
              }}
            >
              {canStartTravel ? "Xác nhận di chuyển" : `Được di chuyển từ ${travelStartLabel}`}
            </Button>
          )}

          {activeTask.status === "MOVING" && (
            <div className="grid grid-cols-2 gap-2.5">
              <Button size="lg" variant="secondary" icon={<Bike className="size-5" />} onClick={() => setIsTravelModalOpen(true)}>
                Hành trình
              </Button>
              <Button
                size="lg"
                icon={<CheckCircle2 className="size-5" />}
                onClick={() => {
                  onUpdateStatus(activeTask.id, "ARRIVED", "Đã đến nơi", "ARRIVED");
                }}
              >
                Đã đến nơi
              </Button>
            </div>
          )}

          {activeTask.status === "ARRIVED" && (
            <Button
              size="lg"
              fullWidth
              icon={<Stethoscope className="size-5" />}
              onClick={() => {
                onUpdateStatus(activeTask.id, "DIAGNOSING", "Đang chẩn đoán", "DIAGNOSING");
                setSubStep("DIAGNOSTIC");
              }}
            >
              Bắt đầu chẩn đoán
            </Button>
          )}
        </ActionBar>
      ) : (
        <div className="h-4" />
      )}

      {isTravelModalOpen && (
        <TravelMapModal
          task={activeTask}
          onClose={() => setIsTravelModalOpen(false)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
};
