'use client';

import React, { useState, useEffect } from 'react';
import {
  ScrollText,
  Search,
  Filter,
  Shield,
  RefreshCw,
  Clock,
  User,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { AuditAction } from '@sales-zalo/shared';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState('');

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedAction) params.append('action', selectedAction);

      const res = await fetchApi(`/audit-logs?${params.toString()}`);
      setLogs(res.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [search, selectedAction]);

  const actionLabels: Record<string, { label: string; color: string }> = {
    LOGIN: { label: 'Đăng nhập', color: 'bg-emerald-100 text-emerald-800' },
    LOGOUT: { label: 'Đăng xuất', color: 'bg-slate-100 text-slate-800' },
    CREATE_USER: { label: 'Tạo nhân viên', color: 'bg-blue-100 text-blue-800' },
    UPDATE_USER: { label: 'Sửa nhân viên', color: 'bg-indigo-100 text-indigo-800' },
    DISABLE_USER: { label: 'Khóa tài khoản', color: 'bg-rose-100 text-rose-800' },
    CREATE_CUSTOMER: { label: 'Thêm khách hàng', color: 'bg-sky-100 text-sky-800' },
    UPDATE_CUSTOMER: { label: 'Sửa khách hàng', color: 'bg-cyan-100 text-cyan-800' },
    ASSIGN_CUSTOMER: { label: 'Phân công khách', color: 'bg-purple-100 text-purple-800' },
    HANDOVER_CUSTOMER: { label: 'Bàn giao khách', color: 'bg-amber-100 text-amber-900 border border-amber-300' },
    EXPORT_CUSTOMERS: { label: 'Xuất CSV', color: 'bg-teal-100 text-teal-800' },
    UPDATE_VERIFICATION: { label: 'Cập nhật xác minh', color: 'bg-violet-100 text-violet-800' },
    UPDATE_CONNECTION: { label: 'Cập nhật kết nối', color: 'bg-blue-100 text-blue-800' },
    CREATE_CAMPAIGN: { label: 'Tạo chiến dịch', color: 'bg-orange-100 text-orange-800' },
    PREVIEW_CAMPAIGN: { label: 'Xem trước chiến dịch', color: 'bg-amber-100 text-amber-800' },
    CONFIRM_CAMPAIGN: { label: 'Xác nhận chiến dịch', color: 'bg-red-100 text-red-800' },
    CANCEL_CAMPAIGN: { label: 'Hủy chiến dịch', color: 'bg-stone-100 text-stone-800' },
    DELETE_ATTACHMENT: { label: 'Xóa tệp lưu trữ', color: 'bg-rose-100 text-rose-800' },
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Nhật Ký Hoạt Động (Audit Logs)</h2>
          <p className="text-sm text-slate-500">
            Ghi nhận bất biến các thao tác quản trị, đăng nhập, phân công và thay đổi xác minh hệ thống
          </p>
        </div>

        <Button variant="outline" onClick={loadLogs}>
          <RefreshCw className="h-4 w-4" />
          <span>Làm mới nhật ký</span>
        </Button>
      </div>

      {/* Filters Bar */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tài khoản, tài nguyên hoặc chi tiết..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
          >
            <option value="">Tất cả hành động</option>
            {Object.keys(actionLabels).map((action) => (
              <option key={action} value={action}>{actionLabels[action].label} ({action})</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Logs Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Thời gian</th>
                <th className="py-3 px-4">Người thực hiện</th>
                <th className="py-3 px-4">Hành động</th>
                <th className="py-3 px-4">Tài nguyên</th>
                <th className="py-3 px-4">Chi tiết thay đổi</th>
                <th className="py-3 px-4">Địa chỉ IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Đang tải nhật ký kiểm toán...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Chưa có sự kiện nào được ghi nhận
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const actionInfo = actionLabels[log.action] || { label: log.action, color: 'bg-slate-100 text-slate-800' };
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {log.user ? `${log.user.name} (${log.user.code})` : 'Hệ thống'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${actionInfo.color}`}>
                          {actionInfo.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-700">{log.resource}</td>
                      <td className="py-3 px-4 max-w-sm">
                        <div className="font-mono text-[10px] text-slate-600 truncate bg-slate-50 p-1.5 rounded border border-slate-100">
                          {log.details || '-'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{log.ipAddress || '127.0.0.1'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
