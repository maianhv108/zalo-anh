'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchApi } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const data = await fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      localStorage.setItem('sales_zalo_token', data.accessToken);
      localStorage.setItem('sales_zalo_user', JSON.stringify(data.user));
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillQuickAccount = (accEmail: string, accPass: string) => {
    setEmail(accEmail);
    setPassword(accPass);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#060a14]">
      {/* Left Brand Panel */}
      <div className="w-full md:w-5/12 bg-[#080d19] text-white p-8 md:p-12 flex flex-col justify-between border-r border-[#1a2842] relative overflow-hidden">
        {/* Glow circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <img
              src="/logo.jpg"
              alt="TourLuk Tool Zalo"
              className="h-12 w-12 rounded-full border-2 border-red-500/60 object-cover shadow-lg shadow-red-500/40 shrink-0"
            />
            <div>
              <h1 className="text-lg font-black tracking-wide text-white">TOURLUK TOOL ZALO</h1>
              <p className="text-xs text-red-400 font-medium">Hệ thống Quản lý Khách hàng & Zalo Đội ngũ Sale</p>
            </div>
          </div>

          <div className="mt-16 space-y-6">
            <h2 className="text-2xl md:text-3xl font-extrabold leading-tight text-slate-100">
              Quản lý tập trung đội ngũ Sale và dữ liệu chăm sóc khách hàng
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Giải pháp CRM nội bộ doanh nghiệp: Phân công và bàn giao khách hàng minh bạch, hộp thư đa hội thoại có nhãn DEMO, cùng cơ chế xác minh Capability Gating nghiêm ngặt đối với tài khoản Zalo cá nhân.
            </p>
          </div>
        </div>

        <div className="relative z-10 mt-12 pt-6 border-t border-[#1a2842] text-xs text-slate-400">
          <p className="font-medium text-slate-300">Nguyên tắc An toàn & Bảo mật:</p>
          <p className="mt-1">Không scrape mật khẩu Zalo, không lưu OTP hay cookie trái phép. Phân biệt rõ dữ liệu mẫu và kênh tích hợp chính thức.</p>
        </div>
      </div>

      {/* Right Login Form Panel */}
      <div className="w-full md:w-7/12 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md bg-[#0d1527] rounded-2xl shadow-2xl border border-[#1a2842] p-8 text-slate-100">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-slate-100">Đăng nhập hệ thống</h3>
            <p className="text-sm text-slate-400 mt-1">Sử dụng tài khoản nội bộ được cấp bởi quản trị viên</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-950/50 border border-rose-800/80 flex items-start gap-3 text-rose-300 text-sm">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Email nhân viên
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@saleszalo.local"
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-[#060a14] border border-[#1a2842] rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all placeholder:text-slate-500 text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-[#060a14] border border-[#1a2842] rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all placeholder:text-slate-500 text-slate-100"
                />
              </div>
            </div>

            <Button type="submit" isLoading={isLoading} className="w-full py-2.5 mt-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white shadow-lg shadow-red-600/30">
              <span>Đăng nhập CRM</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {/* Quick Login for Admin Tiểu Miu */}
          <div className="mt-8 pt-6 border-t border-[#1a2842]">
            <button
              type="button"
              onClick={() => fillQuickAccount('admin@saleszalo.local', 'Admin@123456')}
              className="w-full p-2.5 flex items-center justify-center gap-2 rounded-xl border border-[#1a2842] bg-[#080d19] hover:border-red-500 hover:bg-[#131d33] transition-all text-xs font-medium text-slate-200"
            >
              <Sparkles className="h-3.5 w-3.5 text-red-400" />
              <span>Điền nhanh tài khoản Admin: <strong>Tiểu Miu</strong></span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
