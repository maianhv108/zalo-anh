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
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      {/* Left Brand Panel */}
      <div className="w-full md:w-5/12 bg-[#0b1b3d] text-white p-8 md:p-12 flex flex-col justify-between border-r border-[#1e3a5f] relative overflow-hidden">
        {/* Glow circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-wide">SALES ZALO MANAGEMENT</h1>
              <p className="text-xs text-blue-300">Hệ thống CRM & Quản lý Tài khoản Sale</p>
            </div>
          </div>

          <div className="mt-16 space-y-6">
            <h2 className="text-2xl md:text-3xl font-extrabold leading-tight text-white">
              Quản lý tập trung đội ngũ Sale và dữ liệu chăm sóc khách hàng
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Giải pháp CRM nội bộ doanh nghiệp: Phân công và bàn giao khách hàng minh bạch, hộp thư đa hội thoại có nhãn DEMO, cùng cơ chế xác minh Capability Gating nghiêm ngặt đối với tài khoản Zalo cá nhân.
            </p>
          </div>
        </div>

        <div className="relative z-10 mt-12 pt-6 border-t border-[#1e3a5f]/60 text-xs text-slate-400">
          <p className="font-medium text-slate-300">Nguyên tắc An toàn & Bảo mật:</p>
          <p className="mt-1">Không scrape mật khẩu Zalo, không lưu OTP hay cookie trái phép. Phân biệt rõ dữ liệu mẫu và kênh tích hợp chính thức.</p>
        </div>
      </div>

      {/* Right Login Form Panel */}
      <div className="w-full md:w-7/12 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-slate-900">Đăng nhập hệ thống</h3>
            <p className="text-sm text-slate-500 mt-1">Sử dụng tài khoản nội bộ được cấp bởi quản trị viên</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-sm">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
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
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
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
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <Button type="submit" isLoading={isLoading} className="w-full py-2.5 mt-2">
              <span>Đăng nhập CRM</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {/* Quick Login Test Accounts */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>Tài khoản thử nghiệm nhanh (Development Seed)</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillQuickAccount('admin@saleszalo.local', 'Admin@123456')}
                className="p-2.5 text-center rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all text-xs font-medium text-slate-700"
              >
                <div className="font-semibold text-blue-600">Admin</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Toàn quyền</div>
              </button>

              <button
                type="button"
                onClick={() => fillQuickAccount('manager1@saleszalo.local', 'Manager@123456')}
                className="p-2.5 text-center rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all text-xs font-medium text-slate-700"
              >
                <div className="font-semibold text-indigo-600">Manager 1</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Trưởng nhóm HN</div>
              </button>

              <button
                type="button"
                onClick={() => fillQuickAccount('sale01@saleszalo.local', 'Sale@123456')}
                className="p-2.5 text-center rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all text-xs font-medium text-slate-700"
              >
                <div className="font-semibold text-emerald-600">Sale 01</div>
                <div className="text-[10px] text-slate-400 mt-0.5">An Hoàng Zalo</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
