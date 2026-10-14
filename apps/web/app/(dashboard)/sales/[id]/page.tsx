'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  User,
  Shield,
  Phone,
  Mail,
  Calendar,
  MessageSquare,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Edit3,
  RefreshCw,
  ArrowLeft,
  Share2,
  Lock,
  Unlock,
  Check,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { DemoBadge } from '@/components/ui/demo-badge';
import { fetchApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import {
  CapabilityLabels,
  VerificationStatusLabels,
  VerificationStatusColors,
  ConnectionStatusLabels,
  ConnectionStatusColors,
  IntegrationCapability,
  CapabilityVerificationStatus,
} from '@sales-zalo/shared';

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<any>(null);
  const [integrationData, setIntegrationData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'customers' | 'activities' | 'integrations' | 'handovers'>('integrations');
  const [isLoading, setIsLoading] = useState(true);

  // Modal cập nhật xác minh capability
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCap, setSelectedCap] = useState<any>(null);
  const [verificationForm, setVerificationForm] = useState({
    status: CapabilityVerificationStatus.NEEDS_VERIFICATION,
    method: '',
    evidenceUrl: '',
    evidenceReference: '',
    scopeNotes: '',
    verificationNotes: '',
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [u, integ] = await Promise.all([
        fetchApi(`/users/${id}`),
        fetchApi(`/integration-verifications/user/${id}`),
      ]);
      setUser(u);
      setIntegrationData(integ);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const handleOpenEditModal = (capItem: any) => {
    setSelectedCap(capItem);
    setVerificationForm({
      status: capItem?.status || CapabilityVerificationStatus.NEEDS_VERIFICATION,
      method: capItem?.method || 'Zalo Personal Standard Integration',
      evidenceUrl: capItem?.evidenceUrl || '',
      evidenceReference: capItem?.evidenceReference || '',
      scopeNotes: capItem?.scopeNotes || '',
      verificationNotes: capItem?.verificationNotes || '',
    });
    setIsEditModalOpen(true);
  };

  const handleSaveVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi(`/integration-verifications/user/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          capability: selectedCap.capability,
          ...verificationForm,
        }),
      });
      setIsEditModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCheckConnection = async () => {
    if (!integrationData?.connection?.id) return;
    try {
      await fetchApi(`/integrations/connections/${integrationData.connection.id}/check`, {
        method: 'POST',
      });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (isLoading && !user) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
          <span className="text-sm">Đang tải thông tin nhân viên...</span>
        </div>
      </div>
    );
  }

  const verificationsMap = new Map();
  integrationData?.verifications?.forEach((v: any) => {
    verificationsMap.set(v.capability, v);
  });

  const capabilitiesList = [
    IntegrationCapability.READ_CHATS,
    IntegrationCapability.SYNC_MESSAGES_FILES,
    IntegrationCapability.BULK_SEND,
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link href="/sales" className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span>Quay lại danh sách nhân viên Sale</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link href="/customers">
            <Button size="sm" variant="outline" className="text-xs">
              <span>Bàn giao khách hàng</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* User Header Profile Card */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img
              src={user?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sale'}
              alt={user?.name}
              className="h-16 w-16 rounded-2xl border-2 border-slate-200 object-cover bg-slate-100"
            />
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-slate-900">{user?.name}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                  {user?.code}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    user?.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {user?.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {user?.email}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {user?.phone || 'Chưa có SĐT'}
                </span>
                <span>•</span>
                <span>Đội: <strong className="text-slate-700">{user?.team?.name || 'Chưa gán'}</strong></span>
                <span>•</span>
                <span>Khách đang phụ trách: <strong className="text-blue-600 font-bold">{user?._count?.assignedCustomers || 0}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-100 mt-6 pt-2 overflow-x-auto">
          {[
            { id: 'integrations', label: 'Cài đặt tích hợp Zalo cá nhân (Core)' },
            { id: 'overview', label: 'Tổng quan' },
            { id: 'customers', label: `Khách hàng phụ trách (${user?._count?.assignedCustomers || 0})` },
            { id: 'activities', label: `Lịch sử chăm sóc (${user?._count?.activities || 0})` },
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

      {/* TAB 1: CÀI ĐẶT TÍCH HỢP ZALO CÁ NHÂN (THE CORE REQUIREMENT) */}
      {activeTab === 'integrations' && (
        <div className="space-y-6">
          {/* Connection Status Card */}
          <Card className="p-6 border-blue-200/80 bg-blue-50/20">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">Trạng thái Kết nối Tài khoản Zalo</h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-blue-100 text-blue-800">
                    Tài khoản cá nhân
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Nhãn: <strong className="text-slate-700">{integrationData?.connection?.accountLabel || 'Zalo cá nhân của Sale'}</strong>
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-slate-500">Trạng thái kết nối thực tế:</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      ConnectionStatusColors[integrationData?.connection?.connectionStatus as keyof typeof ConnectionStatusColors] || 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {ConnectionStatusLabels[integrationData?.connection?.connectionStatus as keyof typeof ConnectionStatusLabels] || 'Chưa kết nối'}
                  </span>
                  {integrationData?.connection?.lastErrorCode && (
                    <span className="text-[11px] text-rose-600 font-mono">
                      ({integrationData.connection.lastErrorCode})
                    </span>
                  )}
                </div>
              </div>

              <Button size="sm" variant="outline" onClick={handleCheckConnection}>
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Kiểm tra kết nối</span>
              </Button>
            </div>
          </Card>

          {/* Capability Gating Explanation Alert */}
          <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/80 flex items-start gap-3 text-xs text-amber-900">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Quy tắc Phân tách và Gating (Bảo vệ an toàn dữ liệu Zalo)</p>
              <p className="mt-1">
                Theo tài liệu chính thức từ Zalo, API cá nhân không mở công khai cho đọc tin nhắn hay gửi hàng loạt. Trạng thái kết nối tài khoản và trạng thái xác minh từng tính năng hoạt động <strong>hoàn toàn độc lập</strong>.
              </p>
              <p className="mt-1 font-medium">
                Một tính năng chỉ được phép hoạt động khi: (1) Capability được đánh dấu VERIFIED kèm bằng chứng, (2) Connector thực tế hoạt động ACTIVE, (3) Người dùng có quyền truy cập. Nếu không đủ điều kiện, chức năng sẽ bị khóa an toàn.
              </p>
            </div>
          </div>

          {/* 3 Separate Capability Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {capabilitiesList.map((cap) => {
              const capInfo = CapabilityLabels[cap];
              const verif = verificationsMap.get(cap);
              const status: CapabilityVerificationStatus = verif?.status || CapabilityVerificationStatus.NEEDS_VERIFICATION;
              const isVerified = status === CapabilityVerificationStatus.VERIFIED;

              return (
                <Card key={cap} className="p-5 flex flex-col justify-between border-slate-200">
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <h4 className="font-bold text-sm text-slate-900">{capInfo.label}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${VerificationStatusColors[status]}`}>
                        {VerificationStatusLabels[status]}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 mt-2 min-h-[32px]">{capInfo.description}</p>

                    {/* Verification Details */}
                    <div className="mt-4 space-y-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-[11px] text-slate-400 block">Phương thức tích hợp:</span>
                        <span className="font-medium text-slate-800">{verif?.method || 'Chưa thiết lập'}</span>
                      </div>

                      {verif?.evidenceUrl && (
                        <div>
                          <span className="text-[11px] text-slate-400 block">URL tài liệu bằng chứng:</span>
                          <a
                            href={verif.evidenceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1 font-medium truncate"
                          >
                            <span className="truncate">{verif.evidenceUrl}</span>
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        </div>
                      )}

                      {verif?.evidenceReference && (
                        <div>
                          <span className="text-[11px] text-slate-400 block">Mã tham chiếu:</span>
                          <span className="font-mono text-slate-700">{verif.evidenceReference}</span>
                        </div>
                      )}

                      <div>
                        <span className="text-[11px] text-slate-400 block">Ghi chú xác minh:</span>
                        <p className="text-slate-600 text-[11px] italic mt-0.5">{verif?.verificationNotes || 'Chưa có ghi chú xác minh.'}</p>
                      </div>

                      {verif?.verifiedByUser && (
                        <div className="pt-2 border-t border-slate-200/60 text-[10px] text-slate-500">
                          Người xác minh: <strong>{verif.verifiedByUser.name}</strong> • {formatDate(verif.verifiedAt)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions & Execution State */}
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[11px]">
                      {isVerified ? (
                        <span className="text-emerald-700 font-medium flex items-center gap-1">
                          <Unlock className="h-3.5 w-3.5 text-emerald-600" />
                          Đã xác minh
                        </span>
                      ) : (
                        <span className="text-slate-500 font-medium flex items-center gap-1">
                          <Lock className="h-3.5 w-3.5 text-slate-400" />
                          Chức năng bị khóa
                        </span>
                      )}
                    </div>

                    <Button size="sm" variant="outline" className="h-7 text-xs px-2.5" onClick={() => handleOpenEditModal(verif || { capability: cap })}>
                      <Edit3 className="h-3 w-3" />
                      <span>Cập nhật xác minh</span>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: TỔNG QUAN */}
      {activeTab === 'overview' && (
        <Card className="p-6">
          <h3 className="text-base font-bold text-slate-900 mb-4">Thông tin hồ sơ nhân viên</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-xs">
            <div>
              <span className="text-slate-400 block mb-1">Mã nhân viên:</span>
              <span className="font-bold text-slate-900 text-sm">{user?.code}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Họ và tên:</span>
              <span className="font-semibold text-slate-900 text-sm">{user?.name}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Email nội bộ:</span>
              <span className="text-slate-700">{user?.email}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Số điện thoại:</span>
              <span className="text-slate-700">{user?.phone || 'Chưa cung cấp'}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Tài khoản Zalo cá nhân:</span>
              <span className="font-semibold text-blue-700">{user?.zaloAccountName || 'Chưa khai báo'}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Số điện thoại Zalo:</span>
              <span className="text-slate-700">{user?.zaloPhone || 'Chưa khai báo'}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Ngày tạo tài khoản:</span>
              <span className="text-slate-700">{formatDate(user?.createdAt)}</span>
            </div>
          </div>
        </Card>
      )}

      {/* TAB 3: KHÁCH HÀNG PHỤ TRÁCH */}
      {activeTab === 'customers' && (
        <Card className="p-0 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Danh sách khách hàng đang phân công</h3>
            <Link href="/customers">
              <Button size="sm" variant="outline" className="text-xs">
                <span>Đi đến trang Bàn Giao</span>
              </Button>
            </Link>
          </div>
          <div className="p-4 text-xs text-slate-500">
            Nhân viên này đang quản trị {user?._count?.assignedCustomers || 0} hồ sơ khách hàng trong hệ thống CRM. Bạn có thể sử dụng màn hình CRM để lọc và điều chuyển khách hàng theo quy trình.
          </div>
        </Card>
      )}

      {/* TAB 4: LỊCH SỬ CHĂM SÓC */}
      {activeTab === 'activities' && (
        <Card className="p-6">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Các hoạt động chăm sóc do nhân viên thực hiện</h3>
          <div className="text-xs text-slate-500">
            Toàn bộ các cuộc gọi, ghi chú và hoạt động chăm sóc của Sale này đều được lưu trữ vĩnh viễn trong nhật ký CRM.
          </div>
        </Card>
      )}

      {/* Modal Cập nhật Xác minh Capability */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Xác minh tính năng: ${selectedCap ? CapabilityLabels[selectedCap.capability as IntegrationCapability]?.label : ''}`}
        description="Đánh giá tài liệu chính thức, phân quyền và điều kiện kỹ thuật trước khi bật chức năng"
      >
        <form onSubmit={handleSaveVerification} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Trạng thái xác minh</label>
            <select
              value={verificationForm.status}
              onChange={(e) => setVerificationForm({ ...verificationForm, status: e.target.value as any })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20"
            >
              <option value={CapabilityVerificationStatus.NEEDS_VERIFICATION}>Cần xác minh (NEEDS_VERIFICATION)</option>
              <option value={CapabilityVerificationStatus.IN_REVIEW}>Đang kiểm tra tài liệu (IN_REVIEW)</option>
              <option value={CapabilityVerificationStatus.VERIFIED}>Đã xác minh đạt chuẩn (VERIFIED)</option>
              <option value={CapabilityVerificationStatus.REJECTED}>Không đáp ứng điều kiện / Từ chối (REJECTED)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Phương thức tích hợp đề xuất</label>
            <input
              type="text"
              required
              value={verificationForm.method}
              onChange={(e) => setVerificationForm({ ...verificationForm, method: e.target.value })}
              placeholder="Ví dụ: Zalo Personal Web Connector / Zalo Business SDK"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">URL tài liệu chính thức</label>
              <input
                type="text"
                value={verificationForm.evidenceUrl}
                onChange={(e) => setVerificationForm({ ...verificationForm, evidenceUrl: e.target.value })}
                placeholder="https://developers.zalo.me/..."
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mã tham chiếu / Biên bản test</label>
              <input
                type="text"
                value={verificationForm.evidenceReference}
                onChange={(e) => setVerificationForm({ ...verificationForm, evidenceReference: e.target.value })}
                placeholder="REF-ZALO-2026-TEST"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú phạm vi quyền (Scope notes)</label>
            <input
              type="text"
              value={verificationForm.scopeNotes}
              onChange={(e) => setVerificationForm({ ...verificationForm, scopeNotes: e.target.value })}
              placeholder="Chỉ cho phép đọc tin nhắn khách hàng trong CRM..."
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú xác minh của quản trị viên</label>
            <textarea
              required
              rows={3}
              value={verificationForm.verificationNotes}
              onChange={(e) => setVerificationForm({ ...verificationForm, verificationNotes: e.target.value })}
              placeholder="Nhập lý do, căn cứ kỹ thuật hoặc lý do từ chối tính năng..."
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          {verificationForm.status === CapabilityVerificationStatus.VERIFIED && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
              * Khi đánh dấu VERIFIED, bạn phải nhập URL tài liệu hoặc Mã tham chiếu bằng chứng. Hành động này sẽ được ghi nhận vào Audit Log.
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)}>Hủy</Button>
            <Button type="submit">Lưu xác minh</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
