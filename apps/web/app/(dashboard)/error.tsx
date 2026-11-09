'use client';

import { useEffect } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[DashboardError]', error);
  }, [error]);

  return (
    <div className="flex h-screen items-center justify-center bg-[#090d16]">
      <div className="flex flex-col items-center gap-6 text-center max-w-sm px-6">
        <div className="rounded-full bg-red-500/10 p-4">
          <AlertTriangle className="h-10 w-10 text-red-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-100 mb-2">Trang gặp sự cố</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Có lỗi nhỏ khi tải trang này. Chị bấm <strong className="text-white">Thử lại</strong> là xong ngay ạ!
          </p>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-2 rounded-lg bg-red-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-600 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Thử lại
        </button>
      </div>
    </div>
  );
}

