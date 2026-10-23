"use client";

import React,{ useEffect,useMemo,useRef,useState } from "react";
import { CreateTaskScreen } from "./components/CreateTaskScreen";
import { HomeOverview } from "./components/HomeOverview";
import { NewAssignmentModal } from "./components/NewAssignmentModal";
import { RejectTaskModal } from "./components/RejectTaskModal";
import { TaskCard } from "./components/TaskCard";
import { TaskTabs } from "./components/TaskTabs";
import { TaskDetailScreen } from "./TaskDetailScreen";

import { HistoryTask,Task,TaskStatus } from "@/types/task";
import { EmptyState } from "@h-mobility/ui";
import { ClipboardList, Plus, Search, X } from "lucide-react";
import { createPortal } from "react-dom";
import { mapApiTask, parseAppointment } from "./mapApiTask";
import { showAppNotice } from "@/components/AppNotice";

export type DateFilterType = "all" | "today" | "7days" | "month";

export const DATE_FILTERS: { id: DateFilterType; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "today", label: "Hôm nay" },
  { id: "7days", label: "7 ngày" },
  { id: "month", label: "1 tháng" },
];

function removeVietnameseTones(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

function getTaskDate(task: Task): Date {
  const apt = parseAppointment(task);
  if (apt.day) return apt.day;

  if (task.bookingDate) {
    if (task.bookingDate.toLowerCase().includes("hôm nay")) {
      return new Date();
    }
    const isoMatch = task.bookingDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    }
    const vnMatch = task.bookingDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (vnMatch) {
      return new Date(Number(vnMatch[3]), Number(vnMatch[2]) - 1, Number(vnMatch[1]));
    }
  }

  if (task.requestedTime && task.requestedTime.toLowerCase().includes("hôm nay")) {
    return new Date();
  }

  if (task.createdAt) {
    const d = new Date(task.createdAt);
    if (!isNaN(d.getTime())) return d;
  }

  return new Date();
}

function matchesDateFilter(task: Task, filter: DateFilterType): boolean {
  if (filter === "all") return true;

  const taskDate = getTaskDate(task);
  const now = new Date();

  const taskMidnight = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate()).getTime();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  if (filter === "today") {
    return taskMidnight === todayMidnight;
  }

  if (filter === "7days") {
    const sevenDaysAgo = todayMidnight - 7 * 24 * 60 * 60 * 1000;
    const sevenDaysLater = todayMidnight + 7 * 24 * 60 * 60 * 1000;
    return taskMidnight >= sevenDaysAgo && taskMidnight <= sevenDaysLater;
  }

  if (filter === "month") {
    const thirtyDaysAgo = todayMidnight - 30 * 24 * 60 * 60 * 1000;
    const thirtyDaysLater = todayMidnight + 30 * 24 * 60 * 60 * 1000;
    return taskMidnight >= thirtyDaysAgo && taskMidnight <= thirtyDaysLater;
  }

  return true;
}

