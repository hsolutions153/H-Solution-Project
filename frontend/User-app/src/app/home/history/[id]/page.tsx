import { HomeShell } from "@/components/home/home-shell";
import { HistoryDetail } from "@/components/home/history/history-detail";

export default function HistoryDetailPage() {
  return (
    <HomeShell activeNav="history" hideHeader>
      <HistoryDetail />
    </HomeShell>
  );
}
