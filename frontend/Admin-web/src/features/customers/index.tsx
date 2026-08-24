'use client';

import React, { useState } from "react";
import { CustomerFilterBar } from "./components/CustomerFilterBar";
import { CustomerTable } from "./components/CustomerTable";
import { AddCustomerModal } from "./components/AddCustomerModal";
import { EditCustomerModal } from "./components/EditCustomerModal";
import { CustomerDetailModal } from "./components/CustomerDetailModal"; // Import Modal Xem Chi Tiết
import { ConfirmDeleteModal } from "@/components/common/ConfirmDeleteModal";
import { Customer } from "@/types/customer";

interface CustomerFeatureProps {
  data: Customer[];
}

export const CustomerFeature: React.FC<CustomerFeatureProps> = ({ data }) => {
  // State Modal Thêm mới
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // State Modal Cập nhật
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // State Modal Xem chi tiết
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedViewCustomer, setSelectedViewCustomer] = useState<Customer | null>(null);

  // State Modal Xóa
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedDeleteCustomer, setSelectedDeleteCustomer] = useState<Customer | null>(null);

  // Mở modal xem chi tiết
  const handleViewCustomer = (customer: Customer) => {
    setSelectedViewCustomer(customer);
    setIsDetailModalOpen(true);
  };

  // Mở modal sửa
  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsEditModalOpen(true);
  };

  // Mở modal xóa
  const handleDeleteCustomer = (customer: Customer) => {
    setSelectedDeleteCustomer(customer);
    setIsDeleteModalOpen(true);
  };

  // Xác nhận xóa
  const handleConfirmDelete = () => {
    console.log("Xác nhận xóa khách hàng:", selectedDeleteCustomer);
    setIsDeleteModalOpen(false);
    setSelectedDeleteCustomer(null);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 bg-slate-50/50 min-h-screen">
      <CustomerFilterBar onOpenAddModal={() => setIsAddModalOpen(true)} />
      
      {/* Truyền callback onView, onEdit và onDelete xuống Table */}
      <CustomerTable 
        data={data} 
        onView={handleViewCustomer}
        onEdit={handleEditCustomer} 
        onDelete={handleDeleteCustomer}
      />

      {/* Modal Thêm mới */}
      <AddCustomerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* Modal Cập nhật */}
      <EditCustomerModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedCustomer(null);
        }}
        customer={selectedCustomer}
      />

      {/* Modal Xem chi tiết */}
      <CustomerDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedViewCustomer(null);
        }}
        customer={selectedViewCustomer}
      />

      {/* Modal Xóa dùng chung */}
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedDeleteCustomer(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};