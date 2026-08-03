import React from "react";
import { UrgentRequest } from "@/types/dashboard";
import { PRIORITY_CONFIG } from "@/constants/orderStatus";

const mockRequests: UrgentRequest[] = [
  {
    id: "1",
    code: "#RP-9402",
    device: "Xe lăn điện Karma",
    issue: "Bánh xe bị kẹt cứng",
    customer: "Nguyễn Văn A",
    time: "10:45 AM",
    priority: "CRITICAL",
  },
  {
    id: "2",
    code: "#RP-9398",
    device: "Xe lăn điện Color 180",
    issue: "Hỏng bộ điều khiển (Joystick)",
    customer: "Trần Thị B",
    time: "09:30 AM",
    priority: "HIGH",
  },
  {
    id: "3",
    code: "#RP-9385",
    device: "Xe lăn điện dốc ngược",
    issue: "Lỗi sạc không vào điện",
    customer: "Lê Văn C",
    time: "Hôm qua",
    priority: "MEDIUM",
  },
  {
    id: "4",
    code: "#RP-9372",
    device: "Xe lăn điện Akiko",
    issue: "Đứt xích và rỉ sét trục bánh",
    customer: "Phạm Minh D",
    time: "Hôm qua",
    priority: "HIGH",
  },
];

export const EmergencyOrdersTable = () => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm w-full h-full flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2.5">
            <span className="text-red-600 font-extrabold text-base">!</span> Yêu
            cầu khẩn cấp gần đây
          </h3>
          <a
            href="#"
            className="text-xs text-blue-600 font-semibold hover:underline"
          >
            Xem tất cả
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="text-slate-400 border-b border-slate-100">
                <th className="pb-3.5 font-bold w-28">ID ĐƠN</th>
                <th className="pb-3.5 font-bold">THIẾT BỊ / LỖI</th>
                <th className="pb-3.5 font-bold">KHÁCH HÀNG</th>
                <th className="pb-3.5 font-bold">THỜI GIAN</th>
                <th className="pb-3.5 font-bold text-right">TRẠNG THÁI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mockRequests.map((req) => {
                const priority = PRIORITY_CONFIG[req.priority];
                return (
                  <tr
                    key={req.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-4 font-bold text-blue-600">{req.code}</td>
                    <td className="py-4 pr-4">
                      <div className="font-bold text-slate-900">
                        {req.device}
                      </div>
                      <div className="text-xs text-slate-500 font-medium mt-0.5">
                        {req.issue}
                      </div>
                    </td>
                    <td className="py-4 text-slate-700 font-semibold">
                      {req.customer}
                    </td>
                    <td className="py-4 text-slate-600 font-medium">
                      {req.time}
                    </td>
                    <td className="py-4 text-right">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${priority.bg} ${priority.text}`}
                      >
                        {priority.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
