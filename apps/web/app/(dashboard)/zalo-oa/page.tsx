'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  MessageSquare,
  Users,
  Search,
  RefreshCw,
  Send,
  User,
  Phone,
  Mail,
  Clock,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Filter,
  Check,
  Radio,
  FileText,
  Tag,
  Settings,
  Share2,
  FileSpreadsheet,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchApi } from '@/lib/api';
import { formatDate, formatShortDate } from '@/lib/utils';
import { CustomerStatusLabels, CustomerStatusColors, CustomerStatus } from '@sales-zalo/shared';
import { ZaloOaPostsManager } from '@/components/zalo-oa/zalo-oa-posts-manager';
import { TourContentManager } from '@/components/zalo-oa/tour-content-manager';
import { TourArticleWorkflow } from '@/components/zalo-oa/tour-article-workflow';

export default function ZaloOaPage() {
  const [oaStatus, setOaStatus] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'ARTICLE_WORKFLOW' | 'TOUR_CONTENT' | 'INBOX' | 'CUSTOMERS' | 'POSTS' | 'INFO'>('ARTICLE_WORKFLOW');
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 1. Tải trạng thái OA
  const loadOaStatus = async () => {
    try {
      const res = await fetchApi('/integrations/oa/status');
      setOaStatus(res);
    } catch (e) {
      console.error(e);
    }
  };

  // 2. Tải danh sách hội thoại Zalo OA
  const loadOaConversations = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const convs = await fetchApi('/conversations?channelType=ZALO_OA');
      setConversations(convs || []);
      if (!selectedConvId && convs && convs.length > 0) {
        setSelectedConvId(convs[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // 3. Tải khách hàng Zalo OA
  const loadOaCustomers = async () => {
    try {
      const res = await fetchApi('/customers?source=Zalo%20OA&pageSize=50');
      setCustomers(res.items || res || []);
    } catch (e) {
      console.error(e);
    }
  };

  // 4. Tải chi tiết cuộc hội thoại đang chọn
  const loadConversationDetail = async (id: string) => {
    try {
      const detail = await fetchApi(`/conversations/${id}`);
      setSelectedConversation(detail);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadOaStatus();
    loadOaConversations();
    loadOaCustomers();

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'posts') {
        setActiveTab('POSTS');
      } else if (params.get('tab') === 'tour' || params.get('tab') === 'TOUR_CONTENT') {
        setActiveTab('TOUR_CONTENT');
      }
    }
  }, []);

  useEffect(() => {
    if (selectedConvId) {
      loadConversationDetail(selectedConvId);
    }
  }, [selectedConvId]);

  // Realtime Polling mỗi 3 giây cho các cuộc trò chuyện Zalo OA
  useEffect(() => {
    const timer = setInterval(() => {
      loadOaConversations(true);
      if (selectedConvId) {
        loadConversationDetail(selectedConvId);
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [selectedConvId]);

  // Gửi tin nhắn trả lời từ Zalo OA
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedConvId || isSending) return;

    setIsSending(true);
    try {
      await fetchApi(`/messages/${selectedConvId}`, {
        method: 'POST',
        body: JSON.stringify({
          textContent: replyText.trim(),
          contentType: 'TEXT',
        }),
      });
      setReplyText('');
      await loadConversationDetail(selectedConvId);
      loadOaConversations(true);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Không thể gửi tin nhắn từ Zalo OA',
      });
    } finally {
      setIsSending(false);
    }
  };

  // Nút đồng bộ dữ liệu Zalo OA
  const handleSyncOa = async () => {
    setIsSyncing(true);
    setNotification(null);
    try {
      const res = await fetchApi('/integrations/oa/sync', { method: 'POST' });
      const currentCount = conversations.length;
      if (currentCount === 0 && res.syncedCustomers === 0) {
        setNotification({
          type: 'success',
          message: `Kết nối Zalo OA ID: ${oaStatus?.oaId || '4585991630126061653'} đang HOẠT ĐỘNG tốt! Do chính sách bảo mật Zalo không cho phép tải lén tin nhắn cũ qua OA ID, khi có khách hàng thực tế nhắn tin vào OA, hệ thống sẽ tự động cập nhật ngay lập tức. Bạn có thể bấm "Thử Nghiệm Nhận Khách OA" để kiểm tra luồng tin nhắn.`,
        });
      } else {
        setNotification({
          type: 'success',
          message: `Đồng bộ thành công! Hiện có ${conversations.length} cuộc hội thoại và ${customers.length} khách hàng Zalo OA trong danh mục riêng.`,
        });
      }
      await loadOaConversations();
      await loadOaCustomers();
      await loadOaStatus();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Lỗi khi đồng bộ dữ liệu Zalo OA',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Thử nghiệm gửi tin nhắn khách hàng vào Zalo OA
  const handleSimulateInbound = async () => {
    setIsSimulating(true);
    setNotification(null);
    try {
      const res = await fetchApi('/integrations/oa/simulate-inbound', {
        method: 'POST',
        body: JSON.stringify({
          customerName: `Khách Zalo OA (Trải Nghiệm ${Math.floor(100 + Math.random() * 900)})`,
          phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
          text: 'Xin chào TourLuk Travel! Mình muốn tư vấn tour du lịch qua Zalo OA ạ.',
        }),
      });
      setNotification({
        type: 'success',
        message: `Mô phỏng tin nhắn gửi vào Zalo OA thành công! Khách hàng được tạo với mã ${res.customerCode || 'OA...'} và hội thoại đã xuất hiện.`,
      });
      await loadOaConversations();
      await loadOaCustomers();
      if (res.conversationId) {
        setSelectedConvId(res.conversationId);
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Lỗi khi thử nghiệm tin nhắn Zalo OA',
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.title?.toLowerCase().includes(q) ||
      c.customer?.fullName?.toLowerCase().includes(q) ||
      c.customer?.phone?.includes(q)
    );
  });

  return (
    <div className="space-y-5 max-w-[1600px] h-[calc(100vh-5.5rem)] flex flex-col">
      {/* ========================================================================= */}
      {/* 🌟 HEADER BAR: ZALO OA DOANH NGHIỆP */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-[#0d1527] p-4 rounded-2xl border border-slate-200 dark:border-[#1a2842] shrink-0 shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-500 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-blue-500/30 border border-blue-400/40 shrink-0">
            OA
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Hộp Thư Zalo Official Account (Zalo OA)
              </h2>
              {oaStatus?.isConnected ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/40">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                  {oaStatus?.oaName || 'TourLuk Travel Official'} (Realtime)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/40">
                  <AlertTriangle className="h-3 w-3" />
                  Chưa Kết Nối OA
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Khu vực lưu trữ và xử lý độc lập cho Zalo Doanh Nghiệp — tách biệt hoàn toàn khỏi Zalo cá nhân của nhân viên
            </p>
          </div>
        </div>

        {/* Actions & Tab Switchers */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Quick Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#060a14] rounded-xl border border-slate-200 dark:border-[#162137] shadow-xs">
            <button
              onClick={() => setActiveTab('ARTICLE_WORKFLOW')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'ARTICLE_WORKFLOW'
                  ? 'bg-gradient-to-r from-amber-500 via-pink-600 to-indigo-600 text-white shadow font-bold'
                  : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-300" />
              <span>✍️ Duyệt Bài Viết Zalo OA</span>
            </button>
            <button
              onClick={() => setActiveTab('TOUR_CONTENT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'TOUR_CONTENT'
                  ? 'bg-gradient-to-r from-amber-500 to-indigo-600 text-white shadow font-bold'
                  : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800/50'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              <span>Kế Hoạch Tour & Ảnh Drive</span>
            </button>
            <button
              onClick={() => setActiveTab('INBOX')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'INBOX'
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow font-bold'
                  : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800/50'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Hội Thoại OA ({conversations.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('CUSTOMERS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'CUSTOMERS'
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow font-bold'
                  : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800/50'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Khách Hàng OA ({customers.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('POSTS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'POSTS'
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow font-bold'
                  : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800/50'
              }`}
            >
              <Share2 className="w-3.5 h-3.5 text-pink-500 dark:text-pink-400" />
              <span>Đăng Bài & Hẹn Giờ OA</span>
            </button>
          </div>

          {/* Simulate Inbound Button */}
          <Button
            onClick={handleSimulateInbound}
            disabled={isSimulating}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs h-9 px-3.5 shadow-md shadow-blue-600/25 border border-blue-400/30"
          >
            <Sparkles className={`w-3.5 h-3.5 mr-1.5 ${isSimulating ? 'animate-spin' : ''}`} />
            {isSimulating ? 'Đang Gửi...' : '🧪 Thử Nghiệm Nhận Khách OA'}
          </Button>

          {/* Sync Button */}
          <Button
            onClick={handleSyncOa}
            disabled={isSyncing}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs h-9 px-3.5 shadow-md shadow-emerald-600/20"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Đang Đồng Bộ...' : 'Đồng Bộ Dữ Liệu OA'}
          </Button>

          {/* Post Hub Link */}
          <Link href="/posts">
            <Button className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs h-9 px-3.5 shadow-md shadow-red-600/20">
              <Share2 className="w-3.5 h-3.5 mr-1.5" />
              Trung Tâm Đăng Bài
            </Button>
          </Link>

          {/* Settings Link */}
          <Link href="/settings">
            <Button className="bg-[#141f36] hover:bg-[#1d2d4f] text-slate-300 border border-[#223354] text-xs h-9 px-3">
              <Settings className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
              Cài Đặt Kết Nối
            </Button>
          </Link>
        </div>
      </div>

      {/* Notifications Toast */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs animate-fade-in shrink-0 ${
            notification.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-red-950/40 border-red-500/40 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white text-xs font-bold px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 💬 TAB 1: INBOX ZALO OA (CHAT RIÊNG BIỆT) */}
      {/* ========================================================================= */}
      {activeTab === 'INBOX' && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
          {/* Left Column: Danh sách hội thoại Zalo OA (4 cols) */}
          <div className="lg:col-span-4 bg-white dark:bg-[#0d1527] rounded-2xl border border-slate-200 dark:border-[#1a2842] flex flex-col min-h-0 overflow-hidden shadow-lg">
            {/* Search Box */}
            <div className="p-3.5 border-b border-slate-200 dark:border-[#162137] bg-slate-50 dark:bg-[#090e1c]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm khách hàng Zalo OA, SĐT..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-[#060a14] border border-slate-200 dark:border-[#1a2842] rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-[#141f36]">
              {isLoading ? (
                <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-red-500" />
                  <span>Đang tải tin nhắn Zalo OA...</span>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 space-y-3">
                  <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200">Chưa có hội thoại Zalo OA nào</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Kết nối OA ID: <span className="font-mono text-blue-600 dark:text-blue-300 font-semibold">{oaStatus?.oaId || '4585991630126061653'}</span> đã kích hoạt.
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Do Zalo bảo mật tin nhắn cũ qua OA ID, khi có khách thực tế nhắn tin vào OA của công ty, tin nhắn sẽ tự động xuất hiện với mã <strong className="text-slate-800 dark:text-white">OA...</strong>
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 pt-1">
                    <Button
                      onClick={handleSimulateInbound}
                      disabled={isSimulating}
                      className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-8 px-3 w-full shadow-md shadow-blue-600/20"
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                      {isSimulating ? 'Đang tạo...' : '🧪 Thử gửi 1 tin nhắn khách'}
                    </Button>
                    <Button
                      onClick={handleSyncOa}
                      disabled={isSyncing}
                      className="bg-slate-100 dark:bg-[#141f36] hover:bg-slate-200 dark:hover:bg-[#1d2d4f] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#223354] text-xs h-8 px-3 w-full"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      Kiểm tra trạng thái OA
                    </Button>
                  </div>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isSelected = conv.id === selectedConvId;
                  const lastMsg = conv.messages && conv.messages[0];

                  return (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConvId(conv.id)}
                      className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors ${
                        isSelected
                          ? 'bg-red-50 dark:bg-[#14213d] border-l-4 border-l-red-500'
                          : 'hover:bg-slate-50 dark:hover:bg-[#101b33]'
                      }`}
                    >
                      {/* Avatar */}
                      <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow">
                        {conv.customer?.fullName?.charAt(0)?.toUpperCase() || 'K'}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {conv.customer?.fullName || 'Khách hàng Zalo OA'}
                          </h4>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {conv.lastMessageAt ? formatShortDate(conv.lastMessageAt) : ''}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30">
                            Zalo OA
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            {conv.customer?.code || ''}
                          </span>
                          {conv.customer?.phone && (
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              • {conv.customer.phone}
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                          {lastMsg?.textContent || 'Hội thoại bắt đầu...'}
                        </p>
                      </div>

                      {/* Unread badge */}
                      {conv.unreadCount > 0 && (
                        <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-red-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                          {conv.unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Cửa sổ Chat Zalo OA (8 cols) */}
          <div className="lg:col-span-8 bg-white dark:bg-[#0d1527] rounded-2xl border border-slate-200 dark:border-[#1a2842] flex flex-col min-h-0 overflow-hidden shadow-lg">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="px-5 py-3.5 border-b border-slate-200 dark:border-[#162137] bg-slate-50 dark:bg-[#090e1c] flex items-center justify-between gap-4 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow">
                      {selectedConversation.customer?.fullName?.charAt(0)?.toUpperCase() || 'K'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {selectedConversation.customer?.fullName}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/40">
                          Kênh: Zalo Official Account
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-3 mt-0.5">
                        <span className="font-mono text-slate-700 dark:text-slate-300">
                          Mã KH: {selectedConversation.customer?.code}
                        </span>
                        {selectedConversation.customer?.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {selectedConversation.customer.phone}
                          </span>
                        )}
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          {CustomerStatusLabels[selectedConversation.customer?.status as CustomerStatus] || 'Khách mới'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Customer Profile Link */}
                  <div className="flex items-center gap-2">
                    <Link href={`/customers/${selectedConversation.customer?.id}`}>
                      <Button className="bg-slate-100 dark:bg-[#141f36] hover:bg-slate-200 dark:hover:bg-[#1d2d4f] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#223354] text-xs h-8 px-3">
                        <User className="w-3.5 h-3.5 mr-1.5" />
                        Xem Hồ Sơ Khách
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Messages Feed */}
                <div className="flex-1 p-5 overflow-y-auto space-y-3.5 bg-slate-100/60 dark:bg-[#070b14]">
                  {/* Notice Pill */}
                  <div className="text-center my-2">
                    <span className="px-3 py-1 rounded-full text-[11px] bg-white dark:bg-[#0e172a] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#1a2842] inline-flex items-center gap-1.5 shadow-xs">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      Cuộc trò chuyện chính thức qua Zalo OA Doanh Nghiệp
                    </span>
                  </div>

                  {selectedConversation.messages && selectedConversation.messages.length > 0 ? (
                    selectedConversation.messages.map((msg: any) => {
                      const isInbound = msg.direction === 'INBOUND';

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isInbound ? 'items-start' : 'items-end'}`}
                        >
                          <div className="flex items-center gap-1.5 mb-1 px-1">
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                              {isInbound
                                ? selectedConversation.customer?.fullName
                                : 'Zalo OA (Bạn)'}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                              {formatShortDate(msg.sentAt)}
                            </span>
                          </div>

                          <div
                            className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-md ${
                              isInbound
                                ? 'bg-white dark:bg-[#121c32] text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-[#1e2e4f] rounded-tl-none'
                                : 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white rounded-tr-none'
                            }`}
                          >
                            {msg.textContent}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-500">
                      Chưa có tin nhắn nào trong hội thoại này.
                    </div>
                  )}
                </div>

                {/* Chat Input Bar */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3.5 border-t border-slate-200 dark:border-[#162137] bg-slate-50 dark:bg-[#090e1c] flex items-center gap-2.5 shrink-0"
                >
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Nhập tin nhắn phản hồi từ Zalo OA..."
                    className="flex-1 px-4 py-2 text-xs bg-white dark:bg-[#060a14] border border-slate-200 dark:border-[#1a2842] rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-red-500"
                  />
                  <Button
                    type="submit"
                    disabled={!replyText.trim() || isSending}
                    className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs h-9 px-4 shadow-md shadow-red-600/25"
                  >
                    {isSending ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 mr-1.5" />
                        Gửi Tin OA
                      </>
                    )}
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 dark:text-slate-400 gap-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-blue-900/20 to-indigo-900/20 dark:from-blue-900/40 dark:to-indigo-900/30 border border-blue-300 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-xl">
                  <Building2 className="w-8 h-8" />
                </div>
                <div className="space-y-1.5 max-w-md">
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    Kênh Zalo Official Account Đang Hoạt Động
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Đã liên kết Zalo OA: <strong className="text-blue-600 dark:text-blue-300">{oaStatus?.oaName || 'TourLuk Travel Official'}</strong> (Mã OA: {oaStatus?.oaId || '4585991630126061653'}).
                  </p>
                  <div className="mt-4 p-4 bg-slate-50 dark:bg-[#080d19] rounded-xl border border-slate-200 dark:border-[#162137] text-left text-xs space-y-2 text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-2 font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      Cơ chế đón khách tự động thời gian thực (Realtime):
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 text-[11px] pl-1">
                      <li>Khách hàng mở Zalo nhắn tin vào OA sẽ tự động đổ về hộp thư này.</li>
                      <li>Hệ thống tự động cấp mã khách hàng: <strong className="text-slate-900 dark:text-white font-mono">OA0001, OA0002...</strong></li>
                      <li>Dữ liệu được lưu trữ riêng biệt, không bị lẫn với Zalo cá nhân của Sale.</li>
                    </ul>
                  </div>
                  <div className="pt-3">
                    <Button
                      onClick={handleSimulateInbound}
                      disabled={isSimulating}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs h-9 px-4 shadow-lg shadow-blue-600/25 border border-blue-400/30"
                    >
                      <Sparkles className={`w-3.5 h-3.5 mr-1.5 ${isSimulating ? 'animate-spin' : ''}`} />
                      {isSimulating ? 'Đang tạo tin...' : '🧪 Thử Nghiệm Nhận 1 Tin Nhắn Khách Vào Zalo OA'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 👥 TAB 2: KHÁCH HÀNG ZALO OA (DANH SÁCH RIÊNG) */}
      {/* ========================================================================= */}
      {activeTab === 'CUSTOMERS' && (
        <div className="flex-1 bg-white dark:bg-[#0d1527] rounded-2xl border border-slate-200 dark:border-[#1a2842] p-5 flex flex-col min-h-0 overflow-hidden shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-200 dark:border-[#162137]">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Danh Sách Khách Hàng Từ Zalo OA
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Toàn bộ khách hàng nhắn tin hoặc theo dõi Zalo OA của công ty, được tự động gán mã và lưu riêng biệt
              </p>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Tổng cộng: <strong className="text-slate-900 dark:text-white">{customers.length}</strong> khách hàng Zalo OA
            </div>
          </div>

          {/* Customer Table */}
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-[#090e1c] text-slate-700 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-[#162137] sticky top-0">
                <tr>
                  <th className="py-3 px-4">Mã KH</th>
                  <th className="py-3 px-4">Khách Hàng</th>
                  <th className="py-3 px-4">Số Điện Thoại</th>
                  <th className="py-3 px-4">Nguồn Tiếp Nhận</th>
                  <th className="py-3 px-4">Nhu Cầu / Ghi Chú</th>
                  <th className="py-3 px-4">Trạng Thái</th>
                  <th className="py-3 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#141f36] text-slate-700 dark:text-slate-300">
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      Chưa có khách hàng nào từ Zalo OA. Hãy bấm nút &ldquo;Đồng Bộ Dữ Liệu OA&rdquo; để tải về.
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-[#121c32]/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {c.code}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        {c.fullName}
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                        {c.phone || 'Chưa cập nhật'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30">
                          Zalo OA
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-slate-500 dark:text-slate-400">
                        {c.notes || 'Khách quan tâm tour'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${CustomerStatusColors[c.status as CustomerStatus] || 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-300'}`}>
                          {CustomerStatusLabels[c.status as CustomerStatus] || c.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setActiveTab('INBOX');
                              const matchedConv = conversations.find((conv) => conv.customer?.id === c.id);
                              if (matchedConv) setSelectedConvId(matchedConv.id);
                            }}
                            className="px-2.5 py-1 rounded bg-blue-50 dark:bg-[#162238] hover:bg-blue-100 dark:hover:bg-[#20304e] text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-transparent text-[11px] font-semibold transition-colors"
                          >
                            Mở Chat
                          </button>
                          <Link href={`/customers/${c.id}`}>
                            <button className="px-2.5 py-1 rounded bg-slate-100 dark:bg-[#162238] hover:bg-slate-200 dark:hover:bg-[#20304e] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-transparent text-[11px] font-semibold transition-colors">
                              Chi Tiết
                            </button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🚀 TAB 0: DUYỆT BÀI ĐĂNG ZALO OA (WORKFLOW: CHỜ DUYỆT / CHỜ DUYỆT LẠI / ĐÃ DUYỆT) */}
      {/* ========================================================================= */}
      {activeTab === 'ARTICLE_WORKFLOW' && <TourArticleWorkflow />}

      {/* ========================================================================= */}
      {/* 🚀 TAB 3: ĐĂNG BÀI TỰ ĐỘNG & HẸN GIỜ ZALO OA */}
      {/* ========================================================================= */}
      {activeTab === 'POSTS' && <ZaloOaPostsManager />}

      {/* ========================================================================= */}
      {/* 🚀 TAB 4: KẾ HOẠCH TOUR (GOOGLE SHEETS) & ĐỀ XUẤT ẢNH (GOOGLE DRIVE) */}
      {/* ========================================================================= */}
      {activeTab === 'TOUR_CONTENT' && <TourContentManager />}
    </div>
  );
}
