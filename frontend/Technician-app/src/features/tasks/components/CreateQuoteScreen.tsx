import React, { useState, useEffect } from "react";
import { Task, QuoteItemType, QuoteItem, QuotePayload } from "@/types/task";
import { Badge, Button, Card, Field, cn, inputClasses } from "@h-mobility/ui";
import { ActionBar, Modal, QtyStepper, ScreenHeader, SectionTitle, SkeletonList, labelClasses } from "@/components/ui";
import {
  Plus,
  Trash2,
  Clock,
  Send,
  MapPin,
  Settings,
} from "lucide-react";

let partCounter = 1;
function generatePartId(): string {
  return `part-${Date.now()}-${partCounter++}`;
}

export interface ComponentItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  itemType: QuoteItemType;
}

interface CreateQuoteScreenProps {
  task: Task;
  diagnosticData?: { note: string; repairType: string; images: string[] };
  onBack: () => void;
  onSubmitQuote: (quoteData: any) => void;
}

export const CreateQuoteScreen: React.FC<CreateQuoteScreenProps> = ({
  task,
  diagnosticData,
  onBack,
  onSubmitQuote,
}) => {
  // 1. Quản lý danh sách linh kiện thay thế & dịch vụ
  const [components, setComponents] = useState<ComponentItem[]>([
    {
      id: "comp-1",
      name: "Bộ xích truyền động",
      price: 250000,
      quantity: 1,
      itemType: "SPARE_PART",
    },
  ]);

  // 2. Quản lý tiền công KTV (LABOR)
  const [customLaborCost, setCustomLaborCost] = useState<number>(200000);
  const [estimatedTime, setEstimatedTime] = useState<string>("2 giờ");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const existingQuoteId = task?.quote?.id;

  useEffect(() => {
    if (!task?.id || !existingQuoteId) return;
    let isMounted = true;
    setIsLoadingQuote(true);
    import("@/lib/api-client").then(({ fetchApi }) =>
      fetchApi<any[]>(`/repair-requests/${task.id}/quotes`)
    ).then((quotes) => {
      if (!isMounted) return;
      const quote = quotes.find((entry) => entry.id === existingQuoteId);
      if (!quote) return;
      setComponents((quote.items || [])
        .filter((item: any) => item.item_type !== "LABOR")
        .map((item: any, index: number) => ({
          id: item.id || `quote-part-${index}`,
          name: item.item_name,
          price: Number(item.unit_price || 0),
          quantity: Number(item.quantity ?? 1),
          itemType: item.item_type || "SPARE_PART",
        })));
      setCustomLaborCost(Number(quote.labor_fee || 0));
    }).catch((error) => {
      if (isMounted) setSubmitError(error.message || "Không thể tải báo giá hiện tại");
    }).finally(() => {
      if (isMounted) setIsLoadingQuote(false);
    });
    return () => { isMounted = false; };
  }, [task?.id, existingQuoteId]);

  // Popup thêm linh kiện / dịch vụ
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newPartName, setNewPartName] = useState("");
  const [newPartPrice, setNewPartPrice] = useState("150000");
  const [newPartType, setNewPartType] = useState<QuoteItemType>("SPARE_PART");

  const PRESET_PARTS: { name: string; price: number; type: QuoteItemType }[] = [
    { name: "Ắc quy 12V-20Ah (Cặp)", price: 1200000, type: "SPARE_PART" },
    { name: "Bo mạch điều khiển trung tâm", price: 850000, type: "SPARE_PART" },
    { name: "Cần điều khiển Joystick", price: 650000, type: "SPARE_PART" },
    { name: "Bộ bánh xe trước đặc 8 inch", price: 350000, type: "SPARE_PART" },
    { name: "Lốp xe sau chống trượt", price: 280000, type: "SPARE_PART" },
    { name: "Bộ xích truyền động", price: 250000, type: "SPARE_PART" },
    { name: "Bộ phanh điện từ an toàn", price: 450000, type: "SPARE_PART" },
    { name: "Chổi than & cổ góp động cơ", price: 180000, type: "SPARE_PART" },
    { name: "Dây nguồn & Cáp sạc pin", price: 150000, type: "SPARE_PART" },
    { name: "Gói bảo dưỡng & bôi trơn toàn diện", price: 150000, type: "SERVICE" },
    { name: "Cân chỉnh khung sườn & phanh an toàn", price: 100000, type: "SERVICE" },
  ];

  const handleAddPart = (
    name: string,
    price: number,
    type: QuoteItemType = "SPARE_PART"
  ) => {
    if (!name.trim()) return;
    const newId = generatePartId();
    setComponents((prev) => [
      ...prev,
      {
        id: newId,
        name,
        price,
        quantity: 1,
        itemType: type,
      },
    ]);
    setIsAddModalOpen(false);
    setNewPartName("");
    setNewPartType("SPARE_PART");
  };

  const handleRemovePart = (id: string) => {
    setComponents((prev) => prev.filter((item) => item.id !== id));
  };

  const handleQuantityChange = (id: string, delta: number) => {
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

  // Tính toán chi phí chính xác
  const partsCost = components.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );
  const laborCost = customLaborCost || 0;
  const totalCost = partsCost + laborCost;

  const buildItems = (): QuoteItem[] => [
    ...components.map((it) => ({
      item_name: it.name,
      item_type: it.itemType || "SPARE_PART",
      quantity: it.quantity,
      unit_price: it.price,
      subtotal: it.price * it.quantity,
    })),
    {
      item_name: "Tiền công kỹ thuật viên",
      item_type: "LABOR",
      quantity: 1,
      unit_price: laborCost,
      subtotal: laborCost,
    },
  ];

  const handleSaveDraft = () => {
    onSubmitQuote({
      items: buildItems(),
      parts_cost: partsCost,
      labor_fee: laborCost,
      estimated_price: totalCost,
      total_amount: totalCost,
      estimatedTime,
      status: "DRAFT",
    });
  };

  const handleSend = async () => {
    if (isSubmitting || isLoadingQuote) return;
    setIsSubmitting(true);
    setSubmitError("");
    // Định dạng items đúng chuẩn enum item_type (SPARE_PART, LABOR, SERVICE)
    const quotePayload: QuotePayload = {
      items: buildItems(),
      parts_cost: partsCost,
      labor_fee: laborCost,
      estimated_price: totalCost,
      total_amount: totalCost,
      diagnosis_note: diagnosticData?.note || "Báo giá sửa chữa thiết bị",
      estimatedTime,
    };

    try {
      let createdQuote: any = null;
      if (task?.id) {
        const { fetchApi } = await import("@/lib/api-client");
        createdQuote = await fetchApi(`/repair-requests/${task.id}/quotes`, {
          method: "POST",
          body: JSON.stringify(quotePayload),
        });
      }
      const savedQuote = { ...quotePayload, ...createdQuote, repair_id: task?.id };
      sessionStorage.setItem("quoteData", JSON.stringify(savedQuote));
      onSubmitQuote({ ...savedQuote, status: "SENT" });
    } catch (err: any) {
      setSubmitError(err.message || "Không thể gửi báo giá. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const vnd = (n: number) => `${n.toLocaleString("vi-VN")} đ`;

  return (
    <div className="space-y-5 px-4 pt-4">
      <ScreenHeader
        title="Tạo báo giá"
        subtitle={`Mã đơn ${task.code || "#JOB-99281"}`}
        onBack={onBack}
        trailing={<Badge tone="brand">Khảo sát xong</Badge>}
      />

      <Card className="space-y-1">
        <h3 className="text-sm font-bold text-ink">{task.serviceName || "Sửa chữa xe lăn điện Karma"}</h3>
        <p className="flex items-start gap-1.5 text-[13px] text-slate-600">
          <MapPin className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
          {task.address || "Số 12 Chùa Bộc, Quang Trung, Đống Đa, Hà Nội"}
        </p>
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
          Linh kiện & dịch vụ
        </SectionTitle>

        {isLoadingQuote ? (
          <SkeletonList count={2} className="h-16" />
        ) : components.length === 0 ? (
          <p className="rounded-card border border-dashed border-slate-300 bg-white p-4 text-center text-[13px] leading-relaxed text-slate-500">
            Chưa có linh kiện nào. Bấm &quot;Thêm mục&quot; nếu cần thay phụ tùng hoặc thêm gói dịch vụ.
          </p>
        ) : (
          <Card padded={false} className="divide-y divide-line">
            {components.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{item.name}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <Badge tone={item.itemType === "SERVICE" ? "brand" : "neutral"}>
                      {item.itemType === "SERVICE" ? "Dịch vụ" : "Linh kiện"}
                    </Badge>
                    <span className="tabular-nums">{vnd(item.price)}</span>
                  </p>
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
            ))}
          </Card>
        )}
      </section>

      <Card className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <label htmlFor="quote-labor" className="block text-sm font-semibold text-ink">
            Tiền công kỹ thuật viên
          </label>
          <p className="text-xs text-slate-500">Kiểm tra & lắp ráp tại chỗ</p>
        </div>
        <div className="relative w-36 shrink-0">
          <input
            id="quote-labor"
            type="number"
            inputMode="numeric"
            value={customLaborCost}
            onChange={(e) => setCustomLaborCost(Number(e.target.value) || 0)}
            className={cn(inputClasses, "pr-8 text-right font-bold tabular-nums")}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">đ</span>
        </div>
      </Card>

      <div className="space-y-1.5">
        <label htmlFor="quote-eta" className={labelClasses}>
          Thời gian dự kiến hoàn thành
        </label>
        <div className="relative">
          <Clock className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-slate-400" />
          <input
            id="quote-eta"
            type="text"
            value={estimatedTime}
            onChange={(e) => setEstimatedTime(e.target.value)}
            placeholder="Ví dụ: 2 giờ, 1 ngày"
            className={cn(inputClasses, "pl-10")}
          />
        </div>
      </div>

      <div className="rounded-card bg-brand-950 p-4 text-white">
        <div className="space-y-1.5 text-[13px] text-brand-100">
          <div className="flex justify-between">
            <span>Linh kiện & dịch vụ ({components.length})</span>
            <span className="tabular-nums">{vnd(partsCost)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tiền công</span>
            <span className="tabular-nums">{vnd(laborCost)}</span>
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between border-t border-white/15 pt-3">
          <span className="text-sm font-semibold">Tổng báo giá</span>
          <span className="text-2xl font-bold tabular-nums">{vnd(totalCost)}</span>
        </div>
      </div>

      {submitError && (
        <p role="alert" className="rounded-control border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[13px] text-rose-700">
          {submitError}
        </p>
      )}

      <ActionBar className="grid grid-cols-[1fr_2fr] gap-2.5">
        <Button size="lg" variant="secondary" onClick={handleSaveDraft}>
          Lưu nháp
        </Button>
        <Button
          size="lg"
          disabled={isLoadingQuote}
          loading={isSubmitting}
          icon={<Send className="size-4" />}
          onClick={handleSend}
        >
          {isSubmitting ? "Đang gửi..." : "Gửi báo giá"}
        </Button>
      </ActionBar>

      <Modal open={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} variant="sheet" title="Thêm linh kiện / dịch vụ">
        <p className="mb-2 text-xs font-medium text-slate-500">Hạng mục có sẵn</p>
        <div className="-mx-1 max-h-60 space-y-1 overflow-y-auto px-1">
          {PRESET_PARTS.map((part, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleAddPart(part.name, part.price, part.type)}
              className="flex w-full items-center justify-between gap-3 rounded-control border border-line px-3.5 py-3 text-left transition-colors hover:border-brand-300 hover:bg-brand-50 cursor-pointer"
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium text-ink">{part.name}</span>
                <span className="text-xs text-slate-500">{part.type === "SERVICE" ? "Dịch vụ" : "Phụ tùng"}</span>
              </span>
              <span className="shrink-0 text-sm font-bold tabular-nums text-brand-700">{vnd(part.price)}</span>
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-3 border-t border-line pt-4">
          <p className="text-xs font-medium text-slate-500">Hoặc nhập hạng mục mới</p>

          <div role="radiogroup" className="grid grid-cols-2 gap-1 rounded-control bg-slate-100 p-1">
            {([
              ["SPARE_PART", "Linh kiện"],
              ["SERVICE", "Dịch vụ"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={newPartType === value}
                onClick={() => setNewPartType(value)}
                className={cn(
                  "rounded-lg py-2 text-sm transition-colors cursor-pointer",
                  newPartType === value ? "bg-white font-bold text-brand-700 shadow-card" : "font-medium text-slate-600"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <Field
            label={newPartType === "SERVICE" ? "Tên dịch vụ" : "Tên linh kiện"}
            type="text"
            placeholder={newPartType === "SERVICE" ? "Ví dụ: Bảo dưỡng định kỳ" : "Ví dụ: Ắc quy 12V"}
            value={newPartName}
            onChange={(e) => setNewPartName(e.target.value)}
          />
          <Field
            label="Đơn giá (đ)"
            type="number"
            inputMode="numeric"
            value={newPartPrice}
            onChange={(e) => setNewPartPrice(e.target.value)}
          />
          <Button
            size="lg"
            fullWidth
            icon={<Plus className="size-5" />}
            onClick={() => handleAddPart(newPartName, Number(newPartPrice) || 0, newPartType)}
            disabled={!newPartName.trim()}
          >
            Thêm vào báo giá
          </Button>
        </div>
      </Modal>
    </div>
  );
};
