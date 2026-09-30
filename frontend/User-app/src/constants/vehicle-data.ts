/**
 * Danh mục chuẩn Thương hiệu, Dòng xe và Loại pin cho dịch vụ sửa chữa xe máy điện
 */

export interface VehicleModelItem {
  model: string;
  defaultBattery: string;
  deviceType: "SCOOTER";
  description?: string;
}

export interface VehicleBrandItem {
  id: string;
  name: string;
  country?: string;
  popular?: boolean;
  logo?: string;
  models: VehicleModelItem[];
}

export const BATTERY_TYPE_OPTIONS = [
  { value: "LFP", label: "Pin LFP (Lithium Iron Phosphate - Chống cháy nổ, bền bỉ)" },
  { value: "Lithium-ion", label: "Pin Lithium-ion (Li-ion NMC - Nhẹ, dung lượng cao)" },
  { value: "Ắc quy Chì-axit", label: "Ắc quy Chì-axit khô (Lead-Acid truyền thống)" },
  { value: "Ắc quy Graphene", label: "Ắc quy Graphene (Tuổi thọ cao, sạc nhanh)" },
  { value: "Pin tháo rời", label: "Pin tháo rời đổi trạm (Swappable Battery)" },
  { value: "Khác", label: "Loại pin khác (Tự nhập)" },
];

