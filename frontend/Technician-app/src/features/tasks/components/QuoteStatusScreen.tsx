"use client";

import React from "react";
import { Task } from "@/types/task";
import { MapPin, Clock, FileText, Phone, CheckCircle, XCircle, PencilLine, Wrench, Play } from "lucide-react";
import { Badge, Button, Card, buttonClasses } from "@h-mobility/ui";
import { ActionBar, ScreenHeader } from "@/components/ui";
import { isSupplementaryQuote } from "../mapApiTask";

interface QuoteStatusScreenProps {
  task: Task;
  onBack: () => void;
  onViewDetailQuote?: () => void;
  onContinueRepair: () => void;
  isApproved?: boolean;
}

const vnd = (n: number) => `${n.toLocaleString("vi-VN")} đ`;

// Màn hình trạng thái phản hồi báo giá từ khách hàng
export const QuoteStatusScreen: React.FC<QuoteStatusScreenProps> = ({
  task,
  onBack,
  onViewDetailQuote,
  onContinueRepair,
  isApproved = false,
}) => {
  let cachedQuote: any = null;
  try {
    const savedQuote = typeof window !== "undefined" ? sessionStorage.getItem("quoteData") : null;
    const parsedQuote = savedQuote ? JSON.parse(savedQuote) : null;
    if (parsedQuote?.repair_id === task.id) cachedQuote = parsedQuote;
  } catch {}
  const quoteObj = task.quote || task.quotes?.[0] || cachedQuote;
  const acceptedQuotes = (task.quotes || (task.quote ? [task.quote] : []))
    .filter((quote: any) => quote.status === "ACCEPTED");
  const hasApprovedQuote = acceptedQuotes.length > 0;
  const approvedEstimate = Number(task.approvedEstimate || acceptedQuotes.reduce(
    (sum: number, quote: any) => sum + Number(quote.estimated_price || 0), 0
  ));
  const supplementary = isSupplementaryQuote(task);

  const isRejected = task.status === "ESTIMATE_REJECTED" || (task.status !== "WAITING_FOR_APPROVAL" && quoteObj?.status === "REJECTED");
  const effectivelyApproved = !isRejected && task.status !== "WAITING_FOR_APPROVAL" && (isApproved || task.status === "ESTIMATE_APPROVED" || quoteObj?.status === "ACCEPTED");

  const displayTotal = Number(quoteObj?.estimated_price ?? quoteObj?.totalCost ?? task.totalAmount ?? 0);
  const rejectReason = quoteObj?.reject_reason || "Khách hàng chưa cung cấp lý do";

  const state = isRejected ? "rejected" : effectivelyApproved ? "approved" : "pending";
  const STATE_UI = {
    rejected: { tone: "danger" as const, badge: "Bị từ chối", icon: XCircle, iconClass: "bg-rose-50 text-rose-600" },
    approved: { tone: "success" as const, badge: "Đã phê duyệt", icon: CheckCircle, iconClass: "bg-emerald-50 text-emerald-600" },
    pending: { tone: "warning" as const, badge: "Chờ phê duyệt", icon: Clock, iconClass: "bg-amber-50 text-amber-600" },
  }[state];
  const StateIcon = STATE_UI.icon;
  // Nếu từ chối chi phí phát sinh, KTV vẫn tiếp tục hoàn tất các hạng mục đã được duyệt
  const canContinue = effectivelyApproved || (isRejected && hasApprovedQuote);

  const COPY = supplementary
    ? {
        title: "Chi phí phát sinh",
        heading: {
          pending: "Đã gửi chi phí phát sinh tới khách hàng",
          approved: "Khách hàng đã duyệt chi phí phát sinh",
          rejected: "Khách hàng từ chối chi phí phát sinh",
        }[state],
        body: {
          pending: "Sửa chữa đang tạm dừng. Bạn sẽ tiếp tục ngay khi khách hàng phản hồi.",
          approved: `Tiếp tục sửa chữa với tổng chi phí đã duyệt ${vnd(approvedEstimate)}.`,
          rejected: `Chỉ tiếp tục các hạng mục đã duyệt trước đó (${vnd(approvedEstimate)}).`,
        }[state],
        primary: "Tiếp tục sửa chữa",
        footer: {
          pending: "Nút sẽ mở khi khách hàng phản hồi khoản phát sinh.",
          approved: "Khoản phát sinh đã được cộng vào chi phí sửa chữa.",
          rejected: "Khoản phát sinh bị từ chối không được cộng vào chi phí sửa chữa.",
        }[state],
      }
    : {
        title: "Trạng thái báo giá",
        heading: {
          pending: "Đã gửi báo giá tới khách hàng",
          approved: "Khách hàng đã đồng ý báo giá",
          rejected: "Khách hàng từ chối báo giá",
        }[state],
        body: {
          pending: "Đang chờ khách hàng xác nhận báo giá trên ứng dụng của họ.",
          approved: "Bạn có thể bắt đầu sửa chữa theo báo giá đã duyệt.",
          rejected: "Cần điều chỉnh và gửi lại báo giá để khách hàng duyệt trước khi sửa chữa.",
        }[state],
        primary: "Bắt đầu sửa chữa",
        footer: {
          pending: "Nút sẽ mở khi khách hàng duyệt báo giá.",
          approved: "Khách hàng đã đồng ý báo giá.",
          rejected: "Báo giá chưa được duyệt nên chưa thể bắt đầu sửa chữa.",
        }[state],
      };

  return (
    <div className="space-y-4 px-4 pt-4">
      <ScreenHeader
        title={COPY.title}
        subtitle={`Mã đơn ${task.code}`}
        onBack={onBack}
        trailing={<Badge tone={STATE_UI.tone}>{STATE_UI.badge}</Badge>}
      />

      <Card className="space-y-1">
        <h2 className="text-sm font-bold text-ink">{task.serviceName}</h2>
        <p className="flex items-start gap-1.5 text-[13px] text-slate-600">
          <MapPin className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
          {task.address}
        </p>
      </Card>

      <Card padded={false}>
        <div className="flex flex-col items-center px-5 pt-6 pb-5 text-center">
          <span className={`flex size-14 items-center justify-center rounded-full ${STATE_UI.iconClass}`}>
            <StateIcon className="size-7" />
          </span>
          <h3 className="mt-4 text-lg font-bold text-ink">{COPY.heading}</h3>
          <p className="mt-1.5 max-w-[34ch] text-sm leading-relaxed text-slate-600">{COPY.body}</p>
          {isRejected ? (
            <p className="mt-3 w-full rounded-control border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-left text-[13px] text-rose-800">
              <span className="font-semibold">Lý do từ chối:</span> {rejectReason}
            </p>
          ) : null}
        </div>

        <dl className="grid grid-cols-2 divide-x divide-line border-t border-line">
          {supplementary ? (
            <>
              <div className="px-4 py-3.5">
                <dt className="text-xs text-slate-500">Chi phí phát sinh</dt>
                <dd className={`mt-0.5 text-base font-bold tabular-nums ${isRejected ? "text-slate-400 line-through" : "text-ink"}`}>
                  +{vnd(displayTotal)}
                </dd>
              </div>
              <div className="px-4 py-3.5">
                <dt className="text-xs text-slate-500">Tổng đã duyệt</dt>
                <dd className="mt-0.5 text-base font-bold tabular-nums text-ink">{vnd(approvedEstimate)}</dd>
              </div>
            </>
          ) : (
            <>
              <div className="px-4 py-3.5">
                <dt className="text-xs text-slate-500">Tổng báo giá</dt>
                <dd className="mt-0.5 text-base font-bold tabular-nums text-ink">
                  {displayTotal > 0 ? vnd(displayTotal) : "Chờ tính phí"}
                </dd>
              </div>
              <div className="px-4 py-3.5">
                <dt className="text-xs text-slate-500">Thời gian dự kiến</dt>
                <dd className="mt-0.5 text-base font-bold text-ink">{quoteObj?.estimatedTime || "2 giờ"}</dd>
              </div>
            </>
          )}
        </dl>

        {onViewDetailQuote ? (
          <button
            type="button"
            onClick={onViewDetailQuote}
            className="flex w-full items-center justify-center gap-1.5 border-t border-line py-3 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50 cursor-pointer rounded-b-card"
          >
            <FileText className="size-4" />
            {supplementary ? "Xem chi tiết khoản phát sinh" : "Xem chi tiết báo giá"}
          </button>
        ) : null}
      </Card>

      <ActionBar className="space-y-2.5">
        {state === "pending" && task.customerPhone ? (
          <a href={`tel:${task.customerPhone}`} className={buttonClasses("secondary", "lg", true)}>
            <Phone className="size-5" />
            Gọi nhắc khách hàng
          </a>
        ) : null}

        {state === "pending" && onViewDetailQuote ? (
          <Button size="lg" fullWidth variant="secondary" icon={<PencilLine className="size-5" />} onClick={onViewDetailQuote}>
            {supplementary ? "Sửa chi phí phát sinh" : "Sửa báo giá"}
          </Button>
        ) : null}

        {isRejected && supplementary && onViewDetailQuote ? (
          <Button size="lg" fullWidth variant="secondary" icon={<PencilLine className="size-5" />} onClick={onViewDetailQuote}>
            Gửi lại chi phí phát sinh
          </Button>
        ) : null}

        {isRejected && !hasApprovedQuote ? (
          <Button
            size="lg"
            fullWidth
            disabled={!onViewDetailQuote}
            icon={<PencilLine className="size-5" />}
            onClick={() => onViewDetailQuote?.()}
          >
            Điều chỉnh báo giá
          </Button>
        ) : (
          <Button
            size="lg"
            fullWidth
            disabled={!canContinue}
            icon={supplementary ? <Play className="size-5" /> : <Wrench className="size-5" />}
            onClick={() => {
              if (canContinue) onContinueRepair();
            }}
          >
            {COPY.primary}
          </Button>
        )}
        <p className="text-center text-xs text-slate-500">{COPY.footer}</p>
      </ActionBar>
    </div>
  );
};
