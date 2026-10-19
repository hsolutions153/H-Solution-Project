import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";

const brandFont = Be_Vietnam_Pro({
  variable: "--font-brand",
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "V-HCare - Kỹ Thuật Viên",
    template: "%s | V-HCare KTV",
  },
  description: "Cổng thông tin & Ứng dụng điều phối dành cho Kỹ thuật viên cứu hộ xe điện V-HCare",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#eef6fb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${brandFont.variable} h-full antialiased`}
    >
      <body>
        <div className="app-shell flex flex-col">{children}</div>
      </body>
    </html>
  );
}
