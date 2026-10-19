'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Search,
  LogOut,
  User as UserIcon,
  Server,
  CheckCircle2,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

export function Topbar() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sales_zalo_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.email === 'admin@saleszalo.local') {
          parsed.name = 'Tiểu Miu';
        }
        setUser(parsed);
      }
    } catch (e) {
      // ignore
    }

    // Lấy thông tin tài khoản mới nhất từ Server
    fetchApi('/auth/me')
      .then((fresh) => {
        if (fresh && fresh.id) {
          setUser(fresh);
          localStorage.setItem('sales_zalo_user', JSON.stringify(fresh));
        }
      })
      .catch(() => {});

    // Lấy thông báo
    fetchApi('/notifications')
      .then((data) => setNotifications(data || []))
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    try {
      await fetchApi('/auth/logout', { method: 'POST' });
    } catch (e) {
      // ignore
    } finally {
      localStorage.removeItem('sales_zalo_token');
      localStorage.removeItem('sales_zalo_user');
      router.push('/login');
    }
  };

  const roleLabels: Record<string, string> = {
    ADMIN: 'Quản trị viên (Admin)',
    MANAGER: 'Trưởng nhóm (Manager)',
    SALE: 'Nhân viên (Sale)',
  };

  return (
    <header className="h-16 bg-[#080d19] border-b border-[#162035] px-6 flex items-center justify-between shrink-0 shadow-lg z-20">
      {/* Search Input */}
      <div className="flex items-center gap-3 w-96">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm khách hàng, nhân viên, số điện thoại..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-[#060a14] border border-[#162035] rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Environment Status Badge */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-400">
          <Server className="h-3.5 w-3.5 text-emerald-400" />
          <span className="font-semibold">Hệ thống: API v1 & PostgreSQL 16 Hoạt động</span>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#121c32] transition-colors"
          >
            <Bell className="h-5 w-5" />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[#080d19]" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-[#0d1527] rounded-2xl shadow-2xl border border-[#1e2c47] p-4 z-50 animate-fade-in text-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-[#1e2c47]">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Thông báo hệ thống</h4>
                <span className="text-[11px] text-red-400 font-semibold">Đã cập nhật</span>
              </div>
              <div className="py-2 space-y-2 max-h-60 overflow-y-auto text-xs text-slate-300">
                {notifications.length === 0 ? (
                  <p className="py-4 text-center text-slate-400">Không có thông báo mới</p>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className="p-2.5 rounded-xl bg-[#080d19] border border-[#162035]">
                      <p className="font-bold text-white">{n.title}</p>
                      <p className="text-slate-400 mt-0.5">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-[#162035]" />

        {/* User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-[#121c32] transition-colors text-left"
          >
            <img
              src={user?.avatarUrl && !user.avatarUrl.includes('dicebear') ? user.avatarUrl : '/admin-avatar.png'}
              alt={user?.name || 'User'}
              className="h-9 w-9 rounded-full border-2 border-red-500/60 object-cover bg-[#0d1527] shadow-md shadow-red-500/20"
            />
            <div className="hidden md:block">
              <div className="text-xs font-bold text-white leading-tight">{user?.name || 'Tiểu Miu'}</div>
              <div className="text-[11px] text-red-400 font-semibold">
                {user?.role ? roleLabels[user.role] : 'Quản trị viên'}
              </div>
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-[#0d1527] rounded-2xl shadow-2xl border border-[#1e2c47] py-2 z-50 animate-fade-in text-slate-100">
              <div className="px-4 py-3 border-b border-[#1e2c47] flex items-center gap-3">
                <img
                  src={user?.avatarUrl && !user.avatarUrl.includes('dicebear') ? user.avatarUrl : '/admin-avatar.png'}
                  alt={user?.name || 'Tiểu Miu'}
                  className="h-10 w-10 rounded-full border border-red-500/60 object-cover shadow-sm shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate">{user?.name || 'Tiểu Miu'}</p>
                  <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                  <p className="text-[10px] text-red-400 font-mono mt-0.5">Admin CRM</p>
                </div>
              </div>

              <div className="py-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-950/40 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Đăng xuất khỏi hệ thống</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
