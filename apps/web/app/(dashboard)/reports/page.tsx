'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  Users,
  UserCheck,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { fetchApi } from '@/lib/api';

export default function ReportsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [performance, setPerformance] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [sourceData, setSourceData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [sum, perf, st, src] = await Promise.all([
        fetchApi('/reports/dashboard-summary'),
        fetchApi('/reports/sales-performance'),
        fetchApi('/reports/customer-status'),
        fetchApi('/reports/customer-source'),
      ]);
      setSummary(sum);
      setPerformance(perf || []);
      setStatusData(st || []);
      setSourceData(src || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-slate-900">Báo Cáo Hiệu Suất & Thống Kê</h2>
            <DemoBadge />
          </div>
          <p className="text-sm text-slate-500">
            Dữ liệu tổng hợp từ PostgreSQL về tỷ lệ chuyển đổi, nguồn khách hàng và hoạt động của từng Sale
          </p>
        </div>

        <Button variant="outline" onClick={loadData}>
          <RefreshCw className="h-4 w-4" />
          <span>Làm mới báo cáo</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng khách hàng</span>
          <div className="mt-2 text-3xl font-extrabold text-slate-900">{summary?.kpis?.totalCustomers || 0}</div>
          <p className="text-xs text-slate-400 mt-1">Đang được quản lý trên CRM</p>
        </Card>

        <Card className="p-5">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Khách hàng Chuyển đổi</span>
          <div className="mt-2 text-3xl font-extrabold text-emerald-600">{summary?.kpis?.convertedCustomers || 0}</div>
          <p className="text-xs text-emerald-700 font-semibold mt-1">Tỷ lệ: {summary?.kpis?.conversionRate || '0%'}</p>
        </Card>

        <Card className="p-5">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nhân viên kinh doanh</span>
          <div className="mt-2 text-3xl font-extrabold text-blue-600">{summary?.kpis?.totalSales || 0}</div>
          <p className="text-xs text-slate-500 mt-1">{summary?.kpis?.activeSales || 0} đang hoạt động</p>
        </Card>
      </div>

      {/* Sales Performance Full Table */}
      <Card className="p-0 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Bảng Tổng Hợp Hiệu Suất Đội Ngũ Sale</h3>
            <p className="text-xs text-slate-500">Tỷ lệ chuyển đổi thành công trên số lượng khách được phân công</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Mã NV</th>
                <th className="py-3 px-4">Nhân viên</th>
                <th className="py-3 px-4">Đội nhóm</th>
                <th className="py-3 px-4 text-center">Khách phụ trách</th>
                <th className="py-3 px-4 text-center">Đã chuyển đổi</th>
                <th className="py-3 px-4 text-center">Tỷ lệ chuyển đổi</th>
                <th className="py-3 px-4 text-center">Hoạt động chăm sóc</th>
                <th className="py-3 px-4">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {performance.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-800">{s.code}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{s.name}</td>
                  <td className="py-3 px-4 text-slate-500">{s.teamName}</td>
                  <td className="py-3 px-4 text-center font-bold text-slate-900">{s.assignedCount}</td>
                  <td className="py-3 px-4 text-center font-bold text-emerald-600">{s.convertedCount}</td>
                  <td className="py-3 px-4 text-center font-extrabold text-blue-600">{s.conversionRate}</td>
                  <td className="py-3 px-4 text-center font-medium text-slate-700">{s.activitiesCount}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        s.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {s.status === 'ACTIVE' ? 'Hoạt động' : 'Đã nghỉ việc'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
