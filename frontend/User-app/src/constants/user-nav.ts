export type NavChild = {
  labelVi: string;
  labelEn: string;
  path: string;
};

export type NavGroup = {
  id: string;
  labelVi: string;
  labelEn: string;
  path: string;
  icon: string;
  children?: NavChild[];
};

export const userNavGroups: NavGroup[] = [
  {
    id: "dashboard",
    labelVi: "Bảng điều khiển",
    labelEn: "Bảng điều khiển",
    path: "/home",
    icon: "dashboard",
  },
  {
    id: "repair-request",
    labelVi: "Yêu cầu sửa chữa",
    labelEn: "Yêu cầu sửa chữa",
    path: "/user/requests/new",
    icon: "add_circle",
    children: [
      { labelVi: "Loại thiết bị", labelEn: "Loại thiết bị", path: "/user/requests/new?step=device-type" },
      { labelVi: "Vấn đề", labelEn: "Nhóm sự cố", path: "/user/requests/new?step=problem" },
      { labelVi: "Tải ảnh", labelEn: "Tải ảnh", path: "/user/requests/new?step=photo" },
      { labelVi: "Vị trí", labelEn: "Vị trí", path: "/user/requests/new?step=location" },
      { labelVi: "Gửi", labelEn: "Gửi yêu cầu", path: "/user/requests/new?step=submit" },
    ],
  },
  {
    id: "my-repairs",
    labelVi: "Sửa chữa của tôi",
    labelEn: "Sửa chữa của tôi",
    path: "/user/requests",
    icon: "build",
    children: [
      { labelVi: "Đang chờ", labelEn: "Đang chờ", path: "/user/requests?tab=waiting" },
      { labelVi: "Đã phân công", labelEn: "Đã phân công", path: "/user/requests?tab=assigned" },
      { labelVi: "Hoàn thành", labelEn: "Hoàn thành", path: "/user/requests?tab=completed" },
    ],
  },
  {
    id: "history",
    labelVi: "Lịch sử",
    labelEn: "Lịch sử sửa chữa",
    path: "/user/history",
    icon: "history",
  },
];

export const repairRequestSteps = [
  "device-type",
  "problem",
  "photo",
  "location",
  "submit",
] as const;

export type RepairRequestStep = (typeof repairRequestSteps)[number];

export function isRepairRequestStep(value: string | null): value is RepairRequestStep {
  return repairRequestSteps.includes(value as RepairRequestStep);
}
