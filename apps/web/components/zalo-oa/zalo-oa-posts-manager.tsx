'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Calendar,
  Clock,
  Eye,
  Heart,
  Share2,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Send,
  Building2,
  Tag,
  Search,
  Filter,
  ExternalLink,
  ChevronRight,
  Smartphone,
  Check,
  RefreshCw,
  FileText,
  Image as ImageIcon,
  Flame,
  Plane,
  Compass,
  Award,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ZaloOaPost {
  id: string;
  title: string;
  excerpt?: string;
  content: string;
  coverUrl?: string;
  category?: string;
  author?: string;
  status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED';
  scheduledAt?: string;
  publishedAt?: string;
  isAiGenerated?: boolean;
  viewsCount: number;
  likesCount: number;
  sharesCount: number;
  createdAt: string;
  createdBy?: {
    id: string;
    name: string;
    code: string;
  };
}

export function ZaloOaPostsManager() {
  const [posts, setPosts] = useState<ZaloOaPost[]>([]);
  const [stats, setStats] = useState<any>({
    total: 0,
    published: 0,
    scheduled: 0,
    draft: 0,
    totalViews: 0,
    totalLikes: 0,
    totalShares: 0,
  });
  const [selectedPost, setSelectedPost] = useState<ZaloOaPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State
  const [formId, setFormId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formExcerpt, setFormExcerpt] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCoverUrl, setFormCoverUrl] = useState('');
  const [formCategory, setFormCategory] = useState('TOUR');
  const [formAuthor, setFormAuthor] = useState('TourLuk Travel Official');
  const [publishMode, setPublishMode] = useState<'NOW' | 'SCHEDULED' | 'DRAFT'>('NOW');
  const [formScheduledAt, setFormScheduledAt] = useState('');
  const [customAiPrompt, setCustomAiPrompt] = useState('');

  // 1. Tải danh sách bài viết
  const loadPosts = async () => {
    setIsLoading(true);
    try {
      let url = '/zalo-oa/posts?';
      if (statusFilter !== 'ALL') url += `status=${statusFilter}&`;
      if (categoryFilter !== 'ALL') url += `category=${categoryFilter}&`;
      if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;

      const res = await fetchApi(url);
      if (res && res.posts) {
        setPosts(res.posts);
        setStats(res.stats);
        if (!selectedPost && res.posts.length > 0) {
          setSelectedPost(res.posts[0]);
        } else if (selectedPost) {
          const updatedSelected = res.posts.find((p: any) => p.id === selectedPost.id);
          if (updatedSelected) setSelectedPost(updatedSelected);
        }
      }
    } catch (e: any) {
      console.error(e);
      setNotification({ type: 'error', message: 'Không thể tải danh sách bài viết Zalo OA' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [statusFilter, categoryFilter]);

  // 2. Mở Modal tạo bài viết mới
  const handleOpenCreateModal = (presetTopic?: string) => {
    setFormId(null);
    setFormTitle('');
    setFormExcerpt('');
    setFormContent('');
    setFormCoverUrl('https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=1200&q=80');
    setFormCategory('TOUR');
    setFormAuthor('TourLuk Travel Official');
    setPublishMode('NOW');

    // Mặc định ngày mai lúc 09:00 sáng
    const tmr = new Date(Date.now() + 86400000);
    tmr.setHours(9, 0, 0, 0);
    const tmrIso = tmr.toISOString().slice(0, 16);
    setFormScheduledAt(tmrIso);
    setCustomAiPrompt('');
    setIsModalOpen(true);

    if (presetTopic) {
      handleTriggerAi(presetTopic);
    }
  };

  // 3. Mở Modal chỉnh sửa
  const handleOpenEditModal = (post: ZaloOaPost) => {
    setFormId(post.id);
    setFormTitle(post.title);
    setFormExcerpt(post.excerpt || '');
    setFormContent(post.content);
    setFormCoverUrl(post.coverUrl || '');
    setFormCategory(post.category || 'TOUR');
    setFormAuthor(post.author || 'TourLuk Travel Official');

    if (post.status === 'SCHEDULED' && post.scheduledAt) {
      setPublishMode('SCHEDULED');
      setFormScheduledAt(new Date(post.scheduledAt).toISOString().slice(0, 16));
    } else if (post.status === 'PUBLISHED') {
      setPublishMode('NOW');
    } else {
      setPublishMode('DRAFT');
    }

    setIsModalOpen(true);
  };

  // 4. Kích hoạt AI tạo nội dung 1-Click
  const handleTriggerAi = async (topic: string) => {
    setIsAiGenerating(true);
    try {
      const res = await fetchApi('/zalo-oa/posts/ai-generate', {
        method: 'POST',
        body: JSON.stringify({
          topic,
          customPrompt: customAiPrompt || undefined,
        }),
      });

      if (res && res.data) {
        setFormTitle(res.data.title);
        setFormExcerpt(res.data.excerpt);
        setFormContent(res.data.content);
        if (res.data.coverUrl) setFormCoverUrl(res.data.coverUrl);
        if (res.data.category) setFormCategory(res.data.category);
        setNotification({
          type: 'success',
          message: '✨ AI TourLuk đã tự động viết bài thành công! Bạn có thể chỉnh sửa trước khi lưu.',
        });
      }
    } catch (e: any) {
      setNotification({ type: 'error', message: 'Lỗi khi gọi AI tạo bài viết' });
    } finally {
      setIsAiGenerating(false);
    }
  };

  // 5. Lưu bài viết (Tạo mới hoặc Cập nhật)
  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert('Vui lòng nhập tiêu đề bài viết');
      return;
    }
    if (!formContent.trim()) {
      alert('Vui lòng nhập nội dung bài viết');
      return;
    }

    setIsSaving(true);
    try {
      let status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' = 'DRAFT';
      let scheduledAt: string | undefined = undefined;

      if (publishMode === 'NOW') {
        status = 'PUBLISHED';
      } else if (publishMode === 'SCHEDULED') {
        status = 'SCHEDULED';
        scheduledAt = new Date(formScheduledAt).toISOString();
      } else {
        status = 'DRAFT';
      }

      const payload = {
        title: formTitle,
        excerpt: formExcerpt,
        content: formContent,
        coverUrl: formCoverUrl,
        category: formCategory,
        author: formAuthor,
        status,
        scheduledAt,
      };

      if (formId) {
        await fetchApi(`/zalo-oa/posts/${formId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setNotification({ type: 'success', message: 'Đã cập nhật bài viết Zalo OA thành công!' });
      } else {
        const created = await fetchApi('/zalo-oa/posts', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setSelectedPost(created);
        setNotification({
          type: 'success',
          message:
            status === 'PUBLISHED'
              ? '✅ Đã xuất bản bài viết lên Zalo OA thành công!'
              : status === 'SCHEDULED'
              ? '⏰ Đã lên lịch hẹn giờ tự động đăng bài lên Zalo OA!'
              : '💾 Đã lưu bản nháp bài viết Zalo OA!',
        });
      }

      setIsModalOpen(false);
      await loadPosts();
    } catch (e: any) {
      setNotification({ type: 'error', message: e.message || 'Lỗi khi lưu bài viết' });
    } finally {
      setIsSaving(false);
    }
  };

  // 6. Xuất bản đăng ngay
  const handlePublishNow = async (id: string) => {
    try {
      const updated = await fetchApi(`/zalo-oa/posts/${id}/publish-now`, { method: 'POST' });
      setSelectedPost(updated);
      setNotification({ type: 'success', message: '✅ Đã đăng bài viết trực tiếp lên Zalo OA thành công!' });
      await loadPosts();
    } catch (e: any) {
      setNotification({ type: 'error', message: e.message || 'Lỗi khi đăng bài' });
    }
  };

  // 7. Xóa bài viết
  const handleDeletePost = async (id: string, title: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa bài viết "${title}" không?`)) return;
    try {
      await fetchApi(`/zalo-oa/posts/${id}`, { method: 'DELETE' });
      setNotification({ type: 'success', message: 'Đã xóa bài viết thành công!' });
      if (selectedPost?.id === id) setSelectedPost(null);
      await loadPosts();
    } catch (e: any) {
      setNotification({ type: 'error', message: e.message || 'Lỗi khi xóa bài viết' });
    }
  };

  const getStatusBadge = (status: string, scheduledAt?: string) => {
    switch (status) {
      case 'PUBLISHED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Đã Xuất Bản
          </span>
        );
      case 'SCHEDULED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
            <Clock className="w-3 h-3 text-sky-400" />
            Hẹn Giờ {scheduledAt ? formatDate(scheduledAt) : ''}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            Bản Nháp
          </span>
        );
    }
  };

  const getCategoryLabel = (cat?: string) => {
    switch (cat) {
      case 'TOUR':
        return { label: 'Tour Du Lịch', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' };
      case 'PROMOTION':
        return { label: 'Khuyến Mãi', color: 'bg-rose-500/15 text-rose-400 border-rose-500/30' };
      case 'HANDBOOK':
        return { label: 'Cẩm Nang Visa', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' };
      default:
        return { label: 'Tin Tức', color: 'bg-slate-500/15 text-slate-400 border-slate-500/30' };
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-4">
      {/* Toast thông báo */}
      {notification && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs animate-fade-in shrink-0 ${
            notification.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-red-950/40 border-red-500/40 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white px-2">
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📊 STATS COUNTER & ACTIONS BAR */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 shrink-0">
        <div className="bg-[#0d1527] border border-[#1a2842] p-3 rounded-xl flex items-center gap-3 shadow-md">
          <div className="h-9 w-9 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="text-base font-black text-white">{stats.total}</div>
            <div className="text-[11px] text-slate-400 font-medium">Tổng Bài Viết</div>
          </div>
        </div>

        <div className="bg-[#0d1527] border border-[#1a2842] p-3 rounded-xl flex items-center gap-3 shadow-md">
          <div className="h-9 w-9 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-base font-black text-emerald-400">{stats.published}</div>
            <div className="text-[11px] text-slate-400 font-medium">Đã Xuất Bản</div>
          </div>
        </div>

        <div className="bg-[#0d1527] border border-[#1a2842] p-3 rounded-xl flex items-center gap-3 shadow-md">
          <div className="h-9 w-9 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-base font-black text-sky-400">{stats.scheduled}</div>
            <div className="text-[11px] text-slate-400 font-medium">Hẹn Giờ Tự Động</div>
          </div>
        </div>

        <div className="bg-[#0d1527] border border-[#1a2842] p-3 rounded-xl flex items-center gap-3 shadow-md">
          <div className="h-9 w-9 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
            <Edit3 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-base font-black text-amber-400">{stats.draft}</div>
            <div className="text-[11px] text-slate-400 font-medium">Bản Nháp</div>
          </div>
        </div>

        <div className="bg-[#0d1527] border border-[#1a2842] p-3 rounded-xl flex items-center gap-3 shadow-md">
          <div className="h-9 w-9 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <div className="text-base font-black text-white">{stats.totalViews}</div>
            <div className="text-[11px] text-slate-400 font-medium">Lượt Xem OA</div>
          </div>
        </div>

        <div className="bg-[#0d1527] border border-[#1a2842] p-3 rounded-xl flex items-center gap-3 shadow-md">
          <div className="h-9 w-9 rounded-lg bg-pink-500/15 text-pink-400 flex items-center justify-center shrink-0">
            <Heart className="w-4 h-4" />
          </div>
          <div>
            <div className="text-base font-black text-pink-400">{stats.totalLikes}</div>
            <div className="text-[11px] text-slate-400 font-medium">Lượt Quan Tâm</div>
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0d1527] p-3 rounded-xl border border-[#1a2842] shrink-0">
        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tiêu đề, nội dung..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadPosts()}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#060a14] border border-[#1a2842] rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-[#060a14] border border-[#1a2842] rounded-lg text-slate-300 focus:outline-none focus:border-red-500 font-medium"
          >
            <option value="ALL">Mọi trạng thái</option>
            <option value="PUBLISHED">Đã xuất bản</option>
            <option value="SCHEDULED">Chờ hẹn giờ</option>
            <option value="DRAFT">Bản nháp</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-[#060a14] border border-[#1a2842] rounded-lg text-slate-300 focus:outline-none focus:border-red-500 font-medium"
          >
            <option value="ALL">Mọi danh mục</option>
            <option value="TOUR">Tour Du Lịch</option>
            <option value="PROMOTION">Khuyến Mãi</option>
            <option value="HANDBOOK">Cẩm Nang Visa</option>
          </select>

          <Button
            onClick={loadPosts}
            className="h-8 px-2.5 bg-[#141f36] hover:bg-[#1e2e50] text-slate-300 text-xs border border-[#223354]"
            title="Làm mới"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Buttons: AI Generator & Create Post */}
        <div className="flex items-center gap-2">
          {/* Quick AI Presets Menu */}
          <div className="hidden lg:flex items-center gap-1.5">
            <Button
              onClick={() => handleOpenCreateModal('TOUR_UC')}
              className="bg-blue-950/50 hover:bg-blue-900/60 text-blue-300 border border-blue-500/30 text-xs h-8 px-2.5 font-semibold"
            >
              🇦🇺 Tour Úc
            </Button>
            <Button
              onClick={() => handleOpenCreateModal('TOUR_AU')}
              className="bg-indigo-950/50 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-500/30 text-xs h-8 px-2.5 font-semibold"
            >
              🏰 Tour Châu Âu
            </Button>
            <Button
              onClick={() => handleOpenCreateModal('PROMO')}
              className="bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 text-xs h-8 px-2.5 font-semibold"
            >
              🔥 Khuyến Mãi
            </Button>
          </div>

          <Button
            onClick={() => handleOpenCreateModal()}
            className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs h-8 px-3.5 shadow-md shadow-red-600/30 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Soạn Bài Mới
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 📱 MAIN SPLIT VIEW: DANH SÁCH BÀI VIẾT (TRÁI) & LIVE MOBILE PREVIEW (PHẢI) */}
      {/* ========================================================================= */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0 overflow-hidden">
        {/* CỘT TRÁI: DANH SÁCH BÀI VIẾT (7 Cols) */}
        <div className="lg:col-span-7 bg-[#0d1527] rounded-2xl border border-[#1a2842] flex flex-col min-h-0 overflow-hidden shadow-lg">
          <div className="p-3.5 border-b border-[#162137] bg-[#090e1c] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-red-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Danh Sách Bài Viết Zalo OA ({posts.length})
              </span>
            </div>
            <span className="text-[11px] text-slate-400">Bấm vào bài để xem trước trên điện thoại 👉</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
            {isLoading ? (
              <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-red-500" />
                <span>Đang tải danh sách bài viết Zalo OA...</span>
              </div>
            ) : posts.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400 space-y-3">
                <div className="h-12 w-12 rounded-xl bg-slate-800/60 text-slate-400 flex items-center justify-center mx-auto">
                  <FileText className="w-6 h-6" />
                </div>
                <p className="font-bold text-slate-200">Chưa có bài viết Zalo OA nào</p>
                <p className="text-[11px] text-slate-400">
                  Hãy bấm vào <strong className="text-white">"Soạn Bài Mới"</strong> hoặc dùng tính năng{' '}
                  <strong className="text-red-400">"✨ AI Viết Bài Tự Động"</strong> để tạo bài viết đầu tiên!
                </p>
                <Button
                  onClick={() => handleOpenCreateModal('TOUR_UC')}
                  className="bg-red-600 hover:bg-red-500 text-white text-xs h-8 px-4"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Thử AI Viết Bài Tour Úc
                </Button>
              </div>
            ) : (
              posts.map((post) => {
                const isSelected = selectedPost?.id === post.id;
                const cat = getCategoryLabel(post.category);

                return (
                  <div
                    key={post.id}
                    onClick={() => setSelectedPost(post)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer group ${
                      isSelected
                        ? 'bg-[#15233e] border-red-500/60 shadow-lg shadow-red-500/10'
                        : 'bg-[#090e1c] border-[#162137] hover:border-[#223354] hover:bg-[#0d1629]'
                    }`}
                  >
                    <div className="flex gap-3.5">
                      {/* Cover Thumbnail */}
                      <div className="relative w-24 h-20 rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-[#1a2842]">
                        <img
                          src={post.coverUrl || 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=400&q=80'}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <span className={`absolute top-1 left-1 px-1.5 py-0.2 rounded text-[9px] font-bold border ${cat.color}`}>
                          {cat.label}
                        </span>
                      </div>

                      {/* Content Info */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            {getStatusBadge(post.status, post.scheduledAt)}
                            <span className="text-[11px] text-slate-500 font-mono">
                              {formatDate(post.createdAt)}
                            </span>
                          </div>

                          <h3 className="text-xs font-bold text-white line-clamp-2 leading-relaxed group-hover:text-red-300 transition-colors">
                            {post.title}
                          </h3>

                          {post.excerpt && (
                            <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{post.excerpt}</p>
                          )}
                        </div>

                        {/* Bottom Stats & Actions */}
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#141f36]">
                          <div className="flex items-center gap-3 text-[11px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3 text-slate-500" />
                              {post.viewsCount || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <Heart className="w-3 h-3 text-pink-500/70" />
                              {post.likesCount || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <Share2 className="w-3 h-3 text-blue-500/70" />
                              {post.sharesCount || 0}
                            </span>
                          </div>

                          {/* Quick Action Buttons */}
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {post.status !== 'PUBLISHED' && (
                              <Button
                                onClick={() => handlePublishNow(post.id)}
                                className="h-6 px-2 text-[10px] font-bold bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40"
                                title="Đăng ngay lập tức lên Zalo OA"
                              >
                                ⚡ Đăng Ngay
                              </Button>
                            )}

                            <Button
                              onClick={() => handleOpenEditModal(post)}
                              className="h-6 w-6 p-0 bg-[#16223a] hover:bg-[#203154] text-slate-300 border border-[#233558]"
                              title="Chỉnh sửa bài viết"
                            >
                              <Edit3 className="w-3 h-3" />
                            </Button>

                            <Button
                              onClick={() => handleDeletePost(post.id, post.title)}
                              className="h-6 w-6 p-0 bg-red-950/30 hover:bg-red-900/50 text-red-400 border border-red-500/30"
                              title="Xóa bài viết"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* CỘT PHẢI: KHUNG XEM TRƯỚC LIVE MOBILE PHONE MOCKUP (5 Cols) */}
        <div className="lg:col-span-5 bg-[#0d1527] rounded-2xl border border-[#1a2842] flex flex-col min-h-0 overflow-hidden shadow-lg">
          <div className="p-3.5 border-b border-[#162137] bg-[#090e1c] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Xem Trước Trên Điện Thoại (Zalo App)
              </span>
            </div>
            {selectedPost && getStatusBadge(selectedPost.status, selectedPost.scheduledAt)}
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center bg-[#060a14]">
            {selectedPost ? (
              /* PHONE FRAME CONTAINER */
              <div className="w-full max-w-[340px] bg-slate-950 rounded-[38px] p-2.5 shadow-2xl border-[4px] border-slate-700/80 relative">
                {/* Dynamic Island / Notch */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-4 bg-black rounded-full z-20 flex items-center justify-end px-2">
                  <div className="w-2 h-2 rounded-full bg-blue-900/80 animate-pulse" />
                </div>

                {/* Status Bar */}
                <div className="flex items-center justify-between px-5 pt-2 pb-1 text-[10px] font-bold text-slate-300 z-10 select-none">
                  <span>09:41</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px]">5G</span>
                    <div className="w-4 h-2 border border-slate-400 rounded-sm p-0.5 flex items-center">
                      <div className="w-full h-full bg-slate-200 rounded-2xs" />
                    </div>
                  </div>
                </div>

                {/* ZALO OA APP HEADER */}
                <div className="bg-[#0068ff] text-white px-3 py-2 rounded-t-[26px] flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-2 min-w-0">
                    <button className="text-xs font-bold px-1">‹</button>
                    <div className="truncate">
                      <div className="text-[11px] font-bold leading-tight truncate flex items-center gap-1">
                        TourLuk Travel Official
                        <Check className="w-2.5 h-2.5 bg-amber-400 text-slate-900 rounded-full p-0.5 inline-block" />
                      </div>
                      <div className="text-[9px] text-blue-100 font-medium">Zalo Official Account</div>
                    </div>
                  </div>
                  <button className="text-[10px] bg-white/20 hover:bg-white/30 text-white font-bold px-2 py-0.5 rounded-full shrink-0">
                    Quan tâm
                  </button>
                </div>

                {/* PHONE INNER ARTICLE BODY (SCROLLABLE) */}
                <div className="bg-[#111927] text-slate-100 h-[480px] overflow-y-auto rounded-b-[26px] p-3 text-xs space-y-3">
                  {/* Cover Photo */}
                  <div className="w-full h-40 rounded-xl overflow-hidden bg-slate-900 shadow-md border border-slate-800 relative">
                    <img
                      src={selectedPost.coverUrl || 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=800&q=80'}
                      alt={selectedPost.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-semibold text-white">
                      {getCategoryLabel(selectedPost.category).label}
                    </div>
                  </div>

                  {/* Article Title */}
                  <h1 className="text-sm font-black text-white leading-snug">
                    {selectedPost.title}
                  </h1>

                  {/* Author & Timestamp */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <img src="/logo.jpg" className="w-4 h-4 rounded-full border border-red-500" alt="Avatar" />
                      <span className="font-bold text-slate-200">{selectedPost.author || 'TourLuk Travel'}</span>
                    </div>
                    <span>{formatDate(selectedPost.publishedAt || selectedPost.createdAt)}</span>
                  </div>

                  {/* Excerpt */}
                  {selectedPost.excerpt && (
                    <div className="p-2.5 rounded-lg bg-blue-950/30 border-l-2 border-blue-500 text-[11px] text-blue-200 italic leading-relaxed">
                      "{selectedPost.excerpt}"
                    </div>
                  )}

                  {/* Main Rich Content */}
                  <div className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap font-sans space-y-2">
                    {selectedPost.content}
                  </div>

                  {/* Call To Action Banner */}
                  <div className="p-3 rounded-xl bg-gradient-to-r from-blue-900/60 to-indigo-900/60 border border-blue-500/40 text-center space-y-2 mt-4 shadow-lg">
                    <p className="text-[11px] font-bold text-white">
                      💬 Nhắn tin ngay qua Zalo OA để nhận lịch khởi hành & ưu đãi!
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <button className="bg-[#0068ff] hover:bg-blue-600 text-white font-bold text-[10px] px-3 py-1.5 rounded-full shadow flex items-center gap-1">
                        <Send className="w-2.5 h-2.5" />
                        Nhắn Tin Zalo OA
                      </button>
                      <button className="bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] px-3 py-1.5 rounded-full shadow">
                        📞 Hotline 1900 6868
                      </button>
                    </div>
                  </div>

                  {/* Reactions & Engagement footer */}
                  <div className="flex items-center justify-between pt-3 text-[10px] text-slate-400 border-t border-slate-800">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3 text-slate-500" />
                        {selectedPost.viewsCount || 0} lượt xem
                      </span>
                      <span className="flex items-center gap-1 text-pink-400">
                        <Heart className="w-3 h-3 fill-pink-400" />
                        {selectedPost.likesCount || 0}
                      </span>
                    </div>
                    <span className="flex items-center gap-1 text-blue-400 cursor-pointer">
                      <Share2 className="w-3 h-3" />
                      Chia sẻ
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-xs text-slate-500 p-8">
                <Smartphone className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <span>Chọn một bài viết ở cột bên trái để xem trước</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 📝 MODAL SOẠN THẢO BÀI VIẾT & AI TOUR GENERATOR */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-[#0d1527] border border-[#1a2842] rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#162137] bg-[#090e1c] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-red-600 to-rose-600 text-white flex items-center justify-center font-bold shadow-md shadow-red-600/30">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white">
                    {formId ? 'Chỉnh Sửa Bài Viết Zalo OA' : 'Soạn Thảo & Đăng Bài Tự Động Cho Zalo OA'}
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Tích hợp AI TourLuk tự động viết bài, hẹn giờ đăng tự động và chuẩn SEO Zalo Official Account
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-base font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSavePost} className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* ✨ AI ONE-CLICK CONTENT GENERATOR BAR */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-950/40 via-purple-950/30 to-indigo-950/40 border border-blue-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                    AI TourLuk Content Generator (1-Click Tự Động Viết Bài)
                  </span>
                  {isAiGenerating && (
                    <span className="text-[11px] text-amber-400 font-semibold flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      AI đang sáng tạo nội dung...
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    disabled={isAiGenerating}
                    onClick={() => handleTriggerAi('TOUR_UC')}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 transition-all"
                  >
                    🇦🇺 Tour Úc 6N5Đ
                  </button>
                  <button
                    type="button"
                    disabled={isAiGenerating}
                    onClick={() => handleTriggerAi('TOUR_AU')}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 transition-all"
                  >
                    🏰 Tour Châu Âu 5 Nước
                  </button>
                  <button
                    type="button"
                    disabled={isAiGenerating}
                    onClick={() => handleTriggerAi('TOUR_A')}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 transition-all"
                  >
                    🍁 Tour Nhật Bản Mùa Lá Đỏ
                  </button>
                  <button
                    type="button"
                    disabled={isAiGenerating}
                    onClick={() => handleTriggerAi('PROMO')}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 transition-all"
                  >
                    🔥 Khuyến Mãi Nhóm
                  </button>
                  <button
                    type="button"
                    disabled={isAiGenerating}
                    onClick={() => handleTriggerAi('VISA')}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 transition-all"
                  >
                    🛂 Bí Quyết Visa Đậu 99%
                  </button>
                </div>

                {/* Custom Prompt Input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Hoặc nhập chủ đề bạn muốn (ví dụ: Tour Thái Lan Tết, Tour Hàn Quốc ngắm hoa anh đào...)"
                    value={customAiPrompt}
                    onChange={(e) => setCustomAiPrompt(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs bg-[#060a14] border border-blue-500/30 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-400"
                  />
                  <Button
                    type="button"
                    disabled={isAiGenerating}
                    onClick={() => handleTriggerAi('CUSTOM')}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-8 px-3 shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                    Viết Bài Ngay
                  </Button>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                {/* Title */}
                <div className="md:col-span-8 space-y-1">
                  <label className="text-xs font-bold text-slate-300">
                    Tiêu đề bài viết Zalo OA <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Ví dụ: TOUR ÚC MÙA XUÂN 2026: SYDNEY - MELBOURNE 6N5Đ..."
                    className="w-full px-3 py-2 text-xs bg-[#060a14] border border-[#1a2842] rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500 font-medium"
                  />
                </div>

                {/* Category */}
                <div className="md:col-span-4 space-y-1">
                  <label className="text-xs font-bold text-slate-300">Danh mục bài viết</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#060a14] border border-[#1a2842] rounded-xl text-white focus:outline-none focus:border-red-500 font-medium"
                  >
                    <option value="TOUR">Tour Du Lịch</option>
                    <option value="PROMOTION">Khuyến Mãi & Ưu Đãi</option>
                    <option value="HANDBOOK">Cẩm Nang & Visa</option>
                    <option value="NEWS">Tin Tức Hoạt Động</option>
                  </select>
                </div>

                {/* Excerpt */}
                <div className="md:col-span-12 space-y-1">
                  <label className="text-xs font-bold text-slate-300">Tóm tắt ngắn (Trích dẫn hiển thị trước)</label>
                  <input
                    type="text"
                    value={formExcerpt}
                    onChange={(e) => setFormExcerpt(e.target.value)}
                    placeholder="Đoạn văn 1-2 câu ngắn gọn hấp dẫn thu hút người đọc..."
                    className="w-full px-3 py-2 text-xs bg-[#060a14] border border-[#1a2842] rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500 font-medium"
                  />
                </div>

                {/* Cover URL */}
                <div className="md:col-span-8 space-y-1">
                  <label className="text-xs font-bold text-slate-300">Link ảnh bìa Cover (URL hình ảnh chất lượng cao)</label>
                  <input
                    type="text"
                    value={formCoverUrl}
                    onChange={(e) => setFormCoverUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 text-xs bg-[#060a14] border border-[#1a2842] rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>

                {/* Author */}
                <div className="md:col-span-4 space-y-1">
                  <label className="text-xs font-bold text-slate-300">Tác giả bài viết</label>
                  <input
                    type="text"
                    value={formAuthor}
                    onChange={(e) => setFormAuthor(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#060a14] border border-[#1a2842] rounded-xl text-white focus:outline-none focus:border-red-500 font-medium"
                  />
                </div>

                {/* Main Content */}
                <div className="md:col-span-12 space-y-1">
                  <label className="text-xs font-bold text-slate-300">
                    Nội dung chi tiết bài viết Zalo OA <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    required
                    rows={10}
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    placeholder="Nội dung lịch trình, các điểm đến, giá tour, chính sách ưu đãi, hashtag..."
                    className="w-full px-3 py-2.5 text-xs bg-[#060a14] border border-[#1a2842] rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500 font-sans leading-relaxed"
                  />
                </div>

                {/* Publishing Options / Auto-Scheduling */}
                <div className="md:col-span-12 p-3.5 rounded-xl bg-[#090e1c] border border-[#162137] space-y-3">
                  <label className="text-xs font-bold text-white block">
                    ⏰ Hình thức phát hành bài viết lên Zalo OA
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label
                      className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                        publishMode === 'NOW'
                          ? 'bg-emerald-950/40 border-emerald-500/60 text-white'
                          : 'bg-[#060a14] border-[#162137] text-slate-400 hover:text-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="publishMode"
                        checked={publishMode === 'NOW'}
                        onChange={() => setPublishMode('NOW')}
                        className="text-emerald-500"
                      />
                      <div>
                        <div className="text-xs font-bold flex items-center gap-1 text-emerald-400">
                          ⚡ Đăng Ngay Lập Tức
                        </div>
                        <div className="text-[10px] text-slate-400">Xuất bản bài viết lên Zalo OA ngay</div>
                      </div>
                    </label>

                    <label
                      className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                        publishMode === 'SCHEDULED'
                          ? 'bg-sky-950/40 border-sky-500/60 text-white'
                          : 'bg-[#060a14] border-[#162137] text-slate-400 hover:text-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="publishMode"
                        checked={publishMode === 'SCHEDULED'}
                        onChange={() => setPublishMode('SCHEDULED')}
                        className="text-sky-500"
                      />
                      <div>
                        <div className="text-xs font-bold flex items-center gap-1 text-sky-400">
                          ⏰ Hẹn Giờ Tự Động Đăng
                        </div>
                        <div className="text-[10px] text-slate-400">Tự động đăng theo ngày giờ đã chọn</div>
                      </div>
                    </label>

                    <label
                      className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                        publishMode === 'DRAFT'
                          ? 'bg-amber-950/40 border-amber-500/60 text-white'
                          : 'bg-[#060a14] border-[#162137] text-slate-400 hover:text-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="publishMode"
                        checked={publishMode === 'DRAFT'}
                        onChange={() => setPublishMode('DRAFT')}
                        className="text-amber-500"
                      />
                      <div>
                        <div className="text-xs font-bold flex items-center gap-1 text-amber-400">
                          💾 Lưu Bản Nháp
                        </div>
                        <div className="text-[10px] text-slate-400">Lưu lại để chỉnh sửa sau</div>
                      </div>
                    </label>
                  </div>

                  {/* Scheduled Date/Time picker */}
                  {publishMode === 'SCHEDULED' && (
                    <div className="p-3 bg-[#060a14] rounded-lg border border-sky-500/30 flex flex-col sm:flex-row sm:items-center gap-3">
                      <Clock className="w-4 h-4 text-sky-400 shrink-0" />
                      <div className="flex-1">
                        <label className="text-xs font-semibold text-sky-300 block mb-1">
                          Chọn Ngày & Giờ Hệ Thống Tự Động Đăng Bài:
                        </label>
                        <input
                          type="datetime-local"
                          required
                          value={formScheduledAt}
                          onChange={(e) => setFormScheduledAt(e.target.value)}
                          className="px-3 py-1.5 text-xs bg-[#0d1527] border border-sky-500/40 rounded-lg text-white font-mono focus:outline-none"
                        />
                      </div>
                      <span className="text-[11px] text-slate-400 italic">
                        Bài viết sẽ tự động chuyển sang "Đã Xuất Bản" đúng thời điểm này!
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#162137]">
                <Button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-[#141f36] hover:bg-[#1e2e50] text-slate-300 text-xs h-9 px-4"
                >
                  Hủy Bỏ
                </Button>

                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs h-9 px-5 shadow-lg shadow-red-600/30 flex items-center gap-1.5"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Đang Lưu...
                    </>
                  ) : publishMode === 'NOW' ? (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Xuất Bản Đăng Bài Ngay
                    </>
                  ) : publishMode === 'SCHEDULED' ? (
                    <>
                      <Clock className="w-3.5 h-3.5" />
                      Lên Lịch Hẹn Giờ Tự Động
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Lưu Bản Nháp
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
