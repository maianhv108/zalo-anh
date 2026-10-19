import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TourLuk Tool Zalo — Quản lý Khách hàng & Đội ngũ Sale',
  description: 'Hệ thống TourLuk Tool Zalo: Quản lý khách hàng, hội thoại Zalo và phân quyền đội ngũ kinh doanh TourLuk.',
  icons: {
    icon: '/logo.jpg',
    apple: '/logo.jpg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="dark">
      <body className="min-h-screen bg-[#090d16] text-slate-100 antialiased selection:bg-red-500/30 selection:text-red-200">
        {children}
      </body>
    </html>
  );
}
