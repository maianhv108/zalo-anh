'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Radio,
  Building2,
  Users,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Clock,
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  QrCode,
  Unlink,
  Info,
  Server,
  Zap,
  Activity,
  Layers,
  ArrowRight,
  Eye,
  Check,
  Key,
  Laptop,
  Smartphone,
  PlusCircle,
  Play,
  Square,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { fetchApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';

// Các trạng thái kết nối chuẩn hóa theo yêu cầu
type DisplayConnectionStatus = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'EXPIRED' | 'ERROR' | 'NEEDS_VERIFICATION';

interface ConnectionItem {
  id: string;
  userId: string;
  provider: 'ZALO_OA' | 'ZALO_PERSONAL' | 'DEMO';
  accountLabel: string;
  connectionStatus: string;
  lastCheckedAt: string | null;
  lastErrorCode: string | null;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    code: string;
    name: string;
    email: string;
    phone: string | null;
    zaloAccountName?: string | null;
    zaloPhone?: string | null;
  };
  _count?: {
    conversations: number;
  };
}

interface ConnectionAuditLog {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  details: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    code: string;
    email: string;
  } | null;
}

interface ProfileStatusItem {
  salesCode: string;
  salesName: string;
  userId: string;
  device: {
    deviceName: string;
    deviceModel: string;
    os: string;
    userAgent: string;
    viewport: { width: number; height: number };
  };
  isRunning: boolean;
  pid: number | null;
  profilePath: string;
  hasSession: boolean;
  connectionStatus: string;
  lastSyncAt: string | null;
  conversationCount: number;
}

