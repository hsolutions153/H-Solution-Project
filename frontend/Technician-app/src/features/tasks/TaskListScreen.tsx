"use client";

import React, { useState, useEffect, useMemo } from "react";
import { TaskTabs } from "./components/TaskTabs";
import { TaskCard } from "./components/TaskCard";
import { NewAssignmentModal } from "./components/NewAssignmentModal";
import { RejectTaskModal } from "./components/RejectTaskModal";
import { TaskDetailScreen } from "./TaskDetailScreen";
import { CreateTaskScreen } from "./components/CreateTaskScreen";

import { MOCK_TASKS } from "@/constants/mockTasks";
import { Task, TaskStatus, HistoryTask } from "@/types/task";
import { Plus } from "lucide-react";
import { createPortal } from "react-dom";

interface TaskListScreenProps {
  onCompleteRepair?: (completedTask: HistoryTask) => void;
}

export const TaskListScreen: React.FC<TaskListScreenProps> = ({
  onCompleteRepair,
}) => {
  const [activeTab, setActiveTab] = useState("today");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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

  useEffect(() => {
    let isMounted = true;
    async function loadTechnicianTasks() {
      try {
        const { fetchApi } = await import("@/lib/api-client");
        const res = await fetchApi<any>("/repair-requests/technician/me");
        if (res && Array.isArray(res.items)) {
          const apiTasks: Task[] = res.items.map((item: any) => {
            let status: TaskStatus = "PENDING";
            let statusText = "Chưa bắt đầu";
            if (item.status === "ASSIGNED") {
              status = "WAITING_ACCEPT";
              statusText = "Chờ phản hồi";
            } else if (item.status === "ACCEPTED") {
              status = "PENDING";
              statusText = "Chờ di chuyển";
            } else if (item.status === "EN_ROUTE") {
              status = "MOVING";
              statusText = "Đang di chuyển";
            } else if (item.status === "ARRIVED") {
              status = "ARRIVED";
              statusText = "Đã đến nơi";
            } else if (item.status === "DIAGNOSING") {
              status = "DIAGNOSING";
              statusText = "Đang chẩn đoán";
            } else if (item.status === "WAITING_FOR_APPROVAL" || item.status === "ESTIMATE_SUBMITTED") {
              status = "WAITING_FOR_APPROVAL";
              statusText = "Chờ khách duyệt báo giá";
            } else if (item.status === "ESTIMATE_APPROVED") {
              status = "ESTIMATE_APPROVED";
              statusText = "Báo giá đã duyệt";
            } else if (item.status === "ESTIMATE_REJECTED") {
              status = "ESTIMATE_REJECTED";
              statusText = "Báo giá bị từ chối";
            } else if (item.status === "REPAIRING") {
              status = "REPAIRING";
              statusText = "Đang sửa chữa";
            } else if (item.status === "COMPLETED") {
              status = "COMPLETED";
              statusText = "Hoàn thành";
            } else if (item.status === "CANCELLED" || item.status === "REJECTED") {
              status = "CANCELLED";
              statusText = "Đã từ chối";
            }

            const cust = item.customer || {};
            const dev = item.device || {};
            const imgList = (item.images || []).map((img: any) => typeof img === "string" ? img : (img.image_url || img.url)).filter(Boolean);

            const isSystemId = (str: string) => /^[0-9A-F]{8,12}$/i.test(str) || /^(USR|TCH|DEV|ADM)\d+$/i.test(str);
            const customerName = cust.full_name || item.customer_name || (item.customer_id && !isSystemId(item.customer_id) ? item.customer_id : "Khách hàng");
            const customerPhone = cust.phone || item.customer_phone || item.phone || "0912 345 678";

            const bookingDate = item.booking_date || (item.is_sos ? "Khẩn cấp (SOS)" : "Hôm nay");
            let bookingSlot = item.booking_slot || "Ngay bây giờ";
            if (item.issue_description && item.issue_description.includes("[Hẹn:")) {
              const match = item.issue_description.match(/\[Hẹn:\s*([^\]]+)\]/);
              if (match) {
                bookingSlot = match[1];
              }
            }

            return {
              id: item.id,
              code: item.request_code || item.id,
              serviceName: item.is_sos ? "Cứu hộ khẩn cấp (SOS)" : `Sửa chữa ${item.issue_type || "thiết bị"}`,
              deviceInfo: dev.model_name ? `${dev.manufacturer || ""} ${dev.model_name}` : `Xe lăn điện ${dev.device_type || ""}`,
              customerName,
              customerPhone,
              address: item.location_address || cust.address || "Địa chỉ không xác định",
              distance: "2.5 km",
              time: item.created_at ? new Date(item.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "Vừa xong",
              isEmergency: item.is_sos || false,
              status,
              statusText,
              description: item.issue_description || "Khách hàng yêu cầu kiểm tra sửa chữa thiết bị.",
              images: imgList,
              bookingDate,
              bookingSlot,
              totalAmount: item.total_amount
                ? Number(item.total_amount)
                : item.quote?.estimated_price
                ? Number(item.quote.estimated_price)
                : 0,
              quote: item.quote,
            };
          });

          if (isMounted) {
            setTasks((prev) => {
              const isSame =
                prev.length === apiTasks.length &&
                prev.every((pt, idx) => {
                  const nt = apiTasks[idx];
                  return (
                    pt.id === nt.id &&
                    pt.status === nt.status &&
                    pt.statusText === nt.statusText &&
                    pt.quote?.status === nt.quote?.status &&
                    pt.totalAmount === nt.totalAmount
                  );
                });
              return isSame ? prev : apiTasks;
            });

            // Tự động bật Modal tiếp nhận đơn mới cho KTV được chỉ định nếu chưa xử lý
            const incomingTask = apiTasks.find((t) => t.status === "WAITING_ACCEPT");
            if (incomingTask) {
              setSelectedTask((prev) => {
                if (!prev || (prev.id !== incomingTask.id && prev.status !== "WAITING_ACCEPT")) {
                  setIsModalOpen(true);
                  return incomingTask;
                }
                return prev;
              });
            }
          }
        }
      } catch (err) {
        console.warn("Using fallback tasks:", err);
      }
    }

    loadTechnicianTasks();
    const interval = setInterval(loadTechnicianTasks, 2500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

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

    import("@/lib/api-client").then(({ fetchApi }) => {
      fetchApi(`/repair-requests/${taskId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "ACCEPTED" }),
      }).catch((err) => console.error("Error accepting task:", err));
    });
  };

  const handleRejectAssignment = (taskId: string) => {
    setIsModalOpen(false);
    setRejectTaskId(taskId);
    setIsRejectModalOpen(true);
  };

  const handleTimeoutAssignment = (taskId: string) => {
    setIsModalOpen(false);
    setSelectedTask(null);
    handleConfirmReject(
      taskId,
      "Quá thời gian phản hồi (2 phút)",
      "Hệ thống tự động chuyển đơn cho kỹ thuật viên khác"
    );
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

    const cancelReason = [reason, note].filter(Boolean).join(" - ");
    import("@/lib/api-client").then(({ fetchApi }) => {
      fetchApi(`/repair-requests/${taskId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "REJECTED", cancel_reason: cancelReason }),
      }).catch((err) => console.error("Error rejecting task:", err));
    });
  };

  const handleUpdateTaskStatus = (
    taskId: string,
    status: TaskStatus,
    statusText: string,
    explicitBackendStatus?: string
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

    let backendStatus = explicitBackendStatus;
    if (!backendStatus) {
      if (status === "ACCEPTED" || statusText === "Tiếp nhận đơn" || statusText === "Đã xác nhận lịch") {
        backendStatus = "ACCEPTED";
      } else if (status === "WAITING_MOVE" || statusText === "Chờ di chuyển" || statusText === "Xác nhận di chuyển" || status === "MOVING" || statusText === "Đang di chuyển") {
        backendStatus = "EN_ROUTE";
      } else if (status === "ARRIVED" || statusText === "Đã đến nơi") {
        backendStatus = "ARRIVED";
      } else if (status === "DIAGNOSING" || statusText === "Đang chẩn đoán" || statusText === "Bắt đầu công việc" || statusText === "Chẩn đoán" || statusText === "Chờ thực hiện") {
        backendStatus = "DIAGNOSING";
      } else if (status === "WAITING_FOR_APPROVAL" || statusText === "Đã gửi báo giá" || statusText === "Chờ khách duyệt báo giá") {
        backendStatus = "WAITING_FOR_APPROVAL";
      } else if (status === "ESTIMATE_APPROVED" || statusText === "Báo giá đã duyệt") {
        backendStatus = "ESTIMATE_APPROVED";
      } else if (status === "REPAIRING" || statusText === "Đang sửa chữa" || statusText === "Đang thực hiện" || status === "IN_PROGRESS") {
        backendStatus = "REPAIRING";
      } else if (status === "COMPLETED" || statusText === "Hoàn thành") {
        backendStatus = "COMPLETED";
      } else if (status === "CANCELLED" || (status as string) === "REJECTED") {
        backendStatus = "CANCELLED";
      }
    }

    if (backendStatus) {
      import("@/lib/api-client").then(({ fetchApi }) => {
        fetchApi(`/repair-requests/${taskId}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: backendStatus }),
        }).catch((err) => console.warn("Error syncing status to backend:", err));
      });
    }
  };

  const filteredTasks = useMemo(() => {
    switch (activeTab) {
      case "new":
        return tasks.filter(
          (t) => t.status === "WAITING_ACCEPT" || t.status === "PENDING"
        );
      case "doing":
        return tasks.filter(
          (t) =>
            t.status === "IN_PROGRESS" ||
            t.status === "WAITING_MOVE" ||
            t.status === "MOVING" ||
            t.status === "ARRIVED" ||
            t.status === "WAITING_CONFIRM" ||
            t.status === "DIAGNOSING" ||
            t.status === "WAITING_FOR_APPROVAL" ||
            t.status === "ESTIMATE_APPROVED" ||
            t.status === "ESTIMATE_REJECTED" ||
            t.status === "REPAIRING"
        );
      case "done":
        return tasks.filter((t) => t.status === "COMPLETED");
      case "today":
      default:
        return tasks.filter((t) => t.status !== "CANCELLED");
    }
  }, [tasks, activeTab]);

  const TAB_TITLES: Record<string, string> = {
    today: "Công việc hôm nay",
    new: "Việc mới",
    doing: "Đang làm",
    done: "Đã hoàn tất",
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
        onCompleteRepair={(completedHistoryTask) => {
          if (onCompleteRepair) {
            onCompleteRepair(completedHistoryTask);
          }
        }}
        onBack={() => {
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
        {TAB_TITLES[activeTab] || TAB_TITLES.today} ({filteredTasks.length})
      </h1>

      <div className="space-y-3 px-4">
        {filteredTasks.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs font-medium">
            Không có công việc nào trong mục này
          </div>
        ) : (
          filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => handleCardClick(task)}
              onDetailClick={handleOpenDetail}
            />
          ))
        )}
      </div>

      {isClient && typeof document !== "undefined" && document.getElementById("fab-container") ? (
        createPortal(
          <button
            onClick={() => {
              sessionStorage.setItem("currentView", "create");
              setCurrentView("create");
            }}
            className="w-12 h-12 bg-sky-700 hover:bg-sky-800 rounded-2xl shadow-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 text-sky-200"
            title="Tạo công việc mới"
          >
            <Plus className="w-6 h-6 text-sky-200" strokeWidth={2.5} />
          </button>,
          document.getElementById("fab-container")!
        )
      ) : (
        <button
          onClick={() => {
            sessionStorage.setItem("currentView", "create");
            setCurrentView("create");
          }}
          className="absolute bottom-20 right-4 w-12 h-12 bg-sky-700 hover:bg-sky-800 rounded-2xl shadow-xl flex items-center justify-center z-30 transition-all cursor-pointer active:scale-95 text-sky-200"
          title="Tạo công việc mới"
        >
          <Plus className="w-6 h-6 text-sky-200" strokeWidth={2.5} />
        </button>
      )}

      <NewAssignmentModal
        isOpen={isModalOpen}
        task={selectedTask}
        onClose={() => setIsModalOpen(false)}
        onAccept={handleAcceptAssignment}
        onReject={handleRejectAssignment}
        onTimeout={handleTimeoutAssignment}
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