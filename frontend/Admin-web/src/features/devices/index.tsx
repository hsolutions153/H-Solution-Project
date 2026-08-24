'use client';

import React, { useState } from "react";
import { DeviceFilterBar } from "./components/DeviceFilterBar";
import { DeviceTable } from "./components/DeviceTable";
import { Device } from "@/types/device";
import { AddDeviceModal } from "./components/AddDeviceModal";
import { EditDeviceModal } from "./components/EditDeviceModal";
import { ViewDeviceModal } from "./components/ViewDeviceModal";
import { ConfirmDeleteModal } from "@/components/common/ConfirmDeleteModal";

interface DeviceFeatureProps {
  data: Device[];
}

export const DeviceFeature: React.FC<DeviceFeatureProps> = ({ data }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // State Modal Cập nhật
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  // State Modal Xem Chi Tiết
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewDevice, setViewDevice] = useState<Device | null>(null);

  // State Modal Xóa
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedDeleteDevice, setSelectedDeleteDevice] = useState<Device | null>(null);

  const handleEditDevice = (device: Device) => {
    setSelectedDevice(device);
    setIsEditModalOpen(true);
  };

  const handleViewDevice = (device: Device) => {
    setViewDevice(device);
    setIsViewModalOpen(true);
  };

  const handleDeleteDevice = (device: Device) => {
    setSelectedDeleteDevice(device);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    console.log("Xác nhận xóa thiết bị:", selectedDeleteDevice);
    setIsDeleteModalOpen(false);
    setSelectedDeleteDevice(null);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 bg-slate-50/50 min-h-screen">
      <DeviceFilterBar onOpenAddModal={() => setIsAddModalOpen(true)} />
      
      {/* Truyền callback onView xuống Table */}
      <DeviceTable 
        data={data} 
        onEdit={handleEditDevice}
        onView={handleViewDevice}
        onDelete={handleDeleteDevice}
      />

      {/* Modal Thêm mới */}
      <AddDeviceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* Modal Cập nhật */}
      <EditDeviceModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedDevice(null);
        }}
        device={selectedDevice}
      />

      {/* Modal Xem chi tiết */}
      <ViewDeviceModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setViewDevice(null);
        }}
        device={viewDevice}
      />

      {/* Modal Xóa dùng chung */}
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedDeleteDevice(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};