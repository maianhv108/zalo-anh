'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Search,
  Filter,
  Send,
  X,
  Pin,
  Paperclip,
  User,
  Phone,
  Clock,
  Sparkles,
  ExternalLink,
  Plus,
  RefreshCw,
  Columns,
  Columns3,
  Columns2,
  Eye,
  Download,
  Maximize2,
  Image as ImageIcon,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { fetchApi } from '@/lib/api';
import { formatDate, formatShortDate } from '@/lib/utils';
import { CustomerStatusLabels, CustomerStatusColors, CustomerStatus } from '@sales-zalo/shared';

export default function InboxPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [selectedSaleId, setSelectedSaleId] = useState<string>('');
  const [conversations, setConversations] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Multi-panel state: Array of open conversations (up to 3 panels)
  const [openPanelIds, setOpenPanelIds] = useState<string[]>([]);
  const [isMultiPanelMode, setIsMultiPanelMode] = useState<boolean>(false);
  const [panelConversations, setPanelConversations] = useState<Record<string, any>>({});
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [isSending, setIsSending] = useState<Record<string, boolean>>({});
  const [isSimulating, setIsSimulating] = useState<Record<string, boolean>>({});
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string; time?: string } | null>(null);
  const messagesEndRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Lắng nghe phím Escape để đóng nhanh ảnh phóng to
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewImage(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [salesRes, convsRes] = await Promise.all([
        fetchApi('/users'),
        fetchApi('/conversations'),
      ]);
      setSales(salesRes.items || []);
      setConversations(convsRes || []);

      // Mặc định mở hội thoại đầu tiên
      if (convsRes && convsRes.length > 0 && openPanelIds.length === 0) {
        openConversation(convsRes[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // CẬP NHẬT LIÊN TỤC THỜI GIAN THỰC (Auto-polling mỗi 1.2 giây)
  // Đảm bảo tin nhắn mới phát sinh từ Zalo của nhân viên hoặc khách hàng tự động xuất hiện trên Webapp ngay lập tức
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        // Tải danh sách hội thoại ngầm không gián đoạn thao tác
        const query = selectedSaleId ? `?salesUserId=${selectedSaleId}` : '';
        const convs = await fetchApi(`/conversations${query}`);
        if (convs && Array.isArray(convs)) {
          setConversations(convs);
        }

        // Cập nhật nội dung các khung chat đang mở
        if (openPanelIds.length > 0) {
          const updates = await Promise.all(
            openPanelIds.map(async (id) => {
              try {
                const res = await fetchApi(`/conversations/${id}`);
                return { id, res };
              } catch {
                return null;
              }
            })
          );
          setPanelConversations((prev) => {
            const next = { ...prev };
            updates.forEach((item) => {
              if (item?.res) {
                next[item.id] = item.res;
              }
            });
            return next;
          });
        }
      } catch (err) {
        // Bỏ qua lỗi polling ngầm
      }
    }, 1200);

    return () => clearInterval(timer);
  }, [selectedSaleId, openPanelIds]);

  // Tự động cuộn xuống tin nhắn mới nhất khi hội thoại được mở hoặc có tin nhắn mới
  useEffect(() => {
    openPanelIds.forEach((id) => {
      const el = messagesEndRefs.current[id];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }, [panelConversations, openPanelIds]);

  const loadConversations = async (saleId?: string) => {
    try {
      const query = saleId ? `?salesUserId=${saleId}` : '';
      const convs = await fetchApi(`/conversations${query}`);
      setConversations(convs || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectSale = (saleId: string) => {
    setSelectedSaleId(saleId);
    loadConversations(saleId);
  };

  // Mở hội thoại
  const openConversation = async (convId: string) => {
    if (openPanelIds.includes(convId)) return;
    const newPanelIds = isMultiPanelMode
      ? (openPanelIds.length >= 3 ? [...openPanelIds.slice(1), convId] : [...openPanelIds, convId])
      : [convId];
    setOpenPanelIds(newPanelIds);

    try {
      const fullConv = await fetchApi(`/conversations/${convId}`);
      setPanelConversations((prev) => ({ ...prev, [convId]: fullConv }));
    } catch (e) {
      console.error(e);
    }
  };

  // Bật/tắt đoạn chat: Bấm 1 lần mở, bấm lần 2 tắt
  const handleToggleConversation = async (convId: string) => {
    // Nếu đang mở -> TẮT (ĐÓNG)
    if (openPanelIds.includes(convId)) {
      closePanel(convId);
      return;
    }

    // Nếu chưa mở -> MỞ
    let newPanelIds: string[];
    if (isMultiPanelMode) {
      newPanelIds = openPanelIds.length >= 3 ? [...openPanelIds.slice(1), convId] : [...openPanelIds, convId];
    } else {
      newPanelIds = [convId];
    }
    setOpenPanelIds(newPanelIds);

    try {
      const fullConv = await fetchApi(`/conversations/${convId}`);
      setPanelConversations((prev) => ({ ...prev, [convId]: fullConv }));
    } catch (e) {
      console.error(e);
    }
  };

  const closePanel = (convId: string) => {
    setOpenPanelIds((prev) => prev.filter((id) => id !== convId));
    setPanelConversations((prev) => {
      const copy = { ...prev };
      delete copy[convId];
      return copy;
    });
  };

  const handleSendMessage = async (convId: string) => {
    const text = replyTexts[convId];
    if (!text || !text.trim()) return;

    setIsSending((prev) => ({ ...prev, [convId]: true }));
    try {
      const newMsg = await fetchApi(`/messages/${convId}`, {
        method: 'POST',
        body: JSON.stringify({ textContent: text.trim() }),
      });

      // Cập nhật UI ngay lập tức
      setPanelConversations((prev) => {
        const conv = prev[convId];
        if (!conv) return prev;
        return {
          ...prev,
          [convId]: {
            ...conv,
            messages: [...conv.messages, newMsg],
          },
        };
      });

      setReplyTexts((prev) => ({ ...prev, [convId]: '' }));

      // Tải lại sau 2s để nhận tin nhắn tự động từ khách (nếu là demo)
      setTimeout(async () => {
        const updated = await fetchApi(`/conversations/${convId}`);
        setPanelConversations((prev) => ({ ...prev, [convId]: updated }));
      }, 2000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSending((prev) => ({ ...prev, [convId]: false }));
    }
  };

  // Mô phỏng khách hàng gửi tin nhắn mới vào Zalo để kiểm tra luồng nhận tin nhắn liên tục
  const handleSimulateInbound = async (convId: string) => {
    setIsSimulating((prev) => ({ ...prev, [convId]: true }));
    try {
      await fetchApi(`/messages/${convId}/simulate-inbound`, {
        method: 'POST',
      });
      // Tải lại ngay hội thoại này
      const updated = await fetchApi(`/conversations/${convId}`);
      setPanelConversations((prev) => ({ ...prev, [convId]: updated }));

      // Cập nhật danh sách hội thoại bên trái
      const query = selectedSaleId ? `?salesUserId=${selectedSaleId}` : '';
      const convs = await fetchApi(`/conversations${query}`);
      if (convs && Array.isArray(convs)) {
        setConversations(convs);
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi khi mô phỏng tin nhắn từ khách hàng.');
    } finally {
      setIsSimulating((prev) => ({ ...prev, [convId]: false }));
    }
  };

  const filteredConversations = conversations.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.title?.toLowerCase().includes(s) ||
      c.customer?.fullName?.toLowerCase().includes(s) ||
      c.customer?.phone?.includes(s)
    );
  });

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col space-y-4">
      {/* Top Banner & Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-slate-100">Hộp Thư Hội Thoại Nhiều Tài Khoản (Multi-Panel Inbox)</h2>
            <DemoBadge />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Theo dõi hội thoại Zalo từ nhiều Sale cùng lúc. Mở tối đa 3 khung chat song song trên desktop.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Chế độ xem: 1 Khung chuẩn hoặc Mở song song */}
          <div className="flex items-center gap-1 bg-[#080d19] p-0.5 rounded-xl border border-[#1a2842] text-xs">
            <button
              type="button"
              onClick={() => {
                setIsMultiPanelMode(false);
                if (openPanelIds.length > 1) {
                  setOpenPanelIds([openPanelIds[openPanelIds.length - 1]]);
                }
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
                !isMultiPanelMode ? 'bg-red-600 text-white shadow-xs font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Columns className="h-3.5 w-3.5" />
              <span>1 Khung chuẩn</span>
            </button>
            <button
              type="button"
              onClick={() => setIsMultiPanelMode(true)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
                isMultiPanelMode ? 'bg-red-600 text-white shadow-xs font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Columns3 className="h-3.5 w-3.5" />
              <span>Mở song song</span>
            </button>
          </div>

          {/* Live Sync Status Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 rounded-xl text-xs font-semibold shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Live Sync: Cập nhật liên tục</span>
          </div>

          <Button variant="outline" size="sm" onClick={() => loadConversations(selectedSaleId)} className="border-[#1a2842] bg-[#0d1527] text-slate-300 hover:bg-[#131d33] hover:text-white">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Làm mới</span>
          </Button>
        </div>
      </div>

      {/* Main Inbox Workspace Container */}
      <div className="flex-1 flex gap-4 min-h-0 bg-white dark:bg-[#0d1527] rounded-2xl border border-slate-200 dark:border-[#1a2842] shadow-xl overflow-hidden p-2">
        {/* COLUMN 1: DANH SÁCH TÀI KHOẢN SALE */}
        <div className="w-56 bg-slate-50 dark:bg-[#080d19] border-r border-slate-200 dark:border-[#1a2842] rounded-xl flex flex-col shrink-0 p-3 overflow-hidden">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            Tài Khoản Sale
          </div>

          <button
            onClick={() => handleSelectSale('')}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold mb-1 transition-all ${
              selectedSaleId === '' ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md shadow-red-600/20' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#131d33]'
            }`}
          >
            Tất cả nhân viên
          </button>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {sales.map((s) => {
              const isSelected = selectedSaleId === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => handleSelectSale(s.id)}
                  className={`w-full text-left p-2 rounded-xl transition-all flex items-center gap-2.5 ${
                    isSelected ? 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-semibold border border-red-300 dark:border-red-800/60' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#131d33]'
                  }`}
                >
                  <img
                    src={s.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sale'}
                    alt={s.name}
                    className="h-7 w-7 rounded-full border border-slate-300 dark:border-slate-700 object-cover bg-slate-200 dark:bg-slate-800 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs truncate font-semibold text-slate-900 dark:text-slate-200">{s.name}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate font-mono">
                      {s.code} {s.zaloAccountName && s.zaloAccountName !== s.name ? `• ${s.zaloAccountName}` : ''}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* COLUMN 2: DANH SÁCH HỘI THOẠI */}
        <div className="w-72 bg-white dark:bg-[#090e1c] border-r border-slate-200 dark:border-[#1a2842] flex flex-col shrink-0 p-3 overflow-hidden">
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm khách hàng, tin nhắn..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-[#080d19] border border-slate-200 dark:border-[#1a2842] rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-red-500 focus:outline-none"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {filteredConversations.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-500">Không có hội thoại nào</p>
            ) : (
              filteredConversations.map((c) => {
                const isOpen = openPanelIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => handleToggleConversation(c.id)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isOpen
                        ? 'border-red-500/80 bg-red-50 dark:bg-red-950/30 shadow-xs ring-1 ring-red-500/30'
                        : 'border-transparent hover:bg-slate-100 dark:hover:bg-[#131d33] hover:border-slate-200 dark:hover:border-[#1a2842]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-200 truncate">{c.customer?.fullName}</span>
                      <span className="text-[10px] text-slate-500">{formatShortDate(c.lastMessageAt)}</span>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate mt-1">
                      {c.messages?.[0]?.textContent || 'Chưa có tin nhắn'}
                    </p>

                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 dark:border-[#1a2842] text-[10px]">
                      <span className="text-red-600 dark:text-red-400 font-medium">Sale: {c.salesUser?.name}</span>
                      {isOpen && <span className="text-red-700 dark:text-red-300 font-bold text-[9px] bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700/50 px-1.5 py-0.5 rounded">Đang mở</span>}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* COLUMN 3: MULTI-PANEL CHAT WORKSPACE (OPEN 1, 2, OR 3 PANELS!) */}
        <div className="flex-1 flex gap-3 min-w-0 overflow-x-auto p-1 bg-slate-100 dark:bg-[#080d19] rounded-xl">
          {openPanelIds.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 text-xs">
              <MessageSquare className="h-10 w-10 text-slate-400 dark:text-slate-600 mb-2" />
              <p>Chọn một hội thoại bên trái để mở xem tin nhắn (bấm lại để tắt)</p>
            </div>
          ) : (
            openPanelIds.map((convId) => {
              const conv = panelConversations[convId];
              const isSendingMsg = isSending[convId];

              if (!conv) {
                return (
                  <div key={convId} className="flex-1 bg-white dark:bg-[#0d1527] rounded-xl border border-slate-200 dark:border-[#1a2842] p-6 flex items-center justify-center">
                    <RefreshCw className="h-5 w-5 animate-spin text-red-500" />
                  </div>
                );
              }

              return (
                <div
                  key={convId}
                  className={`flex-1 ${
                    openPanelIds.length === 1 ? 'w-full min-w-0 max-w-none' : 'min-w-[340px] max-w-[500px]'
                  } bg-white dark:bg-[#0d1527] rounded-xl border border-slate-200 dark:border-[#1a2842] flex flex-col overflow-hidden shadow-lg transition-all`}
                >
                  {/* Panel Header */}
                  <div className="p-3 bg-slate-50 dark:bg-[#0a101f] border-b border-slate-200 dark:border-[#162035] flex items-center justify-between shrink-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Link href={`/customers/${conv.customerId}`} className="font-bold text-xs text-slate-900 dark:text-slate-100 hover:text-red-500 truncate">
                          {conv.customer?.fullName}
                        </Link>
                        {conv.isDemo && <span className="text-[10px] px-1.5 py-0.2 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60 rounded font-bold">DEMO</span>}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Sale phụ trách: <strong className="text-slate-800 dark:text-slate-200">{conv.salesUser?.name}</strong> {conv.salesUser?.code ? `(${conv.salesUser.code})` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSimulateInbound(convId)}
                        disabled={isSimulating[convId]}
                        className="h-7 text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border-emerald-300 dark:border-emerald-800/80 flex items-center gap-1 px-2 font-medium"
                        title="Mô phỏng 1 tin nhắn mới từ khách hàng để kiểm tra tính năng cập nhật liên tục thời gian thực"
                      >
                        <Sparkles className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                        <span>{isSimulating[convId] ? 'Đang gửi...' : 'Khách nhắn mới'}</span>
                      </Button>

                      <button
                        onClick={() => closePanel(convId)}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Đóng khung chat này"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                    {/* Panel Messages Scroll Area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-100/60 dark:bg-[#060a14]">
                    {conv.messages?.map((msg: any) => {
                      const isOutbound = msg.direction === 'OUTBOUND';
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[85%] p-2.5 rounded-2xl text-xs ${
                              isOutbound
                                ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white rounded-br-none shadow-md shadow-red-600/20'
                                : 'bg-white dark:bg-[#131d33] text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-[#1e2e4a] rounded-bl-none shadow-sm'
                            }`}
                          >
                            {/* Nội dung văn bản hoặc biểu tượng hình ảnh khi không có file đính kèm */}
                            {(!msg.attachments?.length || (msg.textContent !== '[Hình ảnh]' && msg.textContent !== 'Hình ảnh')) && (
                              <p className="leading-relaxed">
                                {msg.textContent === '[Hình ảnh]' || msg.textContent === 'Hình ảnh' ? (
                                  <span className="flex items-center gap-1.5 text-xs">
                                    <ImageIcon className="h-3.5 w-3.5 text-slate-400" />
                                    <span>[Hình ảnh]</span>
                                  </span>
                                ) : (
                                  msg.textContent
                                )}
                              </p>
                            )}

                            {/* Attachments & Hình ảnh hiển thị trực tiếp */}
                            {msg.attachments?.map((att: any) => {
                              const isImg = att.mimeType?.startsWith('image') || att.fileName?.match(/\.(jpg|jpeg|png|webp|gif)$/i) || att.filePath?.match(/\.(jpg|jpeg|png|webp|gif)/i);
                              const apiHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
                              const fullImgUrl = att.filePath?.startsWith('http')
                                ? att.filePath
                                : `http://${apiHost}:4000${att.filePath}`;
                              const streamFallbackUrl = `http://${apiHost}:4000/api/v1/attachments/${att.id}/view`;

                              if (isImg) {
                                return (
                                  <div key={att.id} className="mt-1.5 relative group/img overflow-hidden rounded-xl border border-slate-200 dark:border-white/10 shadow-md bg-black/10 dark:bg-black/30">
                                    <img
                                      src={fullImgUrl}
                                      alt={att.fileName || 'Hình ảnh'}
                                      className="max-h-72 w-auto max-w-full rounded-xl object-contain cursor-pointer hover:scale-[1.01] transition-transform duration-200"
                                      onClick={() => setPreviewImage({ url: fullImgUrl, name: att.fileName || 'Hình ảnh', time: msg.sentAt })}
                                      onError={(e) => {
                                        const target = e.currentTarget;
                                        if (target.src !== streamFallbackUrl) {
                                          target.src = streamFallbackUrl;
                                        }
                                      }}
                                      loading="lazy"
                                    />
                                    <div
                                      onClick={() => setPreviewImage({ url: fullImgUrl, name: att.fileName || 'Hình ảnh', time: msg.sentAt })}
                                      className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center cursor-pointer transition-opacity text-white text-xs font-semibold gap-1.5 backdrop-blur-[1px]"
                                    >
                                      <Eye className="h-4 w-4" />
                                      <span>Bấm để xem ảnh</span>
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <div key={att.id} className="mt-2 p-2 bg-slate-100 dark:bg-black/30 rounded-lg flex items-center gap-2 text-[11px] border border-slate-200 dark:border-white/10">
                                  <Paperclip className="h-3 w-3 text-red-500" />
                                  <span className="truncate">{att.fileName}</span>
                                </div>
                              );
                            })}
                          </div>
                          <span className="text-[9px] text-slate-500 mt-1">
                            {formatDate(msg.sentAt)}
                          </span>
                        </div>
                      );
                    })}
                    <div ref={(el) => { messagesEndRefs.current[convId] = el; }} />
                  </div>

                  {/* Panel Message Composer */}
                  <div className="p-3 bg-slate-50 dark:bg-[#0a101f] border-t border-slate-200 dark:border-[#162035] shrink-0">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={replyTexts[convId] || ''}
                        onChange={(e) => setReplyTexts({ ...replyTexts, [convId]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSendMessage(convId);
                        }}
                        placeholder="Nhập tin nhắn phản hồi..."
                        className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-[#060a14] border border-slate-200 dark:border-[#1a2842] rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-red-500 focus:outline-none"
                      />
                      <Button
                        size="sm"
                        disabled={isSendingMsg || !replyTexts[convId]?.trim()}
                        onClick={() => handleSendMessage(convId)}
                        className="h-8 px-3 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white shadow-md shadow-red-600/20"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {conv.isDemo && (
                      <p className="text-[9px] text-amber-400/80 mt-1 italic">
                        * Khung chat DEMO: Tin nhắn sẽ tự động nhận phản hồi mẫu sau 1.5 giây.
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Lightbox Preview Modal cho hình ảnh đính kèm */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          {/* Top Bar của Modal */}
          <div
            className="w-full max-w-5xl flex items-center justify-between pb-3 text-white border-b border-white/10 mb-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-600/20 text-red-400 rounded-lg border border-red-500/30">
                <Maximize2 className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-100">{previewImage.name}</h4>
                {previewImage.time && (
                  <p className="text-[11px] text-slate-400">
                    Thời gian gửi: {formatDate(previewImage.time)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={previewImage.url}
                download={previewImage.name}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/10 cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              >
                <Download className="h-3.5 w-3.5" />
                <span>Tải ảnh gốc</span>
              </a>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title="Đóng (Esc)"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Vùng hiển thị ảnh lớn */}
          <div
            className="relative max-w-5xl max-h-[80vh] flex items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-black/50 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewImage.url}
              alt={previewImage.name}
              className="max-h-[78vh] max-w-full object-contain rounded-lg select-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}

