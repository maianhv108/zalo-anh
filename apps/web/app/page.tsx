'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('sales_zalo_token');
    if (token) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-slate-100">
      <div className="flex items-center gap-3 text-slate-600">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <span className="text-sm font-medium">Đang tải hệ thống CRM...</span>
      </div>
    </div>
  );
}
