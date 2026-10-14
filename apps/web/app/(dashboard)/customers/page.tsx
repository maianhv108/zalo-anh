'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  UserCheck,
  UserPlus,
  Search,
  Filter,
  Download,
  Share2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Phone,
  Mail,
  RefreshCw,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { DemoBadge } from '@/components/ui/demo-badge';
import { fetchApi } from '@/lib/api';
import { formatDate, formatShortDate } from '@/lib/utils';
import {
  CustomerStatus,
  CustomerPriority,
  CustomerStatusLabels,
  CustomerStatusColors,
  CustomerPriorityLabels,
} from '@sales-zalo/shared';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedSale, setSelectedSale] = useState('');

  // Selected customers for Handover
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);

  // Add form
  const [newCustomer, setNewCustomer] = useState({
    fullName: '',
    phone: '',
    email: '',
    source: 'Website CRM',
    status: CustomerStatus.NEW,
    priority: CustomerPriority.MEDIUM,
    assignedToId: '',
    notes: '',
  });
  const [duplicateWarning, setDuplicateWarning] = useState<any[]>([]);

  // Handover form
  const [handoverData, setHandoverData] = useState({
    toUserId: '',
    reason: '',
  });

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('pageSize', String(pageSize));
      if (search) params.append('search', search);
      if (selectedStatus) params.append('status', selectedStatus);
      if (selectedPriority) params.append('priority', selectedPriority);
      if (selectedSource) params.append('source', selectedSource);
      if (selectedSale) params.append('assignedToId', selectedSale);

      const [res, salesRes] = await Promise.all([
        fetchApi(`/customers?${params.toString()}`),
        fetchApi('/users?role=SALE'),
      ]);

      setCustomers(res.items || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
      setSales(salesRes.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [page, pageSize, search, selectedStatus, selectedPriority, selectedSource, selectedSale]);

  // Check duplicates when phone changes in Add modal
  const handlePhoneBlur = async () => {
    if (newCustomer.phone.length >= 9) {
      try {
        const res = await fetchApi(`/customers/check-duplicates?phone=${newCustomer.phone}`);
        setDuplicateWarning(res.duplicates || []);
      } catch (e) {}
    } else {
      setDuplicateWarning([]);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi('/customers', {
        method: 'POST',
        body: JSON.stringify(newCustomer),
      });
      setIsAddModalOpen(false);
      setNewCustomer({
        fullName: '',
        phone: '',
        email: '',
        source: 'Website CRM',
        status: CustomerStatus.NEW,
        priority: CustomerPriority.MEDIUM,
        assignedToId: '',
        notes: '',
      });
      setDuplicateWarning([]);
      loadCustomers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCustomerIds.length === 0) {
      alert('Vui lòng chọn ít nhất 1 khách hàng để bàn giao!');
      return;
    }
    if (!handoverData.toUserId) {
      alert('Vui lòng chọn nhân viên tiếp nhận!');
      return;
    }

    try {
      const res = await fetchApi('/customer-assignments/handover', {
        method: 'POST',
        body: JSON.stringify({
          customerIds: selectedCustomerIds,
          toUserId: handoverData.toUserId,
          reason: handoverData.reason,
        }),
      });

      alert(res.message);
      setIsHandoverModalOpen(false);
      setSelectedCustomerIds([]);
      setHandoverData({ toUserId: '', reason: '' });
      loadCustomers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExportCsv = async () => {
    try {
      const csv = await fetchApi('/customers/export/csv');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `customers_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const toggleSelectCustomer = (id: string) => {
    if (selectedCustomerIds.includes(id)) {
      setSelectedCustomerIds(selectedCustomerIds.filter((item) => item !== id));
    } else {
      setSelectedCustomerIds([...selectedCustomerIds, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedCustomerIds.length === customers.length) {
      setSelectedCustomerIds([]);
    } else {
      setSelectedCustomerIds(customers.map((c) => c.id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Quản lý Khách hàng (CRM)</h2>
          <p className="text-sm text-slate-500">
            Tổng cộng: <strong className="text-slate-800">{total}</strong> khách hàng trong cơ sở dữ liệu
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedCustomerIds.length > 0 && (
            <Button
              variant="outline"
              className="bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100"
              onClick={() => setIsHandoverModalOpen(true)}
            >
              <Share2 className="h-4 w-4 text-amber-700" />
              <span>Bàn giao ({selectedCustomerIds.length}) khách hàng</span>
            </Button>
          )}

          <Button variant="outline" onClick={handleExportCsv}>
            <Download className="h-4 w-4" />
            <span>Xuất CSV</span>
          </Button>

          <Button onClick={() => setIsAddModalOpen(true)}>
            <UserPlus className="h-4 w-4" />
            <span>Thêm khách hàng</span>
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, SĐT, email, mã KH..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(CustomerStatusLabels).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <select
            value={selectedSale}
            onChange={(e) => setSelectedSale(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
          >
            <option value="">Tất cả Sale phụ trách</option>
            {sales.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
            ))}
          </select>

          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
          >
            <option value="">Tất cả nguồn</option>
            <option value="Facebook Ads">Facebook Ads</option>
            <option value="Google Ads">Google Ads</option>
            <option value="Website CRM">Website CRM</option>
            <option value="Giới thiệu">Giới thiệu</option>
            <option value="Zalo cá nhân">Zalo cá nhân</option>
            <option value="Sự kiện Hội thảo">Sự kiện Hội thảo</option>
          </select>
        </div>
      </Card>

      {/* Customer CRM Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 text-center w-10">
                  <input
                    type="checkbox"
                    checked={customers.length > 0 && selectedCustomerIds.length === customers.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="py-3 px-3">Mã KH</th>
                <th className="py-3 px-4">Khách hàng</th>
                <th className="py-3 px-4">Số điện thoại / Email</th>
                <th className="py-3 px-4">Nguồn</th>
                <th className="py-3 px-4">Sale phụ trách</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4">Ưu tiên</th>
                <th className="py-3 px-4">Liên hệ cuối</th>
                <th className="py-3 px-4 text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Đang tải dữ liệu khách hàng...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    Không tìm thấy khách hàng phù hợp
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const isChecked = selectedCustomerIds.includes(c.id);
                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-slate-50/80 transition-colors ${isChecked ? 'bg-blue-50/40' : ''}`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectCustomer(c.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-800">{c.code}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <Link href={`/customers/${c.id}`} className="hover:text-blue-600 hover:underline">
                          {c.fullName}
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{c.phone || '-'}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[150px]">{c.email || '-'}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{c.source}</td>
                      <td className="py-3 px-4">
                        {c.assignedTo ? (
                          <span className="font-medium text-blue-700">
                            {c.assignedTo.name} ({c.assignedTo.code})
                          </span>
                        ) : (
                          <span className="text-amber-600 font-medium italic">Chưa phân công</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${CustomerStatusColors[c.status as CustomerStatus]}`}>
                          {CustomerStatusLabels[c.status as CustomerStatus] || c.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[11px] font-medium text-slate-700">
                          {CustomerPriorityLabels[c.priority as CustomerPriority] || c.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {formatShortDate(c.lastContactedAt)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link href={`/customers/${c.id}`}>
                          <Button size="sm" variant="outline" className="h-7 text-xs px-2.5">
                            <span>Hồ sơ</span>
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Hiển thị trang <strong className="text-slate-800">{page}</strong> / <strong>{totalPages}</strong> (Tổng {total} khách hàng)
          </div>

          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="h-8 px-2"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="h-8 px-2"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Modal: Thêm khách hàng mới */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Thêm khách hàng mới vào CRM"
        description="Nhập thông tin khách hàng và kiểm tra tự động trùng lặp số điện thoại"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Họ và tên khách hàng *</label>
              <input
                type="text"
                required
                value={newCustomer.fullName}
                onChange={(e) => setNewCustomer({ ...newCustomer, fullName: e.target.value })}
                placeholder="Ví dụ: Nguyễn Văn Minh"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại *</label>
              <input
                type="text"
                required
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                onBlur={handlePhoneBlur}
                placeholder="0987654321"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          {duplicateWarning.length > 0 && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Cảnh báo trùng lặp:</p>
                <p>Số điện thoại này đã thuộc về khách hàng: <strong>{duplicateWarning[0].fullName}</strong> ({duplicateWarning[0].code}) do <strong>{duplicateWarning[0].assignedTo?.name || 'Chưa gán'}</strong> phụ trách.</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                placeholder="minh.nguyen@example.com"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nguồn tiếp cận *</label>
              <select
                value={newCustomer.source}
                onChange={(e) => setNewCustomer({ ...newCustomer, source: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="Website CRM">Website CRM</option>
                <option value="Facebook Ads">Facebook Ads</option>
                <option value="Google Ads">Google Ads</option>
                <option value="Giới thiệu">Giới thiệu</option>
                <option value="Zalo cá nhân">Zalo cá nhân</option>
                <option value="Sự kiện Hội thảo">Sự kiện Hội thảo</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Trạng thái ban đầu</label>
              <select
                value={newCustomer.status}
                onChange={(e) => setNewCustomer({ ...newCustomer, status: e.target.value as any })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              >
                {Object.entries(CustomerStatusLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phân công cho Sale</label>
              <select
                value={newCustomer.assignedToId}
                onChange={(e) => setNewCustomer({ ...newCustomer, assignedToId: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="">Tự động hoặc để trống</option>
                {sales.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú nhu cầu ban đầu</label>
            <textarea
              rows={2}
              value={newCustomer.notes}
              onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
              placeholder="Khách quan tâm gói sản phẩm nào..."
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>Hủy</Button>
            <Button type="submit">Lưu khách hàng</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Bàn giao khách hàng (Handover Flow) */}
      <Modal
        isOpen={isHandoverModalOpen}
        onClose={() => setIsHandoverModalOpen(false)}
        title="Quy trình Bàn Giao Khách Hàng (Customer Handover)"
        description="Điều chuyển quyền quản lý khách hàng sang Sale mới kèm lý do và ghi nhận lịch sử bất biến"
      >
        <form onSubmit={handleHandover} className="space-y-4">
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900">
            <p className="font-semibold">
              Đang chọn: <strong className="text-blue-700">{selectedCustomerIds.length} khách hàng</strong> để bàn giao
            </p>
            <p className="mt-1 text-[11px] text-blue-800">
              * Toàn bộ lịch sử chăm sóc, tin nhắn hội thoại và tệp đính kèm trước đây của khách hàng sẽ được giữ nguyên vẹn 100%.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nhân viên Sale tiếp nhận bàn giao *</label>
            <select
              required
              value={handoverData.toUserId}
              onChange={(e) => setHandoverData({ ...handoverData, toUserId: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            >
              <option value="">-- Chọn nhân viên nhận --</option>
              {sales
                .filter((s) => s.status === 'ACTIVE')
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code}) - Đang phụ trách {s.assignedCustomersCount} khách
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Lý do bàn giao (Bắt buộc) *</label>
            <textarea
              required
              rows={3}
              value={handoverData.reason}
              onChange={(e) => setHandoverData({ ...handoverData, reason: e.target.value })}
              placeholder="Ví dụ: Nhân viên Sale cũ nghỉ việc bàn giao lại tệp khách hàng / Điều chuyển địa bàn phụ trách..."
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            />
            <p className="text-[11px] text-slate-400 mt-1">Lý do bàn giao sẽ được lưu vĩnh viễn vào CustomerAssignment và AuditLog.</p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsHandoverModalOpen(false)}>Hủy</Button>
            <Button type="submit" variant="primary">Xác nhận bàn giao</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
