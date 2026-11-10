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
  Copy,
  Globe,
  PhoneCall,
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

export type ArticleWorkflowTab = 'ALL' | 'APPROVED' | 'UNAPPROVED' | 'PUBLISHED';

export function TourArticleWorkflow() {
  const [activeTab, setActiveTab] = useState<ArticleWorkflowTab>('ALL');
  const [articles, setArticles] = useState<TourOaArticle[]>([]);
  const [counts, setCounts] = useState({
    total: 0,
    approved: 0,
    unapproved: 0,
    published: 0,
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
        counts: { total: number; approved: number; unapproved: number; published: number };
      }>(`/tour-content/articles?status=${tab}&search=${encodeURIComponent(searchQuery)}`);

      setArticles(res.articles || []);
      setCounts(
        res.counts || {
          total: 0,
          approved: 0,
          unapproved: 0,
          published: 0,
        },
      );

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

  // 2. Thao tác DUYỆT BÀI -> Chuyển sang "Đã duyệt" hoặc "Đã đăng Zalo OA" nếu đăng thành công
  const handleApprove = async (articleId: string) => {
    setIsActionLoading(true);
    try {
      const updated = await fetchApi<TourOaArticle>(`/tour-content/articles/${articleId}/approve`, {
        method: 'POST',
      });
      const isPublished = updated?.status === 'PUBLISHED' || !!updated?.zaloArticleUrl;
      const publishedText = isPublished
        ? ` Đã tự động xuất bản trực tiếp lên Zalo OA TourLuk!`
        : ` Bài đã được lưu vào danh mục "Bài Đăng Đã Được Duyệt".`;
      setNotification({
        type: 'success',
        message: `✅ Đã duyệt thành công bài viết ${articleId}!${publishedText}`,
      });
      if (isPublished) {
        setActiveTab('PUBLISHED');
        await loadArticles('PUBLISHED', articleId);
      } else {
        setActiveTab('APPROVED');
        await loadArticles('APPROVED', articleId);
      }
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
        setActiveTab('PUBLISHED');
        await loadArticles('PUBLISHED', articleId);
      } else {
        setNotification({ type: 'error', message: res?.message || 'Không thể đăng lên Zalo OA' });
      }
    } catch (e: any) {
      setNotification({ type: 'error', message: e.message || 'Lỗi khi đăng lên Zalo OA' });
    } finally {
      setIsActionLoading(false);
    }
  };

  // Thao tác Reset bài viết đã đăng về lại Đã Duyệt (để đăng lại bản mới nếu đã xóa trên Zalo OA)
  const handleResetPublish = async (articleId: string) => {
    setIsActionLoading(true);
    try {
      await fetchApi(`/tour-content/articles/${articleId}/reset-publish`, { method: 'POST' });
      setNotification({
        type: 'success',
        message: '🔄 Đã chuyển bài viết về tab "Bài Đăng Đã Được Duyệt" để sẵn sàng đăng lại bản mới!',
      });
      setActiveTab('APPROVED');
      await loadArticles('APPROVED', articleId);
    } catch (e: any) {
      setNotification({ type: 'error', message: e.message || 'Lỗi khi đặt lại trạng thái bài viết' });
    } finally {
      setIsActionLoading(false);
    }
  };

  // Thao tác Đồng bộ với Zalo OA thực tế (kiểm tra bài nào bị xóa trên OA thì tự động trả về Đã Duyệt)
  const handleSyncWithOa = async () => {
    setIsActionLoading(true);
    try {
      const res = await fetchApi<{ synced: number; reverted: number; revertedIds: string[] }>(
        '/tour-content/articles/sync-oa',
        { method: 'POST' },
      );
      if (res?.reverted > 0) {
        setNotification({
          type: 'success',
          message: `🔄 Đã đồng bộ với Zalo OA: phát hiện ${res.reverted} bài đã bị xóa trên Zalo OA và đã tự động chuyển về tab "Bài Đăng Đã Được Duyệt" để chị đăng lại!`,
        });
        setActiveTab('APPROVED');
        await loadArticles('APPROVED');
      } else {
        setNotification({
          type: 'info',
          message: `✅ Đã kiểm tra đồng bộ: Tất cả bài viết đều khớp chính xác với Zalo OA (${res?.synced || 0} bài trực tuyến).`,
        });
        await loadArticles(activeTab);
      }
    } catch (e: any) {
      setNotification({ type: 'error', message: e.message || 'Lỗi khi đồng bộ với Zalo OA' });
    } finally {
      setIsActionLoading(false);
    }
  };

  // 3. Thao tác YÊU CẦU SỬA -> Tự động sửa và chuyển sang "Bài đăng chưa được duyệt"
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
        message: `🔄 Hệ thống đã tự động sửa bài ${selectedArticleId} theo yêu cầu!`,
      });
      setActiveTab('UNAPPROVED');
      await loadArticles('UNAPPROVED', selectedArticleId);
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
      setActiveTab('ALL');
      await loadArticles('ALL');
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
      {/* 🌟 THANH ĐIỀU HƯỚNG BÀI ĐĂNG ZALO OA (4 TAB CHÍNH XÁC THEO YÊU CẦU) */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-[#0b1329]/90 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm dark:shadow-xl backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        {/* Nhóm 4 Tab bài đăng Zalo OA */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tab 1: Tất Cả Bài Đăng Zalo OA (Sắp xếp theo thứ tự mã bài ZA-001 -> ZA-012) */}
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'ALL'
                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/30 scale-105 border border-slate-700 dark:bg-slate-800'
                : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200/80 dark:bg-slate-900/80 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800'
            }`}
            title="Tất cả bài đăng Zalo OA: bao gồm bài được duyệt, chưa được duyệt, đã đăng OA (Sắp xếp theo thứ tự mã bài ZA-001 -> ZA-012)"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Tất Cả Bài Đăng Zalo OA</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                activeTab === 'ALL' ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {counts.total}
            </span>
          </button>

          {/* Tab 2: Bài Đăng Đã Được Duyệt */}
          <button
            onClick={() => setActiveTab('APPROVED')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'APPROVED'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-105'
                : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200/80 dark:bg-slate-900/80 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800'
            }`}
            title="Các bài đăng đã được duyệt, sẵn sàng đăng lên Zalo OA"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Bài Đăng Đã Được Duyệt</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                activeTab === 'APPROVED' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
              }`}
            >
              {counts.approved}
            </span>
          </button>

          {/* Tab 3: Bài Đăng Chưa Được Duyệt */}
          <button
            onClick={() => setActiveTab('UNAPPROVED')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'UNAPPROVED'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 scale-105'
                : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200/80 dark:bg-slate-900/80 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800'
            }`}
            title="Các bài đăng chưa được duyệt: bao gồm bài chờ duyệt lần đầu và bài đã sửa chờ duyệt lại"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Bài Đăng Chưa Được Duyệt</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                activeTab === 'UNAPPROVED' ? 'bg-black/30 text-white' : 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400'
              }`}
            >
              {counts.unapproved}
            </span>
          </button>

          {/* Tab 4: Bài Đã Được Đăng Lên Zalo OA */}
          <button
            onClick={() => setActiveTab('PUBLISHED')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'PUBLISHED'
                ? 'bg-[#0068ff] text-white shadow-md shadow-blue-500/30 scale-105'
                : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200/80 dark:bg-slate-900/80 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800'
            }`}
            title="Các bài đã được xuất bản chính thức lên Zalo OA kèm link bài viết"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Bài Đã Được Đăng Lên Zalo OA</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                activeTab === 'PUBLISHED' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300'
              }`}
            >
              {counts.published}
            </span>
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
            onClick={handleSyncWithOa}
            disabled={isActionLoading}
            className="text-xs font-bold border border-blue-400 dark:border-blue-500/50 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60 shadow-xs flex items-center gap-1.5"
            title="Đồng bộ trực tiếp với Zalo OA: tự động phát hiện bài đã xóa trên Zalo OA và chuyển về Đã Duyệt để đăng lại"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isActionLoading ? 'animate-spin' : ''}`} />
            <span>Đồng Bộ Zalo OA</span>
          </Button>

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
                          {art.status === 'PUBLISHED' || art.zaloArticleUrl ? (
                            <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/40 px-1.5 py-0.5 rounded font-semibold flex items-center gap-1">
                              <Globe className="w-3 h-3" /> Đã đăng OA
                            </span>
                          ) : art.status === 'APPROVED' ? (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded font-semibold flex items-center gap-1">
                              <Check className="w-3 h-3" /> Đã duyệt
                            </span>
                          ) : art.status === 'REVISED_PENDING' ? (
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded font-semibold flex items-center gap-1 animate-pulse">
                              <RotateCcw className="w-3 h-3" /> Đã sửa ({art.revisionCount})
                            </span>
                          ) : (
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded font-semibold flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Chưa duyệt
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
                          selectedArticle.status === 'PUBLISHED' || selectedArticle.zaloArticleUrl
                            ? 'text-blue-400'
                            : selectedArticle.status === 'APPROVED'
                            ? 'text-emerald-400'
                            : 'text-amber-400'
                        }
                      >
                        {selectedArticle.status === 'PUBLISHED' || selectedArticle.zaloArticleUrl
                          ? 'Đã Đăng Lên Zalo OA'
                          : selectedArticle.status === 'APPROVED'
                          ? 'Đã Duyệt (Sẵn sàng đăng OA)'
                          : selectedArticle.status === 'REVISED_PENDING'
                          ? `Chưa Duyệt (Đã sửa theo yêu cầu)`
                          : 'Chưa Duyệt'}
                      </strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Nút Xem & Copy bài viết trên Zalo OA thực tế nếu đã đăng */}
                  {(selectedArticle.status === 'PUBLISHED' || selectedArticle.zaloArticleUrl) && (
                    <>
                      {selectedArticle.zaloArticleUrl && (
                        <button
                          onClick={() => {
                            if (selectedArticle.zaloArticleUrl) {
                              navigator.clipboard.writeText(selectedArticle.zaloArticleUrl);
                              setNotification({
                                type: 'success',
                                message: '📋 Đã sao chép link bài viết Zalo OA vào bộ nhớ tạm!',
                              });
                            }
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                          title="Sao chép liên kết bài viết Zalo OA"
                        >
                          <Copy className="w-3.5 h-3.5 text-slate-300" />
                          <span>Sao chép Link</span>
                        </button>
                      )}
                      <a
                        href={selectedArticle.zaloArticleUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-[#0068ff] hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition-all hover:scale-105 active:scale-95"
                        title="Mở bài viết đã xuất bản trên Zalo OA"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>Xem Trên Zalo OA</span>
                      </a>
                    </>
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

                  {/* Nút Đăng lại bản mới cho bài đã xuất bản */}
                  {(selectedArticle.status === 'PUBLISHED' || selectedArticle.zaloArticleUrl) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResetPublish(selectedArticle.id)}
                      disabled={isActionLoading}
                      className="text-xs font-bold border border-amber-500/50 text-amber-300 hover:bg-amber-500/10 flex items-center gap-1.5"
                      title="Chuyển bài về lại tab Đã Duyệt để đăng lại bản mới nếu bài đã bị xóa trên Zalo OA"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                      <span>Đăng Lại Bản Mới</span>
                    </Button>
                  )}

                  {/* Nút Đăng lên Zalo OA nếu bài đã duyệt nhưng chưa đăng */}
                  {selectedArticle.status === 'APPROVED' && !selectedArticle.zaloArticleUrl && (
                    <Button
                      size="sm"
                      onClick={() => handlePublishToOa(selectedArticle.id)}
                      disabled={isActionLoading}
                      className="text-xs font-black bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/30 hover:scale-105 active:scale-95 animate-pulse"
                    >
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      {isActionLoading ? 'Đang Đăng Lên Zalo OA...' : '🚀 Đăng Ngay Lên Zalo OA'}
                    </Button>
                  )}

                  {/* Nút Duyệt & Đăng lên Zalo OA cho bài đang chờ duyệt */}
                  {(selectedArticle.status === 'PENDING_APPROVAL' || selectedArticle.status === 'REVISED_PENDING') && (
                    <Button
                      size="sm"
                      onClick={() => handleApprove(selectedArticle.id)}
                      disabled={isActionLoading}
                      className="text-xs font-bold shadow-lg transition-all bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 hover:scale-105 active:scale-95"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                      {isActionLoading ? 'Đang Duyệt & Đăng...' : '🚀 Duyệt & Đăng Lên Zalo OA'}
                    </Button>
                  )}
                </div>
              </div>

              {/* CARD THÔNG BÁO VÀ LINK BÀI ĐĂNG ZALO OA NẾU ĐÃ XUẤT BẢN THÀNH CÔNG */}
              {(selectedArticle.status === 'PUBLISHED' || selectedArticle.zaloArticleUrl) && (
                <div className="p-4 bg-gradient-to-r from-[#002f6c]/90 via-[#0a234d]/90 to-[#063024]/90 rounded-2xl border-2 border-emerald-500/60 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-white">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                          🎉 ĐÃ ĐĂNG BÀI THÀNH CÔNG LÊN ZALO OFFICIAL ACCOUNT
                        </span>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                          Chính thức
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Bài viết đã được đăng lên OA: <strong>TourLuk Official</strong> (ID: {selectedArticle.zaloArticleId || 'OA'})
                        {selectedArticle.publishedAt && (
                          <span className="ml-2 text-slate-400">
                            • Thời gian: {new Date(selectedArticle.publishedAt).toLocaleString('vi-VN')}
                          </span>
                        )}
                      </p>
                      {selectedArticle.zaloArticleUrl && (
                        <div className="flex items-center gap-2 pt-1 text-xs text-blue-300 font-mono break-all">
                          <span className="text-slate-400 shrink-0">Link bài viết:</span>
                          <a
                            href={selectedArticle.zaloArticleUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:text-blue-200 line-clamp-1"
                          >
                            {selectedArticle.zaloArticleUrl}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {selectedArticle.zaloArticleUrl && (
                      <>
                        <button
                          onClick={() => {
                            if (selectedArticle.zaloArticleUrl) {
                              navigator.clipboard.writeText(selectedArticle.zaloArticleUrl);
                              setNotification({
                                type: 'success',
                                message: '📋 Đã sao chép link bài viết Zalo OA vào bộ nhớ tạm!',
                              });
                            }
                          }}
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                          title="Sao chép liên kết bài viết"
                        >
                          <Copy className="w-3.5 h-3.5 text-slate-300" />
                          <span>Sao chép Link</span>
                        </button>
                        <a
                          href={selectedArticle.zaloArticleUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-2 rounded-xl bg-[#0068ff] hover:bg-blue-600 text-white text-xs font-black flex items-center gap-1.5 shadow-lg shadow-blue-500/30 transition-all hover:scale-105 active:scale-95"
                        >
                          <Globe className="w-4 h-4" />
                          <span>Xem Trực Tiếp Trên Zalo OA</span>
                        </a>
                      </>
                    )}
                    <button
                      onClick={() => handleResetPublish(selectedArticle.id)}
                      disabled={isActionLoading}
                      className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/50 flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                      title="Nếu đã xóa bài trên Zalo OA hoặc muốn đăng lại bản mới nhất, bấm nút này để chuyển bài về tab Đã Duyệt"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isActionLoading ? 'Đang xử lý...' : '🔄 Đăng Lại Bản Mới (Reset)'}</span>
                    </button>
                  </div>
                </div>
              )}

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

                        {/* Thân bài viết Zalo OA hoàn chỉnh xen kẽ ảnh thực tế, có in đậm và tách đoạn rõ ràng */}
                        <div className="space-y-2 text-xs leading-relaxed text-slate-200 font-sans">
                          {(() => {
                            const content = selectedArticle.content || '';
                            const gallery = selectedArticle.galleryImages || [];
                            const imageRegex = /📸?\s*\[HÌNH_ẢNH_(\d+):\s*([^\]]+)\]/g;

                            // Hàm phân giải markdown in đậm **text**
                            const renderInlineMarkdown = (text: string) => {
                              const parts = text.split(/(\*\*[^*]+\*\*)/g);
                              return parts.map((part, pIdx) => {
                                if (part.startsWith('**') && part.endsWith('**')) {
                                  return (
                                    <strong key={pIdx} className="font-bold text-white">
                                      {part.slice(2, -2)}
                                    </strong>
                                  );
                                }
                                return part;
                              });
                            };

                            // Hàm tô sáng trực quan đoạn văn bản vừa được AI viết lại
                            const renderParagraphWithHighlight = (text: string) => {
                              const needle = (recentlyRewrittenText || '').trim();
                              if (!needle || !text.includes(needle)) {
                                return renderInlineMarkdown(text);
                              }
                              const chunks = text.split(needle);
                              return (
                                <>
                                  {chunks.map((chunk, cIdx) => (
                                    <React.Fragment key={cIdx}>
                                      {renderInlineMarkdown(chunk)}
                                      {cIdx < chunks.length - 1 && (
                                        <span className="inline-block bg-emerald-500/25 border-l-2 border-emerald-400 text-emerald-200 px-2 py-1 rounded my-1 shadow-md ring-1 ring-emerald-500/50 animate-pulse font-medium">
                                          <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded-full mr-1.5 uppercase tracking-wider">
                                            ✨ Đoạn vừa sửa mới
                                          </span>
                                          {renderInlineMarkdown(needle)}
                                        </span>
                                      )}
                                    </React.Fragment>
                                  ))}
                                </>
                              );
                            };

                            // Tách toàn bộ nội dung thành các khối đoạn văn bản độc lập
                            const rawBlocks = content.split(/\n\s*\n+/);
                            const renderedElements: React.ReactNode[] = [];
                            let galleryIdx = 0;

                            rawBlocks.forEach((raw, bIdx) => {
                              const trimmed = raw.trim();
                              if (!trimmed) return;

                              // 1. Kiểm tra nếu là ảnh xen kẽ
                              const imgMatch = trimmed.match(/📸?\s*\[HÌNH_ẢNH_(\d+):\s*([^\]]+)\]/);
                              if (imgMatch) {
                                const idx = parseInt(imgMatch[1], 10) - 1;
                                const caption = imgMatch[2].trim();
                                const img = gallery[idx] || gallery[galleryIdx];
                                galleryIdx++;

                                renderedElements.push(
                                  <div key={`img-block-${bIdx}`} className="my-3 space-y-1">
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
                                  </div>
                                );
                                return;
                              }

                              // 2. Bỏ qua đường kẻ ngang
                              if (/^[━─—\-_=]{3,}$/.test(trimmed)) {
                                renderedElements.push(<div key={`hr-${bIdx}`} className="my-2 border-t border-slate-800" />);
                                return;
                              }

                              // 3. Khung trích dẫn mở đầu (Hook / Lead) theo chuẩn Zalo OA (giống ảnh mẫu thực tế)
                              if (
                                trimmed.startsWith('✨ Dành riêng') ||
                                trimmed.startsWith('🌟 ') ||
                                trimmed.startsWith('Cùng TourLuk')
                              ) {
                                renderedElements.push(
                                  <blockquote
                                    key={`quote-${bIdx}`}
                                    className="my-3 pl-3.5 pr-3 py-2.5 rounded-r-xl border-l-4 border-indigo-400 bg-slate-800/60 text-slate-200 text-xs italic leading-relaxed shadow-sm"
                                  >
                                    {renderParagraphWithHighlight(trimmed)}
                                  </blockquote>
                                );
                                return;
                              }

                              // 4. Tiêu đề mục (In đậm, có emoji hoặc ngày)
                              const isMarkdownBold = trimmed.startsWith('**') && trimmed.endsWith('**');
                              const cleanHeading = trimmed.replace(/^\*\*|\*\*$/g, '').trim();
                              const isHeadingPattern =
                                /^([💡💎🎯📋⚠️💳👗🌟📌🍁🌉💙✈️👉]|NGÀY\s+\d+|[0-9]+\.\s+)/i.test(cleanHeading) &&
                                cleanHeading.length < 160 &&
                                !cleanHeading.includes('\n');

                              if (isMarkdownBold || isHeadingPattern) {
                                renderedElements.push(
                                  <div key={`heading-${bIdx}`} className="pt-2.5 pb-1">
                                    <h4 className="text-xs font-black text-white tracking-wide flex items-center gap-1.5 uppercase">
                                      {renderParagraphWithHighlight(cleanHeading)}
                                    </h4>
                                  </div>
                                );
                                return;
                              }

                              // 5. Hotline tư vấn
                              if (trimmed.includes('0819 190 101') || trimmed.toLowerCase().includes('hotline')) {
                                renderedElements.push(
                                  <div
                                    key={`hotline-${bIdx}`}
                                    className="p-2.5 my-2 rounded-xl bg-red-950/40 border border-red-500/40 text-xs text-red-200 flex items-center gap-2"
                                  >
                                    <PhoneCall className="w-4 h-4 text-red-400 shrink-0" />
                                    <div>
                                      <span>Hotline / Zalo tư vấn 24/7: </span>
                                      <strong className="text-white font-black tracking-wider text-sm">0819 190 101</strong>
                                    </div>
                                  </div>
                                );
                                return;
                              }

                              // 6. Đường dẫn TourLuk
                              if (trimmed.includes('https://tourluk.com')) {
                                const urlMatch = trimmed.match(/(https:\/\/tourluk\.com[^\s]+)/);
                                const url = urlMatch ? urlMatch[1] : 'https://tourluk.com/au/';
                                renderedElements.push(
                                  <div
                                    key={`link-${bIdx}`}
                                    className="p-2.5 my-2 rounded-xl bg-blue-950/40 border border-blue-500/40 text-xs text-blue-200 flex items-center justify-between gap-2"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Globe className="w-4 h-4 text-blue-400 shrink-0" />
                                      <span className="font-semibold">Khám phá tour trên TourLuk:</span>
                                    </div>
                                    <a
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] flex items-center gap-1 underline underline-offset-2"
                                    >
                                      <span>Xem Tour</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </div>
                                );
                                return;
                              }

                              // 7. Thẻ Hashtags
                              if (trimmed.startsWith('#')) {
                                const tags = trimmed.split(/\s+/).filter(Boolean);
                                renderedElements.push(
                                  <div key={`tags-${bIdx}`} className="flex flex-wrap gap-1.5 pt-2">
                                    {tags.map((tag, tIdx) => (
                                      <span
                                        key={tIdx}
                                        className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px] font-mono"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                );
                                return;
                              }

                              // 8. Đoạn văn bản nội dung thông thường (cách dòng rõ ràng)
                              renderedElements.push(
                                <p key={`p-${bIdx}`} className="text-xs leading-relaxed text-slate-300 my-1.5">
                                  {renderParagraphWithHighlight(trimmed)}
                                </p>
                              );
                            });

                            return renderedElements;
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

