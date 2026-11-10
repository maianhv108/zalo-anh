'use client';

import { useEffect, useState } from 'react';

export default function RootPage() {
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    // Chuyển hướng trực tiếp bằng window.location.replace dứt khoát
    // Bỏ qua hàng đợi chuyển cảnh của Next Router giúp không bị treo màn hình
    const redirect = () => {
      try {
        const token = localStorage.getItem('sales_zalo_token');
        const target = token ? '/dashboard' : '/login';
        window.location.replace(target);
      } catch {
        window.location.replace('/login');
      }
    };

    redirect();

    // Sau 3 giây nếu trình duyệt chặn tự động chuyển hướng thì hiện nút bấm
    const timer = setTimeout(() => setShowRetry(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex h-screen items-center justify-center bg-[#090d16]">
      <div className="flex flex-col items-center gap-5 text-center">
        {/* Logo / spinner */}
        <div className="relative">
          <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center">
            <span className="text-2xl">✈️</span>
          </div>
          <div className="absolute inset-0 h-16 w-16 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
        </div>

        <div>
          <p className="text-sm font-medium text-slate-200">TourLuk CRM</p>
          <p className="text-xs text-slate-400 mt-1">
            Đang vào hệ thống...
          </p>
        </div>

        {showRetry && (
          <button
            onClick={() => window.location.replace('/login')}
            className="mt-2 rounded-lg bg-red-500 px-4 py-2 text-xs font-medium text-white hover:bg-red-600 transition-colors cursor-pointer"
          >
            Vào trang Đăng nhập ngay
          </button>
        )}
      </div>
    </div>
  );
}
