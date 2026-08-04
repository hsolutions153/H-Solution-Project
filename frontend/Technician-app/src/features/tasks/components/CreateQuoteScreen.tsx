"use client";

import React, { useState } from "react";
import { Task } from "@/types/task";
import { ArrowLeft, Plus, Clock, Send, MapPin } from "lucide-react";

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
  // Trạng thái quản lý các hạng mục phụ tùng trong báo giá
  const [items, setItems] = useState([
    { name: "Công sửa chữa (Nhân công kỹ thuật cao)", quantity: 1, price: 500000 },
    { name: "Phụ tùng thay thế (Van an toàn)", quantity: 1, price: 0 },
  ]);

  const [estimatedTime, setEstimatedTime] = useState("");

  // Hàm tính tổng chi phí tự động
  const totalCost = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

  const handleAddItem = () => {
    setItems([...items, { name: "Linh kiện / Phụ tùng mới", quantity: 1, price: 0 }]);
  };

  return (
    <div className="p-4 pb-28 space-y-4">
      {/* Tiêu đề & Nút quay lại */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-bold text-sky-800 hover:underline flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Tạo báo giá
        </button>
      </div>

      {/* Thông tin đơn hàng & Khảo sát xong */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-medium">MA ĐƠN: {task.code || `#JOB-99281`}</p>
            <h3 className="text-xs font-bold text-slate-800">{task.serviceName || `Sửa chữa xe lăn điện Karma`}</h3>
          </div>
          <span className="bg-sky-100 text-sky-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
            Khảo sát xong
          </span>
        </div>
        <p className="text-[11px] text-slate-500 flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {task.address || `Số 12 Chùa Bộc, Quang Trung, Đống Đa, Hà Nội`}
        </p>
      </div>

      {/* Chi tiết chi phí */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <span className="text-xs font-bold text-slate-800">CHI TIẾT CHI PHÍ</span>
          <button
            onClick={handleAddItem}
            className="text-xs font-bold text-sky-800 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Thêm phụ tùng
          </button>
        </div>

        {/* Bảng danh sách hạng mục */}
        <div className="space-y-3">
          <div className="grid grid-cols-12 text-[10px] font-bold text-slate-400 border-b pb-1">
            <span className="col-span-6">Hạng mục / Phụ tùng</span>
            <span className="col-span-2 text-center">SL</span>
            <span className="col-span-2 text-right">Đơn giá (đ)</span>
            <span className="col-span-2 text-right">Thành tiền (đ)</span>
          </div>

          {items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 items-center text-xs text-slate-700 border-b border-gray-50 pb-2 gap-1">
              <div className="col-span-6">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => {
                    const newItems = [...items];
                    newItems[idx].name = e.target.value;
                    setItems(newItems);
                  }}
                  className="w-full bg-gray-50 p-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-sky-800"
                />
              </div>
              <div className="col-span-2 text-center">
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => {
                    const newItems = [...items];
                    newItems[idx].quantity = Number(e.target.value);
                    setItems(newItems);
                  }}
                  className="w-full bg-gray-50 p-1.5 text-center rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-sky-800"
                />
              </div>
              <div className="col-span-2 text-right">
                <input
                  type="number"
                  value={item.price}
                  onChange={(e) => {
                    const newItems = [...items];
                    newItems[idx].price = Number(e.target.value);
                    setItems(newItems);
                  }}
                  className="w-full bg-gray-50 p-1.5 text-right rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-sky-800"
                />
              </div>
              <div className="col-span-2 text-right font-bold text-slate-900">
                {(item.quantity * item.price).toLocaleString()} đ
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Thời gian dự kiến hoàn thành */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-2">
        <label className="text-xs font-bold text-slate-800 block">THỜI GIAN DỰ KIẾN HOÀN THÀNH</label>
        <div className="relative">
          <input
            type="text"
            value={estimatedTime}
            onChange={(e) => setEstimatedTime(e.target.value)}
            placeholder="Ví dụ: 2 giờ, 1 ngày..."
            className="w-full p-3 pl-3 pr-9 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-sky-800"
          />
          <Clock className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
        </div>
        <p className="text-[10px] text-slate-400">Thông tin giúp khách hàng sắp xếp thời gian nghiệm thu.</p>
      </div>

      {/* Tổng chi phí dự kiến */}
      <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700">Tổng chi phí dự kiến</span>
          <span className="text-sm font-extrabold text-sky-900">{totalCost.toLocaleString()} đ</span>
        </div>
        <p className="text-[10px] text-slate-400 italic">* Giá trên chưa bao gồm VAT (nếu có)</p>
      </div>

      {/* Nút thao tác dưới cùng */}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={() => onSubmitQuote({ items, estimatedTime, totalCost, status: "DRAFT" })}
          className="flex-1 py-3 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-slate-700 font-bold text-xs cursor-pointer shadow-xs"
        >
          Lưu nháp
        </button>
        <button
          type="button"
          onClick={() => {
            // Khi bấm Gửi báo giá, gọi hàm onSubmitQuote truyền status là SENT 
            // để component quản lý view chuyển sang QuoteStatusScreen
            onSubmitQuote({ items, estimatedTime, totalCost, status: "SENT" });
          }}
          className="flex-1 py-3 bg-sky-900 hover:bg-sky-950 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
        >
          <Send className="w-3.5 h-3.5" /> Gửi báo giá
        </button>
      </div>
    </div>
  );
};