'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  MessageSquare,
  Building2,
  FolderArchive,
  Send,
  BarChart3,
  ScrollText,
  Settings,
  ChevronRight,
  Share2,
  Radio,
  FileSpreadsheet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ui/theme-toggle';

interface NavItem {
  name: string;
  href: string;
  icon: any;
  isOa?: boolean;
  badge?: string;
  badgeColor?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navigationSections: NavSection[] = [
  {
    title: 'Kênh Zalo & Kết nối',
    items: [
      { name: 'Tổng quan hệ thống', href: '/dashboard', icon: LayoutDashboard },
      {
        name: 'Trung tâm kết nối Zalo',
        href: '/connections',
        icon: Radio,
        badge: 'Live',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-600/40',
      },
      { name: 'Zalo OA Doanh Nghiệp', href: '/zalo-oa', icon: Building2, isOa: true },
    ],
  },
  {
    title: 'Quản lý Đăng bài & Nội dung',
    items: [
      {
        name: 'Trung tâm Đăng bài',
        href: '/posts',
        icon: Share2,
        badge: 'Hub',
        badgeColor: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-600/40',
      },
      { name: 'Đăng bài Sale (Cá nhân)', href: '/posts?tab=personal', icon: Users },
      { name: 'Đăng bài Zalo OA (Hẹn giờ)', href: '/posts?tab=oa', icon: Building2, isOa: true },
      { name: 'Kế hoạch Tour & Ảnh Drive', href: '/posts?tab=tour', icon: FileSpreadsheet, isOa: true },
      { name: 'Duyệt bài viết Tour', href: '/posts?tab=workflow', icon: ScrollText, isOa: true },
    ],
  },
  {
    title: 'Quản lý Sale & Khách hàng',
    items: [
      { name: 'Khách hàng CRM', href: '/customers', icon: UserCheck },
      { name: 'Hội thoại Sale (Cá nhân)', href: '/inbox', icon: MessageSquare },
      { name: 'Nhân viên Sale', href: '/sales', icon: Users },
      { name: 'Kho lưu trữ tài liệu', href: '/archive', icon: FolderArchive },
    ],
  },
  {
    title: 'Hệ thống & Báo cáo',
    items: [
      { name: 'Chiến dịch gửi tin', href: '/campaigns', icon: Send },
      { name: 'Báo cáo kinh doanh', href: '/reports', icon: BarChart3 },
      { name: 'Nhật ký hoạt động', href: '/audit-logs', icon: ScrollText },
      { name: 'Cài đặt hệ thống', href: '/settings', icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [currentQuery, setCurrentQuery] = React.useState('');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentQuery(window.location.search);
      const handleLocationChange = () => {
        setCurrentQuery(window.location.search);
      };
      window.addEventListener('popstate', handleLocationChange);
      return () => window.removeEventListener('popstate', handleLocationChange);
    }
  }, [pathname]);

  return (
    <aside className="w-64 bg-white text-slate-800 border-r border-slate-200 dark:bg-[#060a14] dark:text-slate-200 dark:border-[#162035] flex flex-col shrink-0 select-none shadow-sm dark:shadow-2xl transition-colors">
      {/* Brand Header with Australia & Vietnam Flags */}
      <div className="h-20 flex items-center px-4 gap-3 border-b border-slate-200 dark:border-[#162035] bg-slate-50/80 dark:bg-[#04070e] transition-colors">
        <img
          src="/logo.jpg"
          alt="TourLuk Tool Zalo"
          className="h-11 w-11 rounded-full border-2 border-red-500/60 object-cover shadow-md shadow-red-500/20 shrink-0"
        />
        <div className="overflow-hidden flex-1">
          <h1 className="text-sm font-black tracking-wider truncate text-slate-900 dark:text-white">
            TOURLUK CRM
          </h1>
          {/* Cờ Úc 🇦🇺 và Cờ Việt Nam 🇻🇳 theo yêu cầu */}
          <div className="flex items-center gap-1.5 mt-1">
            <span
              title="Tour Úc - Chuyên tour & dịch vụ Úc"
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800/60 shadow-xs"
            >
              <span className="text-xs leading-none">🇦🇺</span>
              <span>Úc</span>
            </span>
            <span
              title="Khách hàng Việt Nam & Đội ngũ Sale VN"
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-200 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800/60 shadow-xs"
            >
              <span className="text-xs leading-none">🇻🇳</span>
              <span>VN</span>
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold ml-0.5">
              • Zalo
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Menu with Clean Sections */}
      <div className="flex-1 py-3 px-3 space-y-4 overflow-y-auto">
        {navigationSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            {/* Section Header */}
            <div className="px-3 pt-1 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800/50 mb-1">
              {section.title}
            </div>

            {/* Navigation Items */}
            {section.items.map((item) => {
              let isActive = false;
              if (item.href.includes('?')) {
                const [targetPath, targetQuery] = item.href.split('?');
                isActive = pathname === targetPath && currentQuery === `?${targetQuery}`;
              } else if (item.href === '/posts') {
                isActive = pathname === '/posts' && (!currentQuery || currentQuery === '?tab=all');
              } else {
                isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}`));
              }
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    if (item.href.includes('?')) {
                      setCurrentQuery(item.href.substring(item.href.indexOf('?')));
                    } else {
                      setCurrentQuery('');
                    }
                  }}
                  className={cn(
                    'flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all group',
                    isActive
                      ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white font-bold shadow-md shadow-red-600/25'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/90 dark:hover:bg-[#121c32]/80 font-medium',
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={cn(
                        'h-4 w-4 shrink-0 transition-colors',
                        isActive
                          ? 'text-white'
                          : item.isOa
                          ? 'text-blue-600 dark:text-blue-400 group-hover:scale-110'
                          : 'text-slate-500 dark:text-slate-400 group-hover:text-red-500 dark:group-hover:text-red-400 group-hover:scale-110',
                      )}
                    />
                    <span className="truncate">{item.name}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {item.badge && (
                      <span
                        className={cn(
                          'px-1.5 py-0.2 rounded text-[9px] font-bold border',
                          isActive ? 'bg-white/20 text-white border-white/30' : item.badgeColor,
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                    {item.isOa && (
                      <span
                        className={cn(
                          'px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider border',
                          isActive
                            ? 'bg-white/20 text-white border-white/30'
                            : 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30',
                        )}
                      >
                        OA
                      </span>
                    )}
                    {isActive && <ChevronRight className="h-3.5 w-3.5 text-white/90" />}
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* System Status Footer & Quick Theme Toggle */}
      <div className="p-3 border-t border-slate-200 dark:border-[#162035] bg-slate-50/80 dark:bg-[#04070e] transition-colors">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-800 dark:text-slate-300 text-[11px]">
              PostgreSQL & API v1
            </span>
          </div>
          <ThemeToggle showLabel={false} />
        </div>
        <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>Kênh Zalo Realtime:</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">Đang kết nối</span>
        </div>
      </div>
    </aside>
  );
}
