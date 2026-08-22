import { notFound } from "next/navigation";
import { HomeShell } from "@/components/home/home-shell";
import { DeviceForm } from "@/components/home/device-form";
import { readDevices } from "@/services/device-db";

export const dynamic = "force-dynamic";

export default async function EditDevicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const device = readDevices().find((item) => item.id === id);
  if (!device) notFound();
  return <HomeShell activeNav="device" hideHeader mainClassName="device-page-content"><DeviceForm device={device} /></HomeShell>;
}
