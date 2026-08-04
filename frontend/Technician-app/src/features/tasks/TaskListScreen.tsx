"use client";

import React, { useState, useEffect } from "react";
import { TaskTabs } from "./components/TaskTabs";
import { TaskCard } from "./components/TaskCard";
import { NewAssignmentModal } from "./components/NewAssignmentModal";
import { RejectTaskModal } from "./components/RejectTaskModal";
import { TaskDetailScreen } from "./TaskDetailScreen";
import { CreateTaskScreen } from "./components/CreateTaskScreen";

import { MOCK_TASKS } from "@/constants/mockTasks";
import { Task, TaskStatus, HistoryTask } from "@/types/task";
import { Plus } from "lucide-react";

interface TaskListScreenProps {
  onCompleteRepair?: (completedTask: HistoryTask) => void;
}

export const TaskListScreen: React.FC<TaskListScreenProps> = ({
  onCompleteRepair,
}) => {
  const [activeTab, setActiveTab] = useState("today");

  const [tasks, setTasks] = useState<Task[]>(() => {
    const savedTasks = sessionStorage.getItem("tasksList");
    return savedTasks ? JSON.parse(savedTasks) : MOCK_TASKS;
  });

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectTaskId, setRejectTaskId] = useState<string | null>(null);

  const [currentView, setCurrentView] = useState<"list" | "detail" | "create">(
    "list"
  );

  useEffect(() => {
    const savedView = sessionStorage.getItem("currentView") as
      | "list"
      | "detail"
      | "create"
      | null;
    const savedTask = sessionStorage.getItem("selectedTask");

    if (savedView === "detail" && savedTask) {
      setCurrentView("detail");
      const parsedTask = JSON.parse(savedTask);
      const latestTask = tasks.find((t) => t.id === parsedTask.id);
      setSelectedTask(latestTask || parsedTask);
    } else if (savedView === "create") {
      setCurrentView("create");
    }
  }, [tasks]);

  useEffect(() => {
    sessionStorage.setItem("tasksList", JSON.stringify(tasks));
  }, [tasks]);

  const handleCardClick = (task: Task) => {
    setSelectedTask(task);
    if (task.status === "WAITING_ACCEPT") {
      setIsModalOpen(true);
    } else {
      sessionStorage.setItem("selectedTask", JSON.stringify(task));
      sessionStorage.setItem("currentView", "detail");
      setCurrentView("detail");
    }
  };

  const handleOpenDetail = (task: Task) => {
    setSelectedTask(task);
    sessionStorage.setItem("selectedTask", JSON.stringify(task));
    sessionStorage.setItem("currentView", "detail");
    setCurrentView("detail");
  };

  const handleAcceptAssignment = (taskId: string) => {
    if (!selectedTask) return;
    const updatedTask: Task = {
      ...selectedTask,
      status: "PENDING",
      statusText: "Chưa bắt đầu",
    };
    setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));
    setSelectedTask(updatedTask);
    sessionStorage.setItem("selectedTask", JSON.stringify(updatedTask));
    sessionStorage.setItem("currentView", "detail");
    setIsModalOpen(false);
    setCurrentView("detail");
  };

  const handleRejectAssignment = (taskId: string) => {
    setIsModalOpen(false);
    setRejectTaskId(taskId);
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = (
    taskId: string,
    reason: string,
    note: string
  ) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? { ...task, status: "CANCELLED", statusText: "Đã từ chối" }
          : task
      )
    );
    setIsRejectModalOpen(false);
    setRejectTaskId(null);
    setSelectedTask(null);
  };

  const handleUpdateTaskStatus = (
    taskId: string,
    status: TaskStatus,
    statusText: string
  ) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, status, statusText } : task
      )
    );
    setSelectedTask((prev) => {
      if (!prev) return null;
      const updated = { ...prev, status, statusText };
      sessionStorage.setItem("selectedTask", JSON.stringify(updated));
      return updated;
    });
  };

  if (currentView === "create") {
    return (
      <CreateTaskScreen
        onBack={() => {
          sessionStorage.removeItem("currentView");
          setCurrentView("list");
        }}
        onSubmitSuccess={() => {
          sessionStorage.removeItem("currentView");
          setCurrentView("list");
        }}
      />
    );
  }

  if (currentView === "detail") {
    return (
      <TaskDetailScreen
        task={selectedTask}
        onBack={() => {
          if (selectedTask?.status === "COMPLETED" && onCompleteRepair) {
            // Đọc dữ liệu báo giá thực tế từ sessionStorage nếu có
            const savedQuote = sessionStorage.getItem("quoteData");
            const parsedQuote = savedQuote ? JSON.parse(savedQuote) : null;
            const finalAmount = parsedQuote?.totalAmount || "1.200.000đ";

            // Khởi tạo object map chính xác 100% với interface HistoryTask
            const completedHistoryTask: HistoryTask = {
              id: selectedTask.id,
              code: selectedTask.code || `FS-290${selectedTask.id}`,
              date: new Date().toLocaleDateString("vi-VN"), // Khắc phục thiếu date
              time: selectedTask.time || "Hôm nay",         // Khắc phục thiếu time
              serviceType: selectedTask.serviceName,         // Gán serviceName sang serviceType
              customerName: selectedTask.customerName,
              deviceInfo: selectedTask.serviceName,          // Khắc phục thiếu deviceInfo
              address: selectedTask.address,
              type: "repair",                                // Giá trị hợp lệ: "repair" hoặc "maintenance"
              totalAmount: finalAmount,                      // Chấp nhận string hoặc number
            };

            onCompleteRepair(completedHistoryTask);
          }

          sessionStorage.removeItem("selectedTask");
          sessionStorage.removeItem("currentView");
          sessionStorage.removeItem("subStep");
          setCurrentView("list");
          setSelectedTask(null);
        }}
        onUpdateStatus={handleUpdateTaskStatus}
      />
    );
  }

  return (
    <div className="relative pb-24">
      <TaskTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      <h1 className="text-sm font-bold text-slate-900 mb-3 px-4 mt-2">
        Công việc hôm nay ({tasks.length})
      </h1>

      <div className="space-y-3 px-4">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={() => handleCardClick(task)}
            onDetailClick={handleOpenDetail}
          />
        ))}
      </div>

      <button
        onClick={() => {
          sessionStorage.setItem("currentView", "create");
          setCurrentView("create");
        }}
        className="fixed bottom-20 right-197.5 w-12 h-12 bg-sky-700 hover:bg-sky-800 rounded-2xl shadow-xl flex items-center justify-center z-30 transition-all cursor-pointer active:scale-95"
      >
        <Plus className="w-6 h-6 text-sky-200" strokeWidth={2.5} />
      </button>

      <NewAssignmentModal
        isOpen={isModalOpen}
        task={selectedTask}
        onClose={() => setIsModalOpen(false)}
        onAccept={handleAcceptAssignment}
        onReject={handleRejectAssignment}
      />

      <RejectTaskModal
        isOpen={isRejectModalOpen}
        taskId={rejectTaskId}
        onClose={() => {
          setIsRejectModalOpen(false);
          setRejectTaskId(null);
        }}
        onConfirmReject={handleConfirmReject}
      />
    </div>
  );
};