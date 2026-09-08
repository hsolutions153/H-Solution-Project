import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "@/app/globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["vietnamese", "latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AdminRepair - H-Solution Platform",
  description: "Cổng điều phối & Quản trị hệ thống cứu hộ sửa chữa xe lăn điện, scooter H-Solution",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={`${beVietnamPro.variable} antialiased`}>
      <body className="bg-slate-50 text-slate-900 min-h-screen">
        {children}
      </body>
    </html>
  );
}