import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sales Zalo Management System — Quản trị CRM & Zalo Đội ngũ Sale',
  description: 'Hệ thống quản lý tập trung nhiều tài khoản Zalo cá nhân của đội ngũ Sale, phân công khách hàng, hộp thư đa hội thoại và xác minh tích hợp an toàn.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-900">
        {children}
      </body>
    </html>
  );
}
