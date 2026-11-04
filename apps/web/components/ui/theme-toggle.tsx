'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';

interface ThemeToggleProps {
  showLabel?: boolean;
  className?: string;
}

export function ThemeToggle({ showLabel = false, className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={`relative inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
        isDark
          ? 'bg-slate-900/80 border-slate-700/80 text-amber-300 hover:bg-slate-800 hover:border-amber-400/50 shadow-sm'
          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-xs'
      } ${className}`}
      title={isDark ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
      aria-label="Chuyển đổi giao diện Sáng / Tối"
    >
      <div className="relative flex items-center justify-center">
        {isDark ? (
          <Sun className="h-4 w-4 text-amber-400 animate-fade-in transition-transform group-hover:rotate-45" />
        ) : (
          <Moon className="h-4 w-4 text-indigo-600 animate-fade-in" />
        )}
      </div>

      {showLabel && (
        <span className="font-medium text-xs">
          {isDark ? 'Chế độ Sáng' : 'Chế độ Tối'}
        </span>
      )}
    </button>
  );
}