export default function ConnectionsCenterPage() {
  const [connections, setConnections] = useState<ConnectionItem[]>([]);
  const [logs, setLogs] = useState<ConnectionAuditLog[]>([]);
  const [profiles, setProfiles] = useState<ProfileStatusItem[]>([]);
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [activeLaunchModal, setActiveLaunchModal] = useState<ProfileStatusItem | null>(null);
  const [launchingCode, setLaunchingCode] = useState<string | null>(null);
  const [profileQr, setProfileQr] = useState<{
    qrImage: string | null;
    qrSvg?: string | null;
    status: 'STARTING' | 'WAITING_FOR_QR' | 'QR_READY' | 'LOGGED_IN' | 'ERROR';
    error?: string;
  }>({ qrImage: null, qrSvg: null, status: 'STARTING' });
  const [isFocusing, setIsFocusing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('ALL');
  const [stoppingCode, setStoppingCode] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Poll mã QR trực tiếp từ CDP khi mở modal thiết bị giả lập
  useEffect(() => {
    if (!activeLaunchModal) {
      setProfileQr({ qrImage: null, status: 'STARTING' });
      return;
    }

    let isMounted = true;
    const fetchQr = async () => {
      try {
        const res = await fetchApi<{
          qrImage: string | null;
          qrSvg?: string | null;
          status: 'STARTING' | 'WAITING_FOR_QR' | 'QR_READY' | 'LOGGED_IN' | 'ERROR';
          error?: string;
        }>(`/integrations/profiles/${activeLaunchModal.salesCode}/qr`);
        if (isMounted && res) {
          setProfileQr(res);
        }
      } catch (e) {
        // bỏ qua lỗi trong chu kỳ poll
      }
    };

    fetchQr();
    const interval = setInterval(fetchQr, 1800);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeLaunchModal]);

  const [isRefreshingQr, setIsRefreshingQr] = useState(false);

  const handleRefreshQr = async (salesCode: string) => {
    setIsRefreshingQr(true);
    try {
      await fetchApi(`/integrations/profiles/${salesCode}/refresh-qr`, { method: 'POST' });
      setNotification({
        type: 'info',
        message: 'Đã yêu cầu Zalo phát mã QR mới!',
      });
    } catch (e: any) {
      setNotification({
        type: 'error',
        message: e.message || 'Không thể làm mới mã QR.',
      });
    } finally {
      setIsRefreshingQr(false);
    }
  };

  const handleFocusWindow = async (salesCode: string) => {
    setIsFocusing(true);
    try {
      await fetchApi(`/integrations/profiles/${salesCode}/focus`, { method: 'POST' });
      setNotification({
        type: 'info',
        message: `Đã đưa cửa sổ Google Chrome giả lập của ${salesCode} lên màn hình!`,
      });
    } catch (e: any) {
      setNotification({
        type: 'error',
        message: e.message || 'Không thể đưa cửa sổ lên đầu màn hình.',
      });
    } finally {
      setIsFocusing(false);
    }
  };

  // Modal Reconnect / Details
  const [activeModalConnection, setActiveModalConnection] = useState<ConnectionItem | null>(null);
  const [oaQrData, setOaQrData] = useState<{ qrDataUrl: string; authUrl: string } | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const loadData = async () => {
    try {
      const [connectionsRes, logsRes, profilesRes] = await Promise.all([
        fetchApi<ConnectionItem[]>('/integrations/connections'),
        fetchApi<ConnectionAuditLog[]>('/integrations/connections/logs'),
        fetchApi<ProfileStatusItem[]>('/integrations/profiles').catch(() => []),
      ]);
      setConnections(connectionsRes || []);
      setLogs(logsRes || []);
      setProfiles(profilesRes || []);
    } catch (err: any) {
      console.error('Không thể tải danh sách kết nối:', err);
      setNotification({
        type: 'error',
        message: err.message || 'Lỗi khi tải danh sách kết nối.',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleLaunchProfile = async (salesCode: string) => {
    setLaunchingCode(salesCode);
    try {
      const res = await fetchApi<{ success: boolean; message: string; device: any }>('/integrations/profiles/launch', {
        method: 'POST',
        body: JSON.stringify({ salesCode }),
      });
      setNotification({
        type: 'success',
        message: res.message || `Đã mở cửa sổ giả lập thiết bị cho ${salesCode}.`,
      });
      const target = profiles.find((p) => p.salesCode === salesCode);
      if (target) {
        setActiveLaunchModal(target);
      }
      setIsAddAccountModalOpen(false);
      loadData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Lỗi khi khởi chạy cửa sổ giả lập thiết bị.',
      });
    } finally {
      setLaunchingCode(null);
    }
  };

  const handleStopProfile = async (salesCode: string) => {
    setStoppingCode(salesCode);
    try {
      await fetchApi('/integrations/profiles/stop', {
        method: 'POST',
        body: JSON.stringify({ salesCode }),
      });
      setNotification({
        type: 'info',
        message: `Đã tắt cửa sổ giả lập của nhân viên ${salesCode}.`,
      });
      await loadData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Lỗi khi đóng cửa sổ.',
      });
    } finally {
      setStoppingCode(null);
    }
  };

  const handleResetProfile = async (salesCode: string) => {
    if (!confirm(`Bạn có chắc muốn đặt lại phiên của ${salesCode}? Cần quét QR lại từ đầu.`)) return;
    try {
      await fetchApi('/integrations/profiles/reset', {
        method: 'POST',
        body: JSON.stringify({ salesCode }),
      });
      setNotification({
        type: 'success',
        message: `Đã xóa phiên đăng nhập cũ của ${salesCode}. Bạn có thể mở lại cửa sổ để quét mã QR mới!`,
      });
      loadData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Lỗi khi đặt lại phiên.',
      });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  // Chuẩn hóa trạng thái hiển thị
  const getNormalizedStatus = (conn: ConnectionItem): DisplayConnectionStatus => {
    const raw = conn.connectionStatus;
    const err = conn.lastErrorCode || '';

    if (raw === 'ACTIVE') return 'CONNECTED';
    if (err.includes('EXPIRED') || raw === 'EXPIRED') return 'EXPIRED';
    if (raw === 'CONNECTING') return 'CONNECTING';
    if (err.includes('NEEDS_VERIFICATION') || err.includes('UNAVAILABLE') || raw === 'NOT_CONFIGURED') {
      return 'NEEDS_VERIFICATION';
    }
    if (raw === 'ERROR') return 'ERROR';
    if (raw === 'NOT_CONNECTED' || raw === 'DISABLED') return 'DISCONNECTED';
    return 'DISCONNECTED';
  };

  const getStatusBadge = (status: DisplayConnectionStatus) => {
    switch (status) {
      case 'CONNECTED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-500/40 flex items-center gap-1.5 shadow-sm whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse shrink-0" />
            ĐÃ ĐĂNG NHẬP (24/7)
          </span>
        );
      case 'CONNECTING':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-500/50 flex items-center gap-1.5 shadow-sm animate-pulse whitespace-nowrap">
            <RefreshCw className="w-3 h-3 text-amber-600 dark:text-amber-400 animate-spin shrink-0" />
            ĐANG CHỜ QUÉT QR
          </span>
        );
      case 'DISCONNECTED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700 flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0" />
            CHƯA KHỞI CHẠY
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-500/40 flex items-center gap-1.5 whitespace-nowrap">
            <Clock className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
            PHIÊN HẾT HẠN
          </span>
        );
      case 'ERROR':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-500/40 flex items-center gap-1.5 whitespace-nowrap">
            <AlertCircle className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
            LỖI KẾT NỐI
          </span>
        );
      case 'NEEDS_VERIFICATION':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-500/40 flex items-center gap-1.5 whitespace-nowrap">
            <AlertTriangle className="w-3 h-3 text-sky-600 dark:text-sky-400 shrink-0" />
            CẦN XÁC MINH
          </span>
        );
    }
  };

  // Thao tác: Kiểm tra kết nối
  const handleCheckConnection = async (conn: ConnectionItem) => {
    setIsActionLoading(true);
    setNotification(null);
    try {
      const updated = await fetchApi(`/integrations/connections/${conn.id}/check`, {
        method: 'POST',
      });
      setNotification({
        type: 'info',
        message: `Đã kiểm tra kết nối "${conn.accountLabel}". Trạng thái: ${updated.connectionStatus}.`,
      });
      loadData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Lỗi khi kiểm tra kết nối.',
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  // Thao tác: Ngắt kết nối
  const handleDisconnect = async (conn: ConnectionItem) => {
    if (!confirm(`Bạn có chắc chắn muốn ngắt kết nối "${conn.accountLabel}"?`)) return;
    setIsActionLoading(true);
    setNotification(null);
    try {
      await fetchApi(`/integrations/connections/${conn.id}/disconnect`, {
        method: 'POST',
      });
      setNotification({
        type: 'success',
        message: `Đã ngắt kết nối "${conn.accountLabel}" an toàn.`,
      });
      loadData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Lỗi khi ngắt kết nối.',
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  // Thao tác: Mở modal liên kết lại
  const handleOpenRelinkModal = async (conn: ConnectionItem) => {
    setActiveModalConnection(conn);
    if (conn.provider === 'ZALO_OA') {
      try {
        const qrRes = await fetchApi('/integrations/oa/qr-code');
        setOaQrData(qrRes);
      } catch (e) {
        console.error('Không thể tạo mã QR Zalo OA:', e);
      }
    }
  };

  // Thao tác: Thực hiện liên kết lại
  const handleExecuteReconnect = async (conn: ConnectionItem) => {
    setIsActionLoading(true);
    try {
      await fetchApi(`/integrations/connections/${conn.id}/reconnect`, {
        method: 'POST',
      });
      setNotification({
        type: 'info',
        message: `Đã cập nhật trạng thái kiểm tra lại cho "${conn.accountLabel}".`,
      });
      setActiveModalConnection(null);
      loadData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Lỗi khi thực hiện liên kết lại.',
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  // Lọc kết nối
  const filteredConnections = connections.filter((conn) => {
    if (selectedProvider === 'ALL') return true;
    return conn.provider === selectedProvider;
  });

  const connectedCount = connections.filter((c) => getNormalizedStatus(c) === 'CONNECTED').length;
  const errorCount = connections.filter((c) => getNormalizedStatus(c) === 'ERROR').length;
  const needsVerificationCount = connections.filter((c) => getNormalizedStatus(c) === 'NEEDS_VERIFICATION').length;
  const disconnectedCount = connections.filter((c) => getNormalizedStatus(c) === 'DISCONNECTED').length;

  return (
    <div className="space-y-6 max-w-7xl pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-red-600/30">
              <Radio className="h-5 w-5 text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-wide flex items-center gap-2">
                Trung Tâm Quản Lý Kết Nối Zalo
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 font-bold uppercase">
                  Multi-Account Hub
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Giám sát 24/7 trạng thái đa tài khoản Zalo Sale & Zalo OA Doanh Nghiệp, xử lý ngắt kết nối và lịch sử đồng bộ
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            onClick={() => setIsAddAccountModalOpen(true)}
            className="bg-gradient-to-r from-red-600 via-rose-600 to-indigo-600 hover:opacity-90 text-white font-bold shadow-md shadow-red-600/20"
          >
            <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
            Thêm Nick Zalo (Mở Popup Quét QR)
          </Button>

          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={isRefreshing}
            className="border-slate-300 dark:border-[#1e2c47] bg-white dark:bg-[#0d1527] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#152038]"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Làm Mới
          </Button>

          <Link href="/settings">
            <Button size="sm" className="bg-gradient-to-r from-red-600 to-rose-600 text-white font-semibold">
              <Building2 className="w-3.5 h-3.5 mr-1.5" />
              Cấu Hình Zalo OA
            </Button>
          </Link>
        </div>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs animate-fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : notification.type === 'error'
              ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              : 'bg-blue-950/40 border-blue-500/40 text-blue-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : notification.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-blue-400 shrink-0" />
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white text-xs font-bold px-2 py-0.5 rounded"
          >
            ✕
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4 bg-white dark:bg-[#0d1527] border-slate-200 dark:border-[#1e2c47]">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tổng Kết Nối</div>
          <div className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{connections.length}</div>
          <div className="mt-1 text-[10px] text-slate-500">Tất cả tài khoản trong CRM</div>
        </Card>

        <Card className="p-4 bg-emerald-50/50 dark:bg-[#0d1527] border-emerald-300 dark:border-emerald-500/30">
          <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Connected</div>
          <div className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">{connectedCount}</div>
          <div className="mt-1 text-[10px] text-emerald-600/80 dark:text-slate-500">Đang hoạt động thời gian thực</div>
        </Card>

        <Card className="p-4 bg-sky-50/50 dark:bg-[#0d1527] border-sky-300 dark:border-sky-500/30">
          <div className="text-[11px] font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider">Needs Verification</div>
          <div className="mt-1 text-2xl font-black text-sky-600 dark:text-sky-400">{needsVerificationCount}</div>
          <div className="mt-1 text-[10px] text-sky-600/80 dark:text-slate-500">Cần xác minh phương thức API</div>
        </Card>

        <Card className="p-4 bg-slate-50 dark:bg-[#0d1527] border-slate-300 dark:border-slate-700">
          <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Disconnected</div>
          <div className="mt-1 text-2xl font-black text-slate-700 dark:text-slate-300">{disconnectedCount}</div>
          <div className="mt-1 text-[10px] text-slate-500">Đã ngắt hoặc chưa kết nối</div>
        </Card>

        <Card className="p-4 bg-rose-50/50 dark:bg-[#0d1527] border-rose-300 dark:border-rose-500/30">
          <div className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">Lỗi / Hết Hạn</div>
          <div className="mt-1 text-2xl font-black text-rose-600 dark:text-rose-400">{errorCount}</div>
          <div className="mt-1 text-[10px] text-rose-600/80 dark:text-slate-500">Cần kiểm tra hoặc tái xác thực</div>
        </Card>
      </div>

      {/* Transparency Architecture Notice */}
      <Card className="p-5 bg-gradient-to-r from-blue-50/60 via-slate-50 to-blue-50/60 dark:from-[#0d1527] dark:via-[#091020] dark:to-[#0d1527] border border-blue-200 dark:border-blue-500/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Quy Định Kiến Trúc & Minh Bạch Phạm Vi Dữ Liệu
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-4xl">
              <strong className="text-blue-600 dark:text-blue-400">Zalo OA Doanh Nghiệp:</strong> Hỗ trợ chính thức 100% qua OpenAPI & Webhook 24/7 từ máy chủ Zalo. Phục vụ khách hàng nhắn tin trực tiếp vào trang OA công ty.{' '}
              <br className="hidden md:inline" />
              <strong className="text-amber-600 dark:text-amber-400">Zalo Cá Nhân của Sale:</strong> Zalo hiện <em>chưa cung cấp Open API chính thức</em> cho bên thứ 3 liên kết hộp thư cá nhân chạy ngầm trên máy chủ. Hệ thống không tạo mã QR giả mạo để đảm bảo an toàn thông tin và tránh rủi ro khóa số điện thoại của nhân viên.
            </p>
          </div>
          <div className="shrink-0">
            <span className="text-[10px] px-3 py-1.5 rounded-xl bg-white dark:bg-[#141e33] border border-slate-300 dark:border-[#233555] text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-semibold shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Tuân thủ Chính sách Zalo
            </span>
          </div>
        </div>
      </Card>

      {/* SECTION: TRÌNH QUẢN LÝ GIẢ LẬP THIẾT BỊ ĐA TÀI KHOẢN ZALO (MULTI-DEVICE SIMULATOR) */}
      <Card className="bg-white dark:bg-[#0d1527] border-slate-200 dark:border-[#1e2c47] p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#162035]">
          <div>
            <div className="flex items-center gap-2">
              <Laptop className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Trình Quản Lý Giả Lập Thiết Bị Đa Tài Khoản Zalo (Multi-Device Chrome Simulator)
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 font-bold uppercase">
                  Tách Profile Riêng Biệt
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Mỗi nhân viên Sale được phân bổ 1 Profile Chrome độc lập với thông số thiết bị giả lập (User-Agent, Cookie, Screen) riêng biệt. 
              Bấm <strong className="text-indigo-600 dark:text-indigo-300">Mở Cửa Sổ Quét QR</strong> để bật popup Chrome giả lập, nhân viên chỉ việc quét QR trên điện thoại một lần mà <strong className="text-emerald-600 dark:text-emerald-400">không cần cài tiện ích thủ công</strong>.
            </p>
          </div>

          <Button
            size="sm"
            onClick={() => setIsAddAccountModalOpen(true)}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white font-bold shrink-0 shadow-md shadow-indigo-600/20"
          >
            <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
            Thêm Nick Sale (Quét QR)
          </Button>
        </div>

        {/* Danh sách thiết bị giả lập */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {profiles.length === 0 ? (
            <div className="col-span-full py-8 text-center text-slate-500 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
              Đang tải danh sách thiết bị giả lập...
            </div>
          ) : (
            profiles.map((p) => {
              const isLaunching = launchingCode === p.salesCode;
              return (
                <div
                  key={p.salesCode}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    p.isRunning
                      ? 'bg-indigo-50/70 dark:bg-gradient-to-b dark:from-[#0c1a2e] dark:to-[#08101e] border-indigo-300 dark:border-indigo-500/40 shadow-lg shadow-indigo-500/10'
                      : p.hasSession
                      ? 'bg-slate-50 dark:bg-[#080d19] border-slate-200 dark:border-[#1e2c47] hover:border-slate-300 dark:hover:border-slate-600'
                      : 'bg-slate-50/50 dark:bg-[#070b14] border-slate-200 dark:border-slate-800 opacity-90'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header Card: Tên Sale & Trạng thái */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center font-bold text-xs text-indigo-700 dark:text-indigo-400 shrink-0">
                          {p.salesCode.slice(-2)}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                            {p.salesName}
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400 font-mono">
                              {p.salesCode}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {p.conversationCount} cuộc hội thoại
                          </div>
                        </div>
                      </div>

                      {p.connectionStatus === 'ACTIVE' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-500/40 flex items-center gap-1.5 shrink-0 shadow-sm">
                          <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          Đã Đăng Nhập
                        </span>
                      ) : p.isRunning && p.connectionStatus === 'CONNECTING' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-500/40 flex items-center gap-1.5 shrink-0 shadow-sm animate-pulse">
                          <RefreshCw className="w-3 h-3 text-amber-600 dark:text-amber-400 animate-spin" />
                          Đang Chờ Quét QR
                        </span>
                      ) : p.connectionStatus === 'ERROR' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-500/40 flex items-center gap-1 shrink-0">
                          <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                          Phiên Hết Hạn
                        </span>
                      ) : p.hasSession ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-500/40 flex items-center gap-1 shrink-0">
                          <Square className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />
                          Chưa Khởi Chạy
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800/80 dark:text-slate-400 dark:border-slate-700 shrink-0">
                          Chưa Khởi Chạy
                        </span>
                      )}
                    </div>

                    {/* Thông tin thiết bị giả lập */}
                    <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-[#050811] border border-slate-200 dark:border-[#141e33] text-[11px] space-y-1 font-mono">
                      <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                        <span className="text-slate-500 dark:text-slate-400 font-sans text-[10px]">Thiết bị:</span>
                        <span className="font-bold text-indigo-700 dark:text-indigo-300 truncate max-w-[180px]">{p.device.deviceModel}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                        <span className="text-slate-500 dark:text-slate-400 font-sans text-[10px]">Hệ điều hành:</span>
                        <span className="text-slate-700 dark:text-slate-300 truncate">{p.device.os}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                        <span className="text-slate-500 dark:text-slate-400 font-sans text-[10px]">Cửa sổ:</span>
                        <span className="text-slate-600 dark:text-slate-400">{p.device.viewport.width} x {p.device.viewport.height} (App View)</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 pt-1 border-t border-slate-200 dark:border-[#121927]">
                        <span className="text-slate-500 dark:text-slate-400 font-sans text-[10px]">Thư mục:</span>
                        <span className="text-slate-600 dark:text-slate-400 truncate max-w-[180px]" title={p.profilePath}>.../profiles/{p.salesCode}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-[#141e33] flex items-center justify-between gap-1.5">
                    {p.isRunning ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => {
                            setActiveLaunchModal(p);
                            handleFocusWindow(p.salesCode);
                          }}
                          className={`h-7 text-[11px] px-2.5 font-semibold flex-1 flex items-center justify-center gap-1 text-white ${
                            p.connectionStatus === 'ACTIVE'
                              ? 'bg-emerald-600 hover:bg-emerald-700'
                              : 'bg-indigo-600 hover:bg-indigo-700'
                          }`}
                        >
                          <Eye className="w-3 h-3" />
                          {p.connectionStatus === 'ACTIVE' ? 'Xem Cửa Sổ Zalo' : 'Quét Mã QR Ngay'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStopProfile(p.salesCode)}
                          disabled={stoppingCode === p.salesCode}
                          className="h-7 text-[11px] px-2.5 border-rose-300 dark:border-rose-500/50 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 flex items-center gap-1 font-semibold transition-all shadow-sm"
                          title="Tắt cửa sổ giả lập và dừng chế độ chờ quét QR"
                        >
                          {stoppingCode === p.salesCode ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Square className="w-3 h-3 text-rose-600 dark:text-rose-400 fill-rose-600/30 dark:fill-rose-400/30" />
                          )}
                          Tắt
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleLaunchProfile(p.salesCode)}
                        disabled={isLaunching}
                        className="h-7 text-[11px] px-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold flex-1 hover:opacity-90"
                      >
                        {isLaunching ? (
                          <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <Play className="w-3 h-3 mr-1" />
                        )}
                        {p.hasSession ? 'Khởi Chạy Profile' : 'Mở Cửa Sổ Quét QR'}
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResetProfile(p.salesCode)}
                      className="h-7 text-[11px] px-2 border-slate-300 dark:border-[#1e2c47] bg-white dark:bg-[#090e1c] text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#152038]"
                      title="Xóa phiên để quét lại mã QR mới từ đầu"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Reset
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Main Connection Table */}
      <Card className="bg-white dark:bg-[#0d1527] border-slate-200 dark:border-[#1e2c47] overflow-hidden shadow-lg">
        <div className="p-5 border-b border-slate-200 dark:border-[#162035] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-[#080d1a]">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-red-500" />
              Danh Sách Kết Nối Tài Khoản Tập Trung (24/7 Connection Hub)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Quản lý trạng thái, thời gian đồng bộ cuối và thông báo lỗi của từng kết nối
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-[#050811] rounded-xl border border-slate-200 dark:border-[#192742]">
            <button
              onClick={() => setSelectedProvider('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedProvider === 'ALL'
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Tất cả ({connections.length})
            </button>
            <button
              onClick={() => setSelectedProvider('ZALO_OA')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedProvider === 'ZALO_OA'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Zalo OA
            </button>
            <button
              onClick={() => setSelectedProvider('ZALO_PERSONAL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedProvider === 'ZALO_PERSONAL'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Zalo Cá Nhân (Sale)
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-[#050811] text-slate-700 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-[#162035]">
              <tr>
                <th className="py-3 px-4 font-bold">Kênh & Tài Khoản</th>
                <th className="py-3 px-4 font-bold">Nhân Viên Quản Lý</th>
                <th className="py-3 px-4 font-bold">Trạng Thái Kết Nối</th>
                <th className="py-3 px-4 font-bold">Nguồn Dữ Liệu</th>
                <th className="py-3 px-4 font-bold">Đồng Bộ / Kiểm Tra Cuối</th>
                <th className="py-3 px-4 font-bold">Thông Báo Lỗi / Chi Tiết</th>
                <th className="py-3 px-4 font-bold text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#141e33]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    Đang tải dữ liệu kết nối...
                  </td>
                </tr>
              ) : filteredConnections.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Chưa có kết nối nào trong danh mục này.
                  </td>
                </tr>
              ) : (
                filteredConnections.map((conn) => {
                  const status = getNormalizedStatus(conn);
                  const isOa = conn.provider === 'ZALO_OA';

                  return (
                    <tr key={conn.id} className="hover:bg-slate-50/80 dark:hover:bg-[#121c32]/50 transition-colors">
                      {/* Cột 1: Kênh & Label */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border ${
                              isOa
                                ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/80 dark:text-blue-400 dark:border-blue-500/40'
                                : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-400 dark:border-amber-500/40'
                            }`}
                          >
                            {isOa ? 'OA' : 'SALE'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                              {conn.accountLabel}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                              <span>Mã: {conn.id.slice(-6)}</span>
                              <span>•</span>
                              <span>{conn._count?.conversations || 0} hội thoại</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Cột 2: Nhân viên phụ trách */}
                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-200">
                          {conn.user?.name || 'Chưa gán'}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          {conn.user?.code} {conn.user?.phone ? `• ${conn.user?.phone}` : ''}
                        </div>
                      </td>

                      {/* Cột 3: Trạng thái kết nối */}
                      <td className="py-4 px-4">{getStatusBadge(status)}</td>

                      {/* Cột 4: Nguồn dữ liệu */}
                      <td className="py-4 px-4">
                        {conn.isDemo ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30 whitespace-nowrap">
                            Demo / Giả lập
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30 whitespace-nowrap">
                            Dữ liệu thật (Verified)
                          </span>
                        )}
                      </td>

                      {/* Cột 5: Lần kiểm tra / Đồng bộ cuối */}
                      <td className="py-4 px-4">
                        {conn.lastCheckedAt ? (
                          <div>
                            <div className="text-slate-800 dark:text-slate-200 font-medium">{formatDate(conn.lastCheckedAt)}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">Tự động ping 24/7</div>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Chưa kiểm tra</span>
                        )}
                      </td>

                      {/* Cột 6: Thông báo lỗi / Chi tiết */}
                      <td className="py-4 px-4 max-w-xs">
                        {conn.lastErrorCode ? (
                          <div className="p-1.5 rounded-lg bg-rose-100 border border-rose-300 text-[10px] text-rose-800 font-mono line-clamp-2 dark:bg-rose-950/30 dark:border-rose-500/30 dark:text-rose-300" title={conn.lastErrorCode}>
                            {conn.lastErrorCode}
                          </div>
                        ) : status === 'CONNECTED' ? (
                          <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-medium flex items-center gap-1">
                            <Check className="w-3 h-3 shrink-0" />
                            Kết nối ổn định 24/7
                          </span>
                        ) : (
                          <span className="text-slate-600 dark:text-slate-400 text-[11px]">Bình thường</span>
                        )}
                      </td>

                      {/* Cột 7: Thao tác */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                          {/* Nút Kiểm tra kết nối */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCheckConnection(conn)}
                            disabled={isActionLoading}
                            className="h-7 px-2.5 text-[11px] border-slate-300 dark:border-[#1e2c47] bg-white dark:bg-[#090e1c] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#152038]"
                            title="Kiểm tra kết nối tức thì"
                          >
                            <Activity className="w-3 h-3 mr-1 text-blue-600 dark:text-blue-400 shrink-0" />
                            Kiểm Tra
                          </Button>

                          {/* Nút Ngắt kết nối */}
                          {status === 'CONNECTED' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDisconnect(conn)}
                              disabled={isActionLoading}
                              className="h-7 px-2.5 text-[11px] border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/40 hover:text-rose-900 dark:hover:text-white"
                              title="Ngắt kết nối tài khoản"
                            >
                              <Unlink className="w-3 h-3 mr-1 shrink-0" />
                              Ngắt
                            </Button>
                          )}

                          {/* Nút Liên kết lại */}
                          <Button
                            size="sm"
                            onClick={() => handleOpenRelinkModal(conn)}
                            className="h-7 px-2.5 text-[11px] bg-gradient-to-r from-red-600 to-rose-600 text-white font-medium hover:opacity-90"
                            title="Mở hướng dẫn liên kết lại"
                          >
                            <RefreshCw className="w-3 h-3 mr-1 shrink-0" />
                            Liên Kết Lại
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Connection Audit Logs Section */}
      <Card className="bg-white dark:bg-[#0d1527] border-slate-200 dark:border-[#1e2c47] p-5 shadow-lg">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-[#162035] mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Nhật Ký Hoạt Động Kết Nối Thời Gian Thực (Connection Audit Logs)
            </h3>
          </div>
          <span className="text-[10px] text-slate-500">30 sự kiện gần nhất</span>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {logs.length === 0 ? (
            <div className="py-6 text-center text-slate-500 text-xs">
              Chưa có nhật ký kết nối nào được ghi nhận.
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#080d1a] border border-slate-200 dark:border-[#162035] flex items-center justify-between text-xs hover:border-slate-300 dark:hover:border-[#1e2c47] transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200 dark:bg-[#141e33] text-blue-700 dark:text-blue-300 border border-slate-300 dark:border-[#233555]">
                    {log.action}
                  </span>
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-300">
                      {log.user ? `${log.user.name} (${log.user.code})` : 'Hệ thống'}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px] ml-2 font-mono">
                      {log.details ? log.details : 'Thao tác cập nhật kết nối'}
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
                  {formatDate(log.createdAt)}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Modal Re-link / Connect Guide */}
      {activeModalConnection && (
        <Modal
          isOpen={true}
          onClose={() => setActiveModalConnection(null)}
          title={`Thiết Lập / Liên Kết Lại: ${activeModalConnection.accountLabel}`}
          description={`Kênh: ${activeModalConnection.provider === 'ZALO_OA' ? 'Zalo Official Account' : 'Zalo Cá Nhân (Sale)'}`}
          maxWidth="xl"
        >
          <div className="space-y-4">
            {activeModalConnection.provider === 'ZALO_OA' ? (
              // LUỒNG LIÊN KẾT CHÍNH THỨC CHO ZALO OA
              <div className="space-y-4 text-center">
                <div className="p-4 bg-blue-950/30 rounded-2xl border border-blue-500/30 text-left space-y-2">
                  <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                    Phương Thức Được Zalo Hỗ Trợ Chính Thức (OAuth 2.0)
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Zalo cung cấp mã QR và đường link OAuth 2.0 hợp lệ. Quét mã bằng ứng dụng Zalo trên điện thoại của Quản trị viên để ủy quyền kết nối 24/7 với CRM.
                  </p>
                </div>

                {oaQrData?.qrDataUrl ? (
                  <div className="py-3 flex flex-col items-center">
                    <div className="p-3 bg-white rounded-2xl shadow-xl inline-block border-2 border-red-500">
                      <img src={oaQrData.qrDataUrl} alt="Zalo OA QR" className="w-52 h-52 object-contain" />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2">
                      Mở app Zalo trên điện thoại Quản lý & quét mã QR này
                    </p>
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-500" />
                    Đang tạo mã QR Zalo OA chính thức...
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1e2c47]">
                  <Button variant="outline" size="sm" onClick={() => setActiveModalConnection(null)}>
                    Đóng
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleExecuteReconnect(activeModalConnection)}
                    disabled={isActionLoading}
                    className="bg-gradient-to-r from-red-600 to-rose-600 text-white font-semibold"
                  >
                    Xác Nhận Đã Quét Xong
                  </Button>
                </div>
              </div>
            ) : (
              // LUỒNG GIẢI THÍCH MINH BẠCH CHO ZALO CÁ NHÂN (PERSONAL ZALO)
              <div className="space-y-4">
                <div className="p-4 bg-amber-950/40 rounded-2xl border border-amber-500/40 space-y-2.5">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    Thông Báo Bảo Vệ Tài Khoản Nhân Viên (Chính Sách An Toàn)
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    Theo tài liệu chính thức từ Zalo Developers, nền tảng Zalo <strong>chưa cấp phép Open API</strong> cho bên thứ ba tạo kết nối QR để đọc tin nhắn hộp thư cá nhân chạy ngầm trên máy chủ.
                  </p>
                  <div className="p-3 bg-[#080d1a] rounded-xl border border-amber-500/20 text-[11px] text-slate-300 space-y-1.5">
                    <div className="font-semibold text-amber-400">Các rào cản nền tảng đã được kiểm chứng:</div>
                    <ul className="list-disc list-inside space-y-1 text-slate-400">
                      <li><strong>Quy tắc 1 phiên Web duy nhất:</strong> Nếu máy chủ duy trì phiên Zalo Web ảo, khi nhân viên đăng nhập Zalo trên máy tính bàn hoặc laptop thì phiên máy chủ sẽ lập tức bị Zalo ngắt ("văng nick").</li>
                      <li><strong>Nguy cơ khóa số điện thoại:</strong> Zalo tự động chặn các phiên kết nối dài hạn từ IP máy chủ Datacenter.</li>
                      <li><strong>Mã hóa đầu cuối (E2EE):</strong> Tin nhắn cá nhân được mã hóa riêng trên thiết bị của Sale, máy chủ không thể giải mã nếu không có Private Key.</li>
                    </ul>
                  </div>
                </div>

                <div className="p-4 bg-[#090e1c] rounded-2xl border border-[#1e2c47] space-y-2">
                  <h4 className="text-xs font-bold text-slate-200">
                    Phương Thức Vận Hành Được Khuyến Nghị:
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    1. <strong>Tài khoản Zalo cá nhân:</strong> Sử dụng Chrome Extension cài đặt trực tiếp trên máy tính của Sale để đồng bộ trong giờ làm việc mà không vi phạm quy tắc đơn phiên và không rủi ro khóa nick.
                    <br />
                    2. <strong>Hệ thống chạy 24/7:</strong> Sử dụng kênh Zalo OA Doanh Nghiệp chính thức với Webhook trực tiếp từ VNG để đảm bảo tin nhắn không bao giờ bị gián đoạn.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#1e2c47]">
                  <span className="text-[10px] text-slate-500">
                    Tuân thủ điều khoản PRD & AGENTS.md
                  </span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setActiveModalConnection(null)}>
                      Đã Hiểu & Đóng
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleExecuteReconnect(activeModalConnection)}
                      disabled={isActionLoading}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                    >
                      Đánh Dấu Kiểm Tra Lại
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* MODAL 1: CHỌN NHÂN VIÊN SALE ĐỂ MỞ CỬA SỔ GIẢ LẬP THIẾT BỊ MỚI */}
      {isAddAccountModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsAddAccountModalOpen(false)}
          title="Thêm Nick Zalo Mới - Mở Cửa Sổ Giả Lập Thiết Bị"
          description="Chọn tài khoản nhân viên Sale bạn muốn tạo thiết bị giả lập và quét mã QR đăng nhập."
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-indigo-950/40 rounded-xl border border-indigo-500/30 text-xs text-indigo-200 leading-relaxed">
              💡 <strong>Cơ chế hoạt động:</strong> Hệ thống sẽ tự động khởi chạy một cửa sổ Google Chrome với profile độc lập, mô phỏng dấu vân tay thiết bị riêng và tích hợp sẵn tiện ích đồng bộ. Bạn hoặc nhân viên chỉ cần quét mã QR một lần trên cửa sổ đó.
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Chọn nhân viên Sale phụ trách nick Zalo này:
              </label>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {profiles.map((p) => {
                  const isLaunching = launchingCode === p.salesCode;
                  return (
                    <div
                      key={p.salesCode}
                      className="p-3 rounded-xl bg-[#080d1a] border border-[#1e2c47] hover:border-indigo-500/50 flex items-center justify-between transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-indigo-400">
                          {p.salesCode.slice(-2)}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-white flex items-center gap-2">
                            {p.salesName}
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                              {p.salesCode}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Thiết bị: <strong className="text-indigo-300 font-normal">{p.device.deviceModel}</strong> ({p.device.os})
                          </div>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        disabled={isLaunching || p.isRunning}
                        onClick={() => handleLaunchProfile(p.salesCode)}
                        className={`text-xs font-semibold ${
                          p.isRunning
                            ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 cursor-default'
                            : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:opacity-90'
                        }`}
                      >
                        {isLaunching ? (
                          <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        ) : p.isRunning ? (
                          <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                        ) : (
                          <Play className="w-3.5 h-3.5 mr-1" />
                        )}
                        {p.isRunning ? 'Đang Mở' : 'Khởi Chạy'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#1e2c47]">
              <Button variant="outline" size="sm" onClick={() => setIsAddAccountModalOpen(false)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 2: HIỂN THỊ MÃ QR TRỰC TIẾP TỪ THIẾT BỊ GIẢ LẬP */}
      {activeLaunchModal && (
        <Modal
          isOpen={true}
          onClose={() => {
            setActiveLaunchModal(null);
            loadData();
          }}
          title={`Quét Mã QR Zalo: ${activeLaunchModal.salesName} (${activeLaunchModal.salesCode})`}
          description={`Thiết bị giả lập: ${activeLaunchModal.device.deviceName} • Profile: ${activeLaunchModal.salesCode}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-center">
            {/* Box hiển thị mã QR trực tiếp */}
            <div className="p-4 bg-[#080d1a] rounded-2xl border border-indigo-500/30 flex flex-col items-center">
              {profileQr.status === 'LOGGED_IN' ? (
                <div className="py-10 px-4 text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 animate-bounce">
                    <Check className="w-8 h-8" />
                  </div>
                  <h4 className="font-bold text-base text-emerald-300">Đã Quét Mã & Đăng Nhập Thành Công!</h4>
                  <p className="text-xs text-slate-300 max-w-sm mx-auto">
                    Tài khoản Zalo của <strong>{activeLaunchModal.salesName}</strong> ({activeLaunchModal.salesCode}) đã được liên kết với hệ thống CRM. Tin nhắn sẽ tự động đồng bộ.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => {
                      setActiveLaunchModal(null);
                      loadData();
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs mt-2"
                  >
                    Hoàn Tất & Xem Kết Nối
                  </Button>
                </div>
              ) : profileQr.qrImage ? (
                <div className="space-y-3.5">
                  <div
                    onClick={() => handleRefreshQr(activeLaunchModal.salesCode)}
                    className="relative inline-block p-3 bg-white rounded-2xl shadow-2xl border-4 border-indigo-500/40 group cursor-pointer transition-all hover:border-amber-400"
                    title="Bấm vào mã QR để lấy mã mới nếu bị hết hạn"
                  >
                    {profileQr.qrSvg ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: profileQr.qrSvg }}
                        className="w-64 h-64 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-full [&>svg]:max-h-full"
                      />
                    ) : (
                      <img
                        src={profileQr.qrImage}
                        alt="Mã QR Zalo Đăng Nhập"
                        className="w-64 h-auto max-h-64 object-contain rounded-lg mx-auto"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/60 rounded-xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all text-white p-2">
                      <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mb-1" />
                      <span className="text-xs font-bold text-amber-300">Bấm để lấy mã QR mới</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    Mã QR Zalo đang phát trực tiếp cho {activeLaunchModal.salesName} ({activeLaunchModal.salesCode})
                  </div>

                  {/* Các nút bấm thao tác nhanh */}
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => handleFocusWindow(activeLaunchModal.salesCode)}
                      disabled={isFocusing}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-4 h-4" />
                      {isFocusing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                      🖥️ Bật Cửa Sổ Chrome Lên Màn Hình
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRefreshQr(activeLaunchModal.salesCode)}
                      disabled={isRefreshingQr}
                      className="text-xs font-bold border-amber-500/50 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 flex items-center gap-1.5 shadow-sm"
                      title="Bấm vào đây nếu trên ảnh xuất hiện thông báo 'Mã QR hết hạn'"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingQr ? 'animate-spin' : ''}`} />
                      {isRefreshingQr ? 'Đang Đổi Mã...' : '🔄 Đổi Mã QR Mới (Nếu Báo Hết Hạn)'}
                    </Button>
                  </div>

                  {/* Thông tin đảm bảo bảo mật và cô lập hồ sơ */}
                  <div className="p-3 bg-blue-950/30 rounded-xl border border-blue-500/30 text-[11px] text-blue-200 text-left space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-blue-300">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Hồ Sơ Giả Lập Độc Lập 100% (An Toàn Tuyệt Đối)
                    </div>
                    <p className="text-slate-300 text-[11px]">
                      Thư mục phiên riêng: <code className="text-amber-300 font-mono">data/profiles/{activeLaunchModal.salesCode}</code> • Thiết bị: <strong>{activeLaunchModal.device.deviceName}</strong>.
                    </p>
                    <p className="text-slate-400 text-[10px]">
                      🔒 <strong>Tuyệt đối không sử dụng profile cá nhân</strong> trên máy tính của bạn. Mọi tài khoản, lịch sử và mật khẩu cá nhân đều được bảo vệ nguyên vẹn.
                    </p>
                  </div>
                </div>
              ) : profileQr.status === 'ERROR' ? (
                <div className="py-8 px-4 text-center space-y-4">
                  <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
                  <p className="text-xs text-amber-200 max-w-sm">
                    {profileQr.error || 'Chưa tải được ảnh mã QR trực tiếp. Cửa sổ Chrome giả lập đang mở trên máy tính của bạn:'}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleFocusWindow(activeLaunchModal.salesCode)}
                      disabled={isFocusing}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-4 h-4" />
                      🖥️ Mở Cửa Sổ Giả Lập Để Quét Ngay
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="py-10 px-4 text-center space-y-4">
                  <RefreshCw className="w-10 h-10 text-indigo-400 animate-spin mx-auto" />
                  <h4 className="font-bold text-sm text-white">Đang khởi động thiết bị & tải mã QR Zalo...</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Hệ thống đang mở profile riêng biệt của <strong>{activeLaunchModal.salesName}</strong> và trích xuất mã QR (khoảng 2 - 4 giây).
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => handleFocusWindow(activeLaunchModal.salesCode)}
                      disabled={isFocusing}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      🖥️ Bật Cửa Sổ Giả Lập Lên Màn Hình
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await handleStopProfile(activeLaunchModal.salesCode);
                        setActiveLaunchModal(null);
                      }}
                      className="border-rose-500/40 bg-rose-950/30 text-rose-300 hover:bg-rose-900/40 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Square className="w-3.5 h-3.5 text-rose-400" />
                      ⏹ Hủy & Tắt Cửa Sổ
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Hướng dẫn thao tác */}
            <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800 text-left space-y-2 text-xs">
              <div className="font-bold text-indigo-300 uppercase text-[10px] tracking-wider flex items-center justify-between">
                <span>Cách quét mã trên điện thoại của nhân viên:</span>
                <span className="text-slate-400 font-mono text-[10px]">Profile: {activeLaunchModal.salesCode}</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-slate-300">
                <li>Nhân viên <strong>{activeLaunchModal.salesName}</strong> mở app Zalo trên điện thoại.</li>
                <li>Bấm biểu tượng <strong>Quét mã QR</strong> ở góc trên bên phải màn hình Zalo.</li>
                <li>Hướng camera vào <strong>khung mã QR ở trên</strong> để quét đăng nhập.</li>
                <li>Bấm <strong>Đăng nhập</strong> trên điện thoại để hoàn tất liên kết 24/7.</li>
              </ol>
            </div>

            {/* Nút hành động */}
            <div className="flex items-center justify-between pt-3 border-t border-[#1e2c47]">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFocusWindow(activeLaunchModal.salesCode)}
                  disabled={isFocusing}
                  className="text-xs text-blue-300 border-blue-500/40 hover:bg-blue-950/40 flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Bật Cửa Sổ Giả Lập
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await handleStopProfile(activeLaunchModal.salesCode);
                    setActiveLaunchModal(null);
                  }}
                  className="text-xs text-rose-300 border-rose-500/40 hover:bg-rose-950/50 flex items-center gap-1.5"
                >
                  <Square className="w-3.5 h-3.5 text-rose-400" />
                  Tắt Cửa Sổ & Hủy Quét
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setActiveLaunchModal(null);
                    loadData();
                  }}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold"
                >
                  Xác Nhận Đã Quét Xong & Đóng
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

