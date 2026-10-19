'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  MessageSquare,
  FolderArchive,
  Send,
  BarChart3,
  ScrollText,
  Settings,
  ShieldCheck,
  ChevronRight,
  Share2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigationItems = [
  { name: 'Tổng quan', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Nhân viên Sale', href: '/sales', icon: Users },
  { name: 'Khách hàng', href: '/customers', icon: UserCheck },
  { name: 'Hội thoại', href: '/inbox', icon: MessageSquare },
  { name: 'Đăng bài đồng loạt', href: '/posts', icon: Share2 },
  { name: 'Kho lưu trữ', href: '/archive', icon: FolderArchive },
  { name: 'Chiến dịch gửi tin', href: '/campaigns', icon: Send },
  { name: 'Báo cáo', href: '/reports', icon: BarChart3 },
  { name: 'Nhật ký hoạt động', href: '/audit-logs', icon: ScrollText },
  { name: 'Cài đặt hệ thống', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-[#060a14] text-slate-200 flex flex-col shrink-0 select-none border-r border-[#162035] shadow-2xl">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-4 gap-3 border-b border-[#162035] bg-[#04070e]">
        <img
          src="/logo.jpg"
          alt="TourLuk Tool Zalo"
          className="h-10 w-10 rounded-full border border-red-500/50 object-cover shadow-lg shadow-red-500/20 shrink-0"
        />
        <div className="overflow-hidden">
          <h1 className="text-sm font-black text-white tracking-wider truncate">TOURLUK TOOL ZALO</h1>
          <p className="text-[10px] text-red-400 font-bold tracking-widest uppercase truncate">Go anywhere, every day</p>
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          Menu Điều Hướng
        </div>

        {navigationItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group',
                isActive
                  ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white shadow-md shadow-red-600/30 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-[#121c32]/80',
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-white' : 'text-slate-400 group-hover:text-red-400')} />
                <span className="truncate">{item.name}</span>
              </div>
              {isActive && <ChevronRight className="h-3.5 w-3.5 text-white/90" />}
            </Link>
          );
        })}
      </div>

      {/* System Status Footer */}
      <div className="p-4 border-t border-[#162035] bg-[#04070e]">
        <div className="flex items-center gap-2.5 text-xs text-slate-400 mb-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-300">PostgreSQL 16 & API v1</span>
        </div>
        <div className="text-[11px] text-slate-500">
          Tài khoản Zalo: <span className="text-emerald-400 font-semibold">Realtime Mode</span>
        </div>
      </div>
    </aside>
  );
}
