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
  Edit3,
  Check,
  Trash2,
  CheckSquare,
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

  // Edit Customer Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    source: '',
    status: CustomerStatus.NEW,
    priority: CustomerPriority.MEDIUM,
    assignedToId: '',
    notes: '',
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const openEditModal = (c: any) => {
    setEditingCustomer(c);
    setEditFormData({
      fullName: c.fullName || '',
      phone: c.phone || '',
      email: c.email || '',
      source: c.source || 'ZALO',
      status: c.status || CustomerStatus.NEW,
      priority: c.priority || CustomerPriority.MEDIUM,
      assignedToId: c.assignedToId || '',
      notes: c.notes || '',
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    setIsSavingEdit(true);
    try {
      await fetchApi(`/customers/${editingCustomer.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          fullName: editFormData.fullName.trim(),
          phone: editFormData.phone.trim() || '',
          email: editFormData.email.trim() || '',
          source: editFormData.source,
          status: editFormData.status,
          priority: editFormData.priority,
          assignedToId: editFormData.assignedToId || undefined,
          notes: editFormData.notes.trim() || '',
        }),
      });
      setIsEditModalOpen(false);
      loadCustomers();
    } catch (err: any) {
      alert(`Lỗi lưu thông tin: ${err.message}`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete Customer State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [customersToDelete, setCustomersToDelete] = useState<any[]>([]);
  const [permanentDelete, setPermanentDelete] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpenBulkDeleteModal = () => {
    const toDelete = customers.filter((c) => selectedCustomerIds.includes(c.id));
    if (toDelete.length === 0) return;
    setCustomersToDelete(toDelete);
    setPermanentDelete(true);
    setIsDeleteModalOpen(true);
  };

  const handleOpenSingleDeleteModal = (customer: any) => {
    setCustomersToDelete([customer]);
    setPermanentDelete(true);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (customersToDelete.length === 0) return;
    setIsDeleting(true);
    try {
      const ids = customersToDelete.map((c) => c.id);
      if (ids.length === 1) {
        await fetchApi(`/customers/${ids[0]}?permanent=${permanentDelete}`, {
          method: 'DELETE',
        });
      } else {
        await fetchApi(`/customers/bulk-delete`, {
          method: 'POST',
          body: JSON.stringify({ ids, permanent: permanentDelete }),
        });
      }

      // Deselect deleted customers
      setSelectedCustomerIds((prev) => prev.filter((id) => !ids.includes(id)));
      setIsDeleteModalOpen(false);
      setCustomersToDelete([]);
      await loadCustomers();
    } catch (err: any) {
      alert(`Lỗi khi xóa khách hàng: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

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

  const getCustomerStatusBadge = (status: CustomerStatus) => {
    const label = CustomerStatusLabels[status] || status;
    let colorCls = 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    switch (status) {
      case CustomerStatus.NEW:
        colorCls = 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
        break;
      case CustomerStatus.CONTACTED:
        colorCls = 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800';
        break;
      case CustomerStatus.CONSULTING:
        colorCls = 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700';
        break;
      case CustomerStatus.WAITING_REPLY:
        colorCls = 'bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-700';
        break;
      case CustomerStatus.FOLLOW_UP:
        colorCls = 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-700';
        break;
      case CustomerStatus.CONVERTED:
        colorCls = 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700';
        break;
      case CustomerStatus.DROPPED:
        colorCls = 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
        break;
    }
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap inline-flex items-center justify-center shrink-0 ${colorCls}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Quản lý Khách hàng (CRM)</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Tổng cộng: <strong className="text-slate-800 dark:text-slate-200">{total}</strong> khách hàng trong cơ sở dữ liệu
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedCustomerIds.length > 0 && (
            <>
              <Button
                variant="outline"
                className="bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100"
                onClick={() => setIsHandoverModalOpen(true)}
              >
                <Share2 className="h-4 w-4 text-amber-700 mr-1.5" />
                <span>Bàn giao ({selectedCustomerIds.length}) khách</span>
              </Button>

              <Button
                variant="outline"
                className="bg-rose-50 border-rose-300 text-rose-800 hover:bg-rose-100"
                onClick={handleOpenBulkDeleteModal}
              >
                <Trash2 className="h-4 w-4 text-rose-600 mr-1.5" />
                <span>Xóa ({selectedCustomerIds.length}) khách đã chọn</span>
              </Button>
            </>
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
      <Card className="p-4 bg-white dark:bg-[#0d1527] border-slate-200 dark:border-[#1e2c47]">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, SĐT, email, mã KH..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-[#080d19] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 dark:bg-[#080d19] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl"
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(CustomerStatusLabels).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <select
            value={selectedSale}
            onChange={(e) => setSelectedSale(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 dark:bg-[#080d19] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl"
          >
            <option value="">Tất cả Sale phụ trách</option>
            {sales.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
            ))}
          </select>

          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 dark:bg-[#080d19] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl"
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

      {/* Thanh tác vụ Nổi bật khi chọn 1 hoặc nhiều khách hàng (Xóa hàng loạt / Bàn giao) */}
      {selectedCustomerIds.length > 0 && (
        <div className="sticky top-2 z-20 flex flex-wrap items-center justify-between gap-3 p-3.5 bg-rose-500/10 dark:bg-rose-950/60 border-2 border-rose-500/40 dark:border-rose-700/60 rounded-xl shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-600 text-white rounded-lg shadow-sm">
              <CheckSquare className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-rose-950 dark:text-rose-200">
                Đã chọn {selectedCustomerIds.length} khách hàng
              </p>
              <p className="text-[11px] text-rose-700 dark:text-rose-300">
                Bấm nút đỏ bên phải để xóa các khách đã chọn hoặc chuyển giao sang Sale khác
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600"
              onClick={() => setSelectedCustomerIds([])}
            >
              Bỏ chọn ({selectedCustomerIds.length})
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700"
              onClick={() => setIsHandoverModalOpen(true)}
            >
              <Share2 className="h-3.5 w-3.5 mr-1 text-amber-700 dark:text-amber-400" />
              <span>Bàn giao ({selectedCustomerIds.length}) khách</span>
            </Button>

            <Button
              size="sm"
              className="h-8 text-xs font-bold bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white shadow-md shadow-rose-600/30"
              onClick={handleOpenBulkDeleteModal}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              <span>Xóa ({selectedCustomerIds.length}) khách đã chọn</span>
            </Button>
          </div>
        </div>
      )}

      {/* Customer CRM Table */}
      <Card className="p-0 overflow-hidden bg-white dark:bg-[#0d1527] border-slate-200 dark:border-[#1e2c47]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-[#050811] text-[11px] font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-[#162035]">
              <tr>
                <th className="py-3 px-3 text-center w-10">
                  <input
                    type="checkbox"
                    checked={customers.length > 0 && selectedCustomerIds.length === customers.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-800"
                  />
                </th>
                <th className="py-3 px-3 whitespace-nowrap">Mã KH</th>
                <th className="py-3 px-4 min-w-[140px]">Khách hàng</th>
                <th className="py-3 px-4 min-w-[150px]">Số điện thoại / Email</th>
                <th className="py-3 px-4 whitespace-nowrap">Nguồn</th>
                <th className="py-3 px-4 min-w-[130px] whitespace-nowrap">Sale phụ trách</th>
                <th className="py-3 px-4 min-w-[110px] whitespace-nowrap">Trạng thái</th>
                <th className="py-3 px-4 whitespace-nowrap">Ưu tiên</th>
                <th className="py-3 px-4 whitespace-nowrap">Liên hệ cuối</th>
                <th className="py-3 px-4 text-right min-w-[160px] whitespace-nowrap">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
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
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${isChecked ? 'bg-blue-50/50 dark:bg-blue-950/40' : ''}`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectCustomer(c.id)}
                          className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-800"
                        />
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">{c.code}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        <Link href={`/customers/${c.id}`} className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline">
                          {c.fullName}
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{c.phone || '-'}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[150px]">{c.email || '-'}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap">{c.source}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {c.assignedTo ? (
                          <span className="font-semibold text-blue-700 dark:text-blue-400">
                            {c.assignedTo.name} ({c.assignedTo.code})
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-medium italic">Chưa phân công</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getCustomerStatusBadge(c.status as CustomerStatus)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="text-[11px] font-medium text-slate-800 dark:text-slate-200">
                          {CustomerPriorityLabels[c.priority as CustomerPriority] || c.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 text-[11px] whitespace-nowrap">
                        {formatShortDate(c.lastContactedAt)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditModal(c)}
                            className="h-7 text-xs px-2.5 whitespace-nowrap shrink-0 bg-blue-50/70 hover:bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                            title="Bấm để chỉnh sửa, thêm hoặc xóa thông tin khách hàng"
                          >
                            <Edit3 className="h-3 w-3 mr-1 shrink-0" />
                            <span>Hồ sơ</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenSingleDeleteModal(c)}
                            className="h-7 text-xs px-2 whitespace-nowrap shrink-0 bg-rose-50/70 hover:bg-rose-100 text-rose-600 border-rose-200 hover:border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                            title="Xóa khách hàng này"
                          >
                            <Trash2 className="h-3 w-3 mr-1 shrink-0" />
                            <span>Xóa</span>
                          </Button>
                          <Link href={`/customers/${c.id}`} title="Xem trang chi tiết đầy đủ" className="shrink-0">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div>
            Hiển thị trang <strong className="text-slate-800 dark:text-slate-200">{page}</strong> / <strong className="text-slate-800 dark:text-slate-200">{totalPages}</strong> (Tổng {total} khách hàng)
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
                <option value="Zalo OA">Zalo OA (Mã OA...)</option>
                <option value="Zalo cá nhân">Zalo cá nhân (Sale)</option>
                <option value="Website CRM">Website CRM</option>
                <option value="Facebook Ads">Facebook Ads</option>
                <option value="Google Ads">Google Ads</option>
                <option value="Giới thiệu">Giới thiệu</option>
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
                <option value="">Tự động hoặc để trống (Mã KH: KHxxxx)</option>
                {sales.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                * Mã KH sẽ tự động sinh theo tên viết tắt của Sale (VD: Tiểu Nhã &rarr; <strong>TN0001</strong>, Mai Anh &rarr; <strong>MA0001</strong>)
              </p>
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
              * Toàn bộ lịch sử chăm sóc, tin nhắn hội thoại và tệp đính kèm trước đây của khách hàng sẽ được giữ nguyên vẹn 100%. Mã KH sẽ tự động chuyển sang mã nhân viên tiếp nhận (VD: TN0001, MA0001) để quản lý đồng bộ.
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

      {/* Modal: Xem & Chỉnh Sửa Hồ Sơ Khách Hàng */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={editingCustomer ? `Hồ Sơ Khách Hàng - ${editingCustomer.code}` : 'Chỉnh sửa hồ sơ khách hàng'}
        description="Chỉnh sửa, thêm mới hoặc xóa bớt thông tin (tên, số điện thoại, email, ghi chú...)"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-[#080d19] border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400">Mã KH:</span>{' '}
              <strong className="text-slate-900 dark:text-white font-bold">{editingCustomer?.code}</strong>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Nguồn:</span>{' '}
              <span className="px-2 py-0.5 rounded-full font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {editingCustomer?.source}
              </span>
            </div>
            {editingCustomer?.id && (
              <Link
                href={`/customers/${editingCustomer.id}`}
                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
              >
                <span>Trang chi tiết đầy đủ</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Họ và tên khách hàng <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={editFormData.fullName}
              onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
              placeholder="VD: Mai Anh"
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Số điện thoại</label>
                {editFormData.phone && (
                  <button
                    type="button"
                    onClick={() => setEditFormData({ ...editFormData, phone: '' })}
                    className="text-[11px] text-red-500 hover:underline"
                  >
                    Xóa số
                  </button>
                )}
              </div>
              <input
                type="text"
                value={editFormData.phone}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                placeholder="Để trống nếu chưa có SĐT"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">* Có thể nhập mới hoặc xóa trắng</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Email</label>
                {editFormData.email && (
                  <button
                    type="button"
                    onClick={() => setEditFormData({ ...editFormData, email: '' })}
                    className="text-[11px] text-red-500 hover:underline"
                  >
                    Xóa email
                  </button>
                )}
              </div>
              <input
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                placeholder="Để trống nếu chưa có email"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">Trạng thái</label>
              <select
                value={editFormData.status}
                onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as any })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl"
              >
                {Object.entries(CustomerStatusLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">Ưu tiên</label>
              <select
                value={editFormData.priority}
                onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value as any })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl"
              >
                {Object.entries(CustomerPriorityLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">Sale phụ trách</label>
              <select
                value={editFormData.assignedToId}
                onChange={(e) => setEditFormData({ ...editFormData, assignedToId: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl"
              >
                <option value="">Chưa phân công</option>
                {sales.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Ghi chú nhu cầu tư vấn</label>
              {editFormData.notes && (
                <button
                  type="button"
                  onClick={() => setEditFormData({ ...editFormData, notes: '' })}
                  className="text-[11px] text-red-500 hover:underline"
                >
                  Xóa ghi chú
                </button>
              )}
            </div>
            <textarea
              rows={3}
              value={editFormData.notes}
              onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
              placeholder="VD: Khách đi tour Sydney 2 người vào tháng 12..."
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs flex items-center gap-1.5 px-2.5"
              onClick={() => {
                const targetCust = editingCustomer;
                setIsEditModalOpen(false);
                handleOpenSingleDeleteModal(targetCust);
              }}
            >
              <Trash2 className="h-4 w-4" />
              <span>Xóa khách hàng này</span>
            </Button>

            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={isSavingEdit}>
                {isSavingEdit ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    <span>Lưu thay đổi</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => !isDeleting && setIsDeleteModalOpen(false)}
        title="Xác nhận xóa khách hàng"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-rose-900 text-xs">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-950">
                Bạn có chắc chắn muốn xóa {customersToDelete.length} khách hàng đã chọn?
              </p>
              <p className="mt-1 text-slate-600">
                Hồ sơ khách hàng và các cuộc hội thoại liên quan sẽ được xóa hoặc ẩn khỏi danh sách CRM.
              </p>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Danh sách khách hàng sẽ bị xóa ({customersToDelete.length}):
            </label>
            <div className="max-h-48 overflow-y-auto space-y-1 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs divide-y divide-slate-100">
              {customersToDelete.map((c) => (
                <div key={c.id} className="pt-1.5 first:pt-0 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 mr-2">{c.code}</span>
                    <span className="font-medium text-slate-900">{c.fullName}</span>
                  </div>
                  <span className="text-slate-400 text-[11px]">{c.phone || 'Không có SĐT'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
              <input
                type="checkbox"
                checked={permanentDelete}
                onChange={(e) => setPermanentDelete(e.target.checked)}
                className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
              />
              <span>Xóa vĩnh viễn khỏi cơ sở dữ liệu (Dọn dẹp triệt để dữ liệu mẫu/test)</span>
            </label>
            <p className="text-[11px] text-slate-500 mt-1 pl-6">
              Bỏ chọn nếu bạn chỉ muốn đưa vào thùng rác / lưu trữ an toàn (Soft Delete).
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              disabled={isDeleting}
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Hủy bỏ
            </Button>
            <Button
              type="button"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-1.5" />
                  <span>Đang xóa...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  <span>Xác nhận xóa</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