function matchesSearchQuery(task: Task, query: string): boolean {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return true;

  const noTone = removeVietnameseTones(trimmed);

  const fieldsToSearch = [
    task.code,
    task.customerName,
    task.customerPhone,
    task.serviceName,
    task.deviceInfo,
    task.address,
    task.description,
    task.statusText,
  ];

  return fieldsToSearch.some((field) => {
    if (!field) return false;
    const lower = field.toLowerCase();
    if (lower.includes(trimmed)) return true;
    return removeVietnameseTones(lower).includes(noTone);
  });
}

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
    case "all":
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
  const [activeTab, setActiveTab] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateFilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
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
  const [statusError, setStatusError] = useState("");
  // Đếm các lần cập nhật trạng thái đang gửi lên máy chủ. Polling bỏ qua kết quả
  // tải về trong lúc đó, nếu không trạng thái cũ sẽ ghi đè trạng thái vừa chuyển.
  const statusMutationRef = useRef({ inFlight: 0, seq: 0 });
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
    const checkAndOpenTask = async (taskId: string) => {
      let targetTask = tasks.find((t) => t.id === taskId || t.code === taskId);
      if (!targetTask) {
        try {
          const { fetchApi } = await import("@/lib/api-client");
          const raw = await fetchApi<any>(`/repair-requests/${taskId}`);
          if (raw) {
            targetTask = mapApiTask(raw);
            setTasks((prev) => [targetTask!, ...prev.filter((p) => p.id !== targetTask!.id)]);
          }
        } catch (err: any) {
          if (err?.status === 403) {
            // Đơn có thể đã được điều phối lại trong lúc thông báo cũ còn hiển thị.
            // Đây là tình huống nghiệp vụ đã biết, không ghi rác vào console.
            showAppNotice("Đơn đã được chuyển cho kỹ thuật viên khác hoặc không còn thuộc quyền xử lý của bạn.");
          } else {
            console.warn("Lỗi tải chi tiết đơn từ thông báo:", err);
          }
        }
      }

      if (targetTask) {
        setSelectedTask(targetTask);
        sessionStorage.removeItem("technician_pending_task_id");
        if (targetTask.status === "WAITING_ACCEPT") {
          setIsModalOpen(true);
        } else {
          sessionStorage.setItem("selectedTask", JSON.stringify(targetTask));
          sessionStorage.setItem("currentView", "detail");
          setCurrentView("detail");
        }
      }
    };

    // Kiểm tra pending task từ sessionStorage (khi drawer vừa dispatch)
    const pendingId = sessionStorage.getItem("technician_pending_task_id");
    if (pendingId) {
      checkAndOpenTask(pendingId);
    }

    const handleCustomOpen = (e: Event) => {
      const customEvent = e as CustomEvent<{ taskId?: string }>;
      const tid = customEvent.detail?.taskId;
      if (tid) {
        checkAndOpenTask(tid);
      }
    };

    window.addEventListener("OPEN_TECHNICIAN_TASK", handleCustomOpen);
    return () => {
      window.removeEventListener("OPEN_TECHNICIAN_TASK", handleCustomOpen);
    };
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
    let inFlight = false;

    async function loadTechnicianTasks() {
      if (inFlight || (typeof document !== "undefined" && document.hidden)) return;
      inFlight = true;
      const startSeq = statusMutationRef.current.seq;
      try {
        const { fetchApi, getAuthToken } = await import("@/lib/api-client");
        if (!getAuthToken()) return;
        const res = await fetchApi<{ items: any[] }>("/repair-requests/technician/me?limit=50");
        const mutation = statusMutationRef.current;
        if (mutation.inFlight > 0 || mutation.seq !== startSeq) return;
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
              // Luôn đồng bộ task đang được backend giao vào modal. Điều kiện cũ
              // dùng `&&` khiến một task WAITING_ACCEPT cũ giữ chặt state và
              // ngăn task SOS mới được hiển thị.
              setIsModalOpen(true);
              setSelectedTask(incomingTask);
            } else {
              setSelectedTask((prev) => {
                if (prev?.status === "WAITING_ACCEPT") {
                  setIsModalOpen(false);
                  return null;
                }
                return prev;
              });
            }
          }
        }
      } catch (err: any) {
        if (err?.status === 401 || err?.status === 403) return;
        console.warn("Lỗi tải danh sách công việc:", err);
      } finally {
        inFlight = false;
      }
    }

    loadTechnicianTasks();
    const interval = setInterval(loadTechnicianTasks, 3000);
    const handleFocus = () => loadTechnicianTasks();
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, []);

  const handleAcceptAssignment = async (taskId: string) => {
    if (!selectedTask) return;
    try {
      const { fetchApi } = await import("@/lib/api-client");
      const acceptedRequest = await fetchApi<any>(`/repair-requests/${taskId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "ACCEPTED" }),
      });
      const updatedTask = mapApiTask(acceptedRequest);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));
      setSelectedTask(updatedTask);
      sessionStorage.setItem("selectedTask", JSON.stringify(updatedTask));
      sessionStorage.setItem("currentView", "detail");
      setIsModalOpen(false);
      setCurrentView("detail");
      if (view === "home") onNavigate?.("tasks");
    } catch (err: any) {
      // Không chuyển màn hình trước khi backend xác nhận. Nếu KTV đang có
      // đơn chưa hoàn tất, lỗi phải xuất hiện ngay tại bước nhận đơn,
      // không bị dồn tới lúc bấm "Bắt đầu di chuyển".
      showAppNotice(
        err?.message ||
          "Bạn đang có đơn chưa hoàn tất nên chưa thể nhận thêm đơn mới."
      );
      void (async () => {
        try {
          const { fetchApi } = await import("@/lib/api-client");
          const refreshed = await fetchApi<{ items: any[] }>("/repair-requests/technician/me?limit=50");
          setTasks(refreshed.items.map(mapApiTask));
        } catch {
          // Polling tiếp theo sẽ tự đồng bộ lại danh sách.
        }
      })();
    }
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
        console.warn("Đơn không còn thuộc KTV hoặc đã hết hạn nhận:", err);
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      }
    })();
  };

  const handleUpdateTaskStatus = (
    taskId: string,
    status: TaskStatus,
    statusText: string,
    explicitBackendStatus?: string
  ) => {
    setStatusError("");
    const previousTask = tasks.find((task) => task.id === taskId);
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
      } else if ((status as string) === "REJECTED") {
        backendStatus = "REJECTED";
      } else if (status === "CANCELLED") {
        backendStatus = "CANCELLED";
      }
    }

    if (backendStatus) {
      const mutation = statusMutationRef.current;
      mutation.inFlight += 1;
      mutation.seq += 1;
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
        } catch (err: any) {
          console.warn("Lỗi đồng bộ trạng thái đơn lên máy chủ:", err);
          // Không giữ trạng thái giả trên màn hình: lấy lại trạng thái thật từ máy chủ.
          let serverTask: Task | undefined = previousTask;
          try {
            const { fetchApi } = await import("@/lib/api-client");
            serverTask = mapApiTask(await fetchApi<any>(`/repair-requests/${taskId}`));
          } catch (reloadErr) {
            console.warn("Không tải lại được trạng thái đơn:", reloadErr);
          }
          if (serverTask) {
            const restored = serverTask;
            setTasks((prev) => prev.map((task) => task.id === taskId ? restored : task));
            setSelectedTask((prev) => {
              if (prev?.id !== taskId) return prev;
              sessionStorage.setItem("selectedTask", JSON.stringify(restored));
              return restored;
            });
          }
          setStatusError(err?.message || "Không thể cập nhật trạng thái đơn. Vui lòng thử lại.");
        } finally {
          mutation.inFlight -= 1;
          mutation.seq += 1;
        }
      })();
    }
  };

  const filteredTasks = useMemo(() => {
    const tabFiltered = filterTasksByTab(tasks, activeTab);
    const dateFiltered = tabFiltered.filter((task) => matchesDateFilter(task, dateFilter));
    return dateFiltered.filter((task) => matchesSearchQuery(task, searchQuery));
  }, [tasks, activeTab, dateFilter, searchQuery]);

  const tabCounts = useMemo(() => {
    const counts = Object.fromEntries(
      ["all", "new", "doing", "done"].map((tab) => [
        tab,
        filterTasksByTab(tasks, tab).length,
      ])
    );
    counts.today = counts.all;
    return counts;
  }, [tasks]);

  const TAB_TITLES: Record<string, string> = {
    all: "Tất cả công việc",
    today: "Tất cả công việc",
    new: "Việc mới",
    doing: "Đang làm",
    done: "Đã hoàn tất",
  };

  const getSectionTitle = () => {
    if (searchQuery.trim()) {
      return `Tìm kiếm: "${searchQuery.trim()}"`;
    }

    const tabLabel = TAB_TITLES[activeTab] || "Tất cả công việc";
    if (dateFilter === "all") {
      return tabLabel;
    }

    const dateLabels: Record<DateFilterType, string> = {
      all: "",
      today: "hôm nay",
      "7days": "7 ngày",
      month: "1 tháng",
    };

    if (activeTab === "all" || activeTab === "today") {
      return dateFilter === "today" ? "Công việc hôm nay" : `Công việc (${dateLabels[dateFilter]})`;
    }

    return `${tabLabel} (${dateLabels[dateFilter]})`;
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
      <>
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
        {statusError && (
          <div className="fixed inset-x-4 bottom-5 z-[60] mx-auto flex max-w-lg items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-raised" role="alert">
            <p className="min-w-0 flex-1 leading-relaxed">{statusError}</p>
            <button
              type="button"
              className="shrink-0 rounded-md p-1 text-amber-700 transition-colors hover:bg-amber-100"
              onClick={() => setStatusError("")}
              aria-label="Đóng thông báo lỗi"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
      </>
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
      {/* Title */}
      <div className="px-4 pt-4 pb-1">
        <h1 className="text-lg font-bold text-ink">Công việc</h1>
      </div>

      {/* Status Tabs */}
      <TaskTabs activeTab={activeTab} setActiveTab={setActiveTab} counts={tabCounts} />

      {/* Search & Date Filter Section */}
      <div className="px-4 pt-2 pb-1 space-y-2.5">
        {/* Search Field */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo mã đơn, khách hàng, số điện thoại, sự cố..."
            className="w-full h-10 pl-9 pr-9 text-xs rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Xóa tìm kiếm"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Date Filter Chips - Căn đều 4 cột cân đối */}
        <div className="grid grid-cols-4 gap-1.5">
          {DATE_FILTERS.map((f) => {
            const isActive = dateFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setDateFilter(f.id)}
                className={`py-1.5 text-center text-xs rounded-full font-medium transition-all cursor-pointer ${
                  isActive
                    ? "bg-brand-600 text-white shadow-xs font-semibold"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section Subtitle & Counter */}
      <div className="flex items-baseline justify-between px-4 pt-3 pb-3">
        <h2 className="text-sm font-semibold text-ink">{getSectionTitle()}</h2>
        <span className="text-xs font-medium text-slate-500 tabular-nums">{filteredTasks.length} công việc</span>
      </div>

      <div className="space-y-3 px-4">
        {filteredTasks.length === 0 ? (
          <EmptyState
            icon={<ClipboardList />}
            title="Chưa có công việc"
            description={
              searchQuery || dateFilter !== "all"
                ? "Không tìm thấy công việc phù hợp với bộ lọc hoặc từ khóa tìm kiếm."
                : activeTab === "new"
                ? "Yêu cầu mới được phân công cho bạn sẽ hiện ở đây."
                : "Không có công việc nào trong mục này."
            }
            action={
              searchQuery || dateFilter !== "all" ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setDateFilter("all");
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-brand-50 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition-colors cursor-pointer"
                >
                  Đặt lại bộ lọc
                </button>
              ) : undefined
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
