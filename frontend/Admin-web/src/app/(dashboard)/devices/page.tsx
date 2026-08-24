import { DeviceFeature } from "@/features/devices";
import { MOCK_DEVICES } from "@/constants/mockDevices";

export default function DevicesPage() {
  return <DeviceFeature data={MOCK_DEVICES} />;
}