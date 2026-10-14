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
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigationItems = [
  { name: 'Tổng quan', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Nhân viên Sale', href: '/sales', icon: Users },
  { name: 'Khách hàng', href: '/customers', icon: UserCheck },
  { name: 'Hội thoại', href: '/inbox', icon: MessageSquare },
  { name: 'Kho lưu trữ', href: '/archive', icon: FolderArchive },
  { name: 'Chiến dịch gửi tin', href: '/campaigns', icon: Send },
  { name: 'Báo cáo', href: '/reports', icon: BarChart3 },
  { name: 'Nhật ký hoạt động', href: '/audit-logs', icon: ScrollText },
  { name: 'Cài đặt hệ thống', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-[#0b1b3d] text-slate-200 flex flex-col shrink-0 select-none border-r border-[#1e3a5f] shadow-lg">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 gap-3 border-b border-[#1e3a5f]/60 bg-[#07132c]">
        <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-white tracking-wide">SALES ZALO CRM</h1>
          <p className="text-[10px] text-blue-300 font-medium tracking-wider uppercase">Enterprise System</p>
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
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
                'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group',
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-[#1e3a5f]/50',
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn('h-4 w-4', isActive ? 'text-white' : 'text-blue-400 group-hover:text-blue-300')} />
                <span>{item.name}</span>
              </div>
              {isActive && <ChevronRight className="h-3.5 w-3.5 text-blue-200" />}
            </Link>
          );
        })}
      </div>

      {/* System Status Footer */}
      <div className="p-4 border-t border-[#1e3a5f]/60 bg-[#07132c]/50">
        <div className="flex items-center gap-2.5 text-xs text-slate-400 mb-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium text-slate-300">PostgreSQL 16 & API v1</span>
        </div>
        <div className="text-[11px] text-slate-500">
          Tài khoản Zalo cá nhân: <span className="text-amber-400 font-medium">Gated Mode</span>
        </div>
      </div>
    </aside>
  );
}
