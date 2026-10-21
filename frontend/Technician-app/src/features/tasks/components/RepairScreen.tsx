"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Task, HistoryTask, QuoteItem } from "@/types/task";
import { fetchApi } from "@/lib/api-client";
import { Badge, Button, Card, Field, FieldError, cn, inputClasses, rules, useFieldErrors } from "@h-mobility/ui";
import { ActionBar, Modal, QtyStepper, ScreenHeader, SectionTitle, SkeletonList, labelClasses, selectClasses, textareaClasses } from "@/components/ui";
import { SlideToConfirm } from "./SlideToConfirm";
import {
  Play,
  Pause,
  Check,
  Plus,
  Camera,
  ChevronDown,
  Settings,
  FileText,
  Clock,
  MapPin,
  Trash2,
  X,
  AlertTriangle,
  Send,
  FilePlus,
  CheckCircle2,
} from "lucide-react";

interface ComponentItem {
  id: string;
  name: string;
  warehouse: string;
  price: number;
  quantity: number;
  itemType?: "SPARE_PART" | "SERVICE";
}

let repairPartCounter = 1;
function generateRepairPartId(): string {
  return `part-${Date.now()}-${repairPartCounter++}`;
}

function generateHistoryId(): string {
  return `hist-${Date.now()}-${repairPartCounter++}`;
}

interface RepairTimerState {
  isStarted: boolean;
  isPaused: boolean;
  seconds: number;
}

const timerKey = (taskId: string) => `repairTimer:${taskId}`;
const noteKey = (taskId: string) => `repairNote:${taskId}`;

// Khôi phục đồng hồ bấm giờ sửa chữa khi KTV quay lại màn hình
function readRepairTimer(task?: Task): RepairTimerState {
  if (task?.id) {
    try {
      const raw = sessionStorage.getItem(timerKey(task.id));
      if (raw) {
        const saved = JSON.parse(raw) as RepairTimerState & { savedAt: number };
        const away = saved.isStarted && !saved.isPaused ? Math.floor((Date.now() - saved.savedAt) / 1000) : 0;
        return { isStarted: saved.isStarted, isPaused: saved.isPaused, seconds: saved.seconds + Math.max(0, away) };
      }
    } catch {}
  }
  // Đơn đã bắt đầu sửa trên máy chủ nhưng chưa có đồng hồ cục bộ: mở ở trạng thái tạm dừng
  if (task?.repairStartedAt) return { isStarted: true, isPaused: true, seconds: 0 };
  return { isStarted: false, isPaused: false, seconds: 0 };
}

function saveRepairTimer(taskId: string | undefined, timer: RepairTimerState) {
  if (!taskId) return;
  try {
    sessionStorage.setItem(timerKey(taskId), JSON.stringify({ ...timer, savedAt: Date.now() }));
  } catch {}
}

interface RepairScreenProps {
  task?: Task;
  onBack: () => void;
  onComplete?: (completedData: HistoryTask) => void;
  onSupplementaryQuoteCreated?: () => void;
}

