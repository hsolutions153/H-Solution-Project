import { HomeShell } from "@/components/home/home-shell";
import { HistoryList } from "@/components/home/history/history-list";

export default function HistoryPage() {
  return (
    <HomeShell activeNav="history">
      <HistoryList />
    </HomeShell>
  );
}
