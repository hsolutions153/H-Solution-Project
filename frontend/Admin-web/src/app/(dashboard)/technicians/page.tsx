import { TechnicianFeature } from "@/features/technicians";
import { MOCK_TECHNICIANS } from "@/constants/mockTechnicians";

export default function TechniciansPage() {
  return <TechnicianFeature data={MOCK_TECHNICIANS} />;
}