export const RepairScreen: React.FC<RepairScreenProps> = ({
  task,
  onBack,
  onComplete,
  onSupplementaryQuoteCreated,
}) => {
  const [initialTimer] = useState(() => readRepairTimer(task));
  const [isStarted, setIsStarted] = useState<boolean>(initialTimer.isStarted);
  const [seconds, setSeconds] = useState<number>(initialTimer.seconds);
  const [isPaused, setIsPaused] = useState<boolean>(initialTimer.isPaused);

  const [components, setComponents] = useState<ComponentItem[]>([]);

  const [images, setImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [note, setNote] = useState<string>(() => {
    try {
      return (task?.id && sessionStorage.getItem(noteKey(task.id))) || "";
    } catch {
      return "";
    }
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newPartName, setNewPartName] = useState("");
  const [newPartPrice, setNewPartPrice] = useState("150000");
  const { errors, validate, fromApi, clearError, inputProps } = useFieldErrors();
  const [newPartType, setNewPartType] = useState<"SPARE_PART" | "SERVICE">("SPARE_PART");
  const [customLaborCost, setCustomLaborCost] = useState<number>(0);

  // Quản lý hạn mức báo giá đã duyệt & chi phí phát sinh
  const [approvedEstimate, setApprovedEstimate] = useState<number>(0);
  const [hasApprovedQuote, setHasApprovedQuote] = useState(false);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(true);
  const [quoteLoadError, setQuoteLoadError] = useState("");
  const [finalCostOverride, setFinalCostOverride] = useState<number | null>(null);
  const approvedPartsRef = useRef<ComponentItem[]>([]);
  const approvedLaborRef = useRef(0);
  const [hasPendingQuote, setHasPendingQuote] = useState<boolean>(false);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);
  const [isSupplementaryModalOpen, setIsSupplementaryModalOpen] = useState<boolean>(false);
  const [supplementaryNote, setSupplementaryNote] = useState<string>("Chi phí linh kiện / công việc phát sinh trong quá trình sửa chữa");
  const [isSubmittingSupplementary, setIsSubmittingSupplementary] = useState<boolean>(false);

  // Quản lý bước nghiệm thu thanh toán (Handshake 2 chiều: Khách nộp -> Thợ duyệt)
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [settlementData, setSettlementData] = useState<{
    completedData: HistoryTask;
    finalCost: number;
  } | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [paymentSuccessMessage, setPaymentSuccessMessage] = useState<string | null>(null);

  const loadPaymentInfo = useCallback(async () => {
    if (!task?.id) return;
    try {
      const res = await fetchApi<any>(`/payments/repair/${task.id}/qr`);
      setPaymentInfo(res);
    } catch (err) {
      console.warn("Lỗi tải thông tin thanh toán:", err);
    }
  }, [task]);

  useEffect(() => {
    if (!isSettlementModalOpen || !task?.id || paymentSuccessMessage) return;
    loadPaymentInfo();
    const interval = setInterval(() => {
      loadPaymentInfo();
    }, 2500);
    return () => clearInterval(interval);
  }, [isSettlementModalOpen, task, paymentSuccessMessage, loadPaymentInfo]);

  const handleConfirmPaymentAndComplete = async () => {
    if (!task?.id || !settlementData) return;
    setIsConfirmingPayment(true);
    const method = paymentInfo?.payment?.payment_method || "CASH";
    try {
      // Xác nhận thanh toán qua API payments (backend tự động cập nhật trạng thái đơn COMPLETED trong DB)
      await fetchApi<any>(`/payments/repair/${task.id}/confirm`, {
        method: "POST",
        body: JSON.stringify({ payment_method: method }),
      });

      // Cập nhật trạng thái sửa chữa sang COMPLETED với chi phí thực tế (idempotent / fallback)
      try {
        await fetchApi<any>(`/repair-requests/${task.id}/status`, {
          method: "PATCH",
          body: JSON.stringify({
            status: "COMPLETED",
            final_cost: settlementData.finalCost,
          }),
        });
      } catch (statusErr) {
        console.warn("Đơn sửa chữa đã được cập nhật hoàn thành từ trước:", statusErr);
      }

      const msg = "Đã xác nhận thanh toán và hoàn tất đơn sửa chữa thành công!";
      setPaymentSuccessMessage(msg);

      if (task?.id) {
        try {
          sessionStorage.removeItem(timerKey(task.id));
          sessionStorage.removeItem(noteKey(task.id));
        } catch {}
      }

      setTimeout(() => {
        setIsSettlementModalOpen(false);
        if (onComplete) {
          onComplete({
            ...settlementData.completedData,
            paymentStatus: "PAID",
            paymentMethod: method,
          });
        }
      }, 1500);
    } catch (err: any) {
      alert(err.message || "Không thể xác nhận thanh toán. Vui lòng thử lại.");
    } finally {
      setIsConfirmingPayment(false);
    }
  };

  const handleFinishWithoutPayment = async () => {
    if (!settlementData || !task?.id) return;
    setIsConfirmingPayment(true);
    try {
      await fetchApi<any>(`/repair-requests/${task.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "COMPLETED",
          final_cost: settlementData.finalCost,
        }),
      });
      if (task?.id) {
        try {
          sessionStorage.removeItem(timerKey(task.id));
          sessionStorage.removeItem(noteKey(task.id));
        } catch {}
      }
      setIsSettlementModalOpen(false);
      if (onComplete) {
        onComplete({
          ...settlementData.completedData,
          paymentStatus: paymentInfo?.payment?.payment_status || "UNPAID",
          paymentMethod: paymentInfo?.payment?.payment_method || undefined,
        });
      }
    } catch (err: any) {
      alert(err.message || "Không thể cập nhật trạng thái đơn.");
    } finally {
      setIsConfirmingPayment(false);
    }
  };

  const PRESET_PARTS = [
    { name: "Ắc quy 12V-20Ah (Cặp)", price: 1200000 },
    { name: "Bo mạch điều khiển trung tâm", price: 850000 },
    { name: "Cần điều khiển Joystick", price: 650000 },
    { name: "Bộ bánh xe trước đặc 8 inch", price: 350000 },
    { name: "Lốp xe sau chống trượt", price: 280000 },
    { name: "Bộ xích / Dây curoa truyền động", price: 250000 },
    { name: "Bộ phanh điện từ an toàn", price: 450000 },
    { name: "Chổi than & cổ góp động cơ", price: 180000 },
    { name: "Dây nguồn & Cáp sạc pin", price: 150000 },
  ];

  useEffect(() => {
    saveRepairTimer(task?.id, { isStarted, isPaused, seconds });
  }, [task?.id, isStarted, isPaused, seconds]);

  useEffect(() => {
    if (!task?.id) return;
    try {
      sessionStorage.setItem(noteKey(task.id), note);
    } catch {}
  }, [task?.id, note]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isStarted && !isPaused) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isStarted, isPaused]);

  // Báo giá đã được khách hàng duyệt là căn cứ tính phạm vi sửa chữa.
  useEffect(() => {
    if (!task?.id) return;
    let isMounted = true;
    setIsLoadingQuotes(true);
    setQuoteLoadError("");
    fetchApi<any[]>(`/repair-requests/${task.id}/quotes`).then((quotes) => {
      if (!isMounted) return;
      const accepted = quotes.filter((quote) => quote.status === "ACCEPTED");
      setHasPendingQuote(quotes.some((quote) => quote.status === "PENDING"));
      setHasApprovedQuote(accepted.length > 0);
      setApprovedEstimate(accepted.reduce((sum, quote) => sum + Number(quote.estimated_price || 0), 0));
      const approvedParts: ComponentItem[] = accepted.flatMap((quote) => {
        const parts = (quote.items || []).filter((item: any) => item.item_type !== "LABOR" && !item.item_name?.toLowerCase().includes("tiền công"));
        if (parts.length > 0) return parts.map((item: any, index: number) => ({
          id: item.id || `${quote.id}-part-${index}`,
          name: item.item_name,
          warehouse: "Kho kỹ thuật",
          price: Number(item.unit_price || 0),
          quantity: Number(item.quantity ?? 1),
          itemType: item.item_type || "SPARE_PART",
        }));
        return Number(quote.parts_cost || 0) > 0 ? [{
          id: `${quote.id}-parts`, name: "Linh kiện theo báo giá đã duyệt", warehouse: "Kho kỹ thuật",
          price: Number(quote.parts_cost), quantity: 1, itemType: "SPARE_PART",
        }] : [];
      });
      const approvedLabor = accepted.reduce((sum, quote) => sum + Number(quote.labor_fee || 0), 0);
      approvedPartsRef.current = approvedParts;
      approvedLaborRef.current = approvedLabor;
      setComponents(approvedParts);
      setCustomLaborCost(approvedLabor);
    }).catch((error) => {
      if (isMounted) setQuoteLoadError(error.message || "Không thể tải báo giá đã duyệt");
    }).finally(() => {
      if (isMounted) setIsLoadingQuotes(false);
    });
    return () => { isMounted = false; };
  }, [task?.id]);

  const laborCost = customLaborCost || 0;
  const partsCost = components.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );
  const totalCost = laborCost + partsCost;
  const finalCost = finalCostOverride ?? totalCost;
  const additionalAmount = Math.max(0, finalCost - approvedEstimate);

  // Luôn đồng bộ dữ liệu sửa đổi thực tế vào sessionStorage
  useEffect(() => {
    const formattedItems = [
      ...components.map((it) => ({
        item_name: it.name,
        quantity: it.quantity,
        unit_price: it.price,
        subtotal: it.price * it.quantity,
      })),
      {
        item_name: "Tiền công kỹ thuật viên",
        quantity: 1,
        unit_price: laborCost,
        subtotal: laborCost,
      },
    ];
    const payload = {
      repair_id: task?.id,
      items: formattedItems,
      parts_cost: partsCost,
      labor_fee: laborCost,
      estimated_price: totalCost,
      total_amount: totalCost,
      laborCost,
      totalCost,
    };
    sessionStorage.setItem("quoteData", JSON.stringify(payload));
  }, [task?.id, components, laborCost, partsCost, totalCost]);

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleToggleTimer = () => {
    if (!isStarted) {
      setIsStarted(true);
      setIsPaused(false);
    } else {
      setIsPaused(!isPaused);
    }
  };

  const handleQuantityChange = (id: string, delta: number) => {
    setFinalCostOverride(null);
    setComponents((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.size > 50 * 1024 * 1024) {
        alert("Ảnh vượt quá dung lượng tối đa 50MB. Vui lòng chọn ảnh khác.");
        if (e.target) e.target.value = "";
        return;
      }
      const imageUrl = URL.createObjectURL(file);
      setImages((prev) => [...prev, imageUrl]);
      setImageFiles((prev) => [...prev, file]);
    }
    if (e.target) {
      e.target.value = "";
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setImageFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleAddPart = (name: string, price: number, itemType: "SPARE_PART" | "SERVICE" = "SPARE_PART") => {
    if (!name.trim()) return;
    const newId = generateRepairPartId();
    setFinalCostOverride(null);
    setComponents((prev) => [
      ...prev,
      {
        id: newId,
        name,
        warehouse: "Kho kỹ thuật",
        price,
        quantity: 1,
        itemType,
      },
    ]);
    setIsAddModalOpen(false);
    setNewPartName("");
    setNewPartType("SPARE_PART");
  };

  const handleRemovePart = (id: string) => {
    setFinalCostOverride(null);
    setComponents((prev) => prev.filter((item) => item.id !== id));
  };

  const handleCreateSupplementaryQuote = async () => {
    if (!task?.id || isSubmittingSupplementary || isLoadingQuotes || quoteLoadError || !hasApprovedQuote || hasPendingQuote || additionalAmount <= 0) return;
    if (!validate({ supplementaryNote }, { supplementaryNote: rules.maxLength("Lý do phát sinh", 5000) })) return;
    setIsSubmittingSupplementary(true);
    try {
      let formattedItems: QuoteItem[] = components.flatMap((item) => {
        const original = approvedPartsRef.current.find((part) => part.id === item.id);
        const extraCost = item.price * item.quantity - (original ? original.price * original.quantity : 0);
        if (extraCost <= 0) return [];
        const quantity = original && original.price === item.price ? item.quantity - original.quantity : original ? 1 : item.quantity;
        return [{
          item_name: item.name,
          quantity,
          unit_price: extraCost / quantity,
          subtotal: extraCost,
          item_type: item.itemType || "SPARE_PART",
        }];
      });
      const extraLabor = Math.max(0, laborCost - approvedLaborRef.current);
      if (extraLabor > 0) formattedItems.push({
        item_name: "Tiền công phát sinh", quantity: 1, unit_price: extraLabor, subtotal: extraLabor, item_type: "LABOR",
      });
      const itemTotal = formattedItems.reduce((sum, item) => sum + item.subtotal, 0);
      if (itemTotal > additionalAmount) formattedItems = [];
      const unitemizedCost = additionalAmount - formattedItems.reduce((sum, item) => sum + item.subtotal, 0);
      if (unitemizedCost > 0) formattedItems.push({
        item_name: "Chi phí phát sinh sau điều chỉnh", quantity: 1, unit_price: unitemizedCost, subtotal: unitemizedCost, item_type: "SERVICE",
      });

      const payload = {
        items: formattedItems,
        parts_cost: formattedItems.filter((item) => item.item_type !== "LABOR").reduce((sum, item) => sum + item.subtotal, 0),
        labor_fee: formattedItems.filter((item) => item.item_type === "LABOR").reduce((sum, item) => sum + item.subtotal, 0),
        estimated_price: additionalAmount,
        total_amount: additionalAmount,
        diagnosis_note: supplementaryNote || "Báo giá bổ sung linh kiện & công việc phát sinh",
        severity: "MINOR",
      };

      const createdQuote = await fetchApi<any>(`/repair-requests/${task.id}/quotes`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      sessionStorage.setItem("quoteData", JSON.stringify({
        ...payload,
        ...createdQuote,
        repair_id: task.id,
        approvedEstimate,
      }));

      setIsSupplementaryModalOpen(false);
      setValidationWarning(null);
      if (isStarted) {
        setIsPaused(true);
        saveRepairTimer(task.id, { isStarted, isPaused: true, seconds });
      }

      if (onSupplementaryQuoteCreated) {
        onSupplementaryQuoteCreated();
      } else {
        onBack();
      }
    } catch (err: any) {
      if (!fromApi(err, { diagnosis_note: "supplementaryNote" })) {
        alert(err.message || "Lỗi khi tạo báo giá bổ sung");
      }
    } finally {
      setIsSubmittingSupplementary(false);
    }
  };

  // Xử lý đóng gói dữ liệu và gọi callback khi nhấn nút "Hoàn tất sửa chữa & Báo giá"
  const handleFinishRepair = async () => {
    if (isUploading || isLoadingQuotes || quoteLoadError) return;
    if (!hasApprovedQuote || hasPendingQuote) {
      setValidationWarning(hasPendingQuote ? "Báo giá bổ sung đang chờ khách hàng duyệt. Chưa thể hoàn tất sửa chữa." : "Cần khách hàng duyệt báo giá trước khi hoàn tất sửa chữa.");
      return;
    }
    // 1. Kiểm tra nếu chi phí thực tế vượt quá báo giá đã duyệt -> CHẶN LẠI và cảnh báo
    if (finalCost > approvedEstimate) {
      setValidationWarning(
        `Chi phí thực tế (${finalCost.toLocaleString("vi-VN")} đ) cao hơn Báo giá được duyệt (${approvedEstimate.toLocaleString("vi-VN")} đ) là +${additionalAmount.toLocaleString("vi-VN")} đ. Cần khách hàng duyệt chi phí phát sinh trước khi hoàn tất.`
      );
      return;
    }

    setIsUploading(true);
    let uploadedUrls: string[] = [];
    let lastResponse: any = null;

    if (task?.id) {
      try {
        // 1. Upload các ảnh sau sửa chữa thật lên Backend
        if (imageFiles.length > 0) {
          for (const file of imageFiles) {
            try {
              const formData = new FormData();
              formData.append("file", file);
              const res = await fetchApi<any>(
                `/repair-requests/${task.id}/after-repair-images`,
                {
                  method: "POST",
                  body: formData,
                }
              );
              lastResponse = res;
              if (res?.images && Array.isArray(res.images)) {
                const afterImgs = res.images
                  .filter(
                    (img: any) =>
                      img.image_type === "AFTER_REPAIR" ||
                      img.type === "AFTER_REPAIR"
                  )
                  .map((img: any) => img.image_url || img.url);
                if (afterImgs.length > 0) {
                  uploadedUrls = afterImgs;
                }
              }
            } catch (fileErr) {
              console.warn("Lỗi khi upload ảnh:", fileErr);
            }
          }
        }
      } catch (err: any) {
        console.warn("Lỗi khi upload ảnh nghiệm thu:", err);
      } finally {
        setIsUploading(false);
      }
    } else {
      setIsUploading(false);
    }

    const now = new Date();
    // Trích xuất URL ảnh trước sửa từ response backend hoặc task
    const beforeImgFromRes = lastResponse?.images?.find(
      (img: any) => img.image_type === "BEFORE_REPAIR"
    )?.image_url;
    const beforeImage =
      beforeImgFromRes ||
      (task?.images && task.images.length > 0
        ? typeof task.images[0] === "string"
          ? task.images[0]
          : (task.images[0] as any)?.image_url || ""
        : "");

    // Trích xuất URL ảnh sau sửa thật từ Supabase Backend
    const afterImgFromRes = lastResponse?.images?.filter(
      (img: any) => img.image_type === "AFTER_REPAIR"
    );
    const afterImage =
      (afterImgFromRes && afterImgFromRes.length > 0
        ? afterImgFromRes[afterImgFromRes.length - 1].image_url
        : null) ||
      uploadedUrls[uploadedUrls.length - 1] ||
      images[0] ||
      "";

    const completedData: HistoryTask = {
      id: lastResponse?.id || task?.id || generateHistoryId(),
      code: task?.code || lastResponse?.request_code || "JOB-8829",
      date: now.toLocaleDateString("vi-VN"),
      time: now.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      serviceType: task?.serviceName || "Kiểm tra bánh xe và hệ thống xích",
      customerName:
        task?.customerName ||
        lastResponse?.customer?.full_name ||
        "Khách hàng",
      deviceInfo: task?.deviceInfo || "Xe lăn điện",
      address:
        task?.address ||
        lastResponse?.location_address ||
        "Số 12 Chùa Bộc, Quang Trung, Đống Đa, Hà Nội",
      type: "repair",
      diagnosis:
        "Kiểm tra và khắc phục lỗi hoạt động của thiết bị theo lịch hẹn.",
      solution:
        note ||
        `Đã thay thế linh kiện và hoàn tất căn chỉnh thiết bị. Tổng chi phí: ${Number(finalCost).toLocaleString("vi-VN")} đ.`,
      images: {
        before: beforeImage,
        after: afterImage,
      },
      totalAmount: Number(finalCost),
      paymentStatus: "UNPAID",
      paymentMethod: undefined,
    };

    if (finalCost <= 0 || !task?.id) {
      if (task?.id) {
        try {
          sessionStorage.removeItem(timerKey(task.id));
          sessionStorage.removeItem(noteKey(task.id));
        } catch {}
      }
      if (onComplete) {
        onComplete(completedData);
      }
      return;
    }

    setSettlementData({
      completedData,
      finalCost,
    });
    setPaymentSuccessMessage(null);
    setIsSettlementModalOpen(true);
  };

  const vnd = (n: number) => `${n.toLocaleString("vi-VN")} đ`;
  const timerTone = !isStarted ? "neutral" : isPaused ? "warning" : "success";
  const timerLabel = !isStarted ? "Chưa bắt đầu" : isPaused ? "Tạm dừng" : "Đang tính giờ";

  return (
    <div className="space-y-5 px-4 pt-4">
      <ScreenHeader title="Sửa chữa" subtitle={`Mã đơn ${task?.code ?? ""}`} onBack={onBack} />

      <Card className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Badge tone={task?.isEmergency ? "danger" : "brand"}>
            {task?.isEmergency ? "Cứu hộ khẩn cấp" : "Đơn đặt lịch hẹn"}
          </Badge>
          <span className="text-xs text-slate-500 tabular-nums">{task?.bookingDate || "Hôm nay"}</span>
        </div>
        <p className="pt-1 text-sm font-bold text-ink">
          {task?.customerName}
          {task?.customerPhone ? <span className="font-medium text-slate-500 tabular-nums"> · {task.customerPhone}</span> : null}
        </p>
        <p className="flex items-start gap-1.5 text-[13px] text-slate-600">
          <MapPin className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
          {task?.address}
        </p>
      </Card>

      <Card className="text-center">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Clock className="size-4 text-brand-600" /> Thời gian sửa chữa
          </span>
          <Badge tone={timerTone}>{timerLabel}</Badge>
        </div>
        <p className="mt-3 text-4xl font-bold tracking-tight text-ink tabular-nums">{formatTime(seconds)}</p>
        <p className="mt-1.5 text-[13px] text-slate-500">
          {isStarted
            ? isPaused
              ? "Thời gian đang tạm dừng"
              : "Đang ghi nhận thời gian thực tế"
            : "Bấm bắt đầu khi bạn bắt tay vào sửa"}
        </p>
        {(!isStarted || isPaused) && (
          <Button size="lg" fullWidth className="mt-4" icon={<Play className="size-4 fill-current" />} onClick={handleToggleTimer}>
            {!isStarted ? "Bắt đầu sửa chữa" : "Tiếp tục tính giờ"}
          </Button>
        )}
      </Card>

      <section className="space-y-2.5">
        <SectionTitle
          icon={<Settings />}
          action={
            <Button size="sm" variant="ghost" icon={<Plus className="size-4" />} onClick={() => setIsAddModalOpen(true)}>
              Thêm mục
            </Button>
          }
        >
          Linh kiện & tiền công
        </SectionTitle>

        <Card padded={false} className="divide-y divide-line">
          {isLoadingQuotes ? (
            <div className="p-3.5">
              <SkeletonList count={2} className="h-12" />
            </div>
          ) : components.length === 0 ? (
            <p className="p-3.5 text-center text-[13px] text-slate-500">Chưa có linh kiện nào, chỉ tính tiền công.</p>
          ) : (
            components.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{item.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500 tabular-nums">{vnd(item.price)}</p>
                </div>
                <QtyStepper value={item.quantity} onChange={(delta) => handleQuantityChange(item.id, delta)} />
                <button
                  type="button"
                  onClick={() => handleRemovePart(item.id)}
                  className="-mr-1.5 flex size-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                  aria-label={`Xóa ${item.name}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))
          )}

          <div className="flex items-center justify-between gap-3 p-3.5">
            <div className="min-w-0">
              <label htmlFor="repair-labor" className="block text-sm font-semibold text-ink">
                Tiền công kỹ thuật viên
              </label>
              <p className="text-xs text-slate-500">Kiểm tra & lắp ráp tại chỗ</p>
            </div>
            <div className="relative w-36 shrink-0">
              <input
                id="repair-labor"
                type="number"
                inputMode="numeric"
                step={50000}
                value={customLaborCost}
                onChange={(e) => { setFinalCostOverride(null); setCustomLaborCost(Math.max(0, Number(e.target.value))); }}
                className={cn(inputClasses, "pr-8 text-right font-bold tabular-nums")}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">đ</span>
            </div>
          </div>
        </Card>
      </section>

      <section className="space-y-2.5">
        <SectionTitle icon={<Camera />} action={<span className="text-xs text-slate-500">Sau khi sửa</span>}>
          Ảnh nghiệm thu
        </SectionTitle>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={fileInputRef}
          onChange={handleImageUpload}
          className="hidden"
        />
        <div className="grid grid-cols-3 gap-2">
          {images.map((img, idx) => (
            <div key={idx} className="relative aspect-square overflow-hidden rounded-control border border-line bg-slate-100">
              <img
                src={img}
                alt={`Ảnh sau sửa ${idx + 1}`}
                className="size-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/images/s1.jpg";
                }}
              />
              <button
                type="button"
                onClick={() => handleRemoveImage(idx)}
                aria-label={`Xóa ảnh ${idx + 1}`}
                className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full bg-brand-950/70 text-white transition-colors hover:bg-brand-950 cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-control border-2 border-dashed border-slate-300 bg-white text-slate-600 transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700 cursor-pointer"
          >
            <Camera className="size-5" />
            <span className="text-xs font-semibold">Chụp ảnh</span>
          </button>
        </div>
      </section>

      <section className="space-y-2.5">
        <SectionTitle icon={<FileText />}>
          <label htmlFor="repair-note">Báo cáo sửa chữa</label>
        </SectionTitle>
        <textarea
          id="repair-note"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Những gì đã làm và tình trạng thiết bị sau sửa"
          className={textareaClasses}
        />
      </section>

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">Báo giá đã duyệt</p>
            <p className="text-xs text-slate-500">Hạn mức khách hàng đã đồng ý</p>
          </div>
          <span className="text-base font-bold tabular-nums text-ink">
            {hasApprovedQuote ? vnd(approvedEstimate) : "Chưa có"}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
          <div>
            <label htmlFor="repair-final-cost" className="block text-sm font-semibold text-ink">
              Chi phí thực tế
            </label>
            <p className="text-xs text-slate-500 tabular-nums">
              {components.length} linh kiện ({vnd(partsCost)}) + công ({vnd(laborCost)})
            </p>
          </div>
          <div className="relative w-40 shrink-0">
            <input
              id="repair-final-cost"
              type="number"
              inputMode="numeric"
              min={0}
              step={1000}
              value={finalCost}
              disabled={isLoadingQuotes}
              onChange={(event) => setFinalCostOverride(Math.max(0, Number(event.target.value)))}
              className={cn(
                inputClasses,
                "pr-8 text-right text-base font-bold tabular-nums",
                additionalAmount > 0 ? "border-amber-300 text-amber-800" : "text-ink"
              )}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">đ</span>
          </div>
        </div>

        {isLoadingQuotes && <p role="status" className="text-xs text-slate-500">Đang tải báo giá đã duyệt...</p>}
        {quoteLoadError && <p role="alert" className="text-xs font-medium text-rose-700">{quoteLoadError}</p>}
        {hasPendingQuote && (
          <p role="status" className="flex items-start gap-2 rounded-control bg-amber-50 px-3 py-2.5 text-[13px] text-amber-900">
            <Clock className="mt-0.5 size-4 shrink-0" />
            Báo giá bổ sung đang chờ khách hàng duyệt. Chưa thể hoàn tất.
          </p>
        )}

        {hasApprovedQuote && additionalAmount > 0 && !hasPendingQuote && (
          <div className="space-y-3 rounded-control border border-amber-200 bg-amber-50 p-3.5">
            <p className="flex items-start gap-2 text-[13px] leading-relaxed text-amber-900">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <span>
                Vượt báo giá đã duyệt <strong className="font-bold tabular-nums">+{vnd(additionalAmount)}</strong>. Cần gửi
                báo giá bổ sung để khách hàng duyệt trước khi hoàn tất.
              </span>
            </p>
            <Button fullWidth icon={<FilePlus className="size-4" />} onClick={() => setIsSupplementaryModalOpen(true)}>
              Tạo báo giá bổ sung
            </Button>
          </div>
        )}

        {hasApprovedQuote && additionalAmount === 0 && !hasPendingQuote && (
          <Button variant="secondary" fullWidth icon={<FilePlus className="size-4" />} onClick={() => setIsAddModalOpen(true)}>
            Thêm hạng mục phát sinh
          </Button>
        )}
      </Card>

      <ActionBar className="grid grid-cols-[1fr_2fr] gap-2.5">
        <Button
          size="lg"
          variant="secondary"
          icon={!isStarted || isPaused ? <Play className="size-4" /> : <Pause className="size-4" />}
          onClick={handleToggleTimer}
        >
          {!isStarted || isPaused ? "Tiếp tục" : "Tạm dừng"}
        </Button>
        <Button
          size="lg"
          onClick={handleFinishRepair}
          loading={isUploading}
          disabled={isLoadingQuotes || Boolean(quoteLoadError) || hasPendingQuote || !hasApprovedQuote}
          icon={<Check className="size-5" />}
        >
          {isUploading ? "Đang hoàn tất..." : "Hoàn tất sửa chữa"}
        </Button>
      </ActionBar>

      <Modal open={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} variant="sheet" title="Thêm linh kiện / vật tư">
        <p className="mb-2 text-xs font-medium text-slate-500">Linh kiện có sẵn</p>
        <div className="-mx-1 max-h-56 space-y-1 overflow-y-auto px-1">
          {PRESET_PARTS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleAddPart(preset.name, preset.price)}
              className="flex w-full items-center justify-between gap-3 rounded-control border border-line px-3.5 py-3 text-left transition-colors hover:border-brand-300 hover:bg-brand-50 cursor-pointer"
            >
              <span className="text-sm font-medium text-ink">{preset.name}</span>
              <span className="shrink-0 text-sm font-bold tabular-nums text-brand-700">{vnd(preset.price)}</span>
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-3 border-t border-line pt-4">
          <p className="text-xs font-medium text-slate-500">Hoặc nhập hạng mục khác</p>
          <div className="space-y-1.5">
            <label htmlFor="additional-item-type" className={labelClasses}>Loại hạng mục</label>
            <div className="relative">
              <select
                id="additional-item-type"
                value={newPartType}
                onChange={(event) => setNewPartType(event.target.value as "SPARE_PART" | "SERVICE")}
                className={selectClasses}
              >
                <option value="SPARE_PART">Linh kiện / vật tư</option>
                <option value="SERVICE">Công việc / dịch vụ</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
          <Field
            label="Tên hạng mục"
            type="text"
            placeholder="Ví dụ: Ắc quy 12V"
            name="newPartName"
            maxLength={200}
            value={newPartName}
            onChange={(e) => {
              setNewPartName(e.target.value);
              clearError("newPartName");
            }}
            error={errors.newPartName}
          />
          <Field
            label="Đơn giá (đ)"
            type="text"
            inputMode="numeric"
            name="newPartPrice"
            placeholder="Ví dụ: 150000"
            value={newPartPrice}
            onChange={(e) => {
              setNewPartPrice(e.target.value);
              clearError("newPartPrice");
            }}
            error={errors.newPartPrice}
            hint="Số nguyên, đơn vị đồng. Có thể nhập 150.000"
          />
          <Button
            size="lg"
            fullWidth
            icon={<Plus className="size-5" />}
            onClick={() => {
              const valid = validate(
                { newPartName, newPartPrice },
                {
                  newPartName: rules.required("Tên hạng mục", 200),
                  newPartPrice: rules.money({ required: true, label: "Đơn giá" }),
                },
              );
              if (valid) handleAddPart(newPartName.trim(), Number(newPartPrice.replace(/[.,\s]/g, "")), newPartType);
            }}
          >
            Thêm hạng mục
          </Button>
        </div>
      </Modal>

      <Modal open={Boolean(validationWarning)} onClose={() => setValidationWarning(null)} hideClose>
        <div className="text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <AlertTriangle className="size-6" />
          </span>
          <h3 className="mt-4 text-base font-bold text-ink">Chưa thể hoàn tất đơn</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{validationWarning}</p>
        </div>
        <div className="mt-5 space-y-2.5">
          {additionalAmount > 0 && hasApprovedQuote && !hasPendingQuote && (
            <Button
              fullWidth
              size="lg"
              icon={<FilePlus className="size-4" />}
              onClick={() => {
                setValidationWarning(null);
                setIsSupplementaryModalOpen(true);
              }}
            >
              Tạo báo giá bổ sung
            </Button>
          )}
          <Button fullWidth size="lg" variant="secondary" onClick={() => setValidationWarning(null)}>
            Quay lại điều chỉnh
          </Button>
        </div>
      </Modal>

      <Modal
        open={isSupplementaryModalOpen}
        onClose={() => setIsSupplementaryModalOpen(false)}
        variant="sheet"
        title="Báo giá bổ sung"
      >
        <dl className="space-y-2 rounded-control bg-slate-100 p-3.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-600">Báo giá đã duyệt</dt>
            <dd className="font-semibold tabular-nums text-ink">{vnd(approvedEstimate)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-600">Chi phí sau phát sinh</dt>
            <dd className="font-semibold tabular-nums text-ink">{vnd(finalCost)}</dd>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-2">
            <dt className="font-semibold text-ink">Số tiền phát sinh</dt>
            <dd className="font-bold tabular-nums text-amber-800">+{vnd(additionalAmount)}</dd>
          </div>
        </dl>

        <div className="mt-4 space-y-1.5">
          <label htmlFor="supplementary-note" className={labelClasses}>Lý do phát sinh</label>
          <textarea
            id="supplementary-note"
            rows={3}
            maxLength={5000}
            value={supplementaryNote}
            {...inputProps("supplementaryNote")}
            onChange={(e) => {
              setSupplementaryNote(e.target.value);
              clearError("supplementaryNote");
            }}
            placeholder="Mô tả lý do phát sinh thêm linh kiện hoặc công việc"
            className={textareaClasses}
          />
          <FieldError id="supplementaryNote-error" message={errors.supplementaryNote} />
        </div>

        <div className="mt-5 grid grid-cols-[1fr_2fr] gap-2.5">
          <Button size="lg" variant="secondary" onClick={() => setIsSupplementaryModalOpen(false)}>
            Hủy
          </Button>
          <Button
            size="lg"
            loading={isSubmittingSupplementary}
            disabled={additionalAmount <= 0 || hasPendingQuote || !hasApprovedQuote}
            onClick={handleCreateSupplementaryQuote}
            icon={<Send className="size-4" />}
          >
            {isSubmittingSupplementary ? "Đang gửi..." : "Gửi khách hàng"}
          </Button>
        </div>
      </Modal>

      <Modal
        open={isSettlementModalOpen}
        onClose={handleFinishWithoutPayment}
        variant="sheet"
        title="Nghiệm thu & Hoàn tất"
      >
        <div className="space-y-3.5">
          <div className="rounded-card border border-brand-100 bg-brand-50/70 p-3 text-center">
            <p className="text-xs font-medium text-slate-500">Tổng tiền</p>
            <p className="mt-0.5 text-2xl font-black tabular-nums text-brand-700">
              {settlementData?.finalCost.toLocaleString("vi-VN")} đ
            </p>
            <p className="mt-1 text-xs text-slate-600">
              #{task?.code || task?.id} · {task?.customerName || "Khách hàng"}
            </p>
          </div>

          {paymentSuccessMessage ? (
            <div className="flex items-center gap-2.5 rounded-control border border-emerald-200 bg-emerald-50 p-3.5 text-emerald-800">
              <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-bold text-emerald-900">Hoàn tất thành công!</p>
                <p className="text-xs text-emerald-700 mt-0.5">{paymentSuccessMessage}</p>
              </div>
            </div>
          ) : (
            <>
              {paymentInfo?.payment?.payment_status === "PENDING" ? (
                <div className="flex items-center justify-between rounded-control border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-900">
                  <span className="font-semibold">
                    Khách đã trả: {['CASH', 'COD'].includes(String(paymentInfo?.payment?.payment_method || '').toUpperCase()) ? "Tiền mặt" : "Chuyển khoản"}
                  </span>
                  <span className="text-[11px] font-medium text-emerald-700">Kiểm tra & gạt xác nhận</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-control border border-line bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
                  </span>
                  <span>Chờ khách thanh toán trên app...</span>
                </div>
              )}

              <div className="pt-1">
                <SlideToConfirm
                  onConfirm={handleConfirmPaymentAndComplete}
                  isConfirming={isConfirmingPayment}
                  isSuccess={Boolean(paymentSuccessMessage)}
                  // Chỉ mở khi khách đã báo thanh toán trên app (backend cũng chặn)
                  disabled={paymentInfo?.payment?.payment_status !== "PENDING"}
                  disabledText="Chờ khách thanh toán"
                />
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};
