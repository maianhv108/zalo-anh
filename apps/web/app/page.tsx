'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();
  const [tooSlow, setTooSlow] = useState(false);

  useEffect(() => {
    // Timeout 8s: nếu chưa redirect thì hiện nút thử lại
    const timer = setTimeout(() => setTooSlow(true), 8000);

    try {
      const token = localStorage.getItem('sales_zalo_token');
      if (token) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    } catch {
      router.replace('/login');
    }

    return () => clearTimeout(timer);
  }, [router]);

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
          <p className="text-sm font-medium text-slate-300">TourLuk CRM</p>
          <p className="text-xs text-slate-500 mt-1">
            {tooSlow ? 'Đang kết nối lại...' : 'Đang khởi động...'}
          </p>
        </div>

        {tooSlow && (
          <button
            onClick={() => window.location.reload()}
            className="mt-2 rounded-lg bg-red-500 px-4 py-2 text-xs font-medium text-white hover:bg-red-600 transition-colors"
          >
            Tải lại trang
          </button>
        )}
      </div>
    </div>
  );
}
