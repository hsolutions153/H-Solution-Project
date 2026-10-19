import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "@/app/globals.css";

const brandFont = Be_Vietnam_Pro({
  variable: "--font-brand",
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "V-HCare - Quản Trị Hệ Thống",
    template: "%s | V-HCare Admin",
  },
  description: "Cổng điều phối & Quản trị hệ thống cứu hộ sửa chữa xe điện V-HCare",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={`${brandFont.variable} antialiased`}>
      <body className="bg-canvas text-ink min-h-screen">
        {children}
      </body>
    </html>
  );
}
