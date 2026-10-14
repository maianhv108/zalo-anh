'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Shield,
  User,
  Mail,
  Phone,
  Lock,
  ArrowRight,
  Sparkles,
  Building2,
  Clock,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { fetchApi } from '@/lib/api';

export default function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [inviteData, setInviteData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    zaloAccountName: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [newUser, setNewUser] = useState<any>(null);

  // 1. Khi mở trang, gọi API ghi nhận đã quét mã (SCANNED) và lấy thông tin lời mời
  useEffect(() => {
    if (!token) return;

    const initInvite = async () => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        // Ghi nhận quét mã
        await fetchApi(`/sale-invites/${token}/scan`, { method: 'POST' });
        // Lấy thông tin chi tiết lời mời
        const status = await fetchApi(`/sale-invites/${token}/status`);
        setInviteData(status);

        if (status.status === 'COMPLETED') {
          setErrorMsg('Mã QR này đã được sử dụng để kích hoạt tài khoản trước đó.');
        } else if (status.status === 'CANCELLED') {
          setErrorMsg('Lời mời tham gia này đã bị Quản trị viên hủy bỏ.');
        } else if (status.isExpired || status.status === 'EXPIRED') {
          setErrorMsg('Mã QR mời đã hết hạn sử dụng. Vui lòng liên hệ Quản trị viên để nhận mã QR mới.');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Không thể tải thông tin lời mời.');
      } finally {
        setIsLoading(false);
      }
    };

    initInvite();
  }, [token]);

  // 2. Xác nhận tham gia
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetchApi(`/sale-invites/${token}/accept`, {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      // Lưu phiên đăng nhập tự động
      if (res.accessToken) {
        localStorage.setItem('sales_zalo_token', res.accessToken);
        localStorage.setItem('sales_zalo_user', JSON.stringify(res.user));
      }

      setNewUser(res.user);
      setIsSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Đã có lỗi xảy ra khi xác nhận tham gia.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#0b1b3d] to-slate-900 flex flex-col justify-center items-center p-4 py-8">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="text-center mb-6 relative z-10">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/30 mb-3">
          <QrCode className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">Sales Zalo CRM</h1>
        <p className="text-xs text-blue-200/70 mt-1">Hệ thống Quản lý Bán hàng & Khách hàng Đội ngũ Sale</p>
      </div>

      <div className="w-full max-w-md relative z-10">
        {isLoading ? (
          <Card className="p-8 text-center bg-white/95 backdrop-blur shadow-2xl border-white/20">
            <div className="animate-spin h-8 w-8 border-3 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <h3 className="text-sm font-bold text-slate-800">Đang xác thực mã mời...</h3>
            <p className="text-xs text-slate-500 mt-1">Vui lòng chờ trong giây lát</p>
          </Card>
        ) : isSuccess ? (
          /* THÀNH CÔNG */
          <Card className="p-6 text-center bg-white shadow-2xl border-emerald-200">
            <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
              <CheckCircle2 className="h-9 w-9" />
            </div>

            <h3 className="text-xl font-bold text-slate-900">Kích Hoạt Thành Công!</h3>
            <p className="text-xs text-slate-600 mt-1.5">
              Chào mừng bạn đã chính thức gia nhập đội ngũ Sale của hệ thống.
            </p>

            <div className="mt-5 p-4 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Mã nhân viên:</span>
                <span className="font-bold text-blue-700 font-mono">{newUser?.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Họ và tên:</span>
                <span className="font-bold text-slate-900">{newUser?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Email đăng nhập:</span>
                <span className="font-medium text-slate-700">{newUser?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Đội nhóm:</span>
                <span className="font-semibold text-emerald-700">{newUser?.teamName || 'Đội Kinh Doanh'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Vai trò:</span>
                <span className="font-semibold text-blue-600">Nhân viên Sale (SALE)</span>
              </div>
            </div>

            <Button
              className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg shadow-blue-500/20"
              onClick={() => router.push('/dashboard')}
            >
              <span>Vào Bảng điều khiển CRM</span>
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </Card>
        ) : errorMsg && (!inviteData || inviteData.isExpired || inviteData.status === 'COMPLETED' || inviteData.status === 'CANCELLED') ? (
          /* LỖI / HẾT HẠN / ĐÃ DÙNG */
          <Card className="p-6 text-center bg-white shadow-2xl border-rose-200">
            <div className="h-14 w-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8" />
            </div>

            <h3 className="text-lg font-bold text-slate-900">Không Thể Tiếp Tục</h3>
            <p className="text-xs text-rose-600 font-medium mt-2 leading-relaxed bg-rose-50 p-3 rounded-xl border border-rose-200">
              {errorMsg}
            </p>

            <p className="text-[11px] text-slate-500 mt-4">
              Mã mời bằng QR được thiết kế chỉ sử dụng một lần và có thời hạn để đảm bảo an toàn nội bộ.
            </p>

            <Button
              variant="outline"
              className="w-full mt-5"
              onClick={() => router.push('/login')}
            >
              Về trang đăng nhập
            </Button>
          </Card>
        ) : (
          /* FORM ĐIỀN THÔNG TIN TỐI THIỂU */
          <Card className="p-6 bg-white shadow-2xl border-white/20">
            <div className="border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 mb-1">
                <Sparkles className="h-4 w-4" />
                <span>Lời mời gia nhập đội ngũ Sale</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">Xác Nhận Tham Gia Hệ Thống</h2>
              <div className="mt-2.5 flex items-center gap-2 p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900">
                <Building2 className="h-4 w-4 text-blue-600 shrink-0" />
                <span>
                  Đội nhóm phân công: <strong>{inviteData?.teamName || 'Đội Kinh Doanh'}</strong>
                </span>
              </div>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên của bạn <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ví dụ: Nguyễn Thị Mai"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email làm việc <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="mai.nguyen@congty.com"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số điện thoại cá nhân / Zalo <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0912345678"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mật khẩu đăng nhập CRM <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Tối thiểu 6 ký tự"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Dùng để đăng nhập hệ thống CRM sau này</p>
              </div>

              {/* Security policy note */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 flex items-start gap-2">
                <Shield className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Hệ thống nội bộ bảo mật: <strong>Không thu thập mật khẩu Zalo cá nhân</strong>. Tài khoản được cấp quyền <strong>SALE</strong> để phụ trách khách hàng và báo cáo.
                </span>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all mt-2"
              >
                {isSubmitting ? 'Đang kích hoạt tài khoản...' : 'Xác Nhận Tham Gia Hệ Thống'}
              </Button>
            </form>
          </Card>
        )}

        <div className="text-center mt-4 text-[11px] text-slate-400">
          Sales Zalo Management System • Nền tảng CRM An toàn cho Doanh nghiệp
        </div>
      </div>
    </div>
  );
}
