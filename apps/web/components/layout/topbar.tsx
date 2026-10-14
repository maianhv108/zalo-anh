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
        setUser(JSON.parse(stored));
      }
    } catch (e) {
      // ignore
    }

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
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-xs z-20">
      {/* Search Input */}
      <div className="flex items-center gap-3 w-96">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm khách hàng, nhân viên, số điện thoại..."
            className="w-full pl-9 pr-4 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Environment Status Badge */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
          <Server className="h-3.5 w-3.5 text-emerald-600" />
          <span className="font-medium">Hệ thống: API v1 & PostgreSQL 16 Hoạt động</span>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <Bell className="h-5 w-5" />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="text-sm font-semibold text-slate-900">Thông báo hệ thống</h4>
                <span className="text-xs text-blue-600 font-medium">Đã cập nhật</span>
              </div>
              <div className="py-2 space-y-2 max-h-60 overflow-y-auto text-xs text-slate-600">
                {notifications.length === 0 ? (
                  <p className="py-4 text-center text-slate-400">Không có thông báo mới</p>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <p className="font-semibold text-slate-800">{n.title}</p>
                      <p className="text-slate-500 mt-0.5">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-slate-200" />

        {/* User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-100 transition-colors text-left"
          >
            <img
              src={user?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin'}
              alt={user?.name || 'User'}
              className="h-8 w-8 rounded-full border border-slate-200 object-cover bg-slate-100"
            />
            <div className="hidden md:block">
              <div className="text-xs font-semibold text-slate-900 leading-tight">{user?.name || 'Tài khoản'}</div>
              <div className="text-[11px] text-blue-600 font-medium">
                {user?.role ? roleLabels[user.role] : 'Người dùng'}
              </div>
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-fade-in">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900">{user?.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Mã: {user?.code}</p>
              </div>

              <div className="py-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
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
