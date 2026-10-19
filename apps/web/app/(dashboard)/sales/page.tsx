'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Shield,
  Phone,
  Mail,
  UserX,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  QrCode,
  Copy,
  Check,
  Clock,
  ArrowRight,
  Building2,
  Wifi,
  Trash2,
  Laptop,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { fetchApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import {
  InviteStatusLabels,
  InviteStatusColors,
  InviteStatus,
} from '@sales-zalo/shared';

export default function SalesPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);
  const [userToDisable, setUserToDisable] = useState<any>(null);
  const [disableWarning, setDisableWarning] = useState<any>(null);

  // Gỡ bỏ tài khoản Zalo & xóa sạch dữ liệu đồng bộ
  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);
  const [userToWipe, setUserToWipe] = useState<any>(null);
  const [isWiping, setIsWiping] = useState(false);

  // Chrome Extension Modal
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);
  const [copiedExtensionPath, setCopiedExtensionPath] = useState(false);
  const extensionPath = 'd:\\sales-zalo-project-docs\\apps\\extension';

  // Thêm nhân viên Sale trực tiếp
  const [isCreateSaleModalOpen, setIsCreateSaleModalOpen] = useState(false);
  const [createSaleForm, setCreateSaleForm] = useState({
    name: '',
    phone: '',
    email: '',
    teamId: '',
    password: 'Sale@123',
  });
  const [isCreatingSale, setIsCreatingSale] = useState(false);
  const [createSaleError, setCreateSaleError] = useState<string | null>(null);

  // QR Invite State
  const [inviteTeamId, setInviteTeamId] = useState('');
  const [inviteData, setInviteData] = useState<any>(null);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedTeam) params.append('teamId', selectedTeam);
      if (selectedStatus) params.append('status', selectedStatus);

      const [usersRes, teamsRes] = await Promise.all([
        fetchApi(`/users?${params.toString()}`),
        fetchApi('/sales-teams'),
      ]);

      setUsers(usersRes.items || []);
      setTeams(teamsRes || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, selectedTeam, selectedStatus]);

  // Gỡ bỏ hoàn toàn tài khoản Zalo và xóa sạch toàn bộ dữ liệu đồng bộ
  const handleWipeAccount = async () => {
    if (!userToWipe) return;
    setIsWiping(true);
    try {
      const res = await fetchApi(`/users/${userToWipe.id}/wipe-account`, {
        method: 'DELETE',
      });
      alert(res.message || 'Đã gỡ bỏ tài khoản Zalo và xóa sạch toàn bộ dữ liệu thành công.');
      setIsWipeModalOpen(false);
      setUserToWipe(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi gỡ bỏ tài khoản.');
    } finally {
      setIsWiping(false);
    }
  };

  // Tạo nhân viên Sale mới trực tiếp
  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createSaleForm.name.trim()) {
      setCreateSaleError('Vui lòng nhập họ và tên nhân viên Sale');
      return;
    }
    setIsCreatingSale(true);
    setCreateSaleError(null);
    try {
      const cleanPhone = createSaleForm.phone ? createSaleForm.phone.replace(/\D/g, '') : '';
      const email = createSaleForm.email || (cleanPhone ? `sale.${cleanPhone}@crm.local` : `sale.${Date.now()}@crm.local`);
      const payload: any = {
        name: createSaleForm.name.trim(),
        role: 'SALE',
        email,
        password: createSaleForm.password || 'Sale@123',
      };
      if (createSaleForm.phone.trim()) {
        payload.phone = createSaleForm.phone.trim();
        payload.zaloPhone = createSaleForm.phone.trim();
      }
      if (createSaleForm.name.trim()) {
        payload.zaloAccountName = createSaleForm.name.trim();
      }
      if (createSaleForm.teamId) {
        payload.teamId = createSaleForm.teamId;
      }

      await fetchApi('/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setIsCreateSaleModalOpen(false);
      setCreateSaleForm({
        name: '',
        phone: '',
        email: '',
        teamId: '',
        password: 'Sale@123',
      });
      loadData();
      alert('Đã thêm nhân viên Sale thành công! Tên bạn sẽ lập tức có sẵn trên Extension Zalo.');
    } catch (err: any) {
      setCreateSaleError(err.message || 'Lỗi khi tạo nhân viên Sale.');
    } finally {
      setIsCreatingSale(false);
    }
  };

  // Tạo mã QR mời nhân viên Sale
  const handleGenerateInvite = async (teamIdToUse?: string) => {
    setIsGeneratingQr(true);
    try {
      const payload: any = { expiresInMinutes: 15 };
      const tid = teamIdToUse !== undefined ? teamIdToUse : inviteTeamId;
      if (tid) payload.teamId = tid;

      const res = await fetchApi('/sale-invites', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setInviteData(res);
      setTimeLeft(res.expiresInSeconds || 900);
      setCopiedLink(false);
    } catch (err: any) {
      alert(err.message || 'Không thể tạo mã QR mời.');
    } finally {
      setIsGeneratingQr(false);
    }
  };

  // Mở modal và tự động tạo mã QR đầu tiên
  const handleOpenInviteModal = () => {
    setIsInviteModalOpen(true);
    handleGenerateInvite(inviteTeamId);
  };

  // Đóng modal và dọn dẹp interval
  const handleCloseInviteModal = () => {
    setIsInviteModalOpen(false);
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  // Bộ đếm lùi thời gian hết hạn mã QR
  useEffect(() => {
    if (!isInviteModalOpen || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isInviteModalOpen, timeLeft]);

  // Live Polling trạng thái lời mời từ Backend
  useEffect(() => {
    if (!isInviteModalOpen || !inviteData?.token) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }

    // Nếu đã hoàn thành hoặc hết hạn thì không poll nữa
    if (inviteData.status === 'COMPLETED' || inviteData.status === 'CANCELLED' || timeLeft <= 0) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }

    const checkStatus = async () => {
      try {
        const statusRes = await fetchApi(`/sale-invites/${inviteData.token}/status`);

        // Cập nhật trạng thái
        if (statusRes.status !== inviteData.status || statusRes.usedByUser) {
          setInviteData((prev: any) => ({ ...prev, ...statusRes }));

          // Khi nhân viên tham gia thành công -> tự động tải lại danh sách Sale
          if (statusRes.status === 'COMPLETED') {
            loadData();
          }
        }
      } catch (e) {
        console.error('Polling invite error:', e);
      }
    };

    pollingRef.current = setInterval(checkStatus, 2000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [isInviteModalOpen, inviteData?.token, inviteData?.status, timeLeft]);

  // Sao chép link mời
  const handleCopyLink = () => {
    if (!inviteData?.inviteUrl) return;
    navigator.clipboard.writeText(inviteData.inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Hủy lời mời
  const handleCancelInvite = async () => {
    if (!inviteData?.token) return;
    try {
      await fetchApi(`/sale-invites/${inviteData.token}/cancel`, { method: 'POST' });
      handleCloseInviteModal();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi hủy lời mời.');
    }
  };

  // Vô hiệu hóa tài khoản
  const handleDisableUser = async () => {
    if (!userToDisable) return;
    try {
      const res = await fetchApi(`/users/${userToDisable.id}/disable`, {
        method: 'POST',
      });
      setIsDisableModalOpen(false);
      setUserToDisable(null);
      loadData();
    } catch (err: any) {
      setDisableWarning(err.details || { warning: err.message });
    }
  };

  // Định dạng mm:ss
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Quản lý Đội ngũ Nhân viên Sale</h2>
          <p className="text-sm text-slate-500">
            Mời nhân viên tham gia bằng mã QR, quản lý tài khoản Zalo cá nhân và phân bổ khách hàng
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            onClick={() => setIsCreateSaleModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md shadow-emerald-500/20"
          >
            <UserPlus className="h-4 w-4 mr-1.5" />
            <span>Thêm Nhân Viên Sale Mới</span>
          </Button>

          <Button
            onClick={() => setIsExtensionModalOpen(true)}
            variant="outline"
            className="border-blue-300 text-blue-700 hover:bg-blue-50 font-semibold shadow-xs"
          >
            <Sparkles className="h-4 w-4 mr-1.5 text-blue-600" />
            <span>Đồng Bộ Zalo Web (Chrome Extension)</span>
          </Button>

          <Button
            onClick={handleOpenInviteModal}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md shadow-blue-500/20"
          >
            <QrCode className="h-4 w-4 mr-2" />
            <span>Mời Bằng Mã QR</span>
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm theo mã, họ tên, email, số điện thoại..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Tất cả đội nhóm</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="INACTIVE">Đã vô hiệu hóa</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Nhân viên</th>
                <th className="py-3 px-4">Liên hệ</th>
                <th className="py-3 px-4">Đội nhóm</th>
                <th className="py-3 px-4">Tài khoản Zalo cá nhân</th>
                <th className="py-3 px-4 text-center">Khách phụ trách</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Đang tải danh sách nhân viên Sale...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Không tìm thấy nhân viên nào phù hợp
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt={u.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center font-bold text-slate-500">
                              {u.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{u.name}</span>
                            {u.role === 'ADMIN' && (
                              <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-semibold">
                                Admin
                              </span>
                            )}
                            {u.role === 'MANAGER' && (
                              <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-semibold">
                                Manager
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">{u.code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Mail className="h-3 w-3 text-slate-400" />
                          <span>{u.email}</span>
                        </div>
                        {u.phone && (
                          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                            <Phone className="h-3 w-3 text-slate-400" />
                            <span>{u.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-700">
                        {u.team?.name || <span className="text-slate-400 italic">Chưa phân đội</span>}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {u.zaloAccountName || u.zaloPhone ? (
                        <div>
                          <div className="font-semibold text-blue-700">{u.zaloAccountName || 'Zalo cá nhân'}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{u.zaloPhone}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Chưa khai báo</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-full text-xs">
                        {u.assignedCustomersCount || u._count?.assignedCustomers || 0}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {u.status === 'ACTIVE' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {u.status === 'ACTIVE' ? 'Hoạt động' : 'Đã vô hiệu hóa'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/sales/${u.id}`}>
                          <Button size="sm" variant="outline" className="h-7 text-xs px-2.5">
                            <span>Chi tiết & Tích hợp</span>
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        </Link>

                        {u.status === 'ACTIVE' && u.role === 'SALE' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setUserToDisable(u);
                              setDisableWarning(null);
                              setIsDisableModalOpen(true);
                            }}
                            className="h-7 text-xs text-amber-600 hover:bg-amber-50 px-2"
                            title="Vô hiệu hóa tài khoản"
                          >
                            <UserX className="h-3.5 w-3.5" />
                          </Button>
                        )}

                        {u.role === 'SALE' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setUserToWipe(u);
                              setIsWipeModalOpen(true);
                            }}
                            className="h-7 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 px-2 font-medium flex items-center gap-1"
                            title="Gỡ bỏ hoàn toàn tài khoản Zalo & xóa sạch dữ liệu đồng bộ"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Gỡ tài khoản</span>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ======================================================== */}
      {/* MODAL MỚI: MỜI NHÂN VIÊN SALE BẰNG MÃ QR (ĐỒNG BỘ CRM) */}
      {/* ======================================================== */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={handleCloseInviteModal}
        title="Mời nhân viên Sale tham gia"
        description="Mở điện thoại, quét mã QR và xác nhận tham gia hệ thống"
      >
        <div className="space-y-4">
          {/* Lựa chọn Đội nhóm kinh doanh trước khi tạo QR */}
          <div className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-700">Đội nhóm phân công:</span>
            </div>
            <select
              value={inviteTeamId}
              onChange={(e) => {
                setInviteTeamId(e.target.value);
                handleGenerateInvite(e.target.value);
              }}
              className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">-- Mặc định (Chưa phân đội) --</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Vùng hiển thị Mã QR và Trạng thái Thời gian Thực */}
          <div className="text-center p-5 bg-gradient-to-b from-slate-50 to-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            {isGeneratingQr ? (
              <div className="py-16">
                <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500">Đang khởi tạo mã QR bảo mật...</p>
              </div>
            ) : inviteData?.status === 'COMPLETED' ? (
              /* KHI LIÊN KẾT ZALO THÀNH CÔNG */
              <div className="py-6 space-y-3 animate-fade-in">
                <div className="h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="h-9 w-9" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">Tài Khoản Zalo Đã Kết Nối Thành Công!</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Hệ thống đã nhận diện Zalo của nhân viên và bắt đầu đồng bộ tin nhắn</p>
                </div>

                <div className="mt-3 p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl text-left text-xs space-y-1.5 max-w-sm mx-auto">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Mã nhân viên:</span>
                    <span className="font-bold text-emerald-800 font-mono">{inviteData.usedByUser?.code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Họ và tên Sale:</span>
                    <span className="font-bold text-slate-900">{inviteData.usedByUser?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Số điện thoại Zalo:</span>
                    <span className="font-medium text-slate-800 font-mono">{inviteData.usedByUser?.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Trạng thái kết nối Zalo:</span>
                    <span className="font-semibold text-emerald-700 flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                      ĐÃ KẾT NỐI (ACTIVE)
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex justify-center">
                  <Link href="/inbox">
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 shadow-md">
                      <span>Vào Hộp Thư Xem Tin Nhắn</span>
                      <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              /* ĐANG TRONG QUÁ TRÌNH QUÉT & XÁC NHẬN */
              <div className="space-y-3.5">
                {/* Trạng thái Live Status Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border shadow-sm transition-all duration-300">
                  {inviteData?.status === 'PENDING' && (
                    <span className="flex items-center gap-1.5 text-amber-800 bg-amber-50 border-amber-300">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                      </span>
                      <span>Đang chờ nhân viên quét mã...</span>
                    </span>
                  )}
                  {inviteData?.status === 'SCANNED' && (
                    <span className="flex items-center gap-1.5 text-blue-800 bg-blue-50 border-blue-300">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
                      </span>
                      <span>Đã quét mã — Nhân viên đang nhập thông tin</span>
                    </span>
                  )}
                  {(timeLeft <= 0 || inviteData?.status === 'EXPIRED') && (
                    <span className="flex items-center gap-1.5 text-rose-800 bg-rose-50 border-rose-300">
                      <XCircle className="h-3.5 w-3.5 text-rose-500" />
                      <span>Mã QR đã hết hạn</span>
                    </span>
                  )}
                </div>

                {/* Hình ảnh Mã QR lớn */}
                <div className="relative inline-block p-3 bg-white rounded-2xl border-2 border-slate-200/90 shadow-md">
                  {inviteData?.qrCodeDataUrl ? (
                    <img
                      src={inviteData.qrCodeDataUrl}
                      alt="Mã QR tham gia Sale"
                      className="w-56 h-56 mx-auto rounded-lg transition-transform hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-xs">
                      Chưa có mã QR
                    </div>
                  )}

                  {/* Lớp phủ khi hết hạn */}
                  {(timeLeft <= 0 || inviteData?.status === 'EXPIRED') && (
                    <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-4">
                      <Clock className="h-8 w-8 text-rose-500 mb-2" />
                      <p className="text-xs font-bold text-slate-800">Mã QR đã hết hạn</p>
                      <Button
                        size="sm"
                        onClick={() => handleGenerateInvite()}
                        className="mt-3 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                        Tạo mã mới ngay
                      </Button>
                    </div>
                  )}
                </div>

                {/* Hướng dẫn và thời hạn */}
                <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>Thời hạn còn lại:</span>
                    <span className={`font-mono font-bold ${timeLeft < 120 ? 'text-rose-600 animate-pulse' : 'text-slate-800'}`}>
                      {formatTimer(timeLeft)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Hướng dẫn kết nối Wi-Fi cho điện thoại */}
          <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-left text-xs text-amber-900 flex items-start gap-2.5">
            <Wifi className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-950">
                Để điện thoại quét Zalo vào được ngay:
              </p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                1. Điện thoại cần <strong>bật kết nối chung mạng Wi-Fi</strong> với máy tính này (máy tính đang có IP Wi-Fi là <code className="bg-amber-100 font-mono px-1 py-0.5 rounded font-bold">{inviteData?.localIp || '192.168.1.43'}</code>).
                <br />
                2. Chị cũng có thể bấm <strong>"Sao chép link"</strong> ở bên dưới để gửi trực tiếp qua tin nhắn Zalo cho nhân viên bấm vào luôn nhé!
              </p>
            </div>
          </div>

          {/* Công cụ hỗ trợ: Sao chép link hoặc Mở thử nghiệm */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <div className="text-slate-600 truncate max-w-xs text-[11px] font-mono">
              {inviteData?.inviteUrl}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyLink}
                className="h-7 text-xs px-2.5"
                disabled={!inviteData?.inviteUrl}
              >
                {copiedLink ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-600 mr-1" />
                    <span className="text-emerald-700">Đã sao chép!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 mr-1" />
                    <span>Sao chép link</span>
                  </>
                )}
              </Button>

              {inviteData?.inviteUrl && (
                <a
                  href={inviteData.inviteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline px-2 py-1"
                >
                  <span>Mở trang quét</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>

          {/* Ghi chú bảo mật quy định Zalo */}
          <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-[11px] text-blue-900 flex items-start gap-2">
            <Shield className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              Quy trình an toàn: <strong>Nhân viên chỉ cần xác nhận danh tính tối thiểu</strong> (Họ tên, SĐT, Mật khẩu nội bộ). Không yêu cầu mật khẩu Zalo cá nhân; tài khoản Zalo cá nhân giữ nguyên trạng thái kiểm soát Capability Gated Mode.
            </span>
          </div>

          {/* Thao tác dưới modal */}
          <div className="flex items-center justify-between pt-2">
            {inviteData?.status !== 'COMPLETED' ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleGenerateInvite()}
                disabled={isGeneratingQr}
                className="text-xs text-slate-600 hover:text-slate-900"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isGeneratingQr ? 'animate-spin' : ''}`} />
                Tạo mã QR mới
              </Button>
            ) : <div />}

            <div className="flex items-center gap-2">
              {inviteData?.status !== 'COMPLETED' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelInvite}
                  className="text-xs text-rose-600 hover:bg-rose-50"
                >
                  Hủy lời mời
                </Button>
              )}

              <Button
                size="sm"
                onClick={handleCloseInviteModal}
                className={inviteData?.status === 'COMPLETED' ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-semibold' : ''}
              >
                {inviteData?.status === 'COMPLETED' ? 'Hoàn tất & Đóng' : 'Đóng'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal: Xác nhận vô hiệu hóa Sale */}
      <Modal
        isOpen={isDisableModalOpen}
        onClose={() => setIsDisableModalOpen(false)}
        title="Vô hiệu hóa tài khoản Sale"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Cảnh báo quy trình bàn giao khách hàng</p>
              <p className="mt-1">
                Nhân viên <span className="font-bold">{userToDisable?.name}</span> ({userToDisable?.code}) hiện đang phụ trách{' '}
                <span className="font-bold text-rose-600">{userToDisable?.assignedCustomersCount} khách hàng</span>.
              </p>
              <p className="mt-1">
                Khi vô hiệu hóa tài khoản, dữ liệu khách hàng và lịch sử chăm sóc cũ sẽ được giữ nguyên vẹn. Bạn nên thực hiện bàn giao các khách hàng này cho nhân viên khác.
              </p>
            </div>
          </div>

          {disableWarning && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
              <p className="font-semibold">{disableWarning.warning}</p>
              <Link href="/customers" className="mt-2 inline-block text-blue-600 font-semibold underline">
                Đi đến màn hình Bàn Giao Khách Hàng ngay →
              </Link>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsDisableModalOpen(false)}>Hủy</Button>
            <Button variant="danger" onClick={handleDisableUser}>
              Xác nhận vô hiệu hóa
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal MỚI: Xác nhận gỡ bỏ hoàn toàn tài khoản Zalo & xóa sạch dữ liệu đồng bộ */}
      <Modal
        isOpen={isWipeModalOpen}
        onClose={() => !isWiping && setIsWipeModalOpen(false)}
        title="Gỡ Bỏ Tài Khoản Zalo & Xóa Sạch Dữ Liệu Đồng Bộ"
        description="Ngắt quyền giám sát và dọn dẹp toàn bộ dữ liệu của tài khoản này khỏi Webapp"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 text-rose-900 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-rose-900">Cảnh báo: Hành động này không thể hoàn tác!</p>
              <p className="mt-1 leading-relaxed">
                Khi bạn gỡ bỏ tài khoản <span className="font-bold text-rose-950">{userToWipe?.name}</span> ({userToWipe?.code} - SĐT: {userToWipe?.phone}):
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-slate-700">
            <p className="font-bold text-slate-900">Các dữ liệu sau sẽ bị gỡ bỏ và xóa sạch hoàn toàn:</p>
            <div className="space-y-1.5 pl-1">
              <div className="flex items-center gap-2 text-rose-700">
                <Trash2 className="h-3.5 w-3.5 shrink-0" />
                <span>Toàn bộ danh bạ khách hàng liên kết với tài khoản Zalo này</span>
              </div>
              <div className="flex items-center gap-2 text-rose-700">
                <Trash2 className="h-3.5 w-3.5 shrink-0" />
                <span>Toàn bộ tin nhắn, lịch sử chat và các tệp tài liệu trong Hộp thư</span>
              </div>
              <div className="flex items-center gap-2 text-rose-700">
                <Trash2 className="h-3.5 w-3.5 shrink-0" />
                <span>Toàn bộ kết nối tích hợp và quyền giám sát tài khoản Zalo này</span>
              </div>
              <div className="flex items-center gap-2 text-rose-700">
                <Trash2 className="h-3.5 w-3.5 shrink-0" />
                <span>Xóa vĩnh viễn hồ sơ nhân viên khỏi danh sách quản lý của bạn</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-200 mt-2">
              * Sau khi gỡ, trên hệ thống web sẽ hoàn toàn sạch sẽ, không còn bất kỳ dữ liệu nào sót lại về tài khoản này.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              disabled={isWiping}
              onClick={() => setIsWipeModalOpen(false)}
            >
              Hủy bỏ
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={isWiping}
              onClick={handleWipeAccount}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              {isWiping ? 'Đang gỡ bỏ & xóa dữ liệu...' : 'Xác Nhận Gỡ Bỏ Tài Khoản Ngay'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal HƯỚNG DẪN CÀI ĐẶT EXTENSION ĐỒNG BỘ ZALO WEB THẬT */}
      <Modal
        isOpen={isExtensionModalOpen}
        onClose={() => setIsExtensionModalOpen(false)}
        title="Tiện Ích Chrome Extension - Đồng Bộ 100% Zalo Web Thật"
        description="Đồng bộ danh bạ thật và từng tin nhắn chat thực tế giữa Sale và khách hàng trên chat.zalo.me"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 text-blue-900 flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <p className="font-bold text-sm text-slate-900">Cách hoạt động:</p>
              <p className="mt-1">
                Các bạn Sale chỉ cần mở <strong>Zalo Web (chat.zalo.me)</strong> trên máy tính làm việc. Tiện ích Extension sẽ <strong>tự động nhận diện khách hàng và chuyển toàn bộ tin nhắn thật về Webapp quản trị</strong> của chị theo thời gian thực!
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <Laptop className="h-4 w-4 text-blue-600" />
              <span>3 Bước Cài Đặt Tiện Ích Lên Trình Duyệt Chrome / Edge (Chỉ mất 30 giây):</span>
            </h4>

            <div className="space-y-2.5 pl-1 text-slate-700">
              <div className="flex items-start gap-2.5">
                <span className="h-5 w-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                <div>
                  <p className="font-semibold text-slate-900">Mở trang quản lý Tiện ích trên trình duyệt:</p>
                  <p className="text-slate-500 mt-0.5">
                    Mở tab mới trên Chrome hoặc Cốc Cốc / Edge, gõ địa chỉ: <code className="bg-white px-2 py-0.5 rounded border border-slate-300 font-mono text-blue-600 font-bold">chrome://extensions</code>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="h-5 w-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                <div>
                  <p className="font-semibold text-slate-900">Bật Chế độ dành cho nhà phát triển:</p>
                  <p className="text-slate-500 mt-0.5">
                    Gạt nút công tắc <strong>&quot;Chế độ dành cho nhà phát triển&quot; (Developer mode)</strong> ở góc trên bên phải màn hình.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="h-5 w-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                <div>
                  <p className="font-semibold text-slate-900">Bấm &quot;Tải tiện ích đã giải nén&quot; (Load unpacked):</p>
                  <p className="text-slate-500 mt-0.5 mb-1.5">
                    Bấm nút và chọn thư mục Extension đã được em tạo sẵn trên máy tính của chị:
                  </p>

                  <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-300">
                    <code className="text-[11px] font-mono text-slate-800 flex-1 truncate">
                      {extensionPath}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(extensionPath);
                        setCopiedExtensionPath(true);
                        setTimeout(() => setCopiedExtensionPath(false), 3000);
                      }}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded border border-blue-200 flex items-center gap-1 shrink-0"
                    >
                      {copiedExtensionPath ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedExtensionPath ? 'Đã chép!' : 'Chép đường dẫn'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Hoàn tất!</strong> Sau khi cài, nhân viên chỉ việc mở tab <strong>chat.zalo.me</strong> chat với khách hàng, ở góc màn hình sẽ có nút <strong>&quot;⚡ Đồng Bộ Khách Này&quot;</strong> và hệ thống sẽ tự động chụp tin nhắn thật chuyển về Webapp cho chị xem ở mục Hộp thư ngay lập tức!
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExtensionModalOpen(false)}
            >
              Đóng
            </Button>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              onClick={() => {
                window.open('https://chat.zalo.me', '_blank');
              }}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              <span>Mở Zalo Web (chat.zalo.me)</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal THÊM NHÂN VIÊN SALE MỚI (TẠO TÊN CHO SALE CHỌN TRÊN EXTENSION) */}
      <Modal
        isOpen={isCreateSaleModalOpen}
        onClose={() => !isCreatingSale && setIsCreateSaleModalOpen(false)}
        title="Thêm Hồ Sơ Nhân Viên Sale Mới"
        description="Tạo tên nhân viên để hiển thị trong danh sách lựa chọn trên Extension Zalo"
      >
        <form onSubmit={handleCreateSale} className="space-y-4 text-xs">
          {createSaleError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{createSaleError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Họ và tên nhân viên Sale <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={createSaleForm.name}
              onChange={(e) => setCreateSaleForm({ ...createSaleForm, name: e.target.value })}
              placeholder="Ví dụ: Nguyễn Thu Thảo, Mai Anh..."
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Tên này sẽ hiển thị trong danh sách chọn của Chrome Extension để bạn Sale chọn.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Số điện thoại Zalo của bạn Sale (tùy chọn)
            </label>
            <input
              type="tel"
              value={createSaleForm.phone}
              onChange={(e) => setCreateSaleForm({ ...createSaleForm, phone: e.target.value })}
              placeholder="Ví dụ: 0912345678"
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Đội nhóm kinh doanh (tùy chọn)
            </label>
            <select
              value={createSaleForm.teamId}
              onChange={(e) => setCreateSaleForm({ ...createSaleForm, teamId: e.target.value })}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="">Chưa phân đội nhóm</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isCreatingSale}
              onClick={() => setIsCreateSaleModalOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isCreatingSale}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {isCreatingSale ? 'Đang tạo hồ sơ...' : 'Tạo Nhân Viên Ngay'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
