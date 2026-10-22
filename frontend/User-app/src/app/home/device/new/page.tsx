import { HomeShell } from "@/components/home/home-shell";
import { DeviceForm } from "@/components/home/device-form";

export default function NewDevicePage() {
  return <HomeShell activeNav="device" hideHeader mainClassName="device-page-content"><DeviceForm /></HomeShell>;
}
