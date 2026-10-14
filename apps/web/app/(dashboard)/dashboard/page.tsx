'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  UserCheck,
  TrendingUp,
  MessageSquare,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  PhoneCall,
  Calendar,
  CheckCircle2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { fetchApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export default function DashboardPage() {
  const [summary, setSummary] = useState<any>(null);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [sourceData, setSourceData] = useState<any[]>([]);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [sum, status, sources, perf, acts] = await Promise.all([
        fetchApi('/reports/dashboard-summary'),
        fetchApi('/reports/customer-status'),
        fetchApi('/reports/customer-source'),
        fetchApi('/reports/sales-performance'),
        fetchApi('/reports/activity-timeline'),
      ]);
      setSummary(sum);
      setStatusData(status || []);
      setSourceData(sources || []);
      setPerformanceData(perf || []);
      setActivities(acts || []);
    } catch (e) {
      console.error('Error loading dashboard data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const statusLabelMap: Record<string, string> = {
    NEW: 'Khách mới',
    CONTACTED: 'Đã liên hệ',
    CONSULTING: 'Đang tư vấn',
    WAITING_REPLY: 'Chờ phản hồi',
    FOLLOW_UP: 'Theo dõi',
    CONVERTED: 'Chuyển đổi',
    DROPPED: 'Dừng',
  };

  const chartStatusData = statusData.map((d) => ({
    name: statusLabelMap[d.status] || d.status,
    count: d.count,
  }));

  const COLORS = ['#2563eb', '#6366f1', '#f59e0b', '#f97316', '#a855f7', '#10b981', '#64748b'];

  if (isLoading && !summary) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
          <span className="text-sm">Đang tải dữ liệu tổng quan...</span>
        </div>
      </div>
    );
  }

  const kpis = summary?.kpis || {};

  return (
    <div className="space-y-6">
      {/* Top Banner if DEMO DATA */}
      {summary?.isDemoData && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-amber-900">CHẾ ĐỘ MÔI TRƯỜNG PHÁT TRIỂN & KIỂM THỬ</span>
                <DemoBadge size="sm" />
              </div>
              <p className="text-xs text-amber-800 mt-0.5">
                Các số liệu khách hàng, tin nhắn và hội thoại hiển thị dưới đây là dữ liệu mẫu (Seed Data). Các chức năng Zalo cá nhân tuân thủ chính sách Gating và không tự động gửi ra ngoài.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={loadData} className="border-amber-300 text-amber-900 hover:bg-amber-100/50 shrink-0">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Làm mới số liệu</span>
          </Button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Dashboard Tổng quan</h2>
          <p className="text-sm text-slate-500">Giám sát tổng thể hoạt động chăm sóc khách hàng và đội ngũ Sale</p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/customers">
            <Button size="sm" variant="outline">
              <span>Xem khách hàng</span>
            </Button>
          </Link>
          <Link href="/inbox">
            <Button size="sm">
              <MessageSquare className="h-4 w-4" />
              <span>Hộp thư hội thoại</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Nhân viên Sale */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đội ngũ Sale</span>
            <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{kpis.totalSales || 0}</span>
            <span className="text-xs text-slate-500">nhân viên</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-2">
            <span className="text-emerald-600 font-medium">{kpis.activeSales || 0} đang hoạt động</span>
            <span>•</span>
            <span className="text-rose-500 font-medium">{kpis.inactiveSales || 0} đã nghỉ việc</span>
          </div>
        </Card>

        {/* Card 2: Tổng khách hàng */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Khách hàng CRM</span>
            <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{kpis.totalCustomers || 0}</span>
            <span className="text-xs text-emerald-600 font-medium">+{kpis.newCustomers || 0} khách mới</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-2">
            <span>{kpis.consultingCustomers || 0} đang tư vấn</span>
            <span>•</span>
            <span>{kpis.waitingReplyCustomers || 0} chờ phản hồi</span>
          </div>
        </Card>

        {/* Card 3: Khách chuyển đổi */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tỷ lệ Chuyển đổi</span>
            <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600">{kpis.conversionRate || '0%'}</span>
            <span className="text-xs text-slate-500">({kpis.convertedCustomers || 0} chuyển đổi)</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Dừng chăm sóc: <span className="font-medium text-slate-600">{kpis.droppedCustomers || 0} khách</span>
          </div>
        </Card>

        {/* Card 4: Hội thoại & Nhắc việc */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hội thoại & Tác vụ</span>
            <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <MessageSquare className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{kpis.totalConversations || 0}</span>
            <span className="text-xs text-amber-700 font-medium">hội thoại demo</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-rose-500" />
            <span className="text-rose-600 font-medium">{kpis.overdueTasks || 0} nhiệm vụ quá hạn</span>
          </div>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution Bar Chart */}
        <Card className="lg:col-span-2 p-6">
          <CardHeader className="mb-6">
            <div>
              <CardTitle>Phân bố Khách hàng theo Trạng thái</CardTitle>
              <CardDescription>Số lượng khách hàng phân loại theo từng giai đoạn chăm sóc</CardDescription>
            </div>
            {summary?.isDemoData && <DemoBadge />}
          </CardHeader>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartStatusData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Source Distribution Pie Chart */}
        <Card className="p-6">
          <CardHeader className="mb-4">
            <div>
              <CardTitle>Nguồn Khách hàng</CardTitle>
              <CardDescription>Kênh tiếp cận marketing</CardDescription>
            </div>
          </CardHeader>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sourceData}
                  dataKey="count"
                  nameKey="source"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {sourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Sales Performance & Care Timeline Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Performance Table */}
        <Card className="lg:col-span-2 p-6">
          <CardHeader className="mb-4">
            <div>
              <CardTitle>Hiệu suất Đội ngũ Nhân viên Sale</CardTitle>
              <CardDescription>Số lượng khách hàng phụ trách và tỷ lệ chuyển đổi thành công</CardDescription>
            </div>
            <Link href="/sales">
              <Button variant="ghost" size="sm" className="text-blue-600">
                <span>Quản lý Sale</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-y border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Mã Sale</th>
                  <th className="py-2.5 px-3">Nhân viên</th>
                  <th className="py-2.5 px-3">Đội nhóm</th>
                  <th className="py-2.5 px-3 text-center">Khách phụ trách</th>
                  <th className="py-2.5 px-3 text-center">Chuyển đổi</th>
                  <th className="py-2.5 px-3 text-center">Tỷ lệ</th>
                  <th className="py-2.5 px-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {performanceData.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{s.code}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">{s.name}</td>
                    <td className="py-2.5 px-3 text-slate-500">{s.teamName}</td>
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-800">{s.assignedCount}</td>
                    <td className="py-2.5 px-3 text-center text-emerald-600 font-semibold">{s.convertedCount}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-blue-600">{s.conversionRate}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
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

        {/* Recent Activity Timeline */}
        <Card className="p-6">
          <CardHeader className="mb-4">
            <div>
              <CardTitle>Hoạt động Gần đây</CardTitle>
              <CardDescription>Nhật ký chăm sóc từ các Sale</CardDescription>
            </div>
          </CardHeader>

          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
            {activities.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-400">Chưa có hoạt động gần đây</p>
            ) : (
              activities.map((act) => (
                <div key={act.id} className="flex items-start gap-3 text-xs">
                  <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    {act.type === 'CALL' ? (
                      <PhoneCall className="h-3.5 w-3.5" />
                    ) : act.type === 'HANDOVER' ? (
                      <RefreshCw className="h-3.5 w-3.5 text-amber-600" />
                    ) : (
                      <Calendar className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 leading-snug">{act.title}</p>
                    <p className="text-slate-500 text-[11px] mt-0.5 line-clamp-2">{act.description}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                      <span>{act.user?.name}</span>
                      <span>•</span>
                      <span>{formatDate(act.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
