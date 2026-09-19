import React, { useState } from "react";
import { Task, QuoteItemType, QuoteItem, QuotePayload } from "@/types/task";
import {
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  Clock,
  Send,
  MapPin,
  Settings,
  Info,
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

  return (
    <div className="p-4 pb-28 space-y-4 max-w-md mx-auto bg-slate-50 min-h-screen">
      
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-bold text-sky-800 hover:underline flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Tạo báo giá
        </button>
      </div>

      
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
              MÃ ĐƠN: {task.code || "#JOB-99281"}
            </p>
            <h3 className="text-xs font-bold text-slate-800">
              {task.serviceName || "Sửa chữa xe lăn điện Karma"}
            </h3>
          </div>
          <span className="bg-sky-100 text-sky-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
            Khảo sát xong
          </span>
        </div>
        <p className="text-[11px] text-slate-500 flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {task.address || "Số 12 Chùa Bộc, Quang Trung, Đống Đa, Hà Nội"}
        </p>
      </div>

      
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <Settings className="w-4 h-4 text-sky-800" />
            <span>Linh kiện & Vật tư thay thế</span>
          </div>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="text-xs font-bold text-sky-800 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Thêm linh kiện
          </button>
        </div>

        
        <div className="space-y-2">
          {components.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-3 border border-gray-100 shadow-xs flex items-center justify-between gap-2"
            >
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="font-bold text-xs text-slate-800">{item.name}</h4>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      item.itemType === "SERVICE"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-sky-50 text-sky-700 border border-sky-200"
                    }`}
                  >
                    {item.itemType === "SERVICE" ? "Dịch vụ" : "Linh kiện"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Đơn giá:{" "}
                  <span className="font-semibold text-slate-700">
                    {item.price.toLocaleString("vi-VN")} đ
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                
                <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50/50 p-0.5">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(item.id, -1)}
                    className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center text-xs font-bold text-slate-800">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(item.id, 1)}
                    className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                
                <button
                  type="button"
                  onClick={() => handleRemovePart(item.id)}
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                  title="Xóa linh kiện"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {components.length === 0 && (
            <div className="bg-white rounded-2xl p-4 border border-dashed border-gray-200 text-center text-slate-400 text-xs">
              Chưa có linh kiện thay thế nào. Nhấn &quot;+ Thêm linh kiện&quot; nếu cần thay thế phụ tùng hoặc thêm gói dịch vụ.
            </div>
          )}
        </div>
      </div>

      
      <div className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-xs flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h4 className="font-bold text-xs text-slate-800">
              Tiền công kỹ thuật viên
            </h4>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
              Tiền công (LABOR)
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Kiểm tra & lắp ráp tại chỗ
          </p>
        </div>

        <div className="flex items-center gap-1">
          <input
            type="number"
            value={customLaborCost}
            onChange={(e) => setCustomLaborCost(Number(e.target.value) || 0)}
            className="w-28 text-right font-bold text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-sky-800 text-slate-900"
          />
          <span className="text-xs font-semibold text-slate-600">đ</span>
        </div>
      </div>

      
      <div className="bg-sky-50/70 border border-sky-200/80 rounded-2xl p-4 space-y-2 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">
            Tổng chi phí báo giá
          </span>
          <span className="text-base font-extrabold text-sky-900">
            {totalCost.toLocaleString("vi-VN")} đ
          </span>
        </div>

        <div className="flex items-start gap-1.5 text-[11px] text-sky-900/90 leading-relaxed">
          <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          <span>
            Chi phí gồm {components.length} mục vật tư/dịch vụ ({partsCost.toLocaleString("vi-VN")} đ) + tiền công kỹ thuật ({laborCost.toLocaleString("vi-VN")} đ).
          </span>
        </div>
      </div>

      
      <div className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-xs space-y-2">
        <label className="text-xs font-bold text-slate-800 block">
          THỜI GIAN DỰ KIẾN HOÀN THÀNH
        </label>
        <div className="relative">
          <input
            type="text"
            value={estimatedTime}
            onChange={(e) => setEstimatedTime(e.target.value)}
            placeholder="Ví dụ: 2 giờ, 1 ngày..."
            className="w-full p-2.5 pl-3 pr-9 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-sky-800"
          />
          <Clock className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
        </div>
      </div>

      
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={() => {
            const formattedItems: QuoteItem[] = [
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

            onSubmitQuote({
              items: formattedItems,
              parts_cost: partsCost,
              labor_fee: laborCost,
              estimated_price: totalCost,
              total_amount: totalCost,
              estimatedTime,
              status: "DRAFT",
            });
          }}
          className="flex-1 py-3 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-slate-700 font-bold text-xs cursor-pointer shadow-xs"
        >
          Lưu nháp
        </button>
        <button
          type="button"
          onClick={async () => {
            // Định dạng items đúng chuẩn enum item_type (SPARE_PART, LABOR, SERVICE)
            const formattedItems: QuoteItem[] = [
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

            const quotePayload: QuotePayload = {
              items: formattedItems,
              parts_cost: partsCost,
              labor_fee: laborCost,
              estimated_price: totalCost,
              total_amount: totalCost,
              diagnosis_note: diagnosticData?.note || "Báo giá sửa chữa thiết bị",
              estimatedTime,
            };

            // Lưu vào sessionStorage để QuoteStatusScreen đọc ngay lập tức
            sessionStorage.setItem("quoteData", JSON.stringify(quotePayload));

            if (task?.id) {
              try {
                const { fetchApi } = await import("@/lib/api-client");
                await fetchApi(`/repair-requests/${task.id}/quotes`, {
                  method: "POST",
                  body: JSON.stringify(quotePayload),
                });
              } catch (err: any) {
                console.error("Error creating quote:", err);
                try {
                  const { fetchApi } = await import("@/lib/api-client");
                  await fetchApi(`/repair-requests/${task.id}/status`, {
                    method: "PATCH",
                    body: JSON.stringify({
                      status: "WAITING_FOR_APPROVAL",
                      total_amount: totalCost,
                    }),
                  });
                } catch {}
              }
            }

            onSubmitQuote({
              ...quotePayload,
              status: "SENT",
            });
          }}
          className="flex-1 py-3 bg-sky-900 hover:bg-sky-950 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
        >
          <Send className="w-3.5 h-3.5" /> Gửi báo giá
        </button>
      </div>

      
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-xs p-4 shadow-xl border border-gray-100 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-xs text-slate-800">
                Thêm linh kiện / Dịch vụ
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Hạng mục có sẵn
              </p>
              {PRESET_PARTS.map((part, idx) => (
                <div
                  key={idx}
                  onClick={() => handleAddPart(part.name, part.price, part.type)}
                  className="p-2 rounded-xl border border-gray-100 hover:border-sky-300 hover:bg-sky-50/50 cursor-pointer flex justify-between items-center transition-all"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-800">
                      {part.name}
                    </span>
                    <span
                      className={`text-[8px] font-bold px-1 py-0.2 rounded ${
                        part.type === "SERVICE"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-sky-50 text-sky-700 border border-sky-200"
                      }`}
                    >
                      {part.type === "SERVICE" ? "Dịch vụ" : "Phụ tùng"}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-sky-800 shrink-0">
                    {part.price.toLocaleString("vi-VN")} đ
                  </span>
                </div>
              ))}
            </div>

            <hr className="border-gray-100" />

            
            <div className="space-y-2 pt-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Hoặc tự nhập mục mới
              </p>

              
              <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setNewPartType("SPARE_PART")}
                  className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                    newPartType === "SPARE_PART"
                      ? "bg-white text-sky-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Linh kiện (SPARE_PART)
                </button>
                <button
                  type="button"
                  onClick={() => setNewPartType("SERVICE")}
                  className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                    newPartType === "SERVICE"
                      ? "bg-white text-emerald-800 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Dịch vụ (SERVICE)
                </button>
              </div>

              <input
                type="text"
                placeholder={
                  newPartType === "SERVICE"
                    ? "Tên gói dịch vụ..."
                    : "Tên linh kiện phụ tùng..."
                }
                value={newPartName}
                onChange={(e) => setNewPartName(e.target.value)}
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-sky-800"
              />
              <input
                type="number"
                placeholder="Đơn giá (VND)..."
                value={newPartPrice}
                onChange={(e) => setNewPartPrice(e.target.value)}
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-sky-800"
              />
              <button
                type="button"
                onClick={() =>
                  handleAddPart(
                    newPartName,
                    Number(newPartPrice) || 0,
                    newPartType
                  )
                }
                disabled={!newPartName.trim()}
                className="w-full py-2 bg-sky-800 hover:bg-sky-900 disabled:bg-gray-200 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                + Thêm vào báo giá
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};