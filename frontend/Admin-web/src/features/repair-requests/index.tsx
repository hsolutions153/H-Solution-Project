'use client';

import React, { useState } from "react";
import { RepairFilterParams, RepairRequest } from "@/types/repairRequest";
import { MOCK_REPAIR_LIST } from "@/constants/repairOptions";
import { RepairFilterBar } from "./components/RepairFilterBar";
import { RepairTable } from "./components/RepairTable";
import { AssignTechnicianModal } from "./components/AssignTechnicianModal";

export default function RepairRequestsFeature() {
  const [filters, setFilters] = useState<RepairFilterParams>({});
  const [repairList, setRepairList] = useState<RepairRequest[]>(MOCK_REPAIR_LIST);

  // State quản lý việc hiển thị modal & đơn hàng đang chọn
  const [selectedOrder, setSelectedOrder] = useState<RepairRequest | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);

  // Hàm chuyển trạng thái từ CHỜ XÁC NHẬN (PENDING) -> CHỜ TIẾP NHẬN (AWAITING_RECEIPT)
  const handleConfirm = (id: string | number) => {
    setRepairList((prevList) =>
      prevList.map((item) =>
        item.id === id ? { ...item, status: "AWAITING_RECEIPT" } : item
      )
    );
  };

  // Cập nhật hàm mở Modal khi click "Phân công"
  const handleOpenAssignModal = (order: RepairRequest) => {
    setSelectedOrder(order);
    setIsAssignModalOpen(true);
  };

  // Hàm đóng Modal
  const handleCloseAssignModal = () => {
    setIsAssignModalOpen(false);
    setSelectedOrder(null);
  };

  // Hàm xử lý logic lưu kỹ thuật viên đã chọn
  const handleAssignTechnician = (orderId: string | number, technicianName: string) => {
    setRepairList((prevList) =>
      prevList.map((item) =>
        item.id === orderId
          ? {
              ...item,
              technician: technicianName,
              status: "AWAITING_RECEIPT", // Đã sửa: Giữ nguyên trạng thái Chờ tiếp nhận
            }
          : item
      )
    );
  };

  // Logic lọc dữ liệu
  const filteredData = repairList.filter((item) => {
    const matchSearch = filters.search
      ? item.code.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.customerName
          .toLowerCase()
          .includes(filters.search.toLowerCase()) ||
        item.device.toLowerCase().includes(filters.search.toLowerCase())
      : true;

    const matchStatus =
      filters.status && filters.status !== "ALL"
        ? item.status === filters.status
        : true;

    const matchPriority =
      filters.priority && filters.priority !== "ALL"
        ? item.priority === filters.priority
        : true;

    return matchSearch && matchStatus && matchPriority;
  });

  const handleReset = () => {
    setFilters({});
  };

  return (
    <div className="p-8 space-y-6">
      <RepairFilterBar
        filters={filters}
        onFilterChange={setFilters}
        onReset={handleReset}
      />
      
      <RepairTable 
        data={filteredData} 
        onConfirm={handleConfirm} 
        onOpenAssignModal={handleOpenAssignModal}
      />

      {/* Render AssignTechnicianModal */}
      <AssignTechnicianModal
        isOpen={isAssignModalOpen}
        selectedOrder={selectedOrder}
        onClose={handleCloseAssignModal}
        onAssign={handleAssignTechnician}
      />
    </div>
  );
}