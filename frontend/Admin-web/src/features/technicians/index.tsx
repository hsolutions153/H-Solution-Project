'use client';

import React, { useState } from "react";
import { TechnicianFilterBar } from "./components/TechnicianFilterBar";
import { TechnicianTable } from "./components/TechnicianTable";
import { AddTechnicianModal } from "./components/AddTechnicianModal";
import { EditTechnicianModal } from "./components/EditTechnicianModal";
import { ViewTechnicianModal } from "./components/ViewTechnicianModal";
import { ConfirmDeleteModal } from "@/components/common/ConfirmDeleteModal";
import { Technician } from "@/types/technician";

interface TechnicianFeatureProps {
  data: Technician[];
}

export const TechnicianFeature: React.FC<TechnicianFeatureProps> = ({ data }) => {
  // State Modal Thêm mới
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // State Modal Cập nhật
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null);

  // State Modal Xem chi tiết (Mới thêm)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewTechnician, setViewTechnician] = useState<Technician | null>(null);

  // State Modal Xóa
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedDeleteTechnician, setSelectedDeleteTechnician] = useState<Technician | null>(null);

  // Mở modal xem chi tiết
  const handleViewTechnician = (technician: Technician) => {
    setViewTechnician(technician);
    setIsViewModalOpen(true);
  };

  // Mở modal sửa
  const handleEditTechnician = (technician: Technician) => {
    setSelectedTechnician(technician);
    setIsEditModalOpen(true);
  };

  // Mở modal xóa
  const handleDeleteTechnician = (technician: Technician) => {
    setSelectedDeleteTechnician(technician);
    setIsDeleteModalOpen(true);
  };

  // Xác nhận xóa
  const handleConfirmDelete = () => {
    console.log("Xác nhận xóa KTV:", selectedDeleteTechnician);
    setIsDeleteModalOpen(false);
    setSelectedDeleteTechnician(null);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 bg-slate-50/50 min-h-screen">
      <TechnicianFilterBar onOpenAddModal={() => setIsAddModalOpen(true)} />
      
      {/* Gắn handleViewTechnician vào prop onView */}
      <TechnicianTable 
        data={data} 
        onView={handleViewTechnician}
        onEdit={handleEditTechnician} 
        onDelete={handleDeleteTechnician}
      />

      {/* Modal Thêm mới */}
      <AddTechnicianModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* Modal Cập nhật */}
      <EditTechnicianModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedTechnician(null);
        }}
        technician={selectedTechnician}
      />

      {/* Modal Xem chi tiết (Mới thêm) */}
      <ViewTechnicianModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setViewTechnician(null);
        }}
        technician={viewTechnician}
      />

      {/* Modal Xóa dùng chung */}
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedDeleteTechnician(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};