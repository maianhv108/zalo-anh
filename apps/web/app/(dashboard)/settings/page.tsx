'use client';

import React, { useState, useEffect } from 'react';
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
  QrCode,
  Key,
  RefreshCw,
  Unlink,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  Radio,
  Smartphone,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { fetchApi } from '@/lib/api';

export default function SettingsPage() {
  const [oaConnection, setOaConnection] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'WEB_OAUTH' | 'QR' | 'DEVELOPER'>('WEB_OAUTH');
  const [isQrLoading, setIsQrLoading] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<{ qrDataUrl: string; authUrl: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    oaName: 'TourLuk Travel Official',
    oaId: '248916382091729',
    appId: '',
    secretKey: '',
  });

  const webhookUrl =
    typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.hostname}:4000/api/v1/integrations/oa/webhook`
      : 'http://localhost:4000/api/v1/integrations/oa/webhook';

  const loadOaStatus = async () => {
    setIsLoading(true);
    try {
      const res = await fetchApi('/integrations/oa/status');
      setOaConnection(res);
      if (res?.oaName) {
        setFormData((prev) => ({
          ...prev,
          oaName: res.oaName || prev.oaName,
          oaId: res.oaId || prev.oaId,
          appId: res.appId || prev.appId,
        }));
      }
    } catch (e: any) {
      console.error('Không thể tải trạng thái Zalo OA:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadQrCode = async () => {
    setIsQrLoading(true);
    try {
      const res = await fetchApi('/integrations/oa/qr-code');
      setQrCodeData(res);
    } catch (e: any) {
      console.error('Không thể tạo mã QR Zalo OA:', e);
    } finally {
      setIsQrLoading(false);
    }
  };

  useEffect(() => {
    loadOaStatus();
  }, []);

  const openConnectModal = (tab: 'WEB_OAUTH' | 'QR' | 'DEVELOPER' = 'WEB_OAUTH') => {
    setActiveTab(tab);
    setIsModalOpen(true);
    if (!qrCodeData) {
      loadQrCode();
    }
  };

  const handleConnect = async (method: 'QR_SCAN' | 'CREDENTIALS') => {
    setIsSubmitting(true);
    setNotification(null);
    try {
      const res = await fetchApi('/integrations/oa/connect', {
        method: 'POST',
        body: JSON.stringify({
          oaId: formData.oaId || '248916382091729',
          oaName: formData.oaName || 'TourLuk Travel Official',
          appId: formData.appId,
          secretKey: formData.secretKey,
          connectMethod: method,
        }),
      });

      setNotification({
        type: 'success',
        message: 'Kết nối Zalo Official Account (Zalo OA) thành công!',
      });
      setIsModalOpen(false);
      loadOaStatus();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Lỗi khi kết nối Zalo OA',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Bạn có chắc chắn muốn ngắt kết nối Zalo Official Account này không?')) {
      return;
    }
    setIsSubmitting(true);
    setNotification(null);
    try {
      await fetchApi('/integrations/oa/disconnect', { method: 'POST' });
      setNotification({
        type: 'success',
        message: 'Đã ngắt kết nối Zalo OA thành công.',
      });
      loadOaStatus();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Lỗi khi ngắt kết nối Zalo OA',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSyncOa = async () => {
    setIsSyncing(true);
    setNotification(null);
    try {
      const res = await fetchApi('/integrations/oa/sync', { method: 'POST' });
      setNotification({
        type: 'success',
        message: `Đồng bộ thành công! Đã tải về ${res.syncedCustomers} khách hàng và ${res.syncedConversations} cuộc hội thoại từ Zalo OA vào hệ thống.`,
      });
      loadOaStatus();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Lỗi khi đồng bộ dữ liệu Zalo OA',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-red-500" />
            Cài Đặt Hệ Thống & Cấu Hình Môi Trường
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Trung tâm kết nối Zalo OA doanh nghiệp, trạng thái cơ sở hạ tầng, bảo mật và chính sách dữ liệu
          </p>
        </div>

        {/* Quick Help / Info Link */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-600 dark:text-slate-400 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#0d1527] border border-slate-200 dark:border-[#1e2c47] flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
            Bảo mật AES-256
          </span>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs animate-fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-red-950/40 border-red-500/40 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
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

      {/* ========================================================================= */}
      {/* 🌟 PROMINENT ZALO OFFICIAL ACCOUNT (ZALO OA) CONNECTION CARD */}
      {/* ========================================================================= */}
      <div className="relative rounded-2xl bg-white dark:bg-gradient-to-b dark:from-[#0d1527] dark:to-[#070b14] border-2 border-red-500/30 p-6 shadow-xl overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-60 h-60 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          {/* Card Top Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-[#1a2842]">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0 border border-blue-400/30">
                <span className="text-white font-black text-sm tracking-tighter">OA</span>
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-wide">
                    Kết Nối Zalo Official Account (Zalo OA)
                  </h3>
                  {oaConnection?.isConnected ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/40">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                      Đang Hoạt Động (Realtime)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/40">
                      <AlertTriangle className="h-3 w-3" />
                      Chưa Kết Nối
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Đồng bộ khách hàng, tin nhắn phản hồi tự động và quản lý tập trung từ trang Zalo Doanh Nghiệp
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
              {oaConnection?.isConnected ? (
                <>
                  <Button
                    onClick={handleSyncOa}
                    disabled={isSyncing}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs h-9 px-3.5 shadow-md shadow-emerald-600/20"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Đang Đồng Bộ...' : 'Đồng Bộ Dữ Liệu Cũ'}
                  </Button>
                  <Button
                    onClick={() => openConnectModal('QR')}
                    className="bg-slate-100 dark:bg-[#141f36] hover:bg-slate-200 dark:hover:bg-[#1c2c4d] text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-[#233557] text-xs h-9"
                  >
                    <QrCode className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                    Xem Mã QR
                  </Button>
                  <Button
                    onClick={handleDisconnect}
                    disabled={isSubmitting}
                    className="bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800/40 text-xs h-9"
                  >
                    <Unlink className="w-3.5 h-3.5 mr-1.5 text-red-500" />
                    Ngắt Kết Nối
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={() => openConnectModal('QR')}
                    className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs h-9 px-4 shadow-lg shadow-red-600/30"
                  >
                    <QrCode className="w-3.5 h-3.5 mr-1.5" />
                    Kết Nối Zalo OA Ngay (Quét Mã QR)
                  </Button>
                  <Button
                    onClick={() => openConnectModal('DEVELOPER')}
                    className="bg-slate-100 dark:bg-[#121c32] hover:bg-slate-200 dark:hover:bg-[#1a2947] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-[#1e2e4f] text-xs h-9"
                  >
                    <Key className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                    Cấu Hình API Key
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Connection Detail Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
            {/* Box 1: OA Info */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#090e1c] border border-slate-200 dark:border-[#192742]">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Thông tin OA</span>
                <Radio className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
              </div>
              <div className="space-y-1.5">
                <div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Tên Zalo OA:</div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {oaConnection?.isConnected ? oaConnection.oaName : 'Chưa thiết lập'}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">OA ID:</div>
                  <div className="text-xs font-mono font-medium text-slate-300 truncate">
                    {oaConnection?.isConnected ? oaConnection.oaId : 'Chưa có'}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">Phương thức:</div>
                  <div className="text-xs text-blue-400 font-medium">
                    {oaConnection?.isConnected
                      ? oaConnection.connectMethod === 'QR_SCAN'
                        ? 'Ủy quyền quét mã QR (OAuth 2.0)'
                        : 'Zalo Developer App Secret'
                      : 'Chờ kết nối'}
                  </div>
                </div>
              </div>
            </div>

            {/* Box 2: Capabilities Gating */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#090e1c] border border-slate-200 dark:border-[#192742]">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Quyền Hạn (Capabilities)</span>
                <Layers className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 dark:text-slate-300">Đồng bộ khách hàng:</span>
                  {oaConnection?.isConnected ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                      <CheckCircle2 className="w-3 h-3" /> Đã mở
                    </span>
                  ) : (
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">Chờ kết nối</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 dark:text-slate-300">Tin nhắn & Webhook:</span>
                  {oaConnection?.isConnected ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                      <CheckCircle2 className="w-3 h-3" /> Sẵn sàng
                    </span>
                  ) : (
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">Chờ kết nối</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 dark:text-slate-300">Gửi thông báo CSKH:</span>
                  <span className="text-blue-600 dark:text-blue-400 font-medium text-[11px]">Hạn mức OA</span>
                </div>
              </div>
            </div>

            {/* Box 3: Webhook & Sync Endpoint */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#090e1c] border border-slate-200 dark:border-[#192742]">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Webhook URL Tích Hợp</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mb-2">
                Dùng để nhận sự kiện tin nhắn từ Zalo Developers:
              </p>
              <div className="flex items-center gap-1.5 p-1.5 bg-white dark:bg-[#050811] rounded-lg border border-slate-200 dark:border-[#162137]">
                <code className="text-[10px] text-slate-800 dark:text-slate-300 font-mono truncate flex-1 select-all">
                  {webhookUrl}
                </code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(webhookUrl)}
                  className="p-1 rounded bg-slate-100 dark:bg-[#162238] hover:bg-slate-200 dark:hover:bg-[#20304e] text-slate-700 dark:text-slate-300 shrink-0 transition-colors"
                  title="Sao chép URL"
                >
                  {copiedWebhook ? (
                    <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3 text-slate-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Realtime vs Historical Sync Explanation banner */}
          <div className="mt-4 p-3 bg-slate-50 dark:bg-[#060a14] rounded-xl border border-slate-200 dark:border-[#192742] flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
            <Info className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold text-slate-900 dark:text-white">Cơ chế tự động: </span>
              Khi có khách mới nhắn tin hoặc quan tâm Zalo OA, dữ liệu sẽ <strong>tự động truyền về máy tính (Realtime)</strong> mà không cần bấm đồng bộ. Với các khách hàng và tin nhắn cũ đã có từ trước, chị chỉ cần bấm <strong>&ldquo;Đồng Bộ Dữ Liệu Cũ&rdquo;</strong> ở trên để hệ thống quét và kéo về đầy đủ.
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* ENVIRONMENT STATUS GRID */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 bg-white dark:bg-[#0d1527] border-slate-200 dark:border-[#1e2c47]">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 flex items-center justify-center">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Cơ sở dữ liệu</div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">PostgreSQL 16.15</div>
            </div>
          </div>
          <div className="mt-3 text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Service: postgresql-x64-16 (Port 5432)</span>
          </div>
        </Card>

        <Card className="p-5 bg-white dark:bg-[#0d1527] border-slate-200 dark:border-[#1e2c47]">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-500/30 flex items-center justify-center">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Backend REST API</div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">NestJS 10 + Prisma</div>
            </div>
          </div>
          <div className="mt-3 text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Prefix: /api/v1 (Port 4000)</span>
          </div>
        </Card>

        <Card className="p-5 bg-white dark:bg-[#0d1527] border-slate-200 dark:border-[#1e2c47]">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-500/30 flex items-center justify-center">
              <FileCode className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Frontend Portal</div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">Next.js App Router</div>
            </div>
          </div>
          <div className="mt-3 text-xs text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Tailwind CSS & shadcn/ui</span>
          </div>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* ZALO CAPABILITY VERIFICATION POLICY GUIDELINES */}
      {/* ========================================================================= */}
      <Card className="p-6 bg-white dark:bg-[#0d1527] border-slate-200 dark:border-[#1e2c47]">
        <CardHeader className="mb-4 p-0">
          <div>
            <CardTitle className="text-slate-900 dark:text-slate-100">Chính sách và Giới hạn Kỹ thuật Tích hợp Zalo Cá nhân & OA</CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">
              Bảng đối chiếu quy định pháp lý, kỹ thuật và cơ chế Capability Gating
            </CardDescription>
          </div>
        </CardHeader>

        <div className="space-y-4 text-xs">
          <div className="p-4 bg-slate-50 dark:bg-[#090e1c] rounded-xl border border-slate-200 dark:border-[#192742]">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-2">
              1. Nguyên tắc cốt lõi: Phân biệt Zalo OA và Zalo Cá nhân
            </h4>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Zalo cung cấp Open API chính thức cho <strong>Zalo Official Account (Zalo OA)</strong> của doanh nghiệp để quản lý khách hàng, tự động nhận tin nhắn và gửi thông báo theo chính sách của Zalo. Ngược lại, đối với <strong>Zalo Cá nhân (Personal Account)</strong> của nhân viên Sale, Zalo <em>không cung cấp API công khai</em> để đọc toàn bộ hộp thư cá nhân hoặc gửi tin nhắn hàng loạt tự động.
            </p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-[#090e1c] rounded-xl border border-slate-200 dark:border-[#192742]">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-2">2. Ba Capability Gating độc lập</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
              <div className="p-3 bg-white dark:bg-[#0d1527] rounded-lg border border-slate-200 dark:border-[#1e2c47]">
                <span className="font-bold text-blue-600 dark:text-blue-400 block mb-1">READ_CHATS</span>
                <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                  Xem hội thoại: Mặc định ở trạng thái <code>NEEDS_VERIFICATION</code>. Khi kết nối Zalo OA, kênh OA sẽ đồng bộ chính thức; hộp thư cá nhân được bảo vệ theo chính sách riêng tư.
                </p>
              </div>

              <div className="p-3 bg-white dark:bg-[#0d1527] rounded-lg border border-slate-200 dark:border-[#1e2c47]">
                <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-1">SYNC_MESSAGES_FILES</span>
                <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                  Đồng bộ tin nhắn & tệp: Chỉ kích hoạt khi có webhook/connector hợp lệ và cơ chế lưu trữ mã hóa dữ liệu (Encryption at rest).
                </p>
              </div>

              <div className="p-3 bg-white dark:bg-[#0d1527] rounded-lg border border-slate-200 dark:border-[#1e2c47]">
                <span className="font-bold text-rose-600 dark:text-rose-400 block mb-1">BULK_SEND</span>
                <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                  Gửi tin hàng loạt: Bị từ chối (<code>REJECTED</code>) trên tài khoản cá nhân để chống spam; trên Zalo OA được thực hiện tuân thủ hạn mức tin ZNS/Broadcast của Zalo.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-[#090e1c] rounded-xl border border-slate-200 dark:border-[#192742]">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-2">3. Cam kết Tuân thủ An toàn Thông tin</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300">
              <li>Không bao giờ yêu cầu hoặc lưu trữ mật khẩu, OTP, mã đăng nhập hoặc session cookies Zalo của nhân viên.</li>
              <li>Không sử dụng browser automation/scraping trái phép vi phạm điều khoản dịch vụ của Zalo.</li>
              <li>Không hứa hẹn khả năng khôi phục tin nhắn đã bị xóa trên Zalo cá nhân.</li>
              <li>Mọi thao tác quản trị, bàn giao khách hàng và thay đổi trạng thái xác minh đều được ghi nhận vào Audit Log.</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* 🚀 MODAL KẾT NỐI ZALO OA */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Kết Nối Zalo Official Account (Zalo OA)"
        description="Chọn phương thức quét mã QR xác thực nhanh hoặc cấu hình ứng dụng Zalo Developer"
        maxWidth="2xl"
      >
        <div className="space-y-5">
          {/* Tabs Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-[#090e1c] rounded-xl border border-[#192742]">
            <button
              type="button"
              onClick={() => setActiveTab('WEB_OAUTH')}
              className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'WEB_OAUTH'
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-[#121c32]'
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              1. Xác Thực Zalo Web (Không Cần QR)
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('QR');
                if (!qrCodeData) loadQrCode();
              }}
              className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'QR'
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-[#121c32]'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              2. Quét Mã QR Điện Thoại
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('DEVELOPER')}
              className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'DEVELOPER'
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-[#121c32]'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              3. Zalo Developers API Key
            </button>
          </div>

          {/* TAB 0: WEB OAUTH (1-CLICK DIRECT ON BROWSER) */}
          {activeTab === 'WEB_OAUTH' && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-blue-950/40 via-sky-950/30 to-indigo-950/40 rounded-2xl border border-blue-500/30 space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="h-8 w-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-black text-xs shrink-0 border border-blue-500/30">
                    WEB
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-white">Xác Thực Trực Tiếp Bằng Trình Duyệt Web</h4>
                    <p className="text-xs text-slate-300">
                      Dành cho trường hợp chị đang đăng nhập sẵn Zalo OA trên web (ở tab khác hoặc cùng máy tính). <strong>Hoàn toàn không cần dùng điện thoại quét mã QR</strong>.
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const url =
                        qrCodeData?.authUrl ||
                        'https://oauth.zaloapp.com/v4/oa/permission?app_id=tourluk_zalo_oa_app&redirect_uri=http://localhost:4000/api/v1/integrations/oa/callback';
                      window.open(url, '_blank');
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600 hover:from-blue-500 hover:to-sky-500 text-white font-bold text-xs shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Bấm Vào Đây Để Mở Trang Ủy Quyền Zalo Trên Web (Tab Mới)
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div className="p-4 bg-[#060a14] rounded-2xl border border-[#1a2842] space-y-3">
                <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  3 Bước Đơn Giản Trên Trình Duyệt:
                </div>
                <ol className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-start gap-2">
                    <span className="h-5 w-5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      1
                    </span>
                    <span>
                      Bấm nút màu xanh bên trên để mở tab ủy quyền của Zalo. Do chị đã đăng nhập Zalo OA sẵn trên trình duyệt, Zalo sẽ nhận diện ngay.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="h-5 w-5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      Chọn trang <strong>Zalo OA của công ty</strong> và bấm <strong>&ldquo;Cho phép / Xác nhận&rdquo;</strong> bằng chuột trên màn hình máy tính.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="h-5 w-5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      3
                    </span>
                    <span>
                      Quay lại trang này kiểm tra Tên OA & OA ID (lấy từ trang <code>oa.zalo.me</code> đang mở) rồi bấm <strong>&ldquo;Xác Nhận & Hoàn Tất Kết Nối&rdquo;</strong> bên dưới là xong!
                    </span>
                  </li>
                </ol>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#1a2842]">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Tên Zalo OA của công ty
                    </label>
                    <input
                      type="text"
                      value={formData.oaName}
                      onChange={(e) => setFormData({ ...formData, oaName: e.target.value })}
                      placeholder="Ví dụ: TourLuk Travel Official"
                      className="w-full px-3 py-1.5 text-xs bg-[#090e1c] border border-[#1e2c47] rounded-lg text-slate-100 focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      OA ID (Lấy từ góc trang oa.zalo.me)
                    </label>
                    <input
                      type="text"
                      value={formData.oaId}
                      onChange={(e) => setFormData({ ...formData, oaId: e.target.value })}
                      placeholder="Ví dụ: 248916382091729"
                      className="w-full px-3 py-1.5 text-xs bg-[#090e1c] border border-[#1e2c47] rounded-lg text-slate-100 focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#162035]">
                <Button
                  onClick={() => setIsModalOpen(false)}
                  className="bg-[#121c32] hover:bg-[#1a2842] text-slate-300 text-xs h-9 px-4"
                >
                  Đóng
                </Button>
                <Button
                  onClick={() => handleConnect('CREDENTIALS')}
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs h-9 px-5 shadow-lg shadow-red-600/30"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Đang kết nối...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                      Xác Nhận & Hoàn Tất Kết Nối Zalo OA
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* TAB 1: QR CODE */}

          {activeTab === 'QR' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                {/* QR Display Frame */}
                <div className="flex flex-col items-center justify-center p-5 bg-[#060a14] rounded-2xl border border-[#1a2842] relative">
                  {isQrLoading ? (
                    <div className="h-56 w-56 flex flex-col items-center justify-center text-slate-400 gap-2">
                      <RefreshCw className="w-7 h-7 animate-spin text-red-500" />
                      <span className="text-xs">Đang tạo mã QR bảo mật...</span>
                    </div>
                  ) : qrCodeData?.qrDataUrl ? (
                    <div className="relative group">
                      <div className="p-3 bg-white rounded-xl shadow-xl">
                        <img
                          src={qrCodeData.qrDataUrl}
                          alt="Mã QR Xác thực Zalo OA"
                          className="w-48 h-48 rounded object-contain"
                        />
                      </div>
                      <div className="mt-2 text-center">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Mã QR sẵn sàng quét
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-56 w-56 flex flex-col items-center justify-center text-slate-400 gap-2">
                      <AlertCircle className="w-8 h-8 text-amber-500" />
                      <span className="text-xs">Không tải được mã QR</span>
                      <Button onClick={loadQrCode} className="text-xs h-7 mt-1">
                        Thử lại
                      </Button>
                    </div>
                  )}

                  <button
                    onClick={loadQrCode}
                    disabled={isQrLoading}
                    className="mt-3 text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw className={`w-3 h-3 ${isQrLoading ? 'animate-spin' : ''}`} />
                    Làm mới mã QR
                  </button>
                </div>

                {/* Instructions */}
                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-red-400" />
                    3 Bước Quét Mã Kết Nối:
                  </div>

                  <ol className="space-y-2.5 text-xs text-slate-300">
                    <li className="flex items-start gap-2.5">
                      <span className="h-5 w-5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                        1
                      </span>
                      <span>
                        Mở ứng dụng <strong>Zalo</strong> trên điện thoại của Quản trị viên (Admin) Zalo OA.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="h-5 w-5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                        2
                      </span>
                      <span>
                        Bấm vào biểu tượng <strong>Quét mã QR</strong> trên thanh tìm kiếm Zalo và hướng camera vào mã bên cạnh.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="h-5 w-5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                        3
                      </span>
                      <span>
                        Xác nhận <strong>&ldquo;Cho phép ủy quyền&rdquo;</strong> để hệ thống tự động đồng bộ tin nhắn & khách hàng.
                      </span>
                    </li>
                  </ol>

                  {/* Form fields for OA Name */}
                  <div className="pt-2 border-t border-[#1a2842] space-y-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Tên hiển thị Zalo OA
                      </label>
                      <input
                        type="text"
                        value={formData.oaName}
                        onChange={(e) => setFormData({ ...formData, oaName: e.target.value })}
                        placeholder="Ví dụ: TourLuk Travel Official"
                        className="w-full px-3 py-1.5 text-xs bg-[#090e1c] border border-[#1e2c47] rounded-lg text-slate-100 focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        OA ID (Tùy chọn)
                      </label>
                      <input
                        type="text"
                        value={formData.oaId}
                        onChange={(e) => setFormData({ ...formData, oaId: e.target.value })}
                        placeholder="Ví dụ: 248916382091729"
                        className="w-full px-3 py-1.5 text-xs bg-[#090e1c] border border-[#1e2c47] rounded-lg text-slate-100 focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#162035]">
                <Button
                  onClick={() => setIsModalOpen(false)}
                  className="bg-[#121c32] hover:bg-[#1a2842] text-slate-300 text-xs h-9 px-4"
                >
                  Đóng
                </Button>
                <Button
                  onClick={() => handleConnect('QR_SCAN')}
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs h-9 px-5 shadow-lg shadow-red-600/30"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Đang kích hoạt...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                      Xác Nhận & Hoàn Tất Kết Nối Zalo OA
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* TAB 2: DEVELOPER APP CREDENTIALS */}
          {activeTab === 'DEVELOPER' && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-950/30 rounded-xl border border-blue-500/30 text-xs text-blue-300 leading-relaxed">
                Phương thức dành cho Doanh nghiệp đã đăng ký App trên <strong>developers.zalo.me</strong>. Bạn có thể sao chép Webhook URL bên dưới dán vào phần cấu hình Webhook của ứng dụng Zalo.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Tên hiển thị Zalo OA *
                  </label>
                  <input
                    type="text"
                    value={formData.oaName}
                    onChange={(e) => setFormData({ ...formData, oaName: e.target.value })}
                    placeholder="Ví dụ: TourLuk Travel Official"
                    className="w-full px-3 py-2 text-xs bg-[#090e1c] border border-[#1e2c47] rounded-lg text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Zalo OA ID *
                  </label>
                  <input
                    type="text"
                    value={formData.oaId}
                    onChange={(e) => setFormData({ ...formData, oaId: e.target.value })}
                    placeholder="Ví dụ: 248916382091729"
                    className="w-full px-3 py-2 text-xs bg-[#090e1c] border border-[#1e2c47] rounded-lg text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Zalo App ID (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={formData.appId}
                    onChange={(e) => setFormData({ ...formData, appId: e.target.value })}
                    placeholder="Ví dụ: 1938204918239"
                    className="w-full px-3 py-2 text-xs bg-[#090e1c] border border-[#1e2c47] rounded-lg text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Secret Key / Khóa bí mật (Tùy chọn)
                  </label>
                  <input
                    type="password"
                    value={formData.secretKey}
                    onChange={(e) => setFormData({ ...formData, secretKey: e.target.value })}
                    placeholder="••••••••••••••••••••"
                    className="w-full px-3 py-2 text-xs bg-[#090e1c] border border-[#1e2c47] rounded-lg text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* Webhook Box */}
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Webhook URL nhận sự kiện Zalo:
                </label>
                <div className="flex items-center gap-2 p-2 bg-[#060a14] rounded-lg border border-[#1a2842]">
                  <code className="text-xs text-slate-200 font-mono truncate flex-1 select-all">
                    {webhookUrl}
                  </code>
                  <Button
                    type="button"
                    onClick={() => copyToClipboard(webhookUrl)}
                    className="bg-[#121c32] hover:bg-[#1a2842] text-xs h-7 px-3 text-slate-200"
                  >
                    {copiedWebhook ? (
                      <>
                        <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Đã chép
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 mr-1 text-slate-400" /> Sao chép
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#162035]">
                <Button
                  onClick={() => setIsModalOpen(false)}
                  className="bg-[#121c32] hover:bg-[#1a2842] text-slate-300 text-xs h-9 px-4"
                >
                  Đóng
                </Button>
                <Button
                  onClick={() => handleConnect('CREDENTIALS')}
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs h-9 px-5 shadow-lg shadow-red-600/30"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                      Lưu Cấu Hình & Kích Hoạt Zalo OA
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
