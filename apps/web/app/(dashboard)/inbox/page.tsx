'use client';

import React, { useState, useEffect } from 'react';
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
  const [panelConversations, setPanelConversations] = useState<Record<string, any>>({});
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [isSending, setIsSending] = useState<Record<string, boolean>>({});
  const [isSimulating, setIsSimulating] = useState<Record<string, boolean>>({});

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [salesRes, convsRes] = await Promise.all([
        fetchApi('/users?role=SALE'),
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

  // CẬP NHẬT LIÊN TỤC THỜI GIAN THỰC (Auto-polling mỗi 3 giây)
  // Đảm bảo tin nhắn mới phát sinh từ Zalo của nhân viên hoặc khách hàng tự động xuất hiện trên Webapp
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
    }, 3000);

    return () => clearInterval(timer);
  }, [selectedSaleId, openPanelIds]);

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

  const openConversation = async (convId: string) => {
    // Nếu đã mở thì không thêm nữa
    if (openPanelIds.includes(convId)) return;

    // Tối đa 3 panels cùng lúc trên màn hình
    const newPanelIds = openPanelIds.length >= 3 ? [...openPanelIds.slice(1), convId] : [...openPanelIds, convId];
    setOpenPanelIds(newPanelIds);

    try {
      const fullConv = await fetchApi(`/conversations/${convId}`);
      setPanelConversations((prev) => ({ ...prev, [convId]: fullConv }));
    } catch (e) {
      console.error(e);
    }
  };

  const closePanel = (convId: string) => {
    setOpenPanelIds(openPanelIds.filter((id) => id !== convId));
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
            <h2 className="text-xl font-bold text-slate-900">Hộp Thư Hội Thoại Nhiều Tài Khoản (Multi-Panel Inbox)</h2>
            <DemoBadge />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi hội thoại Zalo từ nhiều Sale cùng lúc. Mở tối đa 3 khung chat song song trên desktop.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Live Sync Status Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-xl text-xs font-semibold shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Live Sync: Cập nhật liên tục</span>
          </div>

          <Button variant="outline" size="sm" onClick={() => loadConversations(selectedSaleId)}>
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Làm mới</span>
          </Button>
        </div>
      </div>

      {/* Main Inbox Workspace Container */}
      <div className="flex-1 flex gap-4 min-h-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-2">
        {/* COLUMN 1: DANH SÁCH TÀI KHOẢN SALE */}
        <div className="w-56 bg-slate-50/70 border-r border-slate-200/80 rounded-xl flex flex-col shrink-0 p-3 overflow-hidden">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Tài Khoản Sale
          </div>

          <button
            onClick={() => handleSelectSale('')}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold mb-1 transition-all ${
              selectedSaleId === '' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200/60'
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
                    isSelected ? 'bg-blue-100/80 text-blue-900 font-semibold border border-blue-200' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <img
                    src={s.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sale'}
                    alt={s.name}
                    className="h-7 w-7 rounded-full border border-slate-200 object-cover bg-white shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs truncate font-medium">{s.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{s.zaloAccountName || s.code}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* COLUMN 2: DANH SÁCH HỘI THOẠI */}
        <div className="w-72 border-r border-slate-200/80 flex flex-col shrink-0 p-3 overflow-hidden">
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm khách hàng, tin nhắn..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {filteredConversations.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-400">Không có hội thoại nào</p>
            ) : (
              filteredConversations.map((c) => {
                const isOpen = openPanelIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => openConversation(c.id)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all ${
                      isOpen
                        ? 'border-blue-400 bg-blue-50/50 shadow-xs'
                        : 'border-transparent hover:bg-slate-50 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 truncate">{c.customer?.fullName}</span>
                      <span className="text-[10px] text-slate-400">{formatShortDate(c.lastMessageAt)}</span>
                    </div>

                    <p className="text-[11px] text-slate-500 truncate mt-1">
                      {c.messages?.[0]?.textContent || 'Chưa có tin nhắn'}
                    </p>

                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100/80 text-[10px]">
                      <span className="text-blue-700 font-medium">Sale: {c.salesUser?.name}</span>
                      {c.isDemo && <span className="text-amber-700 font-semibold">DEMO</span>}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* COLUMN 3: MULTI-PANEL CHAT WORKSPACE (OPEN 1, 2, OR 3 PANELS!) */}
        <div className="flex-1 flex gap-3 min-w-0 overflow-x-auto p-1 bg-slate-50/50 rounded-xl">
          {openPanelIds.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs">
              <MessageSquare className="h-10 w-10 text-slate-300 mb-2" />
              <p>Chọn một hoặc nhiều hội thoại bên trái để mở khung chat song song</p>
            </div>
          ) : (
            openPanelIds.map((convId) => {
              const conv = panelConversations[convId];
              const isSendingMsg = isSending[convId];

              if (!conv) {
                return (
                  <div key={convId} className="flex-1 bg-white rounded-xl border border-slate-200 p-6 flex items-center justify-center">
                    <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
                  </div>
                );
              }

              return (
                <div
                  key={convId}
                  className="flex-1 min-w-[340px] max-w-[500px] bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden shadow-xs"
                >
                  {/* Panel Header */}
                  <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Link href={`/customers/${conv.customerId}`} className="font-bold text-xs text-slate-900 hover:text-blue-600 truncate">
                          {conv.customer?.fullName}
                        </Link>
                        {conv.isDemo && <span className="text-[10px] px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded font-bold">DEMO</span>}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Sale phụ trách: <strong>{conv.salesUser?.name}</strong> ({conv.salesUser?.zaloAccountName || 'Zalo cá nhân'})
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSimulateInbound(convId)}
                        disabled={isSimulating[convId]}
                        className="h-7 text-[10px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 flex items-center gap-1 px-2 font-medium"
                        title="Mô phỏng 1 tin nhắn mới từ khách hàng để kiểm tra tính năng cập nhật liên tục thời gian thực"
                      >
                        <Sparkles className="h-3 w-3 text-emerald-600" />
                        <span>{isSimulating[convId] ? 'Đang gửi...' : 'Khách nhắn mới'}</span>
                      </Button>

                      <button
                        onClick={() => closePanel(convId)}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                        title="Đóng khung chat này"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Panel Messages Scroll Area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
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
                                ? 'bg-blue-600 text-white rounded-br-none shadow-xs'
                                : 'bg-white text-slate-900 border border-slate-200/80 rounded-bl-none shadow-xs'
                            }`}
                          >
                            <p>{msg.textContent}</p>

                            {/* Attachments if any */}
                            {msg.attachments?.map((att: any) => (
                              <div key={att.id} className="mt-2 p-2 bg-black/10 rounded-lg flex items-center gap-2 text-[11px]">
                                <Paperclip className="h-3 w-3" />
                                <span className="truncate">{att.fileName}</span>
                              </div>
                            ))}
                          </div>
                          <span className="text-[9px] text-slate-400 mt-1">
                            {formatDate(msg.sentAt)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Panel Message Composer */}
                  <div className="p-3 bg-white border-t border-slate-200 shrink-0">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={replyTexts[convId] || ''}
                        onChange={(e) => setReplyTexts({ ...replyTexts, [convId]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSendMessage(convId);
                        }}
                        placeholder="Nhập tin nhắn phản hồi..."
                        className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                      />
                      <Button
                        size="sm"
                        disabled={isSendingMsg || !replyTexts[convId]?.trim()}
                        onClick={() => handleSendMessage(convId)}
                        className="h-8 px-3"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {conv.isDemo && (
                      <p className="text-[9px] text-amber-700 mt-1 italic">
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
    </div>
  );
}
