'use client';

import React, { useState } from "react";
import { X, Search, MapPin, UserCheck, Star, User, Pin, Siren } from "lucide-react";
import { RepairRequest } from "@/types/repairRequest";
import { MOCK_TECHNICIANS } from "@/constants/mockTechnicians";

const renderTechStatus = (status: string) => {
  switch (status) {
    case "AVAILABLE":
      return (
        <span className="bg-emerald-50 text-emerald-600 font-bold px-2 py-0.5 rounded text-[10px]">
          Sẵn sàng
        </span>
      );
    case "BUSY":
      return (
        <span className="bg-amber-50 text-amber-600 font-bold px-2 py-0.5 rounded text-[10px]">
          Đang bận
        </span>
      );
    case "OFFLINE":
      return (
        <span className="bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded text-[10px]">
          Ngoại tuyến
        </span>
      );
    case "ON_LEAVE":
      return (
        <span className="bg-rose-50 text-rose-500 font-bold px-2 py-0.5 rounded text-[10px]">
          Nghỉ phép
        </span>
      );
    default:
      return (
        <span className="bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded text-[10px]">
          {status}
        </span>
      );
  }
};

interface Props {
  isOpen: boolean;
  selectedOrder: RepairRequest | null;
  onClose: () => void;
  onAssign: (orderId: string | number, technicianName: string) => void;
}

export const AssignTechnicianModal: React.FC<Props> = ({
  isOpen,
  selectedOrder,
  onClose,
  onAssign,
}) => {
  const [selectedTechId, setSelectedTechId] = useState<string>("");

  if (!isOpen || !selectedOrder) return null;

  const handleConfirmAssign = () => {
    const tech = MOCK_TECHNICIANS.find((t) => t.id === selectedTechId);
    if (tech) {
      onAssign(selectedOrder.id, tech.name);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      {/* Tăng max-w từ max-w-2xl lên max-w-3xl để rộng rãi hơn */}
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2 text-sky-900 font-bold text-lg">
            <UserCheck className="w-5 h-5 text-sky-700" />
            <span>Phân công Kỹ thuật viên</span>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thông tin đơn hàng được phân công */}
        <div className="p-5 bg-sky-50/50 space-y-4">
          {/* Thêm whitespace-nowrap và căn chỉnh flex để nằm trên 1 hàng */}
          <div className="flex items-center justify-between gap-3 text-xs text-slate-700 bg-sky-100/60 p-3 rounded-xl border border-sky-100 whitespace-nowrap overflow-x-auto">
            <span className="font-bold text-sky-900 flex items-center gap-1.5 shrink-0">
              <Pin className="w-4 h-4 text-red-500 fill-red-500 shrink-0" /> 
              Đang phân công cho đơn: #{selectedOrder.code}
            </span>
            
            <span className="text-slate-300">|</span>
            
            <span className="flex items-center gap-1 text-slate-600 truncate max-w-[280px]" title={selectedOrder.address}>
              <MapPin className="w-3.5 h-3.5 shrink-0" /> 
              <span className="truncate">{selectedOrder.address || "Chưa có địa chỉ"}</span>
            </span>
            
            <span className="text-slate-300">|</span>
            
            <span className="text-red-600 font-bold flex items-center gap-1.5 shrink-0">
              <Siren className="w-4 h-4 text-red-600 animate-pulse shrink-0" /> 
              Loại yêu cầu: {selectedOrder.priority || "Thường"}
            </span>
          </div>

          {/* Bộ lọc KTV */}
          <div className="grid grid-cols-12 gap-3 text-xs">
            <div className="col-span-5 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Gõ tên kỹ thuật viên..."
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-sky-500 bg-white"
              />
            </div>

            <div className="col-span-3">
              <select className="w-full p-2 border border-slate-200 rounded-lg bg-white outline-none">
                <option value="">Chuyên môn: Tất cả</option>
                <option value="Phần cứng">Phần cứng</option>
                <option value="Điện tử">Điện tử</option>
                <option value="Bảo trì">Bảo trì</option>
                <option value="Hệ thống">Hệ thống</option>
              </select>
            </div>

            <div className="col-span-2">
              <select className="w-full p-2 border border-slate-200 rounded-lg bg-white outline-none">
                <option value="">Trạng thái: Tất cả</option>
                <option value="AVAILABLE">Sẵn sàng</option>
                <option value="BUSY">Đang bận</option>
                <option value="OFFLINE">Ngoại tuyến</option>
                <option value="ON_LEAVE">Nghỉ phép</option>
              </select>
            </div>

            <div className="col-span-2">
              <select className="w-full p-2 border border-slate-200 rounded-lg bg-white outline-none">
                <option value="">Khu vực</option>
              </select>
            </div>
          </div>
        </div>

        {/* Danh sách KTV */}
        <div className="p-5 max-h-[300px] overflow-y-auto space-y-3">
          <table className="w-full text-left text-xs table-fixed">
            <thead>
              <tr className="text-slate-400 font-bold border-b border-slate-100 pb-2">
                <th className="pb-2 text-center w-16">ẢNH</th>
                <th className="pb-2 pl-3 w-32">CHUYÊN MÔN</th>
                <th className="pb-2 pl-2 w-36">HỌ TÊN</th>
                <th className="pb-2 text-center w-28">TRẠNG THÁI</th>
                <th className="pb-2 text-center w-24">ĐÁNH GIÁ</th>
                <th className="pb-2 text-center w-16">CHỌN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MOCK_TECHNICIANS.map((tech) => (
                <tr 
                  key={tech.id} 
                  onClick={() => setSelectedTechId(tech.id)}
                  className={`hover:bg-slate-50 transition cursor-pointer ${selectedTechId === tech.id ? "bg-sky-50/30" : ""}`}
                >
                  <td className="py-3 text-center">
                    {'avatarUrl' in tech && typeof tech.avatarUrl === 'string' && tech.avatarUrl ? (
                      <img 
                        src={tech.avatarUrl} 
                        alt={tech.name} 
                        className="w-8 h-8 rounded-full object-cover mx-auto border border-slate-200"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </td>

                  <td className="py-3 pl-3 font-semibold text-sky-800 truncate">
                    {tech.specialty || "Kỹ thuật"}
                  </td>

                  <td className="py-3 pl-2 font-bold text-slate-800 truncate">
                    {tech.name}
                  </td>

                  <td className="py-3 text-center">
                    {renderTechStatus(tech.status)}
                  </td>

                  <td className="py-3 text-center font-bold text-slate-700">
                    <span className="flex items-center justify-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {tech.rating}
                    </span>
                  </td>

                  <td className="py-3 text-center">
                    <input
                      type="radio"
                      name="technician"
                      checked={selectedTechId === tech.id}
                      onChange={() => setSelectedTechId(tech.id)}
                      className="w-4 h-4 text-sky-900 cursor-pointer"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-100 transition cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            disabled={!selectedTechId}
            onClick={handleConfirmAssign}
            className="px-4 py-2 bg-sky-900 hover:bg-sky-950 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <UserCheck className="w-4 h-4" /> Hoàn tất phân công
          </button>
        </div>

      </div>
    </div>
  );
};