import React from "react";
import { Wrench, FileText } from "lucide-react";

interface Diagnosis {
  part: string;
  status: string;
  isError: boolean;
}

interface ServiceItem {
  name: string;
  price: number;
}

interface RepairQuoteTableProps {
  quoteStatus: string;
  diagnoses: Diagnosis[];
  services: ServiceItem[];
  note?: string;
}

export const RepairQuoteTable: React.FC<RepairQuoteTableProps> = ({
  quoteStatus,
  diagnoses,
  services,
  note,
}) => {
  const subTotal = services.reduce((sum, item) => sum + item.price, 0);
  const vat = subTotal * 0.1;
  const grandTotal = subTotal + vat;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-800">Chẩn đoán & Báo giá</h2>
          <p className="text-slate-400 text-[11px]">
            Phân tích của kỹ thuật viên & Ước tính chi phí
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Trạng thái báo giá:</span>
          <span className="bg-emerald-100 text-emerald-700 font-bold px-2.5 py-1 rounded-md text-[11px]">
            {quoteStatus}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Bảng Chẩn đoán lỗi */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <Wrench className="w-4 h-4 text-sky-800" /> Chẩn đoán lỗi
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-[11px]">
                <th className="py-2">Thành phần</th>
                <th className="py-2">Tình trạng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {diagnoses.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-2.5 font-bold text-slate-700">{item.part}</td>
                  <td
                    className={`py-2.5 font-semibold ${
                      item.isError ? "text-rose-600" : "text-slate-600"
                    }`}
                  >
                    {item.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Linh kiện & Dịch vụ */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <FileText className="w-4 h-4 text-sky-800" /> Linh kiện & Dịch vụ
          </div>
          <table className="w-full text-left border-collapse">
            <tbody className="divide-y divide-slate-50">
              {services.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-2 text-slate-700">{item.name}</td>
                  <td className="py-2 text-right font-bold text-slate-800">
                    {item.price.toLocaleString("vi-VN")} đ
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-slate-100 pt-3 space-y-1.5 text-right">
            <div className="flex justify-between text-slate-400">
              <span>Tạm tính:</span>
              <span className="font-semibold text-slate-700">
                {subTotal.toLocaleString("vi-VN")} đ
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Thuế (VAT 10%):</span>
              <span className="font-semibold text-slate-700">
                {vat.toLocaleString("vi-VN")} đ
              </span>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-100">
              <span>Tổng chi phí:</span>
              <span className="text-base text-sky-900">
                {grandTotal.toLocaleString("vi-VN")} đ
              </span>
            </div>
          </div>
        </div>
      </div>

      {note && (
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Ghi chú nội bộ</p>
          <p className="text-slate-600 text-[11px] font-semibold">{note}</p>
        </div>
      )}
    </div>
  );
};