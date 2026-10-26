import { HomeShell } from "@/components/home/home-shell";
import { HistoryDetail } from "@/components/home/history/history-detail";

export default function HistoryDetailPage() {
  return (
    <HomeShell activeNav="history" hideHeader mainClassName="home-content--history-detail">
      <HistoryDetail />
    </HomeShell>
  );
}
