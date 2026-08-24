import { HistoryFeature } from "@/features/history";
import { MOCK_REPAIR_HISTORY, MOCK_HISTORY_STATS } from "@/constants/mockHistory";

export default function HistoryPage() {
  return <HistoryFeature stats={MOCK_HISTORY_STATS} data={MOCK_REPAIR_HISTORY} />;
}