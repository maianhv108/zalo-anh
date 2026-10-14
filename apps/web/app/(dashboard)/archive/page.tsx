'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FolderArchive,
  Search,
  Filter,
  FileText,
  Image,
  Paperclip,
  Download,
  Trash2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { fetchApi } from '@/lib/api';
import { formatDate, formatFileSize } from '@/lib/utils';

export default function ArchivePage() {
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('');

  const loadAttachments = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedType) params.append('fileType', selectedType);

      const res = await fetchApi(`/attachments?${params.toString()}`);
      setAttachments(res || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAttachments();
  }, [search, selectedType]);

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa tệp này khỏi kho lưu trữ? Thao tác sẽ được ghi vào Audit Log.')) return;
    try {
      await fetchApi(`/attachments/${id}`, { method: 'DELETE' });
      loadAttachments();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-slate-900">Kho Lưu Trữ Tệp Tin & Dữ Liệu</h2>
            <DemoBadge />
          </div>
          <p className="text-sm text-slate-500">
            Quản lý tập trung các tài liệu, bảng báo giá, ảnh và tệp đính kèm được thu thập hợp lệ
          </p>
        </div>

        <Button variant="outline" onClick={loadAttachments}>
          <RefreshCw className="h-4 w-4" />
          <span>Làm mới kho</span>
        </Button>
      </div>

      {/* Filters Bar */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm theo tên file..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
          >
            <option value="">Tất cả loại tệp</option>
            <option value="PDF">Tài liệu PDF</option>
            <option value="IMAGE">Hình ảnh</option>
            <option value="FILE">Tệp khác</option>
          </select>
        </div>
      </Card>

      {/* Attachments List */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Tên tệp tin</th>
                <th className="py-3 px-4">Loại & Kích thước</th>
                <th className="py-3 px-4">Khách hàng liên quan</th>
                <th className="py-3 px-4">Nguồn dữ liệu</th>
                <th className="py-3 px-4">Thời gian lưu</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Đang tải dữ liệu tệp lưu trữ...
                  </td>
                </tr>
              ) : attachments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Không tìm thấy tệp nào
                  </td>
                </tr>
              ) : (
                attachments.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          {att.fileType === 'IMAGE' ? <Image className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                        </div>
                        <span className="font-semibold text-slate-900">{att.fileName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-700">{att.fileType}</span>
                      <span className="text-[11px] text-slate-400 ml-1.5">({formatFileSize(att.fileSize)})</span>
                    </td>
                    <td className="py-3 px-4">
                      {att.customer ? (
                        <Link href={`/customers/${att.customer.id}`} className="font-medium text-blue-600 hover:underline">
                          {att.customer.fullName} ({att.customer.code})
                        </Link>
                      ) : (
                        <span className="text-slate-400 italic">Không liên kết</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        {att.sourceType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{formatDate(att.createdAt)}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <a href={`http://localhost:4000/api/v1/attachments/${att.id}/download`} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="h-7 text-xs px-2.5">
                            <Download className="h-3 w-3" />
                            <span>Tải về</span>
                          </Button>
                        </a>

                        <Button size="sm" variant="ghost" onClick={() => handleDelete(att.id)} className="h-7 text-xs text-rose-600 hover:bg-rose-50 px-2">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
