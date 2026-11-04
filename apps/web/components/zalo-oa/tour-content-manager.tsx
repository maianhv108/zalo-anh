'use client';

import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Info,
  Check,
  Eye,
  MapPin,
  Calendar,
  Clock,
  Tag,
  ShieldCheck,
  FolderOpen,
  Filter,
  Layers,
  Image as ImageIcon,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchApi } from '@/lib/api';

interface TourContentPlanItem {
  id: string;
  month: string;
  stage: string;
  week: string;
  publishDate: string;
  suggestedTime: string;
  targetAudience: string;
  contentRole: string;
  pillar: string;
  destination: string;
  format: string;
  title: string;
  brief: string;
  cta: string;
  imageSourceRequirement: string;
  imageSuggestions: string;
  status: string;
}

interface DriveImageItem {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  webViewLink: string;
  thumbnailUrl: string;
  folderId: string;
  folderName: string;
  region: string;
}

interface RecommendedImage {
  file: DriveImageItem;
  score: number;
  confidence: 'HIGH' | 'MEDIUM' | 'NEEDS_REVIEW';
  statusLabel: 'Khớp chính xác địa điểm' | 'Khớp khu vực / thành phố' | 'Ảnh tiêu biểu toàn quốc' | 'Cần kiểm tra';
  reason: string;
  isHeroCandidate: boolean;
  isSelected?: boolean;
}

interface TourImageRecommendationResult {
  tour: TourContentPlanItem;
  matchedImages: RecommendedImage[];
  selectedImageIds: string[];
  summary: {
    primaryFolder: string;
    fallbackFolder?: string;
    totalMatched: number;
    highConfidenceCount: number;
    status: 'CONFIDENT' | 'NEEDS_REVIEW';
  };
}

interface GoogleStatus {
  auth?: {
    isConfigured: boolean;
    clientEmail: string | null;
    projectId: string | null;
    credentialsPath: string | null;
    scopes: string[];
    errorMessage?: string;
  };
  sheets: {
    connected: boolean;
    authMode: string;
    apiEnabled?: boolean;
    spreadsheetId: string;
    sheetName: string;
    rowCount: number;
    lastCheckedAt: string;
    message: string;
  };
  drive: {
    connected: boolean;
    authMode: string;
    apiEnabled?: boolean;
    folderId: string;
    folderName: string;
    totalRegions: number;
    totalFiles: number;
    lastCheckedAt: string;
    message: string;
  };
  overallReady: boolean;
  instructions: string[];
}

