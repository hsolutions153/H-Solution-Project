import React from "react";
import { UrgentRequest } from "@/types/dashboard";
import { ORDER_STATUS_CONFIG } from "@/constants/orderStatus";
import { formatDateTime } from "@/utils/formatDate";
import { AlertTriangle } from "lucide-react";
// Mock data tạm thời.
// Sau này sẽ thay bằng dữ liệu lấy từ API.
const mockRequests: UrgentRequest[] = [
  {
    id: "1",
    code: "JOB-9402",
    device: "Xe lăn điện Karma",
    issue: "Bánh xe bị kẹt cứng",
    customer: "Nguyễn Văn A",
    createdAt: "2026-08-11T10:45:00",
    requestType: "SOS",
    status: "ASSIGNED",
  },
  {
    id: "2",
    code: "JOB-9398",
    device: "Xe lăn điện Color 180",
    issue: "Hỏng bộ điều khiển (Joystick)",
    customer: "Trần Thị B",
    createdAt: "2026-08-10T09:30:00",
    requestType: "Thường",
    status: "DIAGNOSING",
  },
  {
    id: "3",
    code: "JOB-9385",
    device: "Xe lăn điện dốc ngược",
    issue: "Lỗi sạc không vào điện",
    customer: "Lê Văn C",
    createdAt: "2026-08-09T18:00:00",
    requestType: "Thường",
    status: "COMPLETED",
  },
  {
    id: "4",
    code: "JOB-9372",
    device: "Xe lăn điện Akiko",
    issue: "Đứt xích và rỉ sét trục bánh",
    customer: "Phạm Minh D",
    createdAt: "2026-08-08T18:00:00",
    requestType: "SOS",
    status: "MOVING",
  },
];

export const EmergencyOrdersTable = () => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm w-full h-full flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
            Yêu cầu sửa chữa gần đây
          </h3>

          <a
            href="#"
            className="text-xs text-blue-600 font-semibold hover:underline"
          >
            Xem tất cả
          </a>
        </div>

        <div className="w-full">
          <table className="w-full text-left border-collapse text-xs table-fixed">
            <thead>
              <tr className="text-slate-400 border-b border-slate-100">
                <th className="pb-3.5 font-bold w-[13%]">MÃ ĐƠN</th>
                <th className="pb-3.5 font-bold w-[17%]">LOẠI THIẾT BỊ</th>
                <th className="pb-3.5 font-bold w-[20%]">MÔ TẢ LỖI</th>
                <th className="pb-3.5 font-bold w-[14%]">KHÁCH HÀNG</th>
                <th className="pb-3.5 font-bold w-[12%]">NGÀY TẠO</th>
                <th className="pb-3.5 font-bold w-[12%]">LOẠI YÊU CẦU</th>
                <th className="pb-3.5 font-bold text-right w-[12%]">
                  TRẠNG THÁI
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {mockRequests.map((req) => {
                const orderStatus = ORDER_STATUS_CONFIG[req.status];
                const isSos = req.requestType === "SOS";
                const formatted = formatDateTime(req.createdAt);

                return (
                  <tr
                    key={req.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    {/* Mã đơn */}
                    <td className="py-4 font-bold text-blue-600 truncate pr-1">
                      {req.code}
                    </td>

                    {/* Thiết bị */}
                    <td className="py-4 pr-2 truncate">
                      <div className="font-bold text-slate-900 truncate">
                        {req.device}
                      </div>
                    </td>

                    {/* Vấn đề */}
                    <td className="py-4 pr-2 truncate">
                      <div className="text-slate-500 font-medium truncate">
                        {req.issue}
                      </div>
                    </td>

                    {/* Khách hàng */}
                    <td className="py-4 text-slate-700 font-semibold truncate pr-1">
                      {req.customer}
                    </td>

                    {/* Ngày tạo */}
                    <td className="py-4 truncate pr-1">
                      <div className="font-bold text-slate-900">
                        {formatted.date}
                      </div>
                      <div className="text-slate-500 font-medium mt-0.5">
                        {formatted.time}
                      </div>
                    </td>

                    {/* Loại yêu cầu */}
                    <td className="py-4 truncate pr-1">
                      <span className="inline-flex items-center font-medium">
                        <span
                          className={`w-2 h-2 rounded-full mr-1.5 shrink-0 ${
                            isSos ? "bg-red-600" : "bg-emerald-500"
                          }`}
                        />
                        <span
                          className={
                            isSos ? "text-red-600 font-bold" : "text-slate-700"
                          }
                        >
                          {req.requestType}
                        </span>
                      </span>
                    </td>

                    {/* Trạng thái */}
                    <td className="py-4 text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full font-bold whitespace-nowrap text-[11px] ${orderStatus.bg} ${orderStatus.text}`}
                      >
                        {orderStatus.label}
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
