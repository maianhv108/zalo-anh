'use client';

import React from 'react';
import {
  Settings,
  Server,
  Database,
  Shield,
  Lock,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Cài Đặt Hệ Thống & Cấu Hình Môi Trường</h2>
        <p className="text-sm text-slate-500">
          Thông tin cơ sở hạ tầng, kết nối PostgreSQL, nguyên tắc tích hợp Zalo và chính sách bảo mật
        </p>
      </div>

      {/* Environment Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Cơ sở dữ liệu</div>
              <div className="text-sm font-bold text-slate-900">PostgreSQL 16.15</div>
            </div>
          </div>
          <div className="mt-3 text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Service: postgresql-x64-16 (Port 5432)</span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Backend REST API</div>
              <div className="text-sm font-bold text-slate-900">NestJS 10 + Prisma</div>
            </div>
          </div>
          <div className="mt-3 text-xs text-blue-700 font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Prefix: /api/v1 (Port 4000)</span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileCode className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Frontend Portal</div>
              <div className="text-sm font-bold text-slate-900">Next.js App Router</div>
            </div>
          </div>
          <div className="mt-3 text-xs text-indigo-700 font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Tailwind CSS & shadcn/ui</span>
          </div>
        </Card>
      </div>

      {/* Zalo Capability Verification Policy Guidelines */}
      <Card className="p-6">
        <CardHeader className="mb-4">
          <div>
            <CardTitle>Chính sách và Giới hạn Kỹ thuật Tích hợp Zalo Cá nhân</CardTitle>
            <CardDescription>Bảng đối chiếu quy định pháp lý, kỹ thuật và cơ chế Capability Gating</CardDescription>
          </div>
        </CardHeader>

        <div className="space-y-4 text-xs">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-900 text-sm mb-2">1. Nguyên tắc cốt lõi: Phân biệt Zalo OA và Zalo Cá nhân</h4>
            <p className="text-slate-600 leading-relaxed">
              Zalo cung cấp Open API chính thức cho <strong>Zalo Official Account (Zalo OA)</strong> của doanh nghiệp. Ngược lại, đối với <strong>Zalo Cá nhân (Personal Account)</strong> của nhân viên Sale, Zalo <em>không cung cấp API công khai</em> để đọc toàn bộ hộp thư cá nhân hoặc gửi tin nhắn hàng loạt tự động.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-900 text-sm mb-2">2. Ba Capability Gating độc lập</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <span className="font-bold text-blue-700 block mb-1">READ_CHATS</span>
                <p className="text-slate-500 text-[11px]">
                  Xem hội thoại: Mặc định ở trạng thái <code>NEEDS_VERIFICATION</code>. Hộp thư hiển thị dưới chế độ DEMO có nhãn rõ ràng để đánh giá UI.
                </p>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <span className="font-bold text-indigo-700 block mb-1">SYNC_MESSAGES_FILES</span>
                <p className="text-slate-500 text-[11px]">
                  Đồng bộ tin nhắn & tệp: Chỉ kích hoạt khi có webhook/connector hợp lệ và cơ chế lưu trữ bảo mật (Encryption at rest).
                </p>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <span className="font-bold text-rose-700 block mb-1">BULK_SEND</span>
                <p className="text-slate-500 text-[11px]">
                  Gửi tin hàng loạt: Bị từ chối (<code>REJECTED</code>) trên tài khoản cá nhân do chính sách chống spam của Zalo. Backend khóa toàn bộ nút gửi thật.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-900 text-sm mb-2">3. Cam kết Tuân thủ An toàn Thông tin</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>Không bao giờ yêu cầu hoặc lưu trữ mật khẩu, OTP, mã đăng nhập hoặc session cookies Zalo của nhân viên.</li>
              <li>Không sử dụng browser automation/scraping trái phép vi phạm điều khoản dịch vụ.</li>
              <li>Không hứa hẹn khả năng khôi phục tin nhắn đã bị xóa trên Zalo cá nhân.</li>
              <li>Mọi thao tác quản trị, bàn giao khách hàng và thay đổi trạng thái xác minh đều được ghi nhận vào Audit Log.</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
