import React from 'react';
import { AlertCircle } from 'lucide-react';

interface DemoBadgeProps {
  className?: string;
  size?: 'sm' | 'md';
}

export function DemoBadge({ className = '', size = 'sm' }: DemoBadgeProps) {
  const isSm = size === 'sm';
  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-full border border-amber-300 bg-amber-50 text-amber-800 ${
        isSm ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      } ${className}`}
      title="Dữ liệu mẫu (Demo Data) phục vụ thử nghiệm giao diện và quy trình CRM"
    >
      <AlertCircle className={isSm ? 'h-3 w-3 text-amber-600' : 'h-4 w-4 text-amber-600'} />
      DEMO DATA
    </span>
  );
}