export function TourContentManager() {
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const [tours, setTours] = useState<TourContentPlanItem[]>([]);
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegionFilter, setSelectedRegionFilter] = useState<string>('ALL');

  const [recommendation, setRecommendation] = useState<TourImageRecommendationResult | null>(null);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [isLoadingRecommendation, setIsLoadingRecommendation] = useState(false);
  const [isSavingSelection, setIsSavingSelection] = useState(false);

  // Xem trước ảnh toàn màn hình
  const [previewImage, setPreviewImage] = useState<DriveImageItem | null>(null);

  // Tab duyệt thủ công ảnh từ thư mục khác
  const [isManualBrowseOpen, setIsManualBrowseOpen] = useState(false);
  const [folders, setFolders] = useState<any[]>([]);
  const [selectedBrowseFolder, setSelectedBrowseFolder] = useState<string>('Sydney');
  const [browseImages, setBrowseImages] = useState<DriveImageItem[]>([]);
  const [isLoadingBrowse, setIsLoadingBrowse] = useState(false);

  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(
    null,
  );

  // 1. Tải trạng thái kết nối Google
  const loadStatus = async () => {
    setIsCheckingStatus(true);
    try {
      const res = await fetchApi<GoogleStatus>('/tour-content/status');
      setStatus(res);
    } catch (e: any) {
      console.error(e);
      setNotification({ type: 'error', message: 'Không thể kiểm tra kết nối Google API.' });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // 2. Tải danh sách kế hoạch tour từ Sheets
  const loadTours = async () => {
    try {
      const res = await fetchApi<TourContentPlanItem[]>('/tour-content/plan');
      setTours(res || []);
      if (res && res.length > 0 && !selectedTourId) {
        setSelectedTourId(res[0].id);
      }
    } catch (e: any) {
      console.error(e);
      setNotification({ type: 'error', message: 'Không thể đọc bảng tính Google Sheets.' });
    }
  };

  // 3. Tải gợi ý ảnh cho tour được chọn
  const loadRecommendation = async (tourId: string) => {
    setIsLoadingRecommendation(true);
    try {
      const res = await fetchApi<TourImageRecommendationResult>(`/tour-content/recommend/${tourId}`);
      setRecommendation(res);
      setSelectedImageIds(res?.selectedImageIds || []);
    } catch (e: any) {
      console.error(e);
      setNotification({ type: 'error', message: `Lỗi đề xuất ảnh cho tour ${tourId}.` });
    } finally {
      setIsLoadingRecommendation(false);
    }
  };

  // 4. Tải danh mục thư mục Drive
  const loadFolders = async () => {
    try {
      const res = await fetchApi<any[]>('/tour-content/drive/folders');
      setFolders(res || []);
    } catch (e) {
      console.error(e);
    }
  };

  // 5. Tải ảnh thủ công theo khu vực
  const loadBrowseImages = async (region: string) => {
    setIsLoadingBrowse(true);
    try {
      const res = await fetchApi<DriveImageItem[]>(`/tour-content/drive/images?region=${encodeURIComponent(region)}`);
      setBrowseImages(res || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingBrowse(false);
    }
  };

  useEffect(() => {
    loadStatus();
    loadTours();
    loadFolders();
  }, []);

  useEffect(() => {
    if (selectedTourId) {
      loadRecommendation(selectedTourId);
    }
  }, [selectedTourId]);

  useEffect(() => {
    if (isManualBrowseOpen) {
      loadBrowseImages(selectedBrowseFolder);
    }
  }, [isManualBrowseOpen, selectedBrowseFolder]);

  // Bật/tắt chọn một ảnh
  const toggleSelectImage = (imageId: string) => {
    setSelectedImageIds((prev) =>
      prev.includes(imageId) ? prev.filter((id) => id !== imageId) : [...prev, imageId],
    );
  };

  // Lưu danh sách ảnh đã duyệt
  const handleSaveSelection = async () => {
    if (!selectedTourId) return;
    setIsSavingSelection(true);
    try {
      await fetchApi(`/tour-content/selection/${selectedTourId}`, {
        method: 'POST',
        body: JSON.stringify({ imageIds: selectedImageIds }),
      });
      setNotification({
        type: 'success',
        message: `Đã lưu thành công ${selectedImageIds.length} ảnh được duyệt cho tour ${selectedTourId}!`,
      });
    } catch (e: any) {
      setNotification({ type: 'error', message: e.message || 'Lỗi lưu danh sách ảnh.' });
    } finally {
      setIsSavingSelection(false);
    }
  };

  // Lọc tour
  const filteredTours = tours.filter((t) => {
    const q = searchQuery.toLowerCase();
    const matchQuery =
      t.title.toLowerCase().includes(q) ||
      t.destination.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q);
    if (!matchQuery) return false;
    if (selectedRegionFilter === 'ALL') return true;
    return t.destination.toLowerCase().includes(selectedRegionFilter.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Toast thông báo */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
              : notification.type === 'error'
              ? 'bg-rose-950/80 border-rose-500/50 text-rose-200'
              : 'bg-blue-950/80 border-blue-500/50 text-blue-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white text-xs">
            ✕
          </button>
        </div>
      )}

      {/* 1. KHU VỰC TRẠNG THÁI KẾT NỐI GOOGLE APIS */}
      <Card className="bg-[#0b1329]/80 border-[#1e293b] p-4 text-white shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Kết Nối Google Sheets & Google Drive
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-mono">
                  Read-Only API
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Đọc kế hoạch bài viết tour từ Google Sheets và tự động quét kho hình ảnh thực tế từ Google Drive
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInstructions(!showInstructions)}
              className="text-xs border-indigo-500/30 bg-indigo-950/30 text-indigo-300 hover:bg-indigo-900/40"
            >
              <Info className="w-3.5 h-3.5 mr-1 text-indigo-400" />
              {showInstructions ? 'Ẩn Hướng Dẫn Google Cloud' : 'Hướng Dẫn Cấu Hình'}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                loadStatus();
                loadTours();
                if (selectedTourId) loadRecommendation(selectedTourId);
              }}
              disabled={isCheckingStatus}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isCheckingStatus ? 'animate-spin' : ''}`} />
              Kiểm Tra Kết Nối Lại
            </Button>
          </div>
        </div>

        {/* 2 thẻ trạng thái nguồn dữ liệu */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
          {/* Card Google Sheets */}
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-xs text-white">Google Sheets (Kế Hoạch Tour)</span>
                {status?.sheets.connected ? (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Đã Kết Nối ({status.sheets.rowCount} Tour)
                  </span>
                ) : (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-semibold">
                    Chưa Kết Nối
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300">
                Thẻ bảng tính: <strong>{status?.sheets.sheetName || 'Zalo OA'}</strong> • Chế độ: <code className="text-amber-300 font-mono text-[10px]">{status?.sheets.authMode}</code>
              </p>
              <p className="text-[10px] text-slate-400 line-clamp-1">
                ID: <span className="font-mono text-slate-300">{status?.sheets.spreadsheetId}</span>
              </p>
            </div>
            <a
              href={`https://docs.google.com/spreadsheets/d/${status?.sheets.spreadsheetId}/edit#gid=122891847`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-indigo-400 text-xs p-1"
              title="Mở Google Sheet trên tab mới"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {/* Card Google Drive */}
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-blue-400" />
                <span className="font-bold text-xs text-white">Google Drive (Kho Ảnh HÌNH ẢNH)</span>
                {status?.drive.connected ? (
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                    Đã Kết Nối ({status.drive.totalFiles} Ảnh Thật)
                  </span>
                ) : (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-semibold">
                    Chưa Kết Nối
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300">
                Thư mục gốc: <strong>HÌNH ẢNH</strong> ({status?.drive.totalRegions || 8} khu vực: Sydney, Melbourne, NSW, QLD...)
              </p>
              <p className="text-[10px] text-slate-400 line-clamp-1">
                ID Thư mục: <span className="font-mono text-slate-300">{status?.drive.folderId}</span>
              </p>
            </div>
            <a
              href={`https://drive.google.com/drive/folders/${status?.drive.folderId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-blue-400 text-xs p-1"
              title="Mở thư mục Google Drive trên tab mới"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Banner trạng thái Service Account */}
        <div
          className={`mt-3 p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
            status?.auth?.isConfigured
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <ShieldCheck
              className={`w-5 h-5 shrink-0 ${status?.auth?.isConfigured ? 'text-emerald-400' : 'text-amber-400'}`}
            />
            <div>
              <span className="font-semibold text-xs text-white">
                {status?.auth?.isConfigured
                  ? `Service Account Đã Kích Hoạt: ${status.auth.clientEmail}`
                  : 'Chưa Cấu Hình Khóa Service Account (Đang Chạy Chế Độ Dự Phòng)'}
              </span>
              <span className="text-[11px] text-slate-400 block">
                {status?.auth?.isConfigured
                  ? `Đường dẫn khóa: ${status.auth.credentialsPath || 'Hệ thống'} • Quyền: Read-Only (Sheets & Drive)`
                  : 'Cần thêm đường dẫn file JSON vào biến GOOGLE_APPLICATION_CREDENTIALS trong file .env để chạy API chính thức.'}
              </span>
            </div>
          </div>
          <span
            className={`text-[10px] font-mono px-2.5 py-1 rounded-md border font-semibold shrink-0 self-start sm:self-auto ${
              status?.auth?.isConfigured
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
            }`}
          >
            {status?.auth?.isConfigured ? 'SERVICE_ACCOUNT' : 'FALLBACK_PUBLIC'}
          </span>
        </div>
        {showInstructions && status?.instructions && (
          <div className="mt-3 p-3.5 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-xs space-y-2 text-indigo-100">
            <div className="font-bold flex items-center gap-2 text-indigo-300 text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Các bước cấu hình Service Account Google Cloud (Để quản lý hạn ngạch chính thức):
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px]">
              {status.instructions.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ol>
            <p className="text-[10px] text-slate-400 pt-1 border-t border-indigo-500/20">
              🔒 <strong>Bảo mật:</strong> Toàn bộ yêu cầu Google API chỉ được thực thi phía backend (`apps/api`). Tuyệt đối không để lộ private key hay credential trên frontend.
            </p>
          </div>
        )}
      </Card>

      {/* 2. KHU VỰC DANH SÁCH TOUR & CHI TIẾT ĐỀ XUẤT ẢNH (MASTER-DETAIL LAYOUT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* CỘT TRÁI: DANH SÁCH 12 KẾ HOẠCH TOUR (4 CỘT) */}
        <div className="lg:col-span-4 space-y-3">
          <Card className="bg-[#0b1329]/80 border-[#1e293b] p-3.5 text-white shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2 font-bold text-xs text-white">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span>Kế Hoạch Tour ({filteredTours.length})</span>
              </div>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                Chiến Dịch 3 Tháng
              </span>
            </div>

            {/* Ô tìm kiếm & bộ lọc */}
            <div className="space-y-2 mb-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo tên tour, điểm đến..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px]">
                {['ALL', 'Sydney', 'Melbourne', 'Queensland', 'Perth', 'Toàn nước Úc'].map((reg) => (
                  <button
                    key={reg}
                    onClick={() => setSelectedRegionFilter(reg)}
                    className={`px-2 py-0.5 rounded-md whitespace-nowrap transition-all ${
                      selectedRegionFilter === reg
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'bg-slate-800/80 text-slate-400 hover:text-white'
                    }`}
                  >
                    {reg === 'ALL' ? 'Tất cả' : reg}
                  </button>
                ))}
              </div>
            </div>

            {/* Danh sách thẻ Tour */}
            <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
              {filteredTours.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Không tìm thấy tour phù hợp với bộ lọc.
                </div>
              ) : (
                filteredTours.map((t) => {
                  const isSelected = selectedTourId === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTourId(t.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-indigo-950/40 border-indigo-500/80 shadow-md shadow-indigo-600/20'
                          : 'bg-slate-900/50 border-slate-800/70 hover:border-slate-700 hover:bg-slate-900/80'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded">
                          {t.id}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{t.publishDate} {t.suggestedTime}</span>
                        </div>
                      </div>

                      <h4 className="text-xs font-bold text-white line-clamp-2 mb-1.5 leading-snug">
                        {t.title}
                      </h4>

                      <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-800/60">
                        <div className="flex items-center gap-1 text-slate-300 font-medium">
                          <MapPin className="w-3 h-3 text-rose-400" />
                          <span className="line-clamp-1">{t.destination}</span>
                        </div>
                        <span className="text-slate-400 font-mono text-[9px]">{t.stage}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* CỘT PHẢI: CHI TIẾT TOUR & KHO ẢNH GOOGLE DRIVE ĐỀ XUẤT (8 CỘT) */}
        <div className="lg:col-span-8 space-y-4">
          {isLoadingRecommendation ? (
            <Card className="bg-[#0b1329]/80 border-[#1e293b] p-12 text-center text-white shadow-xl flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
              <h4 className="font-bold text-sm text-white">Đang phân tích tour & quét ảnh Google Drive...</h4>
              <p className="text-xs text-slate-400 max-w-sm">
                Hệ thống đang đối chiếu tên địa danh, lịch trình và thư mục khu vực để đề xuất ảnh thực tế chính xác nhất.
              </p>
            </Card>
          ) : recommendation ? (
            <>
              {/* Thẻ tóm tắt thông tin tour đang chọn */}
              <Card className="bg-[#0b1329]/80 border-[#1e293b] p-4 text-white shadow-xl backdrop-blur-md space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-indigo-600 font-mono font-bold text-xs text-white">
                      {recommendation.tour.id}
                    </span>
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-rose-400" />
                      {recommendation.tour.destination}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">
                      Lịch đề xuất: <strong>{recommendation.tour.publishDate}</strong> lúc <strong>{recommendation.tour.suggestedTime}</strong>
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white mb-1.5 leading-snug">
                    {recommendation.tour.title}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                    <strong>Mô tả nội dung / Brief:</strong> {recommendation.tour.brief}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="p-2 bg-slate-900/40 rounded border border-slate-800/60 text-slate-300">
                    <span className="text-slate-400 block text-[10px]">Kêu gọi hành động (CTA):</span>
                    <strong>{recommendation.tour.cta}</strong>
                  </div>
                  <div className="p-2 bg-slate-900/40 rounded border border-slate-800/60 text-slate-300">
                    <span className="text-slate-400 block text-[10px]">Yêu cầu ảnh marketing:</span>
                    <strong>{recommendation.tour.imageSourceRequirement}</strong>
                  </div>
                </div>

                {recommendation.tour.imageSuggestions && (
                  <div className="p-2 bg-amber-950/20 border border-amber-500/30 rounded text-[11px] text-amber-200">
                    <span className="font-bold text-amber-300">Gợi ý từ Marketing:</span> {recommendation.tour.imageSuggestions}
                  </div>
                )}
              </Card>

              {/* Thẻ điều khiển & tóm tắt quy tắc tìm ảnh */}
              <Card className="bg-[#0b1329]/80 border-[#1e293b] p-4 text-white shadow-xl backdrop-blur-md">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-indigo-400" />
                      Ảnh Google Drive Đề Xuất Cho Tour Này ({recommendation.matchedImages.length})
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Thư mục ưu tiên: <strong>{recommendation.summary.primaryFolder}</strong>
                      {recommendation.summary.fallbackFolder && (
                        <span> • Mở rộng: <strong>{recommendation.summary.fallbackFolder}</strong></span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsManualBrowseOpen(!isManualBrowseOpen)}
                      className="text-xs border-slate-700 bg-slate-800/60 text-slate-200 hover:bg-slate-800 flex items-center gap-1.5"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                      {isManualBrowseOpen ? 'Đóng Kho Ảnh Thủ Công' : 'Duyệt Thêm Thư Mục Khác'}
                    </Button>

                    <Button
                      size="sm"
                      onClick={handleSaveSelection}
                      disabled={isSavingSelection}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {isSavingSelection ? 'Đang Lưu...' : `Lưu Đã Duyệt (${selectedImageIds.length})`}
                    </Button>
                  </div>
                </div>

                {/* Khung duyệt thêm ảnh từ các thư mục khác (khi admin cần đổi ảnh) */}
                {isManualBrowseOpen && (
                  <div className="mt-3 p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <FolderOpen className="w-4 h-4" />
                        Chọn ảnh từ thư mục khu vực bất kỳ:
                      </span>
                      <div className="flex items-center gap-1.5 overflow-x-auto text-[11px]">
                        {folders.map((f) => (
                          <button
                            key={f.folderName}
                            onClick={() => setSelectedBrowseFolder(f.folderName)}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                              selectedBrowseFolder === f.folderName
                                ? 'bg-amber-500 text-black font-bold shadow'
                                : 'bg-slate-800 text-slate-300 hover:text-white'
                            }`}
                          >
                            {f.folderName} ({f.count})
                          </button>
                        ))}
                      </div>
                    </div>

                    {isLoadingBrowse ? (
                      <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                        Đang tải ảnh từ {selectedBrowseFolder}...
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-64 overflow-y-auto p-1">
                        {browseImages.map((img) => {
                          const isSel = selectedImageIds.includes(img.id);
                          return (
                            <div
                              key={img.id}
                              onClick={() => toggleSelectImage(img.id)}
                              className={`group relative rounded-lg overflow-hidden border cursor-pointer transition-all ${
                                isSel
                                  ? 'border-emerald-500 ring-2 ring-emerald-500/50'
                                  : 'border-slate-800 hover:border-slate-600'
                              }`}
                            >
                              <img
                                src={img.thumbnailUrl}
                                alt={img.name}
                                className="w-full h-24 object-cover group-hover:scale-105 transition-all"
                                loading="lazy"
                              />
                              <div className="p-1.5 bg-slate-950/90 text-[10px] text-slate-300 truncate font-mono">
                                {img.name}
                              </div>
                              <div
                                className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white ${
                                  isSel ? 'bg-emerald-500' : 'bg-black/50 group-hover:bg-black/80'
                                }`}
                              >
                                {isSel ? <Check className="w-3 h-3" /> : '+'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* LƯỚI ẢNH ĐỀ XUẤT THEO QUY TẮC */}
                <div className="pt-3">
                  {recommendation.matchedImages.length === 0 ? (
                    <div className="py-12 text-center space-y-2">
                      <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                      <h5 className="font-bold text-sm text-white">Chưa xác định được ảnh khớp tự động</h5>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Hệ thống tuân thủ nguyên tắc không tự bịa ảnh. Bạn có thể bấm <strong>"Duyệt Thêm Thư Mục Khác"</strong> ở trên để tự chọn ảnh phù hợp.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {recommendation.matchedImages.map((rec) => {
                        const isSelected = selectedImageIds.includes(rec.file.id);
                        return (
                          <div
                            key={rec.file.id}
                            className={`rounded-xl border overflow-hidden transition-all flex flex-col justify-between ${
                              isSelected
                                ? 'bg-emerald-950/20 border-emerald-500 ring-2 ring-emerald-500/30'
                                : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                            }`}
                          >
                            {/* Khung ảnh xem trước */}
                            <div className="relative aspect-[16/10] bg-black overflow-hidden group">
                              <img
                                src={rec.file.thumbnailUrl}
                                alt={rec.file.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                                loading="lazy"
                              />

                              {/* Nhãn trạng thái khớp */}
                              <div className="absolute top-2 left-2 flex flex-col gap-1">
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold shadow-md ${
                                    rec.confidence === 'HIGH'
                                      ? 'bg-emerald-600 text-white'
                                      : rec.confidence === 'MEDIUM'
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-amber-600 text-white'
                                  }`}
                                >
                                  {rec.statusLabel}
                                </span>
                              </div>

                              {/* Nút xem to ảnh */}
                              <button
                                onClick={() => setPreviewImage(rec.file)}
                                className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-black/90 transition-all text-xs flex items-center gap-1"
                                title="Xem ảnh kích thước lớn"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {/* Nút mở drive */}
                              <a
                                href={rec.file.webViewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-slate-300 hover:text-white hover:bg-black/90 transition-all"
                                title="Mở file trên Google Drive"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>

                            {/* Thông tin & Lý do đề xuất */}
                            <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-[10px] text-slate-400">
                                  <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded">
                                    Thư mục: {rec.file.folderName}
                                  </span>
                                  <span className="font-bold text-amber-300">Điểm: {rec.score}</span>
                                </div>

                                <h5 className="font-bold text-xs text-white line-clamp-1" title={rec.file.name}>
                                  {rec.file.name}
                                </h5>

                                <p className="text-[11px] text-slate-300 bg-slate-950/40 p-2 rounded border border-slate-800/60 leading-relaxed">
                                  💡 <strong>Lý do:</strong> {rec.reason}
                                </p>
                              </div>

                              {/* Nút duyệt / bỏ chọn */}
                              <div className="pt-2">
                                <Button
                                  size="sm"
                                  onClick={() => toggleSelectImage(rec.file.id)}
                                  className={`w-full text-xs font-bold transition-all ${
                                    isSelected
                                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                      : 'bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white'
                                  }`}
                                >
                                  {isSelected ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 mr-1 text-white" />
                                      Đã Duyệt Cho Tour Này
                                    </>
                                  ) : (
                                    '+ Duyệt Dùng Ảnh Này'
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Card>
            </>
          ) : (
            <Card className="bg-[#0b1329]/80 border-[#1e293b] p-12 text-center text-slate-400 shadow-xl">
              Vui lòng chọn một tour ở danh sách bên trái để xem đề xuất ảnh Google Drive.
            </Card>
          )}
        </div>
      </div>

      {/* POPUP XEM TO ẢNH GOOGLE DRIVE */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="max-w-4xl w-full bg-[#0b1329] rounded-2xl border border-slate-700 overflow-hidden shadow-2xl space-y-3 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-400" />
                <span className="font-bold text-sm text-white">{previewImage.name}</span>
                <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                  {previewImage.folderName}
                </span>
              </div>
              <button
                onClick={() => setPreviewImage(null)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="relative aspect-[16/10] bg-black rounded-xl overflow-hidden flex items-center justify-center">
              <img
                src={previewImage.thumbnailUrl}
                alt={previewImage.name}
                className="max-w-full max-h-full object-contain"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-400 font-mono">
                ID Drive: {previewImage.id}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={previewImage.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Mở Trực Tiếp Trên Google Drive
                </a>
                <Button
                  size="sm"
                  onClick={() => {
                    toggleSelectImage(previewImage.id);
                  }}
                  className={`text-xs font-bold ${
                    selectedImageIds.includes(previewImage.id)
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {selectedImageIds.includes(previewImage.id) ? 'Bỏ Chọn Ảnh' : 'Duyệt Chọn Ảnh Này'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

