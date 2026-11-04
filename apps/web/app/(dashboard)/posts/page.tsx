'use client';

import React, { useState, useEffect } from 'react';
import {
  Share2,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Users,
  Image as ImageIcon,
  Link as LinkIcon,
  Clock,
  Sparkles,
  Eye,
  Trash2,
  Smartphone,
  ThumbsUp,
  MessageCircle,
  Send,
  Calendar,
  CheckSquare,
  Square,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Building2,
  ScrollText,
  FileSpreadsheet,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { DemoBadge } from '@/components/ui/demo-badge';
import { fetchApi } from '@/lib/api';
import { formatDate, formatShortDate } from '@/lib/utils';
import { ZaloOaPostsManager } from '@/components/zalo-oa/zalo-oa-posts-manager';
import { TourContentManager } from '@/components/zalo-oa/tour-content-manager';
import { TourArticleWorkflow } from '@/components/zalo-oa/tour-article-workflow';

interface SaleAccount {
  id: string;
  code: string;
  name: string;
  phone: string;
  avatarUrl: string;
  teamName: string;
  zaloAccountName: string;
  zaloPhone: string;
  connectionStatus: string;
  isConnected: boolean;
  isVerified: boolean;
}

interface BroadcastPost {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  linkUrl?: string;
  status: string;
  scheduledAt?: string;
  publishedAt?: string;
  totalTarget: number;
  successCount: number;
  failedCount: number;
  createdAt: string;
  createdBy?: { id: string; name: string; code: string };
  targets: Array<{
    id: string;
    status: string;
    zaloPostUrl?: string;
    likesCount: number;
    commentsCount: number;
    publishedAt?: string;
    user: {
      id: string;
      name: string;
      code: string;
      avatarUrl?: string;
      zaloAccountName?: string;
      phone?: string;
    };
  }>;
}

const SAMPLE_IMAGES = [
  {
    name: 'Banner Khuyến Mãi Mùa Mới',
    url: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Sản Phẩm Cao Cấp',
    url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Bộ Quà Tặng Tri Ân Khách Hàng',
    url: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Thông Báo Chính Sách Mới',
    url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80',
  },
];

export type PostTab = 'workflow' | 'tour' | 'oa' | 'personal';

export default function PostsPage() {
  const [activeTab, setActiveTab] = useState<PostTab>('workflow');
  const [posts, setPosts] = useState<BroadcastPost[]>([]);
  const [availableAccounts, setAvailableAccounts] = useState<SaleAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Create Post Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form fields
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postImageUrl, setPostImageUrl] = useState('');
  const [postLinkUrl, setPostLinkUrl] = useState('');
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');

  // Preview target account for smartphone mockup
  const [previewAccountIndex, setPreviewAccountIndex] = useState(0);

  // Detail Modal State
  const [selectedPost, setSelectedPost] = useState<BroadcastPost | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [postsRes, accountsRes] = await Promise.all([
        fetchApi('/zalo-posts'),
        fetchApi('/zalo-posts/accounts'),
      ]);
      setPosts(postsRes || []);
      setAvailableAccounts(accountsRes || []);

      // Default select all accounts
      if (accountsRes && accountsRes.length > 0) {
        setSelectedAccountIds(accountsRes.map((a: SaleAccount) => a.id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    if (typeof window !== 'undefined') {
      const handleUrlTab = () => {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        if (tab === 'oa' || tab === 'tour' || tab === 'workflow' || tab === 'personal') {
          setActiveTab(tab as PostTab);
        } else {
          setActiveTab('workflow');
        }
      };
      handleUrlTab();
      window.addEventListener('popstate', handleUrlTab);
      return () => window.removeEventListener('popstate', handleUrlTab);
    }
  }, []);

  const handleSwitchTab = (tab: PostTab) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.pushState({}, '', url.toString());
    }
  };

  // Toggle select all accounts
  const handleToggleSelectAll = () => {
    if (selectedAccountIds.length === availableAccounts.length) {
      setSelectedAccountIds([]);
    } else {
      setSelectedAccountIds(availableAccounts.map((a) => a.id));
    }
  };

  // Toggle single account
  const handleToggleAccount = (id: string) => {
    if (selectedAccountIds.includes(id)) {
      setSelectedAccountIds(selectedAccountIds.filter((item) => item !== id));
    } else {
      setSelectedAccountIds([...selectedAccountIds, id]);
    }
  };

  // Submit create & publish post
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim() || !postContent.trim()) {
      alert('Vui lòng nhập đầy đủ tiêu đề và nội dung bài đăng!');
      return;
    }

    if (selectedAccountIds.length === 0) {
      alert('Vui lòng chọn ít nhất 1 tài khoản Zalo để đăng bài!');
      return;
    }

    setIsSubmitting(true);
    try {
      await fetchApi('/zalo-posts', {
        method: 'POST',
        body: JSON.stringify({
          title: postTitle.trim(),
          content: postContent.trim(),
          imageUrl: postImageUrl.trim() || undefined,
          linkUrl: postLinkUrl.trim() || undefined,
          targetAccountIds: selectedAccountIds,
          scheduledAt: isScheduled && scheduledDate ? scheduledDate : undefined,
        }),
      });

      // Reset form
      setPostTitle('');
      setPostContent('');
      setPostImageUrl('');
      setPostLinkUrl('');
      setIsScheduled(false);
      setScheduledDate('');
      setIsModalOpen(false);

      // Reload
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Đã có lỗi xảy ra khi đăng bài đồng loạt.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete post
  const handleDeletePost = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bài đăng đồng loạt này không?')) return;
    try {
      await fetchApi(`/zalo-posts/${id}`, { method: 'DELETE' });
      setPosts(posts.filter((p) => p.id !== id));
      if (selectedPost?.id === id) setSelectedPost(null);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xóa bài đăng.');
    }
  };

  // Retry post
  const handleRetryPost = async (id: string) => {
    try {
      const updated = await fetchApi(`/zalo-posts/${id}/retry`, { method: 'POST' });
      setPosts(posts.map((p) => (p.id === id ? updated : p)));
      if (selectedPost?.id === id) setSelectedPost(updated);
      alert('Đã đăng thành công lại cho các tài khoản!');
    } catch (err: any) {
      alert(err.message || 'Lỗi khi đăng lại.');
    }
  };

  // Filtered posts
  const filteredPosts = posts.filter((p) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return p.title.toLowerCase().includes(s) || p.content.toLowerCase().includes(s);
  });

  const activeAccountsCount = availableAccounts.length;
  const totalPublishedPosts = posts.length;
  const totalAccountPublications = posts.reduce((acc, p) => acc + p.totalTarget, 0);
  const totalSimulatedLikes = posts.reduce(
    (acc, p) => acc + p.targets.reduce((tAcc, t) => tAcc + (t.likesCount || 0), 0),
    0
  );

  const previewAccount =
    availableAccounts[previewAccountIndex] || availableAccounts[0] || {
      name: 'Nhân viên Sale',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sale',
      zaloAccountName: 'Zalo Sale Doanh Nghiệp',
    };

  return (
    <div className="space-y-6">
      {/* Top Hub Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-[#162035]">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 text-white flex items-center justify-center shadow-md shadow-red-500/20">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Trung Tâm Quản Lý Đăng Bài & Nội Dung
                </h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-700/60">
                  Control Hub
                </span>
                <DemoBadge />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Kiểm soát tập trung: Đăng bài đồng loạt nick Sale cá nhân, Đăng bài & hẹn giờ Zalo OA, Kế hoạch Tour và Kho ảnh Google Drive.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Button for Sale Broadcast Tab */}
        {activeTab === 'personal' && (
          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="gap-1.5 border-slate-300 dark:border-[#1e2c47] bg-white dark:bg-[#090e1c] text-slate-700 dark:text-slate-300"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Làm mới</span>
            </Button>

            <Button
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white gap-1.5 shadow-md shadow-red-600/20 font-bold"
            >
              <Plus className="h-4 w-4" />
              <span>Tạo Bài Đăng Đồng Loạt</span>
            </Button>
          </div>
        )}
      </div>

      {/* Modern High-Contrast Tab Switcher */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 bg-slate-100 dark:bg-[#070b16] p-1.5 rounded-2xl border border-slate-200 dark:border-[#162035]">
        <button
          onClick={() => handleSwitchTab('workflow')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'workflow'
              ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white shadow-md shadow-red-600/25'
              : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-[#121c32]'
          }`}
        >
          <ScrollText className="h-4 w-4" />
          <span>✍️ Duyệt Bài Đăng Tour (Từ Sheet & Drive)</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === 'workflow'
                ? 'bg-white/20 text-white'
                : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
            }`}
          >
            Chờ Duyệt
          </span>
        </button>

        <button
          onClick={() => handleSwitchTab('tour')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'tour'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/25'
              : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-[#121c32]'
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>📅 Kế Hoạch Tour & Ảnh Drive (TourLuk)</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === 'tour'
                ? 'bg-white/20 text-white'
                : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
            }`}
          >
            Drive
          </span>
        </button>

        <button
          onClick={() => handleSwitchTab('oa')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'oa'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
              : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-[#121c32]'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>🏢 Soạn Bài & Hẹn Giờ Zalo OA</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === 'oa'
                ? 'bg-white/20 text-white'
                : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
            }`}
          >
            OA
          </span>
        </button>

        <button
          onClick={() => handleSwitchTab('personal')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'personal'
              ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-600/25'
              : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-[#121c32]'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>📱 Đăng Bài Sale Cá Nhân (Đồng Loạt)</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === 'personal'
                ? 'bg-white/20 text-white'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            {posts.length}
          </span>
        </button>
      </div>

      {/* TAB 1: DUYỆT BÀI ĐĂNG TOUR (WORKFLOW: TỪ SHEET & DRIVE) */}
      {activeTab === 'workflow' && <TourArticleWorkflow />}

      {/* TAB 2: KẾ HOẠCH TOUR & GOOGLE DRIVE MANAGER */}
      {activeTab === 'tour' && <TourContentManager />}

      {/* TAB 3: SOẠN BÀI & HẸN GIỜ ZALO OA */}
      {activeTab === 'oa' && <ZaloOaPostsManager />}

      {/* TAB 4: PERSONAL SALE BROADCAST */}
      {activeTab === 'personal' && (
        <div className="space-y-6">
          {/* Stats Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 bg-white dark:bg-[#0d1527] border-slate-200 dark:border-[#1e2c47] shadow-xs">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Share2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Chiến Dịch Đã Đăng</p>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{totalPublishedPosts} bài viết</h3>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-white dark:bg-[#0d1527] border-slate-200 dark:border-[#1e2c47] shadow-xs">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Tài Khoản Zalo Sẵn Sàng</p>
                  <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{activeAccountsCount} tài khoản</h3>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-white dark:bg-[#0d1527] border-slate-200 dark:border-[#1e2c47] shadow-xs">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Lượt Đăng Lên Zalo</p>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{totalAccountPublications} lượt đăng</h3>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-white dark:bg-[#0d1527] border-slate-200 dark:border-[#1e2c47] shadow-xs">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <ThumbsUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Lượt Tương Tác Nhật Ký</p>
                  <h3 className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-0.5">{totalSimulatedLikes} tương tác</h3>
                </div>
              </div>
            </Card>
          </div>

          {/* Main Posts Feed / List */}
          <Card className="bg-white dark:bg-[#0d1527] border-slate-200 dark:border-[#1e2c47] overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 dark:border-[#1e2c47] flex flex-col sm:flex-row items-center justify-between gap-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Danh Sách Bài Đăng Đồng Loạt ({filteredPosts.length})
              </h3>

              <div className="w-full sm:w-72">
                <input
                  type="text"
                  placeholder="Tìm kiếm bài đăng theo tiêu đề, nội dung..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-[#080d19] border border-slate-200 dark:border-[#1e2c47] rounded-lg focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white transition-all"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="p-12 text-center text-slate-400">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
                <p className="text-xs">Đang tải danh sách bài đăng...</p>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="p-12 text-center">
                <Share2 className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Chưa có bài đăng đồng loạt nào</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Bấm vào nút &quot;Tạo Bài Đăng Đồng Loạt&quot; để soạn bài viết và đăng đồng thời lên Nhật ký Zalo của các nhân viên.
                </p>
                <Button
                  size="sm"
                  onClick={() => setIsModalOpen(true)}
                  className="mt-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs gap-1.5 font-bold shadow-md shadow-red-600/20"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Soạn Bài Đăng Đầu Tiên</span>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-[#16223b]">
                {filteredPosts.map((post) => {
                  const isScheduledPost = post.status === 'SCHEDULED';
                  return (
                    <div key={post.id} className="p-5 hover:bg-slate-50/60 dark:hover:bg-[#111c34]/50 transition-colors">
                      <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
                        {/* Post Content Column */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                                isScheduledPost
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/50'
                              }`}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                              {isScheduledPost ? 'LÊN LỊCH ĐĂNG' : 'ĐÃ ĐĂNG ĐỒNG LOẠT'}
                            </span>

                            <span className="text-[11px] text-slate-400 dark:text-slate-500">
                              {formatDate(post.publishedAt || post.createdAt)}
                            </span>

                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              Người tạo: <strong className="text-slate-700 dark:text-slate-200">{post.createdBy?.name || 'Quản trị viên'}</strong>
                            </span>
                          </div>

                          <h4 className="text-base font-bold text-slate-900 dark:text-white">{post.title}</h4>

                          <p className="text-xs text-slate-700 dark:text-slate-300 mt-2 whitespace-pre-line leading-relaxed max-w-3xl">
                            {post.content}
                          </p>

                          {post.linkUrl && (
                            <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                              <LinkIcon className="h-3.5 w-3.5" />
                              <a href={post.linkUrl} target="_blank" rel="noreferrer" className="truncate max-w-md">
                                {post.linkUrl}
                              </a>
                            </div>
                          )}

                          {/* Attached Image Preview if any */}
                          {post.imageUrl && (
                            <div className="mt-3">
                              <img
                                src={post.imageUrl}
                                alt={post.title}
                                className="h-36 w-60 object-cover rounded-xl border border-slate-200 dark:border-[#1e2c47] shadow-2xs"
                              />
                            </div>
                          )}

                          {/* Targeted Accounts Summary */}
                          <div className="mt-4 p-3 bg-slate-50 dark:bg-[#080d19] border border-slate-200/80 dark:border-[#1e2c47] rounded-xl">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                Đã đăng lên {post.successCount}/{post.totalTarget} tài khoản Zalo nhân viên:
                              </span>
                              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                                ✓ Hoàn tất 100%
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              {post.targets.map((t) => (
                                <div
                                  key={t.id}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-[#121c32] border border-slate-200 dark:border-[#223354] rounded-lg text-xs shadow-2xs"
                                >
                                  <img
                                    src={t.user.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sale'}
                                    alt={t.user.name}
                                    className="h-4 w-4 rounded-full border border-slate-200 dark:border-slate-700 object-cover"
                                  />
                                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">{t.user.name}</span>
                                  <span className="text-[10px] text-slate-400">({t.user.code})</span>
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold ml-0.5">✓</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Post Actions & Metrics */}
                        <div className="flex flex-row lg:flex-col items-end gap-2 shrink-0">
                          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#080d19] p-2 rounded-xl border border-slate-200 dark:border-[#1e2c47] mb-2">
                            <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                              <ThumbsUp className="h-3.5 w-3.5" />
                              {post.targets.reduce((acc, t) => acc + (t.likesCount || 0), 0)} thích
                            </span>
                            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold">
                              <MessageCircle className="h-3.5 w-3.5" />
                              {post.targets.reduce((acc, t) => acc + (t.commentsCount || 0), 0)} bình luận
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedPost(post)}
                              className="h-8 text-xs gap-1 border-slate-300 dark:border-[#1e2c47] bg-white dark:bg-[#090e1c] text-slate-700 dark:text-slate-300"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Chi tiết</span>
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeletePost(post.id)}
                              className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 border-rose-200 dark:border-rose-900/40"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* CREATE & BROADCAST POST MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title="Soạn & Đăng Bài Đồng Loạt Lên Nhật Ký Zalo"
        description="Đăng cùng lúc bài viết này lên Nhật ký Zalo của tất cả hoặc từng tài khoản nhân viên bạn chỉ định."
        maxWidth="3xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT COLUMN: FORM INPUTS (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tiêu đề chiến dịch / bài đăng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Giới thiệu bộ sản phẩm mới tháng này & ưu đãi 15%"
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Nội dung bài viết trên Nhật ký Zalo <span className="text-rose-500">*</span></span>
                  <span className="text-[11px] font-normal text-slate-400">{postContent.length} ký tự</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Nhập nội dung bài đăng (hỗ trợ xuống dòng, icon emoji, hashtag)...&#10;Ví dụ: 🎉 Chào tháng mới! Bên em vừa cập bến lô hàng chính hãng siêu hot. Anh chị em inbox hoặc liên hệ Zalo ngay để nhận báo giá chiết khấu tốt nhất nhé! ❤️"
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all leading-relaxed"
                />
              </div>

              {/* Image Attachment */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Hình ảnh đính kèm bài viết (URL ảnh)
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="url"
                      placeholder="https://..."
                      value={postImageUrl}
                      onChange={(e) => setPostImageUrl(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                  {postImageUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPostImageUrl('')}
                      className="text-xs h-8 text-slate-500"
                    >
                      Bỏ ảnh
                    </Button>
                  )}
                </div>

                {/* Sample Images Picker */}
                <div className="mt-2">
                  <span className="text-[10px] text-slate-400 font-medium">Hoặc chọn nhanh ảnh mẫu có sẵn:</span>
                  <div className="flex items-center gap-2 mt-1 overflow-x-auto pb-1">
                    {SAMPLE_IMAGES.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPostImageUrl(img.url)}
                        className={`text-[10px] px-2 py-1 rounded-lg border text-left truncate max-w-[130px] transition-all ${
                          postImageUrl === img.url
                            ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {img.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Link Attachment */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Liên kết website hoặc báo giá (Tùy chọn)
                </label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="url"
                    placeholder="https://example.com/san-pham"
                    value={postLinkUrl}
                    onChange={(e) => setPostLinkUrl(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* SELECT ACCOUNTS SECTION - CORE USER REQUIREMENT */}
              <div className="pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-800">
                      Chọn tài khoản Zalo nhân viên để đăng bài <span className="text-rose-500">*</span>
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Chị có thể bấm <strong>"Chọn tất cả"</strong> hoặc tích chọn riêng từng nhân viên theo ý muốn.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors"
                  >
                    {selectedAccountIds.length === availableAccounts.length ? (
                      <>
                        <CheckSquare className="h-3.5 w-3.5" />
                        <span>Bỏ chọn tất cả</span>
                      </>
                    ) : (
                      <>
                        <Square className="h-3.5 w-3.5" />
                        <span>Chọn tất cả ({availableAccounts.length} acc)</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
                  {availableAccounts.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">Chưa có tài khoản Sale nào</p>
                  ) : (
                    availableAccounts.map((account) => {
                      const isSelected = selectedAccountIds.includes(account.id);
                      return (
                        <div
                          key={account.id}
                          onClick={() => handleToggleAccount(account.id)}
                          className={`flex items-center justify-between p-2 rounded-xl border cursor-pointer select-none transition-all ${
                            isSelected
                              ? 'bg-blue-50 border-blue-300 shadow-2xs'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by parent div click
                              className="h-4 w-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                            />
                            <img
                              src={account.avatarUrl}
                              alt={account.name}
                              className="h-7 w-7 rounded-full border border-slate-200 object-cover bg-white"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">{account.name}</p>
                              <p className="text-[10px] text-slate-500 truncate">
                                Zalo: {account.zaloAccountName} • SĐT: {account.zaloPhone}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Sẵn sàng
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="mt-2 text-[11px] text-blue-800 bg-blue-50/70 p-2 rounded-lg border border-blue-200 flex items-center justify-between">
                  <span>
                    Đang chọn: <strong>{selectedAccountIds.length}</strong> / {availableAccounts.length} tài khoản
                  </span>
                  <span className="font-semibold text-blue-700">
                    {selectedAccountIds.length === availableAccounts.length
                      ? '⭐ Đăng toàn bộ hệ thống'
                      : '⭐ Đăng theo nhóm chỉ định'}
                  </span>
                </div>
              </div>

              {/* Schedule Option */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={isScheduled}
                    onChange={(e) => setIsScheduled(e.target.checked)}
                    className="h-4 w-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <span>Lên lịch hẹn giờ đăng tự động (Nếu không tích sẽ đăng ngay lập tức)</span>
                </label>

                {isScheduled && (
                  <div className="mt-2 pl-6">
                    <input
                      type="datetime-local"
                      required={isScheduled}
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: SMARTPHONE LIVE PREVIEW (5 cols) */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="text-center mb-2">
                <span className="text-xs font-bold text-slate-700 flex items-center justify-center gap-1">
                  <Smartphone className="h-4 w-4 text-blue-600" />
                  Mô Phỏng Nhật Ký Zalo Trên Điện Thoại
                </span>
                <p className="text-[10px] text-slate-400">Xem trước giao diện hiển thị trên Zalo của nhân viên</p>
              </div>

              {/* Phone Mockup Frame */}
              <div className="w-full max-w-[300px] bg-slate-900 p-3 rounded-[32px] shadow-2xl border-4 border-slate-800 text-slate-900">
                {/* Speaker notch */}
                <div className="h-4 w-24 bg-slate-800 rounded-full mx-auto mb-2" />

                {/* Inner screen */}
                <div className="bg-white rounded-[24px] overflow-hidden flex flex-col min-h-[460px] text-xs shadow-inner">
                  {/* Zalo Top App Bar */}
                  <div className="bg-[#0068ff] text-white p-2.5 flex items-center justify-between font-semibold text-[11px]">
                    <span>Nhật ký</span>
                    <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded">Zalo Feed</span>
                  </div>

                  {/* Post Card on Feed */}
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Author Header */}
                      <div className="flex items-center gap-2 mb-2">
                        <img
                          src={previewAccount.avatarUrl}
                          alt={previewAccount.name}
                          className="h-8 w-8 rounded-full border border-slate-200 object-cover"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-[11px] truncate">{previewAccount.name}</p>
                          <p className="text-[9px] text-slate-400">Vừa xong • 🌐 Công khai</p>
                        </div>
                      </div>

                      {/* Post Content */}
                      <p className="text-[11px] text-slate-800 leading-snug whitespace-pre-line">
                        {postContent || 'Nội dung bài viết sẽ xuất hiện ở đây khi bạn nhập vào ô bên trái...'}
                      </p>

                      {/* Attached Image if any */}
                      {postImageUrl && (
                        <div className="mt-2.5 rounded-xl overflow-hidden border border-slate-200 max-h-40 bg-slate-100 flex items-center justify-center">
                          <img
                            src={postImageUrl}
                            alt="Preview"
                            className="w-full h-36 object-cover"
                            onError={(e) => {
                              (e.target as any).style.display = 'none';
                            }}
                          />
                        </div>
                      )}

                      {/* Attached Link */}
                      {postLinkUrl && (
                        <div className="mt-2 p-1.5 bg-blue-50 border border-blue-200 rounded-lg text-[10px] text-blue-700 truncate">
                          🔗 {postLinkUrl}
                        </div>
                      )}
                    </div>

                    {/* Like & Comment Bar */}
                    <div className="pt-2 border-t border-slate-100 mt-3 flex items-center justify-around text-slate-500 text-[10px]">
                      <span className="flex items-center gap-1 font-semibold text-rose-600">
                        <ThumbsUp className="h-3 w-3" /> Thích
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" /> Bình luận
                      </span>
                      <span className="flex items-center gap-1">
                        <Share2 className="h-3 w-3" /> Chia sẻ
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => setIsModalOpen(false)}
            >
              Hủy Bỏ
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting || selectedAccountIds.length === 0 || !postTitle || !postContent}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/25 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang đăng bài đồng loạt lên các tài khoản...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Tiến Hành Đăng Bài Cho {selectedAccountIds.length} Tài Khoản Zalo</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* DETAIL MODAL */}
      {selectedPost && (
        <Modal
          isOpen={!!selectedPost}
          onClose={() => setSelectedPost(null)}
          title={`Chi Tiết: ${selectedPost.title}`}
          description={`Thời gian tạo: ${formatDate(selectedPost.createdAt)} • Người tạo: ${selectedPost.createdBy?.name || 'Admin'}`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-[#080d19] rounded-xl border border-slate-200 dark:border-[#1e2c47]">
              <h5 className="font-bold text-slate-700 dark:text-slate-300 mb-1">Nội dung bài viết:</h5>
              <p className="whitespace-pre-line text-slate-800 dark:text-slate-200 leading-relaxed">{selectedPost.content}</p>
            </div>

            {selectedPost.imageUrl && (
              <div>
                <h5 className="font-bold text-slate-700 dark:text-slate-300 mb-1">Hình ảnh đính kèm:</h5>
                <img
                  src={selectedPost.imageUrl}
                  alt={selectedPost.title}
                  className="h-44 w-auto rounded-xl border border-slate-200 dark:border-[#1e2c47] object-cover"
                />
              </div>
            )}

            <div>
              <h5 className="font-bold text-slate-700 dark:text-slate-300 mb-2">
                Danh sách tài khoản đã đăng ({selectedPost.targets.length}):
              </h5>
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {selectedPost.targets.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-2.5 bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-[#1e2c47] rounded-xl"
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={t.user.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sale'}
                        alt={t.user.name}
                        className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover"
                      />
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">{t.user.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {t.user.code} • SĐT: {t.user.phone}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right text-[11px]">
                        <span className="text-rose-600 dark:text-rose-400 font-bold">{t.likesCount} thích</span> •{' '}
                        <span className="text-blue-600 dark:text-blue-400 font-bold">{t.commentsCount} bình luận</span>
                      </div>

                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                        ✓ Thành công
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-[#1e2c47] flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedPost(null)} className="border-slate-300 dark:border-[#1e2c47] bg-white dark:bg-[#090e1c] text-slate-700 dark:text-slate-300">
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
