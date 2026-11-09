'use client';

import { RefreshCw, AlertTriangle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="vi">
      <body className="flex h-screen items-center justify-center bg-[#090d16] text-slate-100 font-sans">
        <div className="flex flex-col items-center gap-6 text-center max-w-sm px-6">
          <div className="rounded-full bg-red-500/10 p-4">
            <AlertTriangle className="h-10 w-10 text-red-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-100 mb-2">Hệ thống sẵn sàng tải lại</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Trang web gặp sự cố nhỏ khi nạp dữ liệu. Chị bấm nút bên dưới để tải lại ngay nhé ạ!
            </p>
          </div>
          <button
            onClick={() => {
              if (reset) reset();
              else window.location.reload();
            }}
            className="flex items-center gap-2 rounded-lg bg-red-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-600 transition-colors cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            Tải lại ngay
          </button>
          <p className="text-xs text-slate-500">
            Hoặc chị có thể nhấn phím F5 trên bàn phím.
          </p>
        </div>
      </body>
    </html>
  );
}
