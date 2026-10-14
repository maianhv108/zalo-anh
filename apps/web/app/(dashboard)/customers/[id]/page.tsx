'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  Tag,
  Share2,
  FileText,
  MessageSquare,
  CheckCircle2,
  Plus,
  Download,
  AlertCircle,
  Paperclip,
  Check,
  RefreshCw,
  Send,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { DemoBadge } from '@/components/ui/demo-badge';
import { fetchApi } from '@/lib/api';
import { formatDate, formatShortDate, formatFileSize } from '@/lib/utils';
import {
  CustomerStatus,
  CustomerPriority,
  CustomerStatusLabels,
  CustomerStatusColors,
  CustomerPriorityLabels,
  ActivityType,
  ActivityTypeLabels,
} from '@sales-zalo/shared';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<any>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'activities' | 'conversations' | 'tasks' | 'attachments' | 'assignments'>('overview');
  const [isLoading, setIsLoading] = useState(true);

  // Modal Handover
  const [isHandoverOpen, setIsHandoverOpen] = useState(false);
  const [handoverData, setHandoverData] = useState({ toUserId: '', reason: '' });

  // Add Care Activity Form
  const [activityForm, setActivityForm] = useState({
    type: ActivityType.CALL,
    title: '',
    description: '',
  });

  // Add Task Form
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    dueDate: '',
  });

  const loadCustomer = async () => {
    setIsLoading(true);
    try {
      const [cust, salesRes] = await Promise.all([
        fetchApi(`/customers/${id}`),
        fetchApi('/users?role=SALE'),
      ]);
      setCustomer(cust);
      setSales(salesRes.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadCustomer();
  }, [id]);

  const handleStatusChange = async (newStatus: CustomerStatus) => {
    try {
      await fetchApi(`/customers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      loadCustomer();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityForm.title) return;
    try {
      await fetchApi('/customer-activities', {
        method: 'POST',
        body: JSON.stringify({
          customerId: id,
          ...activityForm,
        }),
      });
      setActivityForm({ type: ActivityType.CALL, title: '', description: '' });
      loadCustomer();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          customerId: id,
          ...taskForm,
          dueDate: taskForm.dueDate ? new Date(taskForm.dueDate) : undefined,
        }),
      });
      setIsTaskModalOpen(false);
      setTaskForm({ title: '', description: '', dueDate: '' });
      loadCustomer();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await fetchApi(`/tasks/${taskId}/complete`, { method: 'POST' });
      loadCustomer();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSingleHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchApi('/customer-assignments/handover', {
        method: 'POST',
        body: JSON.stringify({
          customerIds: [id],
          toUserId: handoverData.toUserId,
          reason: handoverData.reason,
        }),
      });
      alert(res.message);
      setIsHandoverOpen(false);
      setHandoverData({ toUserId: '', reason: '' });
      loadCustomer();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (isLoading && !customer) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
          <span className="text-sm">Đang tải hồ sơ khách hàng...</span>
        </div>
      </div>
    );
  }

  const tags = Array.isArray(customer.tags) ? customer.tags : [];

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link href="/customers" className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span>Quay lại danh sách khách hàng</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setIsHandoverOpen(true)}>
            <Share2 className="h-3.5 w-3.5 text-blue-600" />
            <span>Bàn giao khách hàng này</span>
          </Button>
          <Button size="sm" onClick={() => setIsTaskModalOpen(true)}>
            <Plus className="h-4 w-4" />
            <span>Tạo nhiệm vụ / Lịch hẹn</span>
          </Button>
        </div>
      </div>

      {/* Customer Header Card */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-900">{customer.fullName}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                {customer.code}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${CustomerStatusColors[customer.status as CustomerStatus]}`}>
                {CustomerStatusLabels[customer.status as CustomerStatus] || customer.status}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-500">
              <span className="flex items-center gap-1 font-medium text-slate-700">
                <Phone className="h-3.5 w-3.5 text-blue-600" />
                {customer.phone || 'Chưa có SĐT'}
              </span>
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                {customer.email || 'Chưa có email'}
              </span>
              <span>•</span>
              <span>Nguồn: <strong>{customer.source}</strong></span>
              <span>•</span>
              <span>
                Sale phụ trách:{' '}
                <strong className="text-blue-700">
                  {customer.assignedTo ? `${customer.assignedTo.name} (${customer.assignedTo.code})` : 'Chưa phân công'}
                </strong>
              </span>
            </div>
          </div>

          {/* Quick Status Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Đổi trạng thái:</span>
            <select
              value={customer.status}
              onChange={(e) => handleStatusChange(e.target.value as any)}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl"
            >
              {Object.entries(CustomerStatusLabels).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-100 mt-6 pt-2 overflow-x-auto">
          {[
            { id: 'overview', label: 'Tổng quan' },
            { id: 'activities', label: `Lịch sử chăm sóc (${customer.activities?.length || 0})` },
            { id: 'conversations', label: `Hội thoại Zalo (${customer.conversations?.length || 0})` },
            { id: 'tasks', label: `Nhiệm vụ & Lịch hẹn (${customer.tasks?.length || 0})` },
            { id: 'attachments', label: `Tệp đính kèm (${customer.attachments?.length || 0})` },
            { id: 'assignments', label: `Lịch sử bàn giao (${customer.assignments?.length || 0})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Card>

      {/* TAB 1: TỔNG QUAN */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4">Thông tin chi tiết</h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-1">Mã khách hàng:</span>
                <span className="font-semibold text-slate-900 text-sm">{customer.code}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Họ và tên:</span>
                <span className="font-semibold text-slate-900 text-sm">{customer.fullName}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Số điện thoại:</span>
                <span className="text-slate-800 font-medium">{customer.phone || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Email:</span>
                <span className="text-slate-800">{customer.email || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Mức độ ưu tiên:</span>
                <span className="font-medium text-slate-800">{CustomerPriorityLabels[customer.priority as CustomerPriority]}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Ngày tạo hồ sơ:</span>
                <span className="text-slate-700">{formatDate(customer.createdAt)}</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-700 block mb-2">Thẻ phân loại (Tags):</span>
              <div className="flex flex-wrap gap-1.5">
                {tags.length === 0 ? (
                  <span className="text-xs text-slate-400 italic">Chưa gắn thẻ</span>
                ) : (
                  tags.map((t: string, idx: number) => (
                    <span key={idx} className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                      #{t}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-700 block mb-1">Ghi chú nhu cầu ban đầu:</span>
              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                {customer.notes || 'Không có ghi chú.'}
              </p>
            </div>
          </Card>

          {/* Side Info */}
          <Card className="p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Trạng thái chăm sóc</h3>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block mb-1">Lần liên hệ gần nhất:</span>
                <span className="font-medium text-slate-800">{formatDate(customer.lastContactedAt)}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block mb-1">Lịch chăm sóc tiếp theo:</span>
                <span className="font-medium text-blue-700">{formatDate(customer.nextFollowUpAt)}</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: LỊCH SỬ CHĂM SÓC */}
      {activeTab === 'activities' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Timeline List */}
          <Card className="md:col-span-2 p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4">Dòng thời gian chăm sóc</h3>
            <div className="space-y-4">
              {customer.activities?.length === 0 ? (
                <p className="text-center py-8 text-xs text-slate-400">Chưa có hoạt động chăm sóc nào</p>
              ) : (
                customer.activities.map((act: any) => (
                  <div key={act.id} className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-100 text-xs">
                    <div className="flex items-center justify-between pb-1">
                      <span className="font-bold text-slate-900">{act.title}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800">
                        {ActivityTypeLabels[act.type as ActivityType] || act.type}
                      </span>
                    </div>
                    {act.description && <p className="text-slate-600 mt-1">{act.description}</p>}
                    <div className="mt-2 pt-2 border-t border-slate-200/50 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Người thực hiện: <strong>{act.user?.name}</strong></span>
                      <span>{formatDate(act.createdAt)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Quick Add Care Activity Form */}
          <Card className="p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Ghi nhận hoạt động chăm sóc</h3>
            <form onSubmit={handleAddActivity} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Loại hoạt động</label>
                <select
                  value={activityForm.type}
                  onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value as any })}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value={ActivityType.CALL}>Cuộc gọi tư vấn</option>
                  <option value={ActivityType.MESSAGE}>Tin nhắn Zalo/SMS</option>
                  <option value={ActivityType.MEETING}>Gặp mặt trực tiếp</option>
                  <option value={ActivityType.NOTE}>Ghi chú nội bộ</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tiêu đề *</label>
                <input
                  type="text"
                  required
                  value={activityForm.title}
                  onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                  placeholder="Ví dụ: Đã gọi điện trao đổi báo giá..."
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nội dung chi tiết</label>
                <textarea
                  rows={3}
                  value={activityForm.description}
                  onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                  placeholder="Khách hàng yêu cầu gửi lại hợp đồng..."
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <Button type="submit" size="sm" className="w-full mt-2">
                <span>Lưu hoạt động</span>
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* TAB 3: HỘI THOẠI */}
      {activeTab === 'conversations' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900">Luồng tin nhắn Zalo</h3>
            <DemoBadge />
          </div>

          {customer.conversations?.length === 0 ? (
            <p className="text-center py-12 text-xs text-slate-400">Khách hàng này chưa có hội thoại nào</p>
          ) : (
            customer.conversations.map((conv: any) => (
              <div key={conv.id} className="space-y-3">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 max-h-96 overflow-y-auto space-y-3">
                  {conv.messages?.map((msg: any) => {
                    const isOutbound = msg.direction === 'OUTBOUND';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-md p-3 rounded-2xl text-xs ${
                            isOutbound
                              ? 'bg-blue-600 text-white rounded-br-none shadow-xs'
                              : 'bg-white text-slate-900 border border-slate-200 rounded-bl-none shadow-xs'
                          }`}
                        >
                          <p>{msg.textContent}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1">
                          {formatDate(msg.sentAt)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end">
                  <Link href="/inbox">
                    <Button size="sm" variant="outline">
                      <MessageSquare className="h-4 w-4" />
                      <span>Mở hội thoại trong Hộp thư tập trung</span>
                    </Button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </Card>
      )}

      {/* TAB 4: NHIỆM VỤ & LỊCH HẸN */}
      {activeTab === 'tasks' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900">Nhiệm vụ & Nhắc việc chăm sóc</h3>
            <Button size="sm" onClick={() => setIsTaskModalOpen(true)}>
              <Plus className="h-4 w-4" />
              <span>Thêm nhiệm vụ</span>
            </Button>
          </div>

          <div className="space-y-3">
            {customer.tasks?.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-400">Chưa có nhiệm vụ nào được lên lịch</p>
            ) : (
              customer.tasks.map((t: any) => (
                <div key={t.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <p className={`font-bold ${t.status === 'COMPLETED' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                      {t.title}
                    </p>
                    {t.description && <p className="text-slate-500 mt-0.5">{t.description}</p>}
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                      <span>Hạn: <strong className="text-blue-700">{formatDate(t.dueDate)}</strong></span>
                      <span>•</span>
                      <span>Người tạo: {t.createdBy?.name}</span>
                    </div>
                  </div>

                  {t.status !== 'COMPLETED' && (
                    <Button size="sm" variant="success" className="h-8 text-xs" onClick={() => handleCompleteTask(t.id)}>
                      <Check className="h-3.5 w-3.5" />
                      <span>Hoàn thành</span>
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* TAB 5: TỆP ĐÍNH KÈM */}
      {activeTab === 'attachments' && (
        <Card className="p-6">
          <h3 className="text-base font-bold text-slate-900 mb-4">Tài liệu và tệp lưu trữ hợp lệ</h3>
          <div className="space-y-3">
            {customer.attachments?.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-400">Không có tệp đính kèm nào</p>
            ) : (
              customer.attachments.map((att: any) => (
                <div key={att.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <Paperclip className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="font-semibold text-slate-900">{att.fileName}</p>
                      <p className="text-[11px] text-slate-400">{formatFileSize(att.fileSize)} • Nguồn: {att.sourceType}</p>
                    </div>
                  </div>

                  <a href={`http://localhost:4000/api/v1/attachments/${att.id}/download`} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" className="h-7 text-xs">
                      <Download className="h-3.5 w-3.5" />
                      <span>Tải về</span>
                    </Button>
                  </a>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* TAB 6: LỊCH SỬ BÀN GIAO (CUSTOMER ASSIGNMENTS) */}
      {activeTab === 'assignments' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Lịch sử Phân công & Bàn giao Bất biến</h3>
              <p className="text-xs text-slate-500">Mọi lần thay đổi người phụ trách đều được lưu trữ vĩnh viễn</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setIsHandoverOpen(true)}>
              <Share2 className="h-3.5 w-3.5 text-blue-600" />
              <span>Thực hiện bàn giao mới</span>
            </Button>
          </div>

          <div className="space-y-4">
            {customer.assignments?.map((asg: any) => (
              <div key={asg.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                  <div className="font-bold text-slate-900">
                    Bàn giao từ <span className="text-slate-600">{asg.fromUser ? asg.fromUser.name : 'Khách mới / Tự động'}</span> → <span className="text-blue-700">{asg.toUser?.name}</span>
                  </div>
                  <span className="text-[11px] text-slate-400">{formatDate(asg.createdAt)}</span>
                </div>
                <div className="mt-2 text-slate-600">
                  Lý do bàn giao: <strong className="text-slate-800">{asg.reason}</strong>
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  Người thực hiện thao tác: <strong>{asg.changedByUser?.name}</strong>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Modal Bàn giao 1 khách hàng */}
      <Modal
        isOpen={isHandoverOpen}
        onClose={() => setIsHandoverOpen(false)}
        title="Bàn giao khách hàng này"
        description="Chuyển quyền quản lý sang nhân viên Sale khác"
      >
        <form onSubmit={handleSingleHandover} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nhân viên tiếp nhận *</label>
            <select
              required
              value={handoverData.toUserId}
              onChange={(e) => setHandoverData({ ...handoverData, toUserId: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            >
              <option value="">-- Chọn nhân viên Sale nhận bàn giao --</option>
              {sales
                .filter((s) => s.status === 'ACTIVE' && s.id !== customer.assignedToId)
                .map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Lý do bàn giao *</label>
            <textarea
              required
              rows={3}
              value={handoverData.reason}
              onChange={(e) => setHandoverData({ ...handoverData, reason: e.target.value })}
              placeholder="Nhập lý do chuyển giao khách..."
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsHandoverOpen(false)}>Hủy</Button>
            <Button type="submit">Xác nhận</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Tạo nhiệm vụ */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        title="Tạo nhiệm vụ chăm sóc khách hàng"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tiêu đề nhiệm vụ *</label>
            <input
              type="text"
              required
              value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              placeholder="Ví dụ: Gọi lại tư vấn gói Enterprise..."
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Hạn hoàn thành</label>
            <input
              type="datetime-local"
              value={taskForm.dueDate}
              onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mô tả công việc</label>
            <textarea
              rows={3}
              value={taskForm.description}
              onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsTaskModalOpen(false)}>Hủy</Button>
            <Button type="submit">Tạo nhiệm vụ</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
