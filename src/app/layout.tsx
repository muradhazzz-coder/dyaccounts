import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "dyaccounts",
  description: "إدارة طلبات الرصيد الآجل والديون للزبائن",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
