"use client";

import React,{ useEffect,useMemo,useState } from "react";
import { CreateTaskScreen } from "./components/CreateTaskScreen";
import { HomeOverview } from "./components/HomeOverview";
import { NewAssignmentModal } from "./components/NewAssignmentModal";
import { RejectTaskModal } from "./components/RejectTaskModal";
import { TaskCard } from "./components/TaskCard";
import { TaskTabs } from "./components/TaskTabs";
import { TaskDetailScreen } from "./TaskDetailScreen";

import { HistoryTask,Task,TaskStatus } from "@/types/task";
import { EmptyState } from "@h-mobility/ui";
import { ClipboardList,Plus } from "lucide-react";
import { createPortal } from "react-dom";
import { mapApiTask } from "./mapApiTask";

const DOING_STATUSES: TaskStatus[] = [
  "IN_PROGRESS",
  "WAITING_MOVE",
  "MOVING",
  "ARRIVED",
  "WAITING_CONFIRM",
  "DIAGNOSING",
  "WAITING_FOR_APPROVAL",
  "ESTIMATE_APPROVED",
  "ESTIMATE_REJECTED",
  "REPAIRING",
];

function filterTasksByTab(tasks: Task[], tab: string): Task[] {
  switch (tab) {
    case "new":
      return tasks.filter((t) => t.status === "WAITING_ACCEPT" || t.status === "PENDING");
    case "doing":
      return tasks.filter((t) => DOING_STATUSES.includes(t.status));
    case "done":
      return tasks.filter((t) => t.status === "COMPLETED");
    case "today":
    default:
      return tasks.filter((t) => t.status !== "CANCELLED");
  }
}

interface TaskListScreenProps {
  onCompleteRepair?: (completedTask: HistoryTask) => void;
  view?: "home" | "tasks";
  onNavigate?: (tab: "home" | "tasks") => void;
}

export const TaskListScreen: React.FC<TaskListScreenProps> = ({
  onCompleteRepair,
  view = "tasks",
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState("today");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const [tasks, setTasks] = useState<Task[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedTasks = sessionStorage.getItem("tasksList");
        if (savedTasks) return JSON.parse(savedTasks);
      } catch {}
    }
    return [];
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
        const { fetchApiPages } = await import("@/lib/api-client");
        const res = await fetchApiPages<any>("/repair-requests/technician/me");
        if (res && Array.isArray(res.items)) {
          const apiTasks: Task[] = res.items.map(mapApiTask);

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
                    pt.quote?.id === nt.quote?.id &&
                    pt.quote?.reject_reason === nt.quote?.reject_reason &&
                    pt.approvedEstimate === nt.approvedEstimate &&
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
        console.warn("Lỗi tải danh sách công việc:", err);
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
    if (view === "home") onNavigate?.("tasks");

    (async () => {
      try {
        const { fetchApi } = await import("@/lib/api-client");
        await fetchApi(`/repair-requests/${taskId}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: "ACCEPTED" }),
        });
      } catch (err) {
        console.error("Lỗi khi tiếp nhận đơn:", err);
      }
    })();
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
    (async () => {
      try {
        const { fetchApi } = await import("@/lib/api-client");
        await fetchApi(`/repair-requests/${taskId}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: "REJECTED", cancel_reason: cancelReason }),
        });
      } catch (err) {
        console.error("Lỗi khi từ chối đơn:", err);
      }
    })();
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
      (async () => {
        try {
          const { fetchApi } = await import("@/lib/api-client");
          const updatedRequest = await fetchApi<any>(`/repair-requests/${taskId}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status: backendStatus }),
          });
          const updatedTask = mapApiTask(updatedRequest);
          setTasks((prev) => prev.map((task) => task.id === taskId ? updatedTask : task));
          setSelectedTask((prev) => {
            if (prev?.id !== taskId) return prev;
            sessionStorage.setItem("selectedTask", JSON.stringify(updatedTask));
            return updatedTask;
          });
        } catch (err) {
          console.warn("Lỗi đồng bộ trạng thái đơn lên máy chủ:", err);
        }
      })();
    }
  };

  const filteredTasks = useMemo(() => filterTasksByTab(tasks, activeTab), [tasks, activeTab]);
  const tabCounts = useMemo(
    () => Object.fromEntries(["today", "new", "doing", "done"].map((tab) => [tab, filterTasksByTab(tasks, tab).length])),
    [tasks]
  );

  const TAB_TITLES: Record<string, string> = {
    today: "Công việc hôm nay",
    new: "Việc mới",
    doing: "Đang làm",
    done: "Đã hoàn tất",
  };

  if (view === "tasks" && currentView === "create") {
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

  if (view === "tasks" && currentView === "detail") {
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

  const openCreate = () => {
    sessionStorage.setItem("currentView", "create");
    setCurrentView("create");
  };
  const fabContainer = isClient && typeof document !== "undefined" ? document.getElementById("fab-container") : null;
  const fab = (
    <button
      type="button"
      onClick={openCreate}
      className="flex size-14 items-center justify-center rounded-card bg-brand-600 text-white shadow-raised transition-[background-color,transform] hover:bg-brand-700 active:scale-95 cursor-pointer"
      aria-label="Tạo phiếu tiếp nhận mới"
      title="Tạo phiếu tiếp nhận mới"
    >
      <Plus className="size-6" strokeWidth={2.25} />
    </button>
  );

  const modals = (
    <>
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
    </>
  );

  if (view === "home") {
    return (
      <div className="relative pb-8">
        <HomeOverview
          tasks={tasks}
          onOpenTask={(task) => {
            if (task.status === "WAITING_ACCEPT") {
              setSelectedTask(task);
              setIsModalOpen(true);
              return;
            }
            sessionStorage.setItem("selectedTask", JSON.stringify(task));
            sessionStorage.setItem("currentView", "detail");
            onNavigate?.("tasks");
          }}
          onViewAll={() => onNavigate?.("tasks")}
        />
        {modals}
      </div>
    );
  }

  return (
    <div className="relative pb-28">
      <div className="px-4 pt-4">
        <h1 className="text-lg font-bold text-ink">Công việc</h1>
      </div>
      <TaskTabs activeTab={activeTab} setActiveTab={setActiveTab} counts={tabCounts} />

      <div className="flex items-baseline justify-between px-4 pt-3 pb-3">
        <h2 className="text-sm font-semibold text-ink">{TAB_TITLES[activeTab] || TAB_TITLES.today}</h2>
        <span className="text-xs font-medium text-slate-500 tabular-nums">{filteredTasks.length} công việc</span>
      </div>

      <div className="space-y-3 px-4">
        {filteredTasks.length === 0 ? (
          <EmptyState
            icon={<ClipboardList />}
            title="Chưa có công việc"
            description={
              activeTab === "new"
                ? "Yêu cầu mới được phân công cho bạn sẽ hiện ở đây."
                : "Không có công việc nào trong mục này."
            }
          />
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

      {fabContainer ? createPortal(fab, fabContainer) : <div className="absolute bottom-6 right-4 z-30">{fab}</div>}

      {modals}
    </div>
  );
};