export const VEHICLE_BRANDS: VehicleBrandItem[] = [
  {
    id: "vinfast",
    name: "VinFast",
    country: "Việt Nam",
    popular: true,
    logo: "/brands/vinfast.svg",
    models: [
      { model: "Evo 200", defaultBattery: "LFP", deviceType: "SCOOTER", description: "Pin LFP 3.5 kWh, quãng đường 205km" },
      { model: "Evo 200 Lite", defaultBattery: "LFP", deviceType: "SCOOTER", description: "Pin LFP 3.5 kWh, giới hạn 49km/h" },
      { model: "Feliz S", defaultBattery: "LFP", deviceType: "SCOOTER", description: "Pin LFP 3.5 kWh, động cơ 3000W" },
      { model: "Klara S (2022)", defaultBattery: "LFP", deviceType: "SCOOTER", description: "Pin LFP 3.5 kWh" },
      { model: "Vento S", defaultBattery: "LFP", deviceType: "SCOOTER", description: "Pin LFP 3.5 kWh, động cơ IPM đặt bên" },
      { model: "Theon S", defaultBattery: "LFP", deviceType: "SCOOTER", description: "Pin LFP 3.5 kWh, công suất 7100W" },
      { model: "Feliz (Đời cũ)", defaultBattery: "Ắc quy Chì-axit", deviceType: "SCOOTER", description: "Ắc quy chì-axit 72V" },
      { model: "Klara A2", defaultBattery: "Ắc quy Chì-axit", deviceType: "SCOOTER", description: "Ắc quy chì-axit 72V 20Ah" },
      { model: "Impes", defaultBattery: "Lithium-ion", deviceType: "SCOOTER", description: "Pin LG Chem Lithium-ion" },
      { model: "Ludo", defaultBattery: "Lithium-ion", deviceType: "SCOOTER", description: "Pin LG Chem Lithium-ion" },
    ],
  },
  {
    id: "datbike",
    name: "Dat Bike",
    country: "Việt Nam",
    popular: true,
    logo: "/brands/datbike.svg",
    models: [
      { model: "Quantum", defaultBattery: "Lithium-ion", deviceType: "SCOOTER", description: "Pin Lithium-ion 72V 85Ah, 270km" },
      { model: "Quantum S1", defaultBattery: "Lithium-ion", deviceType: "SCOOTER", description: "Pin 72V 85Ah sạc nhanh 4h" },
      { model: "Quantum S2", defaultBattery: "Lithium-ion", deviceType: "SCOOTER", description: "Pin Lithium-ion, cốp 41L" },
      { model: "Weaver++", defaultBattery: "Lithium-ion", deviceType: "SCOOTER", description: "Pin Lithium-ion 72V, 200km" },
      { model: "Weaver 200", defaultBattery: "Lithium-ion", deviceType: "SCOOTER", description: "Pin Lithium-ion 72V" },
      { model: "Weaver", defaultBattery: "Lithium-ion", deviceType: "SCOOTER", description: "Dòng xe đầu tiên của Dat Bike" },
    ],
  },
  {
    id: "yadea",
    name: "Yadea",
    country: "Quốc tế",
    popular: true,
    logo: "/brands/yadea.svg",
    models: [
      { model: "Voltguard", defaultBattery: "Ắc quy Graphene", deviceType: "SCOOTER", description: "Ắc quy Graphene TTFAR thế hệ mới" },
      { model: "Ossy", defaultBattery: "Ắc quy Graphene", deviceType: "SCOOTER", description: "Ắc quy Graphene 72V 22Ah" },
      { model: "Orla", defaultBattery: "Ắc quy Graphene", deviceType: "SCOOTER", description: "Ắc quy TTFAR Graphene" },
      { model: "G5", defaultBattery: "Lithium-ion", deviceType: "SCOOTER", description: "Pin Panasonic Lithium 60V 24Ah" },
      { model: "BuyE", defaultBattery: "Ắc quy Graphene", deviceType: "SCOOTER", description: "Ắc quy Graphene 72V 20Ah" },
      { model: "Ulike", defaultBattery: "Ắc quy Graphene", deviceType: "SCOOTER", description: "Ắc quy Graphene 72V" },
      { model: "E3", defaultBattery: "Ắc quy Graphene", deviceType: "SCOOTER", description: "Ắc quy 60V 20Ah" },
      { model: "Odora S1", defaultBattery: "Ắc quy Graphene", deviceType: "SCOOTER", description: "Ắc quy TTFAR" },
    ],
  },
  {
    id: "pega",
    name: "Pega (HKbike)",
    country: "Việt Nam",
    popular: true,
    logo: "/brands/pega.svg",
    models: [
      { model: "NewTech", defaultBattery: "Ắc quy Chì-axit", deviceType: "SCOOTER", description: "Ắc quy 72V 20Ah, phanh đĩa CBS" },
      { model: "eSH", defaultBattery: "Ắc quy Chì-axit", deviceType: "SCOOTER", description: "Ắc quy chì-axit 72V" },
      { model: "Aura S / Aura 9", defaultBattery: "Ắc quy Chì-axit", deviceType: "SCOOTER", description: "Ắc quy 60V 20Ah" },
      { model: "Cap A9 / Cap A", defaultBattery: "Ắc quy Chì-axit", deviceType: "SCOOTER", description: "Ắc quy 48V" },
      { model: "Trans", defaultBattery: "Ắc quy Chì-axit", deviceType: "SCOOTER", description: "Ắc quy chì-axit 72V" },
    ],
  },
  {
    id: "dibao",
    name: "Dibao",
    country: "Đài Loan",
    popular: true,
    logo: "/brands/dibao.svg",
    models: [
      { model: "Pansy S2", defaultBattery: "Ắc quy Chì-axit", deviceType: "SCOOTER", description: "Ắc quy 60V (5 bình 20Ah)" },
      { model: "Gogo SS / Gogo Cross", defaultBattery: "Ắc quy Chì-axit", deviceType: "SCOOTER", description: "Ắc quy 60V 20Ah" },
      { model: "Creer E", defaultBattery: "Ắc quy Chì-axit", deviceType: "SCOOTER", description: "Ắc quy 60V 20Ah cổ điển" },
      { model: "Tesla Chic", defaultBattery: "Ắc quy Chì-axit", deviceType: "SCOOTER", description: "Ắc quy 60V 20Ah" },
      { model: "R1", defaultBattery: "Ắc quy Chì-axit", deviceType: "SCOOTER", description: "Ắc quy 60V" },
    ],
  },
  {
    id: "honda",
    name: "Honda",
    country: "Nhật Bản",
    popular: true,
    logo: "/brands/honda.svg",
    models: [
      { model: "Benly e:", defaultBattery: "Pin tháo rời", deviceType: "SCOOTER", description: "2 pin Honda Mobile Power Pack e: tháo rời" },
      { model: "U-Go / U-be", defaultBattery: "Lithium-ion", deviceType: "SCOOTER", description: "Pin Lithium 48V 30Ah" },
      { model: "Mono", defaultBattery: "Lithium-ion", deviceType: "SCOOTER", description: "Pin Lithium 60V" },
      { model: "Cub e:", defaultBattery: "Lithium-ion", deviceType: "SCOOTER", description: "Pin Lithium 48V 20Ah" },
      { model: "Dax e:", defaultBattery: "Lithium-ion", deviceType: "SCOOTER", description: "Pin Lithium 48V" },
    ],
  },
  {
    id: "yamaha",
    name: "Yamaha",
    country: "Nhật Bản",
    popular: true,
    logo: "/brands/yamaha.svg",
    models: [
      { model: "Neo's", defaultBattery: "Pin tháo rời", deviceType: "SCOOTER", description: "Pin Lithium-ion 51.1V 23.2Ah tháo rời" },
      { model: "EMF", defaultBattery: "Pin tháo rời", deviceType: "SCOOTER", description: "Pin trạm đổi Gogoro Network" },
      { model: "E-Vino", defaultBattery: "Lithium-ion", deviceType: "SCOOTER", description: "Pin Lithium-ion 50V" },
    ],
  },
];
