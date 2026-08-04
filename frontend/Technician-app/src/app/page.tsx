"use client";

import { useState, useEffect } from "react";
import { LoginScreen } from "@/features/auth/LoginScreen";
import { ForgotPasswordScreen } from "@/features/auth/ForgotPasswordScreen";
import { VerifyOtpScreen } from "@/features/auth/VerifyOtpScreen";
import { ResetPasswordScreen } from "@/features/auth/ResetPasswordScreen";
import { TaskListScreen } from "@/features/tasks/TaskListScreen";
import { TaskHistoryScreen } from "@/features/tasks/components/TaskHistoryScreen";
import { AppLayout } from "@/components/AppLayout";
import { HistoryTask } from "@/types/task";

export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentView, setCurrentView] = useState<
    "login" | "forgot-password" | "verify-otp" | "reset-password"
  >("login");
  const [isMounted, setIsMounted] = useState(false);

  // Quản lý Tab hiển thị hiện tại trên BottomNav
  const [activeTab, setActiveTab] = useState<string>("home");

  // Quản lý dữ liệu công việc vừa hoàn thành
  const [lastCompletedTask, setLastCompletedTask] =
    useState<HistoryTask | null>(null);

  useEffect(() => {
    setIsMounted(true);
    const savedLoginState = sessionStorage.getItem("isLoggedIn");
    if (savedLoginState === "true") {
      setIsLoggedIn(true);
    }
  }, []);

  if (!isMounted) return null;

  // Xử lý khi hoàn tất sửa chữa: lưu dữ liệu & tự động chuyển sang tab History
  const handleCompleteRepair = (completedTask: HistoryTask) => {
    setLastCompletedTask(completedTask);
    setActiveTab("history");
  };

  // Đã đăng nhập -> Bọc vào AppLayout
  if (isLoggedIn) {
    return (
      <AppLayout
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        onLogout={() => {
          sessionStorage.removeItem("isLoggedIn");
          sessionStorage.removeItem("currentView");
          sessionStorage.removeItem("selectedTask");
          sessionStorage.removeItem("subStep");
          setIsLoggedIn(false);
          setCurrentView("login");
        }}
        onResetHome={() => {
          sessionStorage.removeItem("currentView");
          sessionStorage.removeItem("selectedTask");
          sessionStorage.removeItem("subStep");
        }}
      >
        {/* Tab 1: Trang chủ / Danh sách công việc */}
        {activeTab === "home" && (
          <TaskListScreen onCompleteRepair={handleCompleteRepair} />
        )}

        {/* Tab 2: Lịch trình */}
        {activeTab === "schedule" && (
          <div className="p-4 text-center text-xs text-slate-500 pt-10 font-medium">
            Màn hình Schedule (Lịch trình)
          </div>
        )}

        {/* Tab 3: Lịch sử công việc */}
        {activeTab === "history" && (
          <TaskHistoryScreen newCompletedTask={lastCompletedTask} />
        )}

        {/* Tab 4: Trang cá nhân */}
        {activeTab === "profile" && (
          <div className="p-4 text-center text-xs text-slate-500 pt-10 font-medium">
            Màn hình Profile (Tài khoản)
          </div>
        )}
      </AppLayout>
    );
  }

  // Các màn hình Quên mật khẩu / Login
  if (currentView === "forgot-password") {
    return (
      <ForgotPasswordScreen
        onBackToLogin={() => setCurrentView("login")}
        onSubmitSuccess={() => setCurrentView("verify-otp")}
      />
    );
  }

  if (currentView === "verify-otp") {
    return (
      <VerifyOtpScreen
        onBack={() => setCurrentView("forgot-password")}
        onVerifySuccess={() => setCurrentView("reset-password")}
      />
    );
  }

  if (currentView === "reset-password") {
    return (
      <ResetPasswordScreen
        onResetSuccess={() => {
          alert("Đặt lại mật khẩu thành công!");
          setCurrentView("login");
        }}
        onBackToLogin={() => setCurrentView("login")}
      />
    );
  }

  return (
    <LoginScreen
      onLoginSuccess={() => {
        sessionStorage.setItem("isLoggedIn", "true");
        setIsLoggedIn(true);
      }}
      onForgotPassword={() => setCurrentView("forgot-password")}
    />
  );
}