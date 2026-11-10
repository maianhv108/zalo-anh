'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Smartphone,
  Eye,
  Edit3,
  Send,
  Calendar,
  Clock,
  MapPin,
  Tag,
  Search,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Check,
  X,
  MessageCircle,
  Share2,
  Layers,
  Image as ImageIcon,
  ThumbsUp,
  Award,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchApi } from '@/lib/api';

export type TourOaArticleStatus = 'PENDING_APPROVAL' | 'REVISED_PENDING' | 'APPROVED' | 'PUBLISHED';

export interface RevisionHistoryItem {
  revisionNumber: number;
  requestedAt: string;
  requestedNote: string;
  revisedAt: string;
  revisedSummary: string;
}

export interface TourOaArticle {
  id: string;
  tourId: string;
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
  hook: string;
  brief: string;
  cta: string;
  keywords: string;
  content: string;
  excerpt: string;
  status: TourOaArticleStatus;
  coverImage?: {
    id: string;
    name: string;
    thumbnailUrl: string;
    webViewLink: string;
    region: string;
  };
  galleryImages: Array<{
    id: string;
    name: string;
    thumbnailUrl: string;
    webViewLink: string;
    region: string;
  }>;
  revisionHistory: RevisionHistoryItem[];
  revisionCount: number;
  lastRevisionNote?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  publishedAt?: string;
  zaloArticleId?: string;
  zaloArticleUrl?: string;
}

