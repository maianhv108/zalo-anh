'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Shield,
  User,
  Phone,
  Sparkles,
  Building2,
  XCircle,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { fetchApi } from '@/lib/api';

export default function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [inviteData, setInviteData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form state: Chỉ cần Tên và Số điện thoại Zalo (Không cần mật khẩu hay email phức tạp)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
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
        // Ghi nhận quét mã thời gian thực cho Admin
        await fetchApi(`/sale-invites/${token}/scan`, { method: 'POST' });
        // Lấy thông tin chi tiết lời mời
        const status = await fetchApi(`/sale-invites/${token}/status`);
        setInviteData(status);

        if (status.status === 'COMPLETED') {
          setErrorMsg('Mã QR này đã được liên kết với một tài khoản Zalo trước đó.');
        } else if (status.status === 'CANCELLED') {
          setErrorMsg('Yêu cầu liên kết này đã bị Quản trị viên hủy bỏ.');
        } else if (status.isExpired || status.status === 'EXPIRED') {
          setErrorMsg('Mã QR đã hết hạn. Vui lòng liên hệ Quản trị viên để hiển thị mã mới.');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Không thể tải thông tin lời mời liên kết.');
      } finally {
        setIsLoading(false);
      }
    };

    initInvite();
  }, [token]);

  // 2. Xác nhận liên kết Zalo vào hệ thống Admin
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetchApi(`/sale-invites/${token}/accept`, {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          zaloAccountName: formData.zaloAccountName || formData.name,
        }),
      });

      setNewUser(res.user);
      setIsSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Đã có lỗi xảy ra khi xác nhận liên kết Zalo.');
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
        <p className="text-xs text-blue-200/70 mt-1">Cổng Kết Nối & Giám Sát Hội Thoại Zalo Doanh Nghiệp</p>
      </div>

      <div className="w-full max-w-md relative z-10">
        {isLoading ? (
          <Card className="p-8 text-center bg-white/95 backdrop-blur shadow-2xl border-white/20">
            <div className="animate-spin h-8 w-8 border-3 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <h3 className="text-sm font-bold text-slate-800">Đang xác thực liên kết Zalo...</h3>
            <p className="text-xs text-slate-500 mt-1">Vui lòng chờ trong giây lát</p>
          </Card>
        ) : isSuccess ? (
          /* THÀNH CÔNG: THÔNG BÁO CHO NHÂN VIÊN TIẾP TỤC DÙNG ZALO */
          <Card className="p-6 text-center bg-white shadow-2xl border-emerald-200 animate-fade-in">
            <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
              <CheckCircle2 className="h-9 w-9" />
            </div>

            <h3 className="text-xl font-bold text-slate-900">Đã Liên Kết Zalo Thành Công!</h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Tài khoản Zalo của bạn đã được kết nối vào hệ thống quản trị của Quản lý.
            </p>

            <div className="mt-5 p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Mã nhân viên:</span>
                <span className="font-bold text-emerald-800 font-mono">{newUser?.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Họ và tên Sale:</span>
                <span className="font-bold text-slate-900">{newUser?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Số điện thoại Zalo:</span>
                <span className="font-medium text-slate-800 font-mono">{newUser?.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Đội nhóm:</span>
                <span className="font-semibold text-emerald-700">{newUser?.teamName || 'Đội Kinh Doanh'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Trạng thái giám sát:</span>
                <span className="font-semibold text-blue-600 inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                  Đang hoạt động (ACTIVE)
                </span>
              </div>
            </div>

            <div className="mt-5 p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 text-left flex items-start gap-2.5">
              <MessageSquare className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                <strong>Bạn đã hoàn tất!</strong> Bạn có thể đóng tab này lại và tiếp tục sử dụng ứng dụng Zalo trên điện thoại để nhắn tin, tư vấn và chăm sóc khách hàng như bình thường.
              </span>
            </div>

            <Button
              className="w-full mt-5 bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs py-2.5"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.close();
                }
              }}
            >
              Hoàn tất & Đóng trang
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
              Mã QR liên kết được thiết kế dùng một lần để đảm bảo an toàn. Vui lòng nhờ Quản lý tạo mã mới trên màn hình máy tính.
            </p>
          </Card>
        ) : (
          /* FORM XÁC NHẬN LIÊN KẾT ZALO CHO NHÂN VIÊN */
          <Card className="p-6 bg-white shadow-2xl border-white/20">
            <div className="border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 mb-1">
                <Sparkles className="h-4 w-4" />
                <span>Liên kết Zalo Doanh Nghiệp</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">Xác Nhận Kết Nối Zalo Với Quản Trị Viên</h2>
              <p className="text-xs text-slate-500 mt-1">
                Tài khoản Zalo trên điện thoại này sẽ được liên kết vào hệ thống quản lý của Quản lý để hỗ trợ chăm sóc khách hàng.
              </p>

              <div className="mt-3 flex items-center gap-2 p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900">
                <Building2 className="h-4 w-4 text-blue-600 shrink-0" />
                <span>
                  Đội nhóm kinh doanh: <strong>{inviteData?.teamName || 'Đội Kinh Doanh'}</strong>
                </span>
              </div>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên nhân viên Sale <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ví dụ: Trần Mai Anh"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số điện thoại Zalo của máy này <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Ví dụ: 0912345678"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Số điện thoại đăng ký tài khoản Zalo bạn đang sử dụng</p>
              </div>

              {/* Security policy note */}
              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/80 text-[11px] text-emerald-900 flex items-start gap-2">
                <Shield className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Bảo mật tuyệt đối: <strong>Không yêu cầu mật khẩu Zalo</strong> hay mật khẩu cá nhân. Quá trình quét mã chỉ cấp quyền để Quản lý theo dõi lịch sử tin nhắn tư vấn khách hàng trên CRM.
                </span>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all text-sm mt-2"
              >
                {isSubmitting ? 'Đang kích hoạt liên kết...' : 'Xác Nhận Liên Kết Zalo Ngay'}
              </Button>
            </form>
          </Card>
        )}

        <div className="text-center mt-4 text-[11px] text-slate-400">
          Sales Zalo Management System • Nền tảng Giám sát & Quản trị Zalo Doanh nghiệp
        </div>
      </div>
    </div>
  );
}
