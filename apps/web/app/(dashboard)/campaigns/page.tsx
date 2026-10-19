'use client';

import React, { useState, useEffect } from 'react';
import {
  Send,
  Plus,
  Play,
  XCircle,
  AlertTriangle,
  CheckCircle2,
  Users,
  Eye,
  RefreshCw,
  Lock,
  Sparkles,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { DemoBadge } from '@/components/ui/demo-badge';
import { fetchApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { CampaignStatus, CampaignStatusLabels } from '@sales-zalo/shared';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Wizard Modal
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    content: '',
    targetFilter: {
      status: ['CONVERTED', 'CONSULTING'],
      assignedToId: '',
    },
  });
  const [previewData, setPreviewData] = useState<any>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [gatingNotice, setGatingNotice] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [camps, salesRes] = await Promise.all([
        fetchApi('/campaigns'),
        fetchApi('/users?role=SALE'),
      ]);
      setCampaigns(camps || []);
      setSales(salesRes.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleNextStep = async () => {
    if (wizardStep === 1) {
      if (!newCampaign.name || !newCampaign.content) {
        alert('Vui lòng nhập tên chiến dịch và nội dung tin nhắn!');
        return;
      }
      setWizardStep(2);
    } else if (wizardStep === 2) {
      setIsPreviewLoading(true);
      try {
        const preview = await fetchApi('/campaigns/preview', {
          method: 'POST',
          body: JSON.stringify(newCampaign),
        });
        setPreviewData(preview);
        setWizardStep(3);
      } catch (err: any) {
        alert(err.message);
      } finally {
        setIsPreviewLoading(false);
      }
    }
  };

  const handleCreateDraft = async () => {
    try {
      await fetchApi('/campaigns', {
        method: 'POST',
        body: JSON.stringify(newCampaign),
      });
      setIsWizardOpen(false);
      setWizardStep(1);
      setNewCampaign({ name: '', content: '', targetFilter: { status: ['CONVERTED', 'CONSULTING'], assignedToId: '' } });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDryRun = async (campaignId: string) => {
    try {
      const res = await fetchApi(`/campaigns/${campaignId}/dry-run`, { method: 'POST' });
      alert(res.message);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleConfirmSend = async (campaignId: string) => {
    setGatingNotice(null);
    try {
      await fetchApi(`/campaigns/${campaignId}/confirm-send`, { method: 'POST' });
    } catch (err: any) {
      // Hiển thị thông báo gating giải thích rõ ràng cho người dùng
      setGatingNotice(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-slate-900">Chiến Dịch Gửi Tin (Campaign Management)</h2>
            <DemoBadge />
          </div>
          <p className="text-sm text-slate-500">
            Soạn thảo chiến dịch, xem trước tệp người nhận, phát hiện trùng lặp và kiểm soát Gating gửi tin
          </p>
        </div>

        <Button onClick={() => { setIsWizardOpen(true); setWizardStep(1); }}>
          <Plus className="h-4 w-4" />
          <span>Tạo chiến dịch mới</span>
        </Button>
      </div>

      {/* Gating Rule Card */}
      <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/90 flex items-start gap-3 text-xs text-amber-900">
        <Lock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-sm">Chính sách Gating cho Module Chiến Dịch:</p>
          <p className="mt-1">
            Chức năng gửi tin hàng loạt (BULK_SEND) chỉ cho phép thực thi gửi thật khi phương thức tích hợp đã được kiểm chứng và xác minh. Đối với Zalo cá nhân, do không có API công khai hỗ trợ gửi hàng loạt và tránh vi phạm chính sách chống spam, hệ thống hỗ trợ tạo bản nháp (DRAFT), chạy thử nghiệm (DRY-RUN) và kiểm tra tệp người nhận, đồng thời <strong>khóa hoàn toàn nút gửi thật</strong>.
          </p>
        </div>
      </div>

      {gatingNotice && (
        <div className="p-4 rounded-xl border border-rose-300 bg-rose-50 text-rose-900 text-xs flex items-start gap-3 animate-fade-in">
          <XCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm">Thông báo từ Backend Gating Controller:</p>
            <p className="mt-1 font-mono text-[11px]">{gatingNotice}</p>
          </div>
        </div>
      )}

      {/* Campaigns List Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Tên chiến dịch</th>
                <th className="py-3 px-4">Nội dung xem trước</th>
                <th className="py-3 px-4 text-center">Người nhận dự kiến</th>
                <th className="py-3 px-4">Người tạo</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4">Ngày tạo</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Đang tải danh sách chiến dịch...
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Chưa có chiến dịch nào được tạo
                  </td>
                </tr>
              ) : (
                campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{c.name}</td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-500">{c.content}</td>
                    <td className="py-3 px-4 text-center font-bold text-blue-600 text-sm">{c.totalRecipients}</td>
                    <td className="py-3 px-4 font-medium text-slate-700">{c.createdBy?.name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">
                        {CampaignStatusLabels[c.status as CampaignStatus] || c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{formatDate(c.createdAt)}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDryRun(c.id)}
                          className="h-7 text-xs px-2.5"
                          title="Chạy thử nghiệm mô phỏng"
                        >
                          <Play className="h-3 w-3 text-indigo-600" />
                          <span>Dry-run</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleConfirmSend(c.id)}
                          className="h-7 text-xs px-2.5 bg-rose-600 hover:bg-rose-700"
                          title="Thử nghiệm gửi thật (Sẽ bị chặn an toàn)"
                        >
                          <Send className="h-3 w-3" />
                          <span>Gửi thật (Gated)</span>
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

      {/* Campaign Creation Wizard Modal */}
      <Modal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        title={`Tạo chiến dịch gửi tin — Bước ${wizardStep}/3`}
        description={
          wizardStep === 1
            ? 'Bước 1: Nhập tên và nội dung tin nhắn'
            : wizardStep === 2
            ? 'Bước 2: Lọc đối tượng khách hàng nhận tin'
            : 'Bước 3: Xem trước người nhận và phát hiện số điện thoại trùng'
        }
      >
        <div className="space-y-4">
          {/* STEP 1: CONTENT */}
          {wizardStep === 1 && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tên chiến dịch *</label>
                <input
                  type="text"
                  required
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  placeholder="Ví dụ: Tri ân khách hàng tháng 10"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nội dung tin nhắn *</label>
                <textarea
                  required
                  rows={4}
                  value={newCampaign.content}
                  onChange={(e) => setNewCampaign({ ...newCampaign, content: e.target.value })}
                  placeholder="Kính gửi Quý khách hàng..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
                />
                <p className="text-[11px] text-slate-400 mt-1">Hỗ trợ tối đa 500 ký tự.</p>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={handleNextStep}>Tiếp tục: Chọn đối tượng →</Button>
              </div>
            </div>
          )}

          {/* STEP 2: AUDIENCE FILTER */}
          {wizardStep === 2 && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Lọc theo trạng thái khách hàng</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {['NEW', 'CONTACTED', 'CONSULTING', 'WAITING_REPLY', 'CONVERTED'].map((st) => (
                    <label key={st} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newCampaign.targetFilter.status.includes(st as any)}
                        onChange={(e) => {
                          const current = newCampaign.targetFilter.status;
                          if (e.target.checked) {
                            setNewCampaign({
                              ...newCampaign,
                              targetFilter: { ...newCampaign.targetFilter, status: [...current, st as any] },
                            });
                          } else {
                            setNewCampaign({
                              ...newCampaign,
                              targetFilter: { ...newCampaign.targetFilter, status: current.filter((item) => item !== st) },
                            });
                          }
                        }}
                        className="rounded text-blue-600"
                      />
                      <span>{st}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sale phụ trách (Tùy chọn)</label>
                <select
                  value={newCampaign.targetFilter.assignedToId}
                  onChange={(e) =>
                    setNewCampaign({
                      ...newCampaign,
                      targetFilter: { ...newCampaign.targetFilter, assignedToId: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="">Tất cả nhân viên Sale</option>
                  {sales.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={() => setWizardStep(1)}>← Quay lại</Button>
                <Button onClick={handleNextStep} isLoading={isPreviewLoading}>Xem trước danh sách →</Button>
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW & DEDUPLICATION */}
          {wizardStep === 3 && previewData && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="text-xl font-bold text-blue-700">{previewData.totalFound}</div>
                  <div className="text-[11px] text-slate-500">Khách tìm thấy</div>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <div className="text-xl font-bold text-emerald-700">{previewData.uniqueCount}</div>
                  <div className="text-[11px] text-slate-500">Số điện thoại duy nhất</div>
                </div>
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                  <div className="text-xl font-bold text-rose-700">{previewData.duplicateCount}</div>
                  <div className="text-[11px] text-slate-500">Trùng lặp đã loại</div>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-700 block mb-1">Mẫu 10 khách hàng sẽ nhận tin:</span>
                <div className="max-h-40 overflow-y-auto space-y-1 bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
                  {previewData.sampleRecipients.map((c: any) => (
                    <div key={c.id} className="flex justify-between p-1.5 bg-white rounded border border-slate-100">
                      <span className="font-medium text-slate-900">{c.fullName}</span>
                      <span className="text-slate-500">{c.phone}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                {previewData.gatingStatus.reason}
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={() => setWizardStep(2)}>← Quay lại</Button>
                <Button onClick={handleCreateDraft}>Lưu bản nháp chiến dịch</Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
