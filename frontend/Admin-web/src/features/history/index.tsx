"use client";

import React, { useState } from "react";
import { HistoryStatsCards } from "./components/HistoryStatsCards";
import { HistoryTable } from "./components/HistoryTable";
import { HistoryDetailModal } from "./components/HistoryDetailModal";
import { RepairHistoryItem, HistoryStats } from "@/types/history";

interface HistoryFeatureProps {
  stats: HistoryStats;
  data: RepairHistoryItem[];
}

export const HistoryFeature: React.FC<HistoryFeatureProps> = ({
  stats,
  data,
}) => {
  const [selectedItem, setSelectedItem] = useState<RepairHistoryItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleViewDetail = (item: RepairHistoryItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 bg-slate-50/50 min-h-screen">
      <HistoryStatsCards stats={stats} />
      <HistoryTable data={data} onViewDetail={handleViewDetail} />
      
      {/* Modal Popup xem chi tiết */}
      <HistoryDetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        data={selectedItem}
      />
    </div>
  );
};