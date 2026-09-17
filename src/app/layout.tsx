import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "หารกัน — แบ่งค่าใช้จ่ายกับเพื่อนง่าย ๆ",
  description: "ทุกทริปสนุกได้ เรื่องเงินให้หารกันช่วย",
  applicationName: "หารกัน",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
