"use client";

import React, { useState, useEffect, useRef } from "react";
import { Task, HistoryTask, QuoteItem } from "@/types/task";
import { fetchApi } from "@/lib/api-client";
import {
  ArrowLeft,
  Play,
  Pause,
  Check,
  Plus,
  Minus,
  Camera,
  Settings,
  FileText,
  Info,
  Clock,
  MapPin,
  Trash2,
  Loader2,
  AlertTriangle,
  Send,
  FilePlus,
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
  const [isStarted, setIsStarted] = useState<boolean>(false);
  const [seconds, setSeconds] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const [components, setComponents] = useState<ComponentItem[]>([]);

  const [images, setImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [note, setNote] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newPartName, setNewPartName] = useState("");
  const [newPartPrice, setNewPartPrice] = useState("150000");
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

      if (onSupplementaryQuoteCreated) {
        onSupplementaryQuoteCreated();
      } else {
        onBack();
      }
    } catch (err: any) {
      alert(err.message || "Lỗi khi tạo báo giá bổ sung");
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
            } catch (uploadErr) {
              console.error("Lỗi khi upload ảnh nghiệm thu:", uploadErr);
            }
          }
        }

        // 2. Cập nhật trạng thái hoàn thành với tổng tiền
        const statusRes = await fetchApi<any>(`/repair-requests/${task.id}/status`, {
          method: "PATCH",
          body: JSON.stringify({
            status: "COMPLETED",
            final_cost: finalCost,
          }),
        });
        if (statusRes.status !== "COMPLETED") throw new Error("Đơn chưa được hoàn tất. Vui lòng thử lại.");
        lastResponse = statusRes;
      } catch (err: any) {
        console.error("Lỗi khi hoàn tất đơn:", err);
        alert(err.message || "Không thể hoàn tất đơn sửa chữa. Vui lòng kiểm tra lại báo giá đã duyệt.");
        setIsUploading(false);
        return; // KHÔNG gọi onComplete nếu API thất bại!
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
        `Đã thay thế linh kiện và hoàn tất căn chỉnh thiết bị. Tổng chi phí: ${Number(lastResponse?.total_amount ?? finalCost).toLocaleString("vi-VN")} đ.`,
      images: {
        before: beforeImage,
        after: afterImage,
      },
      totalAmount: Number(lastResponse?.total_amount ?? finalCost),
    };

    if (onComplete) {
      onComplete(completedData);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-slate-50 min-h-screen pb-10 flex flex-col justify-between border-x border-slate-100 font-sans">
      <div className="p-4 space-y-4">
        
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-800">
              Sửa chữa & Báo giá
            </h1>
            <p className="text-xs text-slate-500">Mã đơn: {task?.code}</p>
          </div>
        </div>

        
        <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md">
              {task?.isEmergency ? "Cứu hộ khẩn cấp" : "Đơn đặt lịch hẹn"}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {task?.bookingDate || "Hôm nay"}
            </span>
          </div>
          <p className="text-xs font-bold text-slate-800">{task?.customerName} • {task?.customerPhone}</p>
          <p className="text-[11px] text-slate-500 flex items-start gap-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            {task?.address}
          </p>
        </div>

        
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-[#12537d]">
            <Clock className="w-6 h-6" />
            <span className="text-3xl font-bold font-mono tracking-wider">
              {formatTime(seconds)}
            </span>
          </div>

          <p className="text-xs text-slate-500">
            {isStarted
              ? isPaused
                ? "Thời gian sửa chữa đang tạm dừng"
                : "Đang ghi nhận thời gian sửa chữa thực tế"
              : "Bấm nút bên dưới để bắt đầu tính thời gian sửa chữa"}
          </p>

          <span
            className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${
              !isStarted
                ? "bg-slate-100 text-slate-500"
                : isPaused
                ? "bg-amber-50 text-amber-600"
                : "bg-emerald-50 text-emerald-600"
            }`}
          >
            {!isStarted
              ? "Chưa bắt đầu"
              : isPaused
              ? "Đang tạm dừng"
              : "Đang tính giờ"}
          </span>

          {(!isStarted || isPaused) && (
            <button
              onClick={handleToggleTimer}
              className="w-full py-2.5 bg-[#12537d] hover:bg-brand-900 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              {!isStarted ? "Bắt đầu sửa chữa" : "Tiếp tục tính giờ"}
            </button>
          )}
        </div>

        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Settings className="w-4 h-4 text-slate-500" /> Linh kiện & Vật tư thay thế
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="text-xs font-bold text-brand-700 hover:text-brand-900 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm linh kiện
            </button>
          </div>

          {components.length === 0 ? (
            <div className="p-3 bg-white rounded-xl border border-dashed border-slate-200 text-center">
              <p className="text-xs text-slate-400">Chưa có linh kiện nào (Chỉ tính tiền công)</p>
            </div>
          ) : (
            components.map((item) => (
              <div
                key={item.id}
                className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between"
              >
                <div>
                  <p className="font-bold text-xs text-slate-800">{item.name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Đơn giá: {item.price.toLocaleString("vi-VN")} đ
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg p-1 bg-slate-50">
                    <button
                      onClick={() => handleQuantityChange(item.id, -1)}
                      className="w-5 h-5 flex items-center justify-center bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold w-4 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(item.id, 1)}
                      className="w-5 h-5 flex items-center justify-center bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <button
                    onClick={() => handleRemovePart(item.id)}
                    className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                    title="Xóa linh kiện"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}

          
          <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="font-bold text-xs text-slate-800">Tiền công kỹ thuật viên</p>
              <p className="text-[10px] text-slate-400">Kiểm tra & lắp ráp tại chỗ</p>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step={50000}
                value={customLaborCost}
                onChange={(e) => { setFinalCostOverride(null); setCustomLaborCost(Math.max(0, Number(e.target.value))); }}
                className="w-24 p-1.5 text-right bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <span className="text-xs font-medium text-slate-500">đ</span>
            </div>
          </div>
        </div>

        
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-4 w-full max-w-sm space-y-3 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-bold text-sm text-slate-800">Thêm linh kiện / Vật tư</h3>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
                >
                  &times;
                </button>
              </div>

              
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Linh kiện có sẵn:</p>
                <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                  {PRESET_PARTS.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAddPart(preset.name, preset.price)}
                      className="w-full text-left p-2 rounded-xl bg-slate-50 hover:bg-brand-50 border border-slate-100 flex items-center justify-between text-xs cursor-pointer transition-colors"
                    >
                      <span className="font-medium text-slate-700">{preset.name}</span>
                      <span className="font-bold text-brand-800">{preset.price.toLocaleString("vi-VN")} đ</span>
                    </button>
                  ))}
                </div>
              </div>

              
              <div className="border-t border-slate-100 pt-2 space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Hoặc nhập linh kiện khác:</p>
                <label htmlFor="additional-item-type" className="text-xs text-slate-600">Loại hạng mục</label>
                <select id="additional-item-type" value={newPartType} onChange={(event) => setNewPartType(event.target.value as "SPARE_PART" | "SERVICE")} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <option value="SPARE_PART">Linh kiện / vật tư</option>
                  <option value="SERVICE">Công việc / dịch vụ</option>
                </select>
                <input
                  type="text"
                  placeholder="Tên linh kiện..."
                  value={newPartName}
                  onChange={(e) => setNewPartName(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <input
                  type="number"
                  placeholder="Đơn giá (VNĐ)"
                  value={newPartPrice}
                  onChange={(e) => setNewPartPrice(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <button
                  onClick={() => handleAddPart(newPartName, Math.max(0, Number(newPartPrice) || 0), newPartType)}
                  disabled={!newPartName.trim()}
                  className="w-full py-2 bg-[#12537d] disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Xác nhận thêm
                </button>
              </div>
            </div>
          </div>
        )}

        
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Camera className="w-4 h-4 text-slate-500" /> Chụp ảnh sau khi sửa
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fileInputRef}
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="h-24 border border-dashed border-slate-300 bg-white rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <Camera className="w-5 h-5 mb-1 text-slate-400" />
              <span className="text-[11px] font-medium">Chụp ảnh</span>
            </button>
            {images.map((img, idx) => (
              <div
                key={idx}
                className="h-24 rounded-2xl overflow-hidden border border-slate-200 relative bg-slate-100 group"
              >
                <img
                  src={img}
                  alt="Sau khi sửa"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/images/s1.jpg";
                  }}
                />
                <button
                  onClick={() => handleRemoveImage(idx)}
                  className="absolute top-1.5 right-1.5 p-1 bg-black/50 text-white rounded-full opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <FileText className="w-4 h-4 text-slate-500" /> Báo cáo nội dung sửa chữa thực tế
          </div>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi chú về việc sửa chữa và tình trạng thiết bị..."
            className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 placeholder:text-slate-400"
          />
        </div>

        
        {/* Khối Tổng chi phí & Báo giá đã duyệt */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-3 shadow-xs">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                Tổng báo giá đã duyệt
              </span>
              <span className="text-[10px] text-slate-400">
                Hạn mức tối đa được khách hàng phê duyệt
              </span>
            </div>
            <span className="text-sm font-bold text-slate-700">
              {hasApprovedQuote ? `${approvedEstimate.toLocaleString("vi-VN")} đ` : "Chưa có"}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <label htmlFor="repair-final-cost" className="text-xs font-bold text-slate-900">Chi phí thực tế (Final Cost)</label>
            <input id="repair-final-cost" type="number" min={0} step={1000} value={finalCost} disabled={isLoadingQuotes} onChange={(event) => setFinalCostOverride(Math.max(0, Number(event.target.value)))} className={`w-36 p-2 text-right border border-slate-200 rounded-lg text-sm font-bold ${additionalAmount > 0 ? "text-amber-700" : "text-brand-900"}`} />
          </div>

          {isLoadingQuotes && <p role="status" className="text-xs text-slate-500">Đang tải báo giá đã duyệt...</p>}
          {quoteLoadError && <p role="alert" className="text-xs text-rose-700">{quoteLoadError}</p>}
          {hasPendingQuote && <p role="status" className="text-xs text-amber-800">Báo giá bổ sung đang chờ khách hàng duyệt. Chưa thể hoàn tất.</p>}

          <div className="flex items-start gap-1.5 text-[10px] text-slate-500 leading-snug">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span>
              Gồm {components.length} linh kiện ({partsCost.toLocaleString("vi-VN")} đ) + tiền công ({laborCost.toLocaleString("vi-VN")} đ).
            </span>
          </div>

          {/* Cảnh báo nếu chi phí thực tế vượt Báo giá đã duyệt */}
          {hasApprovedQuote && additionalAmount > 0 && !hasPendingQuote && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[11px] text-amber-900 leading-tight">
                  <span className="font-bold">Chi phí vượt báo giá đã duyệt: </span>
                  <span className="font-extrabold text-rose-600">+{additionalAmount.toLocaleString("vi-VN")} đ</span>.
                  <p className="mt-1 text-slate-600">
                    Cần gửi báo giá bổ sung để khách hàng phê duyệt trước khi hoàn tất.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSupplementaryModalOpen(true)}
                className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <FilePlus className="w-3.5 h-3.5" /> Tạo báo giá bổ sung (+{additionalAmount.toLocaleString("vi-VN")} đ)
              </button>
            </div>
          )}

          {/* Nút Tạo chi phí phát sinh nếu technician muốn chủ động tạo thêm */}
          {hasApprovedQuote && additionalAmount === 0 && !hasPendingQuote && (
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="w-full py-2 bg-slate-50 hover:bg-brand-50 text-brand-800 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FilePlus className="w-3.5 h-3.5" /> Thêm linh kiện / công việc phát sinh
            </button>
          )}
        </div>

        <div className="flex gap-2.5 pt-2">
          <button
            onClick={handleToggleTimer}
            className="w-1/3 py-3 border border-slate-300 bg-white hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            {!isStarted || isPaused ? (
              <>
                <Play className="w-4 h-4" /> Tiếp tục
              </>
            ) : (
              <>
                <Pause className="w-4 h-4" /> Tạm dừng
              </>
            )}
          </button>
          <button
            onClick={handleFinishRepair}
            disabled={isUploading || isLoadingQuotes || Boolean(quoteLoadError) || hasPendingQuote || !hasApprovedQuote}
            className="flex-1 py-3 bg-[#12537d] hover:bg-brand-900 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Đang tải ảnh & hoàn tất...
              </>
            ) : (
              <>
                Hoàn tất sửa chữa <Check className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Modal Cảnh báo khi bấm Hoàn tất mà vượt báo giá */}
        {validationWarning && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-in fade-in">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1.5">
                <h3 className="text-sm font-bold text-slate-900">
                  Không thể hoàn tất đơn sửa chữa!
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {validationWarning}
                </p>
              </div>
              <div className="space-y-2 pt-1">
                {additionalAmount > 0 && hasApprovedQuote && !hasPendingQuote && <button
                  type="button"
                  onClick={() => {
                    setValidationWarning(null);
                    setIsSupplementaryModalOpen(true);
                  }}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
                >
                  Tạo báo giá bổ sung (+{additionalAmount.toLocaleString("vi-VN")} đ)
                </button>}
                <button
                  type="button"
                  onClick={() => setValidationWarning(null)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Quay lại điều chỉnh chi phí
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Xác nhận gửi Báo giá phát sinh */}
        {isSupplementaryModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold text-sm">
                  <FilePlus className="w-4 h-4 text-brand-700" />
                  <span>Tạo Báo Giá Bổ Sung</span>
                </div>
                <button
                  onClick={() => setIsSupplementaryModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="bg-brand-50/70 p-3 rounded-xl border border-brand-100 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Báo giá đã duyệt:</span>
                    <span className="font-bold text-slate-800">{approvedEstimate.toLocaleString("vi-VN")} đ</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Chi phí sau phát sinh:</span>
                    <span className="font-bold text-slate-900">{finalCost.toLocaleString("vi-VN")} đ</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-brand-200/60 text-brand-950 font-bold">
                    <span>Số tiền phát sinh:</span>
                    <span className="text-amber-700 font-black">
                      +{additionalAmount.toLocaleString("vi-VN")} đ
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 block">Lý do phát sinh chi phí:</label>
                  <textarea
                    rows={2}
                    value={supplementaryNote}
                    onChange={(e) => setSupplementaryNote(e.target.value)}
                    placeholder="Mô tả lý do phát sinh thêm linh kiện/công việc..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsSupplementaryModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={isSubmittingSupplementary || additionalAmount <= 0 || hasPendingQuote || !hasApprovedQuote}
                  onClick={handleCreateSupplementaryQuote}
                  className="flex-1 py-2.5 bg-brand-900 hover:bg-brand-950 disabled:opacity-60 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                >
                  {isSubmittingSupplementary ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang gửi...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" /> Gửi khách hàng
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