export function TourArticleWorkflow() {
  const [activeTab, setActiveTab] = useState<'PENDING_APPROVAL' | 'REVISED_PENDING' | 'APPROVED' | 'ALL'>(
    'PENDING_APPROVAL',
  );
  const [articles, setArticles] = useState<TourOaArticle[]>([]);
  const [counts, setCounts] = useState({
    total: 0,
    pendingApproval: 0,
    revisedPending: 0,
    approved: 0,
  });
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<TourOaArticle | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Modal Yêu cầu sửa
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [revisionNote, setRevisionNote] = useState('');

  // Modal Tự chỉnh sửa nội dung trực tiếp
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editHook, setEditHook] = useState('');
  const [editContent, setEditContent] = useState('');

  // Xem trước ảnh lớn
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Trạng thái tô đen đoạn văn bản để AI viết lại (Inline Regenerate)
  const [highlightedText, setHighlightedText] = useState<string>('');
  const [selectionCoords, setSelectionCoords] = useState<{ x: number; y: number } | null>(null);
  const [isRegenModalOpen, setIsRegenModalOpen] = useState(false);
  const [regenInstruction, setRegenInstruction] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [recentlyRewrittenText, setRecentlyRewrittenText] = useState<string | null>(null);

  // Toast thông báo
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(
    null,
  );

  // 1. Tải danh sách bài viết từ backend
  const loadArticles = async (statusTab?: string, keepArticleId?: string | null) => {
    setIsLoading(true);
    try {
      const tab = statusTab || activeTab;
      const res = await fetchApi<{
        articles: TourOaArticle[];
        counts: { total: number; pendingApproval: number; revisedPending: number; approved: number };
      }>(`/tour-content/articles?status=${tab}&search=${encodeURIComponent(searchQuery)}`);

      setArticles(res.articles || []);
      setCounts(res.counts || { total: 0, pendingApproval: 0, revisedPending: 0, approved: 0 });

      const targetId = keepArticleId || selectedArticleId;
      // Giữ đúng bài đang chọn hoặc bài vừa sửa (không nhảy về bài đầu tiên)
      if (res.articles && res.articles.length > 0) {
        if (targetId && res.articles.some((a) => a.id === targetId)) {
          setSelectedArticleId(targetId);
          const current = res.articles.find((a) => a.id === targetId);
          if (current) setSelectedArticle(current);
        } else {
          setSelectedArticleId(res.articles[0].id);
          setSelectedArticle(res.articles[0]);
        }
      } else {
        setSelectedArticle(null);
      }
    } catch (e: any) {
      console.error(e);
      setNotification({ type: 'error', message: 'Không thể tải danh sách bài viết Zalo OA.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadArticles(activeTab);
  }, [activeTab]);

  // Cập nhật selectedArticle khi selectedArticleId thay đổi
  useEffect(() => {
    if (selectedArticleId) {
      const found = articles.find((a) => a.id === selectedArticleId);
      if (found) setSelectedArticle(found);
    }
  }, [selectedArticleId, articles]);

  // 2. Thao tác DUYỆT BÀI -> Chuyển sang "Đã duyệt đăng bài" và tự động đăng lên Zalo OA
  const handleApprove = async (articleId: string) => {
    setIsActionLoading(true);
    try {
      const updated = await fetchApi<TourOaArticle>(`/tour-content/articles/${articleId}/approve`, {
        method: 'POST',
      });
      const publishedText = updated?.zaloArticleUrl
        ? ` Đã tự động xuất bản trực tiếp lên Zalo OA TourLuk!`
        : ` Bài đã được lưu vào danh mục "Đã Duyệt Đăng Bài".`;
      setNotification({
        type: 'success',
        message: `✅ Đã duyệt thành công bài viết ${articleId}!${publishedText}`,
      });
      // Tự động chuyển tab sang 'APPROVED' để chị nhìn thấy ngay bài vừa duyệt
      setActiveTab('APPROVED');
      await loadArticles('APPROVED', articleId);
    } catch (e: any) {
      setNotification({ type: 'error', message: e.message || 'Lỗi khi duyệt bài viết.' });
    } finally {
      setIsActionLoading(false);
    }
  };

  // Thao tác đăng bài lên Zalo OA thủ công cho bài đã duyệt
  const handlePublishToOa = async (articleId: string) => {
    setIsActionLoading(true);
    try {
      const res = await fetchApi<{ success: boolean; zaloArticleUrl?: string; message?: string }>(
        `/tour-content/articles/${articleId}/publish-oa`,
        { method: 'POST' }
      );
      if (res?.success) {
        setNotification({
          type: 'success',
          message: `🎉 Đã xuất bản thành công bài viết ${articleId} lên Zalo OA TourLuk!`,
        });
        await loadArticles(undefined, articleId);
      } else {
        setNotification({ type: 'error', message: res?.message || 'Không thể đăng lên Zalo OA' });
      }
    } catch (e: any) {
      setNotification({ type: 'error', message: e.message || 'Lỗi khi đăng lên Zalo OA' });
    } finally {
      setIsActionLoading(false);
    }
  };

  // 3. Thao tác YÊU CẦU SỬA -> Tự động sửa và chuyển sang "Chờ duyệt lại"
  const handleSubmitRevision = async () => {
    if (!selectedArticleId || !revisionNote.trim()) {
      setNotification({ type: 'error', message: 'Vui lòng nhập ghi chú yêu cầu sửa.' });
      return;
    }
    setIsActionLoading(true);
    try {
      const updated = await fetchApi<TourOaArticle>(`/tour-content/articles/${selectedArticleId}/request-revision`, {
        method: 'POST',
        body: JSON.stringify({ revisionNote }),
      });
      setIsRevisionModalOpen(false);
      setRevisionNote('');
      setNotification({
        type: 'success',
        message: `🔄 Hệ thống đã tự động sửa bài ${selectedArticleId} theo yêu cầu và chuyển sang mục "Chờ Duyệt Lại"!`,
      });
      // Tự động chuyển tab sang Chờ Duyệt Lại để chị kiểm tra ngay
      setActiveTab('REVISED_PENDING');
      await loadArticles('REVISED_PENDING', selectedArticleId);
    } catch (e: any) {
      setNotification({ type: 'error', message: e.message || 'Lỗi khi gửi yêu cầu sửa bài.' });
    } finally {
      setIsActionLoading(false);
    }
  };

  // 3.1. Bắt sự kiện bôi đen (tô đen) đoạn văn bản
  const handleSelectionChange = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      return;
    }
    const text = selection.toString().trim();
    if (text.length >= 6) {
      setHighlightedText(text);
      try {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSelectionCoords({
          x: rect.left + rect.width / 2,
          y: rect.top,
        });
      } catch {}
    }
  };

  // 3.2. Thao tác viết lại đoạn văn bản được chọn bằng AI
  const handleRegenerateSelection = async (instructionToUse?: string) => {
    if (!selectedArticleId || !highlightedText.trim()) {
      setNotification({ type: 'error', message: 'Vui lòng chọn hoặc tô đen đoạn văn cần sửa.' });
      return;
    }
    const instruction = (instructionToUse || regenInstruction).trim();
    setIsRegenerating(true);
    try {
      const res = await fetchApi<{
        article: TourOaArticle;
        originalText: string;
        rewrittenText: string;
        message: string;
      }>(`/tour-content/articles/${selectedArticleId}/regenerate-selection`, {
        method: 'POST',
        body: JSON.stringify({
          selectedText: highlightedText,
          instruction,
        }),
      });

      if (res?.article) {
        setSelectedArticle(res.article);
        setRecentlyRewrittenText(res.rewrittenText);
        setNotification({
          type: 'success',
          message: `✨ Đã thay thế trực tiếp đoạn văn mới vào bài viết!`,
        });
        setIsRegenModalOpen(false);
        setHighlightedText('');
        setSelectionCoords(null);
        setRegenInstruction('');
        await loadArticles(undefined, res.article.id);

        // Giữ hiệu ứng highlight 20s để chị thấy rõ đoạn văn vừa được thay thế
        setTimeout(() => setRecentlyRewrittenText(null), 20000);
      }
    } catch (e: any) {
      setNotification({ type: 'error', message: e.message || 'Lỗi khi viết lại đoạn văn.' });
    } finally {
      setIsRegenerating(false);
    }
  };

  // 4. Mở modal chỉnh sửa thủ công
  const openEditModal = () => {
    if (!selectedArticle) return;
    setEditTitle(selectedArticle.title);
    setEditHook(selectedArticle.hook);
    setEditContent(selectedArticle.content);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedArticleId) return;
    setIsActionLoading(true);
    try {
      const updated = await fetchApi<TourOaArticle>(`/tour-content/articles/${selectedArticleId}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: editTitle,
          hook: editHook,
          content: editContent,
        }),
      });
      setIsEditModalOpen(false);
      setNotification({ type: 'success', message: 'Đã lưu chỉnh sửa nội dung bài viết thành công!' });
      await loadArticles(undefined, selectedArticleId);
    } catch (e: any) {
      setNotification({ type: 'error', message: e.message || 'Lỗi khi lưu chỉnh sửa.' });
    } finally {
      setIsActionLoading(false);
    }
  };

  // 5. Tự động soạn thảo lại từ Sheet & Drive
  const handleRegenerateAll = async () => {
    if (!confirm('Bạn có chắc muốn tự động soạn thảo lại toàn bộ 12 bài viết từ Google Sheets & Google Drive?')) {
      return;
    }
    setIsActionLoading(true);
    try {
      await fetchApi('/tour-content/articles/generate-all', { method: 'POST' });
      setNotification({
        type: 'success',
        message: 'Đã tạo mới và đồng bộ lại 12 bài viết Zalo OA từ Google Sheets & Drive!',
      });
      setActiveTab('PENDING_APPROVAL');
      await loadArticles('PENDING_APPROVAL');
    } catch (e: any) {
      setNotification({ type: 'error', message: e.message || 'Lỗi khi tạo mới bài viết.' });
    } finally {
      setIsActionLoading(false);
    }
  };

  // Màu sắc badge theo điểm đến
  const getDestinationBadgeColor = (dest: string) => {
    if (dest.includes('Sydney')) return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    if (dest.includes('Melbourne')) return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    if (dest.includes('Perth')) return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    if (dest.includes('Queensland') || dest.includes('Brisbane'))
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
  };

  return (
    <div className="space-y-5">
      {/* Toast thông báo */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium shadow-lg transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
              : notification.type === 'error'
              ? 'bg-rose-950/80 border-rose-500/50 text-rose-200'
              : 'bg-blue-950/80 border-blue-500/50 text-blue-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white text-xs ml-4">
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🌟 THANH ĐIỀU HƯỚNG WORKFLOW 3 TAB CHÍNH */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-[#0b1329]/90 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm dark:shadow-xl backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        {/* Nhóm 3 Tab quy trình */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tab 1: Chờ Duyệt */}
          <button
            onClick={() => setActiveTab('PENDING_APPROVAL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'PENDING_APPROVAL'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 scale-105'
                : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200/80 dark:bg-slate-900/80 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Chờ Duyệt</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                activeTab === 'PENDING_APPROVAL' ? 'bg-black/30 text-white' : 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400'
              }`}
            >
              {counts.pendingApproval}
            </span>
          </button>

          {/* Tab 2: Chờ Duyệt Lại (Những bài đã sửa theo yêu cầu) */}
          <button
            onClick={() => setActiveTab('REVISED_PENDING')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'REVISED_PENDING'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-105'
                : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200/80 dark:bg-slate-900/80 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Chờ Duyệt Lại</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                activeTab === 'REVISED_PENDING' ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300'
              }`}
            >
              {counts.revisedPending}
            </span>
          </button>

          {/* Tab 3: Đã Duyệt Đăng Bài */}
          <button
            onClick={() => setActiveTab('APPROVED')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'APPROVED'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-105'
                : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200/80 dark:bg-slate-900/80 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Đã Duyệt Đăng Bài</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                activeTab === 'APPROVED' ? 'bg-white/20 text-white' : 'bg-emerald-500/20 text-emerald-300'
              }`}
            >
              {counts.approved}
            </span>
          </button>

          {/* Tab 4: Tất Cả */}
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'ALL'
                ? 'bg-slate-900 text-white border border-slate-700 dark:bg-slate-800'
                : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100/80 dark:bg-transparent border border-slate-200 dark:border-transparent'
            }`}
          >
            Tất Cả ({counts.total})
          </button>
        </div>

        {/* Thanh tìm kiếm & Nút hành động */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm bài viết, tour, điểm đến..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadArticles()}
              className="bg-slate-50 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 w-52"
            />
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handleRegenerateAll}
            disabled={isActionLoading}
            className="text-xs font-bold border border-indigo-300 dark:border-indigo-500/40 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900/60 shadow-xs"
            title="Đồng bộ và viết lại toàn bộ 12 bài viết từ Google Sheet & Drive"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-indigo-600 dark:text-indigo-400" />
            Viết Lại 12 Bài
          </Button>

          <Button
            size="sm"
            onClick={() => loadArticles()}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 🌟 KHU VỰC CHÍNH: DANH SÁCH BÀI VIẾT & DEMO XEM TRƯỚC ZALO OA */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* CỘT TRÁI (4 CỘT): DANH SÁCH BÀI VIẾT TRONG TAB */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>
              Hiển thị: <strong>{articles.length} bài viết</strong>
            </span>
            <span className="text-[11px] text-slate-500">Bấm bài viết để xem bản Demo OA</span>
          </div>

          <div className="space-y-2.5 max-h-[calc(100vh-17rem)] overflow-y-auto pr-1">
            {isLoading && articles.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                Đang tải danh sách bài viết Zalo OA...
              </div>
            ) : articles.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800 text-xs">
                <FileText className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                Không có bài viết nào trong mục này.
              </div>
            ) : (
              articles.map((art) => {
                const isSelected = selectedArticleId === art.id;
                return (
                  <div
                    key={art.id}
                    onClick={() => {
                      setSelectedArticleId(art.id);
                      setSelectedArticle(art);
                    }}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all duration-200 text-left ${
                      isSelected
                        ? 'bg-gradient-to-r from-indigo-950/80 to-slate-900 border-indigo-500/80 shadow-lg shadow-indigo-950/50 ring-1 ring-indigo-500/50'
                        : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Ảnh thu nhỏ từ Google Drive */}
                      <div className="w-16 h-16 rounded-xl bg-slate-800 overflow-hidden shrink-0 border border-slate-700/60 relative">
                        {art.coverImage?.thumbnailUrl ? (
                          <img
                            src={art.coverImage.thumbnailUrl}
                            alt={art.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as any).src =
                                'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=400&q=80';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-500">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                        )}
                        <span className="absolute bottom-0.5 right-0.5 text-[9px] bg-black/70 text-slate-200 px-1 rounded font-mono font-bold">
                          {art.id}
                        </span>
                      </div>

                      {/* Thông tin bài viết */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${getDestinationBadgeColor(
                              art.destination,
                            )}`}
                          >
                            {art.destination}
                          </span>

                          {/* Nhãn trạng thái */}
                          {art.status === 'APPROVED' ? (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded font-semibold flex items-center gap-1">
                              <Check className="w-3 h-3" /> Đã duyệt
                            </span>
                          ) : art.status === 'REVISED_PENDING' ? (
                            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-1.5 py-0.5 rounded font-semibold flex items-center gap-1 animate-pulse">
                              <RotateCcw className="w-3 h-3" /> Đã sửa ({art.revisionCount})
                            </span>
                          ) : (
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded font-semibold flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Chờ duyệt
                            </span>
                          )}
                        </div>

                        <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug">{art.title}</h4>

                        <p className="text-[11px] text-slate-400 line-clamp-1 italic">{art.hook}</p>

                        <div className="flex items-center gap-3 text-[10px] text-slate-500 pt-0.5">
                          <span>📅 {art.publishDate}</span>
                          <span>⏰ {art.suggestedTime}</span>
                          <span>📸 {art.galleryImages?.length + 1} ảnh</span>
                        </div>
                      </div>
                    </div>

                    {/* Banner hiển thị ghi chú sửa gần nhất nếu ở tab Chờ Duyệt Lại */}
                    {art.status === 'REVISED_PENDING' && art.lastRevisionNote && (
                      <div className="mt-2 pt-2 border-t border-indigo-500/20 text-[10px] text-indigo-300 flex items-start gap-1.5">
                        <span className="font-bold shrink-0">Yêu cầu sửa:</span>
                        <span className="italic line-clamp-1">"{art.lastRevisionNote}"</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* CỘT PHẢI (8 CỘT): DEMO XEM TRƯỚC BẢN ĐĂNG TRÊN ZALO OA & CÔNG CỤ DUYỆT BÀI */}
        <div className="lg:col-span-8">
          {selectedArticle ? (
            <div className="space-y-4">
              {/* THANH THAO TÁC DUYỆT BÀI NHANH */}
              <div className="p-3.5 bg-gradient-to-r from-[#0d172e] to-[#121c38] rounded-2xl border border-indigo-500/30 flex flex-wrap items-center justify-between gap-3 shadow-xl">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-xs">
                    {selectedArticle.id}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white line-clamp-1">{selectedArticle.title}</h3>
                    <p className="text-[10px] text-slate-400">
                      Trạng thái hiện tại:{' '}
                      <strong
                        className={
                          selectedArticle.status === 'APPROVED'
                            ? 'text-emerald-400'
                            : selectedArticle.status === 'REVISED_PENDING'
                            ? 'text-indigo-400'
                            : 'text-amber-400'
                        }
                      >
                        {selectedArticle.zaloArticleUrl
                          ? 'Đã Xuất Bản Lên Zalo OA'
                          : selectedArticle.status === 'APPROVED'
                          ? 'Đã Duyệt Đăng Bài'
                          : selectedArticle.status === 'REVISED_PENDING'
                          ? `Chờ Duyệt Lại (Đã sửa theo yêu cầu)`
                          : 'Đang Chờ Duyệt Lần Đầu'}
                      </strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Nút Xem bài viết trên Zalo OA thực tế nếu đã đăng */}
                  {selectedArticle.zaloArticleUrl && (
                    <a
                      href={selectedArticle.zaloArticleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition-all animate-pulse"
                      title="Mở bài viết đã xuất bản trên Zalo OA"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Xem Trên Zalo OA</span>
                    </a>
                  )}

                  {/* Nút Tự Sửa */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={openEditModal}
                    className="text-xs border-slate-700 bg-slate-900/80 text-slate-300 hover:bg-slate-800"
                  >
                    <Edit3 className="w-3.5 h-3.5 mr-1" />
                    Tự Sửa
                  </Button>

                  {/* Nút Yêu Cầu Sửa */}
                  <Button
                    size="sm"
                    onClick={() => {
                      setRevisionNote('');
                      setIsRevisionModalOpen(true);
                    }}
                    className="text-xs bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-md shadow-amber-600/20"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                    Yêu Cầu Sửa
                  </Button>

                  {/* Nút Đăng lên Zalo OA nếu bài đã duyệt nhưng chưa có link */}
                  {selectedArticle.status === 'APPROVED' && !selectedArticle.zaloArticleUrl && (
                    <Button
                      size="sm"
                      onClick={() => handlePublishToOa(selectedArticle.id)}
                      disabled={isActionLoading}
                      className="text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20"
                    >
                      <Send className="w-3.5 h-3.5 mr-1" />
                      Đăng Lên Zalo OA
                    </Button>
                  )}

                  {/* Nút Duyệt & Đăng lên Zalo OA */}
                  <Button
                    size="sm"
                    onClick={() => handleApprove(selectedArticle.id)}
                    disabled={isActionLoading || selectedArticle.status === 'APPROVED'}
                    className={`text-xs font-bold shadow-lg transition-all ${
                      selectedArticle.status === 'APPROVED'
                        ? 'bg-emerald-800/60 text-emerald-200 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 hover:scale-105 active:scale-95'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    {selectedArticle.status === 'APPROVED' ? '✅ Đã Duyệt Bài Này' : '🚀 Duyệt & Đăng Lên Zalo OA'}
                  </Button>
                </div>
              </div>

              {/* THANH HƯỚNG DẪN TÍNH NĂNG TÔ ĐEN SỬA TỰ ĐỘNG BẰNG AI */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 bg-gradient-to-r from-indigo-950/70 via-purple-950/60 to-slate-900 border border-indigo-500/30 rounded-2xl text-xs shadow-md">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-300 animate-pulse shrink-0" />
                  <span className="text-slate-200 text-xs">
                    <strong className="text-amber-300">Tính năng Sửa Tự Động (Regenerate):</strong> Chị đọc đoạn nào chưa ưng ý, chỉ cần <strong>dùng chuột bôi đen (tô đen)</strong> đoạn đó trong khung điện thoại để AI viết lại ngay lập tức!
                  </span>
                </div>
                {highlightedText && (
                  <Button
                    size="sm"
                    onClick={() => setIsRegenModalOpen(true)}
                    className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs h-8 px-3.5 shadow-lg shadow-red-600/30 shrink-0 gap-1.5 animate-bounce"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                    <span>Sửa Đoạn Đã Chọn ({highlightedText.length} ký tự)</span>
                  </Button>
                )}
              </div>

              {/* BẢN XEM TRƯỚC DEMO TRÊN ZALO OA (ZALO OA MOBILE SIMULATOR) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* KHUNG ĐIỆN THOẠI DI ĐỘNG DEMO (7 CỘT) */}
                <div className="md:col-span-7 flex justify-center">
                  <div className="w-full max-w-[420px] bg-slate-950 rounded-[40px] border-4 border-slate-800 p-3 shadow-2xl relative overflow-hidden">
                    {/* Tai thỏ / Dynamic Island giả lập */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-900 rounded-full z-20 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-950 mr-2" />
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-950" />
                    </div>

                    {/* Màn hình hiển thị Zalo OA App View */}
                    <div className="bg-[#0b1120] text-slate-100 rounded-[32px] overflow-hidden border border-slate-800/80 flex flex-col h-[700px]">
                      {/* Top Bar Zalo */}
                      <div className="bg-[#0068ff] text-white px-4 pt-6 pb-2.5 flex items-center justify-between shrink-0 shadow-md">
                        <div className="flex items-center gap-2">
                          <span className="text-xs">❮</span>
                          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">
                            TL
                          </div>
                          <div>
                            <div className="text-xs font-bold flex items-center gap-1">
                              TourLuk - Du Lịch Úc
                              <span className="w-3 h-3 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[8px] font-black">
                                ✓
                              </span>
                            </div>
                            <div className="text-[9px] text-white/80">Official Account Doanh Nghiệp</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold">Quan tâm</span>
                          <span>⋮</span>
                        </div>
                      </div>

                      {/* Nội dung bài viết cuộn được */}
                      <div
                        onMouseUp={handleSelectionChange}
                        onTouchEnd={handleSelectionChange}
                        className="flex-1 overflow-y-auto p-4 space-y-3.5 text-left text-xs text-slate-200 select-text"
                      >
                        {/* Ảnh bìa Hero Cover từ Google Drive */}
                        <div className="rounded-xl overflow-hidden border border-slate-800 shadow-md bg-slate-900 relative group">
                          {selectedArticle.coverImage?.thumbnailUrl ? (
                            <img
                              src={selectedArticle.coverImage.thumbnailUrl}
                              alt={selectedArticle.title}
                              className="w-full h-48 object-cover cursor-pointer hover:scale-105 transition-all duration-300"
                              onClick={() => setPreviewImage(selectedArticle.coverImage?.webViewLink || null)}
                              onError={(e) => {
                                (e.target as any).src =
                                  'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=800&q=80';
                              }}
                            />
                          ) : (
                            <div className="h-48 flex items-center justify-center text-slate-500 bg-slate-900">
                              <ImageIcon className="w-8 h-8" />
                            </div>
                          )}
                          <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[10px] font-mono">
                            📸 {selectedArticle.coverImage?.name || 'Ảnh Drive'}
                          </div>
                        </div>

                        {/* Tiêu đề bài viết */}
                        <h2 className="text-sm font-extrabold text-white leading-tight">{selectedArticle.title}</h2>

                        {/* Meta thông tin */}
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 pb-1 border-b border-slate-800">
                          <span>TourLuk Official</span>
                          <span>•</span>
                          <span>{selectedArticle.publishDate}</span>
                          <span>•</span>
                          <span className="text-blue-400 font-semibold">{selectedArticle.destination}</span>
                        </div>

                        {/* Đoạn Hook mở đầu */}
                        <div className="p-3 bg-indigo-950/40 border-l-4 border-indigo-500 rounded-r-xl text-[11px] text-indigo-100 italic leading-relaxed">
                          {selectedArticle.hook}
                        </div>

                        {/* Thân bài viết Zalo OA hoàn chỉnh xen kẽ ảnh thực tế */}
                        <div className="space-y-3 text-[11px] leading-relaxed text-slate-300 font-sans">
                          {(() => {
                            const content = selectedArticle.content || '';
                            const gallery = selectedArticle.galleryImages || [];
                            const imageRegex = /📸 \[HÌNH_ẢNH_(\d+): ([^\]]+)\]/g;

                            // Hàm tô sáng trực quan đoạn văn bản vừa được AI viết lại
                            const renderParagraphWithHighlight = (text: string) => {
                              const needle = (recentlyRewrittenText || '').trim();
                              if (!needle || !text.includes(needle)) {
                                return text;
                              }
                              const chunks = text.split(needle);
                              return (
                                <>
                                  {chunks.map((chunk, cIdx) => (
                                    <React.Fragment key={cIdx}>
                                      {chunk}
                                      {cIdx < chunks.length - 1 && (
                                        <span className="inline-block bg-emerald-500/25 border-l-2 border-emerald-400 text-emerald-200 px-2 py-1 rounded my-1 shadow-md ring-1 ring-emerald-500/50 animate-pulse">
                                          <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded-full mr-1.5 uppercase tracking-wider">
                                            ✨ Đoạn vừa sửa mới
                                          </span>
                                          {needle}
                                        </span>
                                      )}
                                    </React.Fragment>
                                  ))}
                                </>
                              );
                            };

                            // Kiểm tra xem bài có thẻ ảnh inline không
                            const hasInlineTags = imageRegex.test(content);
                            imageRegex.lastIndex = 0; // reset regex index

                            if (!hasInlineTags) {
                              return (
                                <>
                                  <div className="whitespace-pre-line">{renderParagraphWithHighlight(content)}</div>
                                  {gallery.length > 0 && (
                                    <div className="space-y-1.5 pt-2">
                                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                        <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                                        Ảnh Thực Tế Chuyến Đi ({gallery.length} ảnh):
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        {gallery.map((img, idx) => (
                                          <div
                                            key={idx}
                                            className="h-24 rounded-lg overflow-hidden border border-slate-800 bg-slate-900 relative cursor-pointer hover:border-indigo-500 transition-all"
                                            onClick={() => setPreviewImage(img.webViewLink || img.thumbnailUrl)}
                                          >
                                            <img
                                              src={img.thumbnailUrl}
                                              alt={img.name}
                                              className="w-full h-full object-cover"
                                              onError={(e) => {
                                                (e.target as any).src =
                                                  'https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?auto=format&fit=crop&w=400&q=80';
                                              }}
                                            />
                                            <span className="absolute bottom-1 left-1 bg-black/70 text-[8px] text-slate-200 px-1 rounded truncate max-w-[90%]">
                                              {img.name}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </>
                              );
                            }

                            // Render bài viết xen kẽ ảnh inline
                            const parts: React.ReactNode[] = [];
                            let lastIndex = 0;
                            let match: RegExpExecArray | null;

                            while ((match = imageRegex.exec(content)) !== null) {
                              const textBefore = content.substring(lastIndex, match.index);
                              if (textBefore.trim()) {
                                parts.push(
                                  <div key={`txt-${lastIndex}`} className="whitespace-pre-line">
                                    {renderParagraphWithHighlight(textBefore)}
                                  </div>,
                                );
                              }

                              const imgIdx = parseInt(match[1], 10) - 1;
                              const caption = match[2];
                              const img = gallery[imgIdx];

                              parts.push(
                                <div key={`inline-img-${match.index}`} className="my-3 space-y-1">
                                  <div
                                    className="rounded-xl overflow-hidden border border-slate-700/80 bg-slate-900 shadow-md relative cursor-pointer group hover:border-indigo-500 transition-all"
                                    onClick={() => setPreviewImage(img?.webViewLink || img?.thumbnailUrl || null)}
                                    title="Bấm để xem ảnh phóng to từ Google Drive"
                                  >
                                    {img?.thumbnailUrl ? (
                                      <img
                                        src={img.thumbnailUrl}
                                        alt={caption}
                                        className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300"
                                        onError={(e) => {
                                          (e.target as any).src =
                                            'https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?auto=format&fit=crop&w=600&q=80';
                                        }}
                                      />
                                    ) : (
                                      <div className="h-36 flex items-center justify-center bg-slate-800 text-slate-500">
                                        <ImageIcon className="w-6 h-6" />
                                      </div>
                                    )}
                                    <span className="absolute bottom-1.5 right-1.5 bg-black/75 backdrop-blur-sm text-[9px] text-slate-200 px-2 py-0.5 rounded-full font-medium">
                                      🔍 Xem ảnh Drive
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-center text-slate-400 italic font-medium px-2">
                                    📸 {caption}
                                  </p>
                                </div>,
                              );

                              lastIndex = match.index + match[0].length;
                            }

                            const remainingText = content.substring(lastIndex);
                            if (remainingText.trim()) {
                              parts.push(
                                <div key={`txt-${lastIndex}`} className="whitespace-pre-line">
                                  {renderParagraphWithHighlight(remainingText)}
                                </div>,
                              );
                            }

                            return parts;
                          })()}
                        </div>

                        {/* Call To Action Box (Khung kêu gọi Zalo OA) */}
                        <div className="p-3 bg-gradient-to-tr from-blue-950/60 to-slate-900 rounded-xl border border-blue-500/30 text-center space-y-2 mt-3">
                          <p className="font-bold text-xs text-white">✨ {selectedArticle.cta.toUpperCase()}</p>
                          <button className="w-full py-2 rounded-lg bg-[#0068ff] hover:bg-blue-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md">
                            <MessageCircle className="w-3.5 h-3.5" />
                            Nhắn Tin Tư Vấn Tour
                          </button>
                        </div>
                      </div>

                      {/* Footer thanh công cụ Zalo OA */}
                      <div className="bg-[#0b1120] border-t border-slate-800 p-2.5 flex items-center justify-around text-slate-400 text-xs shrink-0">
                        <span className="flex items-center gap-1 hover:text-white cursor-pointer">
                          <ThumbsUp className="w-3.5 h-3.5" /> Thích
                        </span>
                        <span className="flex items-center gap-1 hover:text-white cursor-pointer">
                          <MessageCircle className="w-3.5 h-3.5" /> Bình luận
                        </span>
                        <span className="flex items-center gap-1 hover:text-white cursor-pointer">
                          <Share2 className="w-3.5 h-3.5" /> Chia sẻ
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* THÔNG TIN TIÊU CHÍ GOOGLE SHEET & LỊCH SỬ SỬA ĐỔI (5 CỘT) */}
                <div className="md:col-span-5 space-y-3.5">
                  {/* CARD SỬA TỰ ĐỘNG BẰNG AI (REGENERATE THEO ĐOẠN TÔ ĐEN) */}
                  <Card className="bg-gradient-to-br from-[#121b36] to-[#0a1024] border-indigo-500/40 p-4 text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-28 h-28 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-indigo-500/20">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center shadow-md">
                          <Sparkles className="w-3.5 h-3.5 text-white animate-spin" />
                        </div>
                        <h4 className="text-xs font-black text-white uppercase tracking-wider">
                          Sửa Tự Động Đoạn Văn (AI Regenerate)
                        </h4>
                      </div>
                      <span className="text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full font-bold">
                        Tô Đen & Viết Lại
                      </span>
                    </div>

                    {highlightedText ? (
                      <div className="space-y-3">
                        <div className="p-2.5 bg-slate-900/90 rounded-xl border border-indigo-500/30 space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span className="font-bold text-amber-300">Đoạn văn chị đã chọn ({highlightedText.length} ký tự):</span>
                            <button
                              onClick={() => {
                                setHighlightedText('');
                                setSelectionCoords(null);
                              }}
                              className="text-slate-400 hover:text-rose-400"
                            >
                              ✕ Bỏ chọn
                            </button>
                          </div>
                          <p className="text-[11px] text-amber-100 italic line-clamp-3 leading-relaxed">
                            "{highlightedText}"
                          </p>
                        </div>

                        {/* Gợi ý yêu cầu sửa nhanh */}
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-1">
                            Chọn nhanh hướng sửa chị muốn:
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              { label: '⚡ Viết hấp dẫn hơn', val: 'Viết hấp dẫn, lôi cuốn và tạo hứng khởi du lịch' },
                              { label: '✂️ Rút ngắn gọn', val: 'Rút ngắn gọn, súc tích và dễ đọc' },
                              { label: '💖 Thêm cảm xúc', val: 'Thêm cảm xúc ấm áp, gần gũi và sâu lắng' },
                              { label: '💎 Tiện ích TourLuk', val: 'Nhấn mạnh dịch vụ và cam kết uy tín của TourLuk' },
                              { label: '💡 Thêm giá & ưu đãi', val: 'Bổ sung giá tour minh bạch và ưu đãi Zalo OA' },
                              { label: '👨‍👩‍👧 Phù hợp gia đình', val: 'Phù hợp gia đình có người lớn tuổi và trẻ nhỏ' },
                            ].map((chip, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleRegenerateSelection(chip.val)}
                                disabled={isRegenerating}
                                className="px-2 py-1 rounded-lg bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-500/30 text-indigo-200 text-[10px] font-medium transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                              >
                                {chip.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Ô nhập yêu cầu chỉnh sửa riêng */}
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            value={regenInstruction}
                            onChange={(e) => setRegenInstruction(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleRegenerateSelection()}
                            placeholder="Hoặc gõ yêu cầu cụ thể (vd: vui hơn, nhấn mạnh visa...)"
                            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleRegenerateSelection()}
                            disabled={isRegenerating}
                            className="w-full bg-gradient-to-r from-red-600 via-rose-600 to-indigo-600 hover:from-red-500 hover:to-indigo-500 text-white font-black text-xs h-8 shadow-md shadow-red-600/30 gap-1.5"
                          >
                            <Sparkles className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                            <span>{isRegenerating ? 'Đang viết lại đoạn văn...' : '🚀 Viết Lại Đoạn Này Ngay (Regenerate)'}</span>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2.5 text-xs text-slate-300">
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          💡 <strong>Cách dùng siêu dễ:</strong> Chị đọc bài viết trong khung điện thoại bên cạnh, thấy câu hay đoạn nào chưa ưng ý chỉ cần <strong>dùng chuột tô đen</strong>, công cụ AI sẽ nhận diện ngay để viết lại theo ý chị!
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setHighlightedText(selectedArticle.hook || selectedArticle.title);
                            setIsRegenModalOpen(true);
                          }}
                          className="w-full text-xs border-indigo-500/40 bg-indigo-950/40 text-indigo-300 hover:bg-indigo-900/60 font-bold gap-1.5"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Thử Viết Lại Đoạn Mở Đầu (Hook)</span>
                        </Button>
                      </div>
                    )}
                  </Card>

                  {/* Card thông số từ Google Sheet */}
                  <Card className="bg-[#0b1329]/80 border-slate-800 p-4 text-white shadow-xl">
                    <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5 pb-2.5 border-b border-slate-800">
                      <FileText className="w-3.5 h-3.5 text-indigo-400" />
                      Yêu Cầu Bài Viết Từ Google Sheet
                    </h4>

                    <div className="space-y-2.5 pt-3 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Mã Tour / ID:</span>
                        <span className="font-bold font-mono text-amber-300">{selectedArticle.id}</span>
                        <span className="text-[11px] text-slate-400 ml-2">
                          ({selectedArticle.month} • {selectedArticle.week} • {selectedArticle.stage})
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block">Phân Khúc Khách (Audience):</span>
                        <span className="font-semibold text-slate-200">{selectedArticle.targetAudience}</span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block">Trụ Cột / Vai Trò Nội Dung:</span>
                        <span className="text-slate-300">
                          {selectedArticle.pillar} • Vai trò:{' '}
                          <span className="text-emerald-400 font-semibold">{selectedArticle.contentRole}</span>
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block">Từ Khóa & Chủ Đề Cốt Lõi:</span>
                        <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800 text-[11px] text-indigo-200 font-mono">
                          {selectedArticle.keywords}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block">Brief Yêu Cầu Chi Tiết:</span>
                        <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800 text-[11px] text-slate-300 leading-relaxed max-h-36 overflow-y-auto">
                          {selectedArticle.brief}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block">Lời Kêu Gọi (CTA):</span>
                        <span className="font-semibold text-amber-300">{selectedArticle.cta}</span>
                      </div>
                    </div>
                  </Card>

                  {/* Card Lịch Sử Sửa Đổi (Nếu có) */}
                  <Card className="bg-[#0b1329]/80 border-slate-800 p-4 text-white shadow-xl">
                    <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5 pb-2.5 border-b border-slate-800">
                      <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                      Lịch Sử Yêu Cầu Sửa Đổi ({selectedArticle.revisionCount || 0})
                    </h4>

                    {selectedArticle.revisionHistory && selectedArticle.revisionHistory.length > 0 ? (
                      <div className="space-y-2.5 pt-3 max-h-48 overflow-y-auto pr-1">
                        {selectedArticle.revisionHistory.map((rev, idx) => (
                          <div key={idx} className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800 text-xs">
                            <div className="flex items-center justify-between text-[10px] text-slate-400 pb-1">
                              <span className="font-bold text-indigo-300">Lần sửa #{rev.revisionNumber}</span>
                              <span>{new Date(rev.revisedAt).toLocaleTimeString('vi-VN')}</span>
                            </div>
                            <p className="text-[11px] text-amber-200 italic font-medium">"{rev.requestedNote}"</p>
                            <p className="text-[10px] text-emerald-400 mt-1">✓ {rev.revisedSummary}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-4 text-center text-slate-500 text-xs">
                        Bài viết chưa có yêu cầu sửa đổi nào. Đang ở phiên bản gốc.
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-16 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">
              <FileText className="w-10 h-10 mx-auto mb-2 text-slate-600" />
              <p className="text-sm font-semibold">Chưa chọn bài viết nào</p>
              <p className="text-xs text-slate-500 mt-1">Vui lòng bấm chọn 1 bài viết ở danh sách bên trái</p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 🌟 MODAL: YÊU CẦU SỬA BÀI VIẾT */}
      {/* ========================================================================= */}
      {isRevisionModalOpen && selectedArticle && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e1629] border border-slate-800 rounded-2xl w-full max-w-lg p-5 text-white shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm text-white">Yêu Cầu Sửa Bài: {selectedArticle.id}</h3>
              </div>
              <button
                onClick={() => setIsRevisionModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-300">
                Nhập nội dung chị muốn sửa (ví dụ: bổ sung giá tour, nhấn mạnh visa, viết ngắn gọn hơn, thêm lưu ý cho
                người lớn tuổi...). Sau khi gửi, <strong>hệ thống sẽ tự động sửa bài ngay</strong> và đưa vào tab{' '}
                <strong className="text-indigo-400">"Chờ Duyệt Lại"</strong>.
              </p>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Gợi ý sửa nhanh:</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Bổ sung chi tiết giá tour & ưu đãi Zalo OA',
                    'Thêm lưu ý hồ sơ Visa Úc và thời hạn nộp',
                    'Nhấn mạnh tiện ích cho người lớn tuổi & trẻ em',
                    'Thêm kinh nghiệm chuẩn bị trang phục & thời tiết',
                    'Làm câu Hook mở đầu giật gân, cuốn hút hơn',
                  ].map((tip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setRevisionNote(tip)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] transition-all"
                    >
                      + {tip}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Nội dung yêu cầu sửa cụ thể:
                </label>
                <textarea
                  rows={4}
                  value={revisionNote}
                  onChange={(e) => setRevisionNote(e.target.value)}
                  placeholder="Nhập yêu cầu sửa của chị ở đây..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRevisionModalOpen(false)}
                className="text-xs border-slate-700 text-slate-400"
              >
                Hủy Bỏ
              </Button>
              <Button
                size="sm"
                onClick={handleSubmitRevision}
                disabled={isActionLoading || !revisionNote.trim()}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs"
              >
                {isActionLoading ? 'Đang Tự Động Sửa...' : 'Gửi Yêu Cầu & Sửa Bài Ngay'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🌟 MODAL: TỰ CHỈNH SỬA BÀI VIẾT TRỰC TIẾP */}
      {/* ========================================================================= */}
      {isEditModalOpen && selectedArticle && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e1629] border border-slate-800 rounded-2xl w-full max-w-2xl p-5 text-white shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-sm text-white">Tự Chỉnh Sửa Bài Viết: {selectedArticle.id}</h3>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white text-sm">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs overflow-y-auto pr-1 flex-1">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Tiêu đề bài viết:</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Câu Hook mở đầu thu hút:</label>
                <textarea
                  rows={2}
                  value={editHook}
                  onChange={(e) => setEditHook(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Nội dung hoàn chỉnh bài viết Zalo OA:
                </label>
                <textarea
                  rows={12}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white font-sans leading-relaxed focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditModalOpen(false)}
                className="text-xs border-slate-700 text-slate-400"
              >
                Hủy Bỏ
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEdit}
                disabled={isActionLoading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
              >
                {isActionLoading ? 'Đang Lưu...' : 'Lưu Thay Đổi'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🌟 NÚT NỔI (FLOATING PILL) KHI BÔI ĐEN ĐOẠN VĂN BẢN TRONG BÀI VIẾT */}
      {/* ========================================================================= */}
      {highlightedText && !isRegenModalOpen && (
        <div
          style={{
            position: 'fixed',
            left: `${Math.min(Math.max(selectionCoords?.x || 200, 160), typeof window !== 'undefined' ? window.innerWidth - 180 : 500)}px`,
            top: `${Math.max((selectionCoords?.y || 160) - 48, 15)}px`,
            transform: 'translateX(-50%)',
            zIndex: 9999,
          }}
          className="animate-in fade-in zoom-in-95 duration-150"
        >
          <button
            onClick={() => setIsRegenModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-indigo-600 text-white text-xs font-black shadow-2xl hover:scale-105 active:scale-95 transition-all border-2 border-white/50 shadow-red-600/50 backdrop-blur-md cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
            <span>✨ Sửa đoạn tô đen này bằng AI</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🌟 MODAL: SỬA TỰ ĐỘNG ĐOẠN VĂN BẢN ĐƯỢC CHỌN (AI REGENERATE) */}
      {/* ========================================================================= */}
      {isRegenModalOpen && selectedArticle && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e1629] border border-indigo-500/40 rounded-2xl w-full max-w-lg p-5 text-white shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center shadow-md">
                  <Sparkles className="w-4 h-4 text-white animate-spin" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Sửa Tự Động Đoạn Văn Bằng AI (Regenerate)</h3>
                  <p className="text-[10px] text-slate-400">
                    Đang sửa cho bài: {selectedArticle.id} - {selectedArticle.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsRegenModalOpen(false);
                  setHighlightedText('');
                  setSelectionCoords(null);
                }}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Đoạn trích văn bản đang chọn */}
              <div className="p-3 bg-slate-900/90 rounded-xl border border-indigo-500/30 space-y-1">
                <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
                  Đoạn văn chị đã chọn ({highlightedText.length} ký tự):
                </span>
                <p className="text-xs text-amber-100 italic leading-relaxed font-serif max-h-32 overflow-y-auto">
                  "{highlightedText}"
                </p>
              </div>

              {/* Gợi ý yêu cầu sửa nhanh */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
                  Chọn nhanh hướng sửa chị muốn:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: '⚡ Viết hấp dẫn, lôi cuốn hơn', val: 'Viết hấp dẫn, lôi cuốn và tạo hứng khởi du lịch' },
                    { label: '✂️ Rút ngắn gọn, súc tích', val: 'Rút ngắn gọn, súc tích và dễ đọc' },
                    { label: '💖 Thêm cảm xúc & gần gũi', val: 'Thêm cảm xúc ấm áp, gần gũi và sâu lắng' },
                    { label: '💎 Tiện ích TourLuk uy tín', val: 'Nhấn mạnh dịch vụ và cam kết uy tín của TourLuk' },
                    { label: '💡 Thêm giá & ưu đãi Zalo OA', val: 'Bổ sung giá tour minh bạch và ưu đãi Zalo OA' },
                    {
                      label: '👨‍👩‍👧 Phù hợp gia đình & người lớn tuổi',
                      val: 'Phù hợp gia đình có người lớn tuổi và trẻ nhỏ',
                    },
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleRegenerateSelection(chip.val)}
                      disabled={isRegenerating}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-indigo-950 border border-slate-700/80 hover:border-indigo-500/50 text-slate-200 hover:text-white text-[11px] text-left transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ô gõ yêu cầu riêng */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Hoặc nhập yêu cầu chỉnh sửa riêng:
                </label>
                <textarea
                  rows={2}
                  value={regenInstruction}
                  onChange={(e) => setRegenInstruction(e.target.value)}
                  placeholder="Ví dụ: viết hài hước hơn, đổi câu mở đầu, nhắc lưu ý về thời tiết lạnh..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsRegenModalOpen(false);
                  setHighlightedText('');
                  setSelectionCoords(null);
                }}
                className="text-xs border-slate-700 text-slate-400"
              >
                Hủy Bỏ
              </Button>
              <Button
                size="sm"
                onClick={() => handleRegenerateSelection()}
                disabled={isRegenerating || !highlightedText.trim()}
                className="bg-gradient-to-r from-red-600 via-rose-600 to-indigo-600 hover:from-red-500 hover:to-indigo-500 text-white font-black text-xs gap-1.5 shadow-lg shadow-red-600/30"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                <span>{isRegenerating ? 'Đang Viết Lại...' : '🚀 Viết Lại Đoạn Này Ngay'}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

