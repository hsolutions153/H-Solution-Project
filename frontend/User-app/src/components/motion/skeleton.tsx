import { cn } from "@h-mobility/ui";

/** Shimmering placeholder block. Size it with Tailwind classes to match the real content. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

function LoadingRegion({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className} role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** Generic page body used by the route-level `loading.tsx`. */
export function PageBodySkeleton() {
  return (
    <LoadingRegion label="Đang tải trang..." className="mx-auto w-full max-w-[480px] space-y-4 pb-4">
      <Skeleton className="h-28 rounded-card" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-24 rounded-card" />
        <Skeleton className="h-24 rounded-card" />
      </div>
      <Skeleton className="h-4 w-32" />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-16 rounded-card" />
      ))}
    </LoadingRegion>
  );
}

/** Mirrors `.device-card`: image area, title, meta line, badges and the action row. */
export function DeviceListSkeleton({ count = 2 }: { count?: number }) {
  return (
    <LoadingRegion label="Đang tải phương tiện..." className="device-grid">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="device-card">
          <Skeleton className="h-[220px] rounded-none" />
          <div className="device-card-body space-y-2.5">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex gap-1.5">
              <Skeleton className="h-4 w-14 rounded-full" />
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
            <div className="device-card-actions">
              <Skeleton className="h-[42px] rounded-control" />
              <Skeleton className="h-[42px] rounded-control" />
              <Skeleton className="h-[42px] rounded-control" />
            </div>
          </div>
        </div>
      ))}
    </LoadingRegion>
  );
}

/** Device detail and device edit: header row, large photo, then spec rows. */
export function DeviceDetailSkeleton({ label = "Đang tải thông tin xe..." }: { label?: string }) {
  return (
    <LoadingRegion label={label} className="device-detail-page space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <Skeleton className="h-6 w-44" />
      </div>
      <Skeleton className="h-[240px] rounded-card" />
      <div className="space-y-3 rounded-card border border-line bg-surface p-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3.5 w-28" />
          </div>
        ))}
      </div>
      <Skeleton className="h-12 rounded-control" />
    </LoadingRegion>
  );
}

/** Repair request detail: header, status card, progress steps and the cost card. */
export function HistoryDetailSkeleton() {
  return (
    <LoadingRegion label="Đang tải chi tiết yêu cầu..." className="space-y-4 px-5 pt-4 pb-28">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <div className="space-y-3 rounded-card border border-line bg-surface p-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="size-12 rounded-control" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      </div>
      <div className="flex justify-between gap-2 rounded-card border border-line bg-surface p-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-2">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-2.5 w-full max-w-12" />
          </div>
        ))}
      </div>
      <div className="space-y-3 rounded-card border border-line bg-surface p-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex justify-between">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3.5 w-20" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}
