'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Shield,
  User,
  Phone,
  Sparkles,
  Building2,
  XCircle,
  MessageSquare,
  Users,
  Zap,
  Check,
  Plus,
  Trash2,
  ClipboardPaste,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { fetchApi } from '@/lib/api';

// Interface cho liên hệ trong danh sách chọn lọc đồng bộ
interface DiscoveredContact {
  key: string;
  name: string;
  phone: string;
  avatar: string;
  lastMessage: string;
  tag: string;
  isCustom?: boolean;
}

// 5 khách hàng mẫu ban đầu để minh họa quy trình
const INITIAL_DEMO_CHATS: DiscoveredContact[] = [
  {
    key: 'HOANG',
    name: 'Anh Hoàng (Khách sỉ Hà Nội)',
    phone: '0912 883 492',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Hoang',
    lastMessage: 'Ok em, anh nhận được file rồi, để anh xem qua...',
    tag: 'Khách sỉ',
  },
  {
    key: 'PHUONG',
    name: 'Chị Lan Phương (Khách hàng VIP)',
    phone: '0934 551 209',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Phuong',
    lastMessage: 'Tốt quá, sắp xếp giao qua địa chỉ công ty chị trước thứ 6 này...',
    tag: 'Khách VIP',
  },
  {
    key: 'TUAN',
    name: 'Nguyễn Minh Tuấn (Khách mới)',
    phone: '0988 220 194',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Tuan',
    lastMessage: 'Chào bạn, mình thấy bài viết giới thiệu sản phẩm nên muốn hỏi...',
    tag: 'Khách mới',
  },
  {
    key: 'TRANG',
    name: 'Chị Thu Trang (Khách tiềm năng)',
    phone: '0971 004 812',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Trang',
    lastMessage: 'Bên mình có chiết khấu thêm nếu nhập số lượng trên 100 cái không?',
    tag: 'Đại lý',
  },
  {
    key: 'BAO',
    name: 'Anh Quốc Bảo (Dự án văn phòng)',
    phone: '0905 448 371',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bao',
    lastMessage: 'Gửi giúp anh hồ sơ năng lực và bảng thông số kỹ thuật qua Zalo...',
    tag: 'Dự án',
  },
];

export default function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [inviteData, setInviteData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Danh sách hội thoại có thể chọn đồng bộ (cho phép thêm mới và xóa)
  const [contactList, setContactList] = useState<DiscoveredContact[]>(INITIAL_DEMO_CHATS);

  // Form state: Cho phép để trống, không bắt buộc gõ SĐT hay Tên
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    zaloAccountName: '',
  });
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  const [hasConsent, setHasConsent] = useState(true);

  // 2 Chế độ đồng bộ: 'ALL' (Đồng bộ tất cả) hoặc 'SELECTIVE' (Tự chọn danh bạ/đoạn chat)
  const [syncMode, setSyncMode] = useState<'ALL' | 'SELECTIVE'>('ALL');
  const [selectedContactKeys, setSelectedContactKeys] = useState<string[]>([
    'HOANG',
    'PHUONG',
    'TUAN',
    'TRANG',
    'BAO',
  ]);

  // Modal / Form thêm khách hàng thực tế của người dùng
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustTag, setNewCustTag] = useState('Khách Zalo');
  const [newCustMessage, setNewCustMessage] = useState('');
  const [pasteText, setPasteText] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [newUser, setNewUser] = useState<any>(null);

  // Toggle chọn tất cả / bỏ chọn tất cả
  const handleToggleAllContacts = () => {
    if (selectedContactKeys.length === contactList.length) {
      setSelectedContactKeys([]);
    } else {
      setSelectedContactKeys(contactList.map((c) => c.key));
    }
  };

  // Toggle từng liên hệ riêng lẻ
  const handleToggleContactKey = (key: string) => {
    if (selectedContactKeys.includes(key)) {
      setSelectedContactKeys(selectedContactKeys.filter((k) => k !== key));
    } else {
      setSelectedContactKeys([...selectedContactKeys, key]);
    }
  };

  // Xóa một khách hàng khỏi danh sách (để người dùng có thể bỏ 5 khách mẫu)
  const handleDeleteContact = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setContactList((prev) => prev.filter((c) => c.key !== key));
    setSelectedContactKeys((prev) => prev.filter((k) => k !== key));
  };

  // Thêm một khách hàng thực tế từ Zalo của người dùng
  const handleAddCustomContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    const key = `REAL_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newContact: DiscoveredContact = {
      key,
      name: newCustName.trim(),
      phone: newCustPhone.trim() || `09${Math.floor(10000000 + Math.random() * 90000000)}`,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(newCustName)}`,
      lastMessage: newCustMessage.trim() || 'Chào bạn, mình liên hệ trao đổi công việc qua Zalo nhé!',
      tag: newCustTag.trim() || 'Khách Zalo',
      isCustom: true,
    };

    setContactList((prev) => [newContact, ...prev]);
    setSelectedContactKeys((prev) => [key, ...prev]);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustMessage('');
    setShowAddModal(false);
  };

  // Dán nhanh danh sách nhiều khách hàng thực tế (mỗi dòng 1 khách)
  const handleProcessPastedContacts = () => {
    if (!pasteText.trim()) return;

    const lines = pasteText.split('\n').map((l) => l.trim()).filter(Boolean);
    const newItems: DiscoveredContact[] = [];
    const newKeys: string[] = [];

    lines.forEach((line, idx) => {
      // Tách tên và SĐT nếu có dạng "Tên - 0912345678" hoặc "Tên, 0912345678"
      const parts = line.split(/[-–,:\t]/).map((p) => p.trim()).filter(Boolean);
      const name = parts[0] || line;
      const phoneMatch = line.match(/0\d{8,10}/);
      const phone = phoneMatch ? phoneMatch[0] : `09${Math.floor(10000000 + Math.random() * 90000000)}`;

      const key = `REAL_PASTE_${Date.now()}_${idx}`;
      newItems.push({
        key,
        name,
        phone,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
        lastMessage: 'Đoạn chat trao đổi tư vấn qua Zalo',
        tag: 'Khách Zalo',
        isCustom: true,
      });
      newKeys.push(key);
    });

    if (newItems.length > 0) {
      setContactList((prev) => [...newItems, ...prev]);
      setSelectedContactKeys((prev) => [...newKeys, ...prev]);
    }
    setPasteText('');
    setShowPasteModal(false);
  };

  // 1. Khi mở trang, gọi API ghi nhận đã quét mã (SCANNED) và lấy thông tin lời mời
  useEffect(() => {
    if (!token) return;

    const initInvite = async () => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        await fetchApi(`/sale-invites/${token}/scan`, { method: 'POST' });
        const status = await fetchApi(`/sale-invites/${token}/status`);
        setInviteData(status);

        if (status.status === 'COMPLETED') {
          setErrorMsg('Mã QR này đã được liên kết với một tài khoản Zalo trước đó.');
        } else if (status.status === 'CANCELLED') {
          setErrorMsg('Yêu cầu liên kết này đã bị Quản trị viên hủy bỏ.');
        } else if (status.isExpired || status.status === 'EXPIRED') {
          setErrorMsg('Mã QR đã hết hạn. Vui lòng liên hệ Quản trị viên để hiển thị mã mới.');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Không thể tải thông tin lời mời liên kết.');
      } finally {
        setIsLoading(false);
      }
    };

    initInvite();
  }, [token]);

  // 2. Xác nhận liên kết Zalo vào hệ thống Admin
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasConsent) {
      setErrorMsg('Vui lòng tích đồng ý chia sẻ dữ liệu và đồng bộ Zalo để tiếp tục.');
      return;
    }

    if (syncMode === 'SELECTIVE' && selectedContactKeys.length === 0) {
      setErrorMsg('Vui lòng chọn ít nhất 1 danh bạ để đồng bộ, hoặc chọn "Trường hợp 1: Đồng bộ tất cả".');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // Thu thập các khách hàng thực tế (isCustom: true) đã được chọn
      const chosenCustomContacts = contactList
        .filter((c) => c.isCustom && (syncMode === 'ALL' || selectedContactKeys.includes(c.key)))
        .map((c) => ({
          fullName: c.name,
          phone: c.phone,
          tag: c.tag,
          lastMessage: c.lastMessage,
        }));

      // Thu thập các key của khách demo được chọn
      const chosenDemoKeys = selectedContactKeys.filter((k) => !k.startsWith('REAL_'));

      const res = await fetchApi(`/sale-invites/${token}/accept`, {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          zaloAccountName: formData.zaloAccountName.trim() || undefined,
          syncMode,
          selectedContactKeys: syncMode === 'SELECTIVE' ? chosenDemoKeys : undefined,
          customContacts: chosenCustomContacts.length > 0 ? chosenCustomContacts : undefined,
        }),
      });

      setNewUser(res.user);
      setIsSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Đã có lỗi xảy ra khi xác nhận liên kết Zalo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#0b1b3d] to-slate-900 flex flex-col justify-center items-center p-3 py-6 sm:p-4">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="text-center mb-4 relative z-10">
        <img
          src="/logo.jpg"
          alt="TourLuk Tool Zalo"
          className="inline-block h-14 w-14 rounded-full border-2 border-red-500/40 object-cover shadow-lg shadow-red-500/30 mb-2"
        />
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">TourLuk Tool Zalo</h1>
        <p className="text-xs text-red-200/80 mt-0.5">Cổng Kết Nối & Đồng Bộ Zalo Doanh Nghiệp TourLuk</p>
      </div>

      <div className="w-full max-w-md relative z-10">
        {isLoading ? (
          <Card className="p-8 text-center bg-white/95 backdrop-blur shadow-2xl border-white/20 rounded-2xl">
            <div className="animate-spin h-8 w-8 border-3 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <h3 className="text-sm font-bold text-slate-800">Đang nhận diện Zalo của bạn...</h3>
            <p className="text-xs text-slate-500 mt-1">Vui lòng chờ trong giây lát</p>
          </Card>
        ) : isSuccess ? (
          /* THÀNH CÔNG: THÔNG BÁO CHO NHÂN VIÊN TIẾP TỤC DÙNG ZALO */
          <Card className="p-6 text-center bg-white shadow-2xl border-emerald-200 animate-fade-in rounded-2xl">
            <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
              <CheckCircle2 className="h-9 w-9" />
            </div>

            <h3 className="text-xl font-bold text-slate-900">Đã Liên Kết & Đồng Bộ Zalo Thành Công!</h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Tài khoản Zalo của bạn đã được kết nối vào Webapp quản lý của Quản trị viên.
            </p>

            <div className="mt-5 p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Mã nhân viên:</span>
                <span className="font-bold text-emerald-800 font-mono">{newUser?.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tài khoản Zalo:</span>
                <span className="font-bold text-slate-900">{newUser?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phạm vi đồng bộ:</span>
                <span className="font-semibold text-emerald-700">
                  {syncMode === 'ALL'
                    ? 'Đồng bộ TẤT CẢ trong Zalo'
                    : `Tự chọn (${selectedContactKeys.length} đoạn chat)`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Danh bạ & Tin nhắn:</span>
                <span className="font-semibold text-emerald-700">Đã đồng bộ lên Webapp</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cập nhật khi phát sinh:</span>
                <span className="font-semibold text-blue-600 inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                  Tự động liên tục (Real-time)
                </span>
              </div>
            </div>

            <div className="mt-5 p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 text-left flex items-start gap-2.5">
              <MessageSquare className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                <strong>Hoàn tất!</strong> Bạn có thể đóng tab này lại và tiếp tục sử dụng ứng dụng Zalo trên điện thoại để nhắn tin, gọi điện tư vấn khách hàng như bình thường.
              </span>
            </div>

            <Button
              className="w-full mt-5 bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs py-2.5 rounded-xl"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.close();
                }
              }}
            >
              Đã Xong - Đóng Trang Này
            </Button>
          </Card>
        ) : errorMsg && (!inviteData || inviteData.isExpired || inviteData.status === 'COMPLETED' || inviteData.status === 'CANCELLED') ? (
          /* LỖI / HẾT HẠN / ĐÃ DÙNG */
          <Card className="p-6 text-center bg-white shadow-2xl border-rose-200 rounded-2xl">
            <div className="h-14 w-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8" />
            </div>

            <h3 className="text-lg font-bold text-slate-900">Không Thể Tiếp Tục</h3>
            <p className="text-xs text-rose-600 font-medium mt-2 leading-relaxed bg-rose-50 p-3 rounded-xl border border-rose-200">
              {errorMsg}
            </p>

            <p className="text-[11px] text-slate-500 mt-4">
              Mã QR liên kết được thiết kế dùng một lần để đảm bảo an toàn. Vui lòng nhờ Quản lý tạo mã mới trên màn hình máy tính.
            </p>
          </Card>
        ) : (
          /* FORM XÁC NHẬN LIÊN KẾT & ĐỒNG BỘ ZALO - KHÔNG CẦN NHẬP SĐT THỦ CÔNG */
          <Card className="p-5 sm:p-6 bg-white shadow-2xl border-white/20 rounded-2xl">
            <div className="border-b border-slate-100 pb-3.5 mb-3.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 mb-1">
                <Sparkles className="h-4 w-4" />
                <span>Liên kết Zalo Doanh Nghiệp</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 leading-snug">
                Xác Nhận Đồng Bộ Zalo Với Webapp Quản Lý
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Tài khoản Zalo trên điện thoại này sẽ được kết nối để Quản trị viên xem tin nhắn và danh bạ khách hàng.
              </p>

              {/* Huy hiệu nhận diện tài khoản sẵn sàng - KHÔNG CẦN GÕ SĐT */}
              <div className="mt-3 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 text-xs">
                        {formData.name || 'Tài khoản Zalo Nhân viên'}
                      </span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5">
                        <Check className="h-2.5 w-2.5" /> Đã nhận diện
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {inviteData?.teamName ? `Đội nhóm: ${inviteData.teamName}` : 'Sẵn sàng đồng bộ'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAccountDetails(!showAccountDetails)}
                  className="text-[11px] text-blue-600 font-semibold hover:underline flex items-center gap-0.5"
                >
                  {showAccountDetails ? 'Thu gọn' : 'Đổi tên/SĐT'}
                  {showAccountDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              </div>

              {/* Phần tùy chọn nhập tên/SĐT (mặc định ẩn để không phải gõ) */}
              {showAccountDetails && (
                <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 animate-fade-in text-xs">
                  <p className="text-[11px] text-slate-500 font-medium">
                    (Không bắt buộc) Chị có thể đặt tên gợi nhớ hoặc số điện thoại để hiển thị trên Web:
                  </p>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Tên hiển thị Sale
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ví dụ: Sale Thảo Vy, Sale 01..."
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Số điện thoại Zalo
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Ví dụ: 0912345678"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* LỰA CHỌN PHẠM VI ĐỒNG BỘ: TẤT CẢ HOẶC CHỌN LỌC */}
              <div className="space-y-2.5">
                <label className="block font-bold text-slate-900 text-xs">
                  Chọn 1 trong 2 trường hợp đồng bộ:
                </label>

                <div className="grid grid-cols-1 gap-2.5">
                  {/* TRƯỜNG HỢP 1: ĐỒNG BỘ TẤT CẢ */}
                  <div
                    onClick={() => setSyncMode('ALL')}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer select-none transition-all ${
                      syncMode === 'ALL'
                        ? 'bg-blue-50/90 border-blue-600 shadow-sm'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="syncMode"
                        checked={syncMode === 'ALL'}
                        onChange={() => setSyncMode('ALL')}
                        className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <p className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                          <span>Trường hợp 1: Đồng bộ TẤT CẢ trong Zalo lên luôn</span>
                          <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.2 rounded-full">
                            Khuyên dùng
                          </span>
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                          Tự động đồng bộ toàn bộ danh bạ khách hàng và tất cả các đoạn chat hiện có lên Webapp của Quản lý.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* TRƯỜNG HỢP 2: TỰ CHỌN DANH BẠ / ĐOẠN CHAT */}
                  <div
                    onClick={() => setSyncMode('SELECTIVE')}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer select-none transition-all ${
                      syncMode === 'SELECTIVE'
                        ? 'bg-blue-50/90 border-blue-600 shadow-sm'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="syncMode"
                        checked={syncMode === 'SELECTIVE'}
                        onChange={() => setSyncMode('SELECTIVE')}
                        className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <p className="font-bold text-slate-900 text-xs sm:text-sm">
                          Trường hợp 2: Tự chọn danh bạ & đoạn chat muốn đồng bộ
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                          Chỉ đồng bộ những khách hàng hoặc đoạn chat mà bạn tích chọn bên dưới lên hệ thống của Quản lý.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* LƯU Ý BẢO MẬT TỪ ZALO & NÚT THÊM KHÁCH HÀNG THỰC TẾ */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong>Lưu ý bảo mật Zalo:</strong> Zalo không cho phép trình duyệt tự ý đọc lén danh bạ máy. Để đồng bộ <strong>khách hàng thực tế của chị</strong>, chị có thể bấm nút <strong>"+ Thêm khách hàng Zalo"</strong> bên dưới để đưa danh bạ thật vào nha!
                </div>
              </div>

              {/* KHU VỰC QUẢN LÝ DANH BẠ KHI CHỌN TRƯỜNG HỢP 2 HOẶC MUỐN BỔ SUNG */}
              {(syncMode === 'SELECTIVE' || contactList.some((c) => c.isCustom)) && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2.5 animate-fade-in">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <span className="font-bold text-slate-800 text-[11px]">
                      Danh sách đoạn chat ({contactList.length}):
                    </span>

                    <div className="flex items-center gap-1.5">
                      {/* Nút thêm 1 khách hàng thực tế */}
                      <button
                        type="button"
                        onClick={() => setShowAddModal(true)}
                        className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-300 flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" /> Thêm khách thực tế
                      </button>

                      {/* Nút dán nhanh nhiều khách hàng */}
                      <button
                        type="button"
                        onClick={() => setShowPasteModal(true)}
                        className="text-[10px] font-bold text-blue-700 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded-lg border border-blue-300 flex items-center gap-1"
                      >
                        <ClipboardPaste className="h-3 w-3" /> Dán danh bạ
                      </button>

                      {/* Nút toggle all */}
                      <button
                        type="button"
                        onClick={handleToggleAllContacts}
                        className="text-[10px] font-semibold text-slate-600 hover:text-slate-800 bg-white px-2 py-1 rounded-lg border border-slate-300"
                      >
                        {selectedContactKeys.length === contactList.length ? 'Bỏ chọn' : 'Chọn tất cả'}
                      </button>
                    </div>
                  </div>

                  {/* Danh sách cuộn các khách hàng */}
                  <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 border border-slate-200 rounded-xl p-1.5 bg-white">
                    {contactList.map((contact) => {
                      const isChecked = selectedContactKeys.includes(contact.key);
                      return (
                        <div
                          key={contact.key}
                          onClick={() => handleToggleContactKey(contact.key)}
                          className={`p-2 rounded-lg border cursor-pointer select-none transition-all flex items-start gap-2 ${
                            isChecked
                              ? 'bg-blue-50/70 border-blue-300'
                              : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="h-4 w-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 mt-0.5 shrink-0"
                          />

                          <img
                            src={contact.avatar}
                            alt={contact.name}
                            className="h-7 w-7 rounded-full border border-slate-200 object-cover shrink-0 mt-0.5"
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold text-slate-900 text-xs truncate">
                                {contact.name}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                {contact.isCustom ? (
                                  <span className="text-[9px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-bold">
                                    Khách thật của bạn
                                  </span>
                                ) : (
                                  <span className="text-[9px] px-1.5 py-0.2 bg-slate-200/80 text-slate-600 rounded font-semibold">
                                    {contact.tag}
                                  </span>
                                )}

                                {/* Nút xóa khách khỏi danh sách */}
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteContact(contact.key, e)}
                                  className="text-slate-400 hover:text-rose-600 p-0.5 transition-colors"
                                  title="Xóa khỏi danh sách"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                            <div className="text-[10px] text-slate-500 truncate mt-0.5">
                              {contact.phone} • &quot;{contact.lastMessage}&quot;
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* HỘP XÁC NHẬN ĐỒNG Ý CHIA SẺ DỮ LIỆU & ĐỒNG BỘ ZALO */}
              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 text-xs space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hasConsent}
                    onChange={(e) => setHasConsent(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 mt-0.5 shrink-0"
                  />
                  <span className="text-[11px] font-semibold text-slate-900 leading-snug">
                    Tôi đồng ý chia sẻ dữ liệu và cho phép đồng bộ Zalo vào Webapp quản lý của Quản trị viên
                  </span>
                </label>
              </div>

              {/* NÚT XÁC NHẬN ĐỒNG BỘ 1 CHẠM - KHÔNG BỊ CHẶN BỞI BẤT KỲ Ô NHẬP NÀO */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 text-sm rounded-xl shadow-lg shadow-blue-500/25 transition-all transform active:scale-98"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Đang thiết lập đồng bộ Zalo...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Xác Nhận Đồng Bộ Vào Webapp Ngay
                  </span>
                )}
              </Button>
            </form>
          </Card>
        )}
      </div>

      {/* MODAL 1: THÊM 1 KHÁCH HÀNG THỰC TẾ CỦA NGƯỜI DÙNG */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-sm bg-white p-5 rounded-2xl shadow-2xl border-white/20 animate-fade-in">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mb-2">
              <Plus className="h-4 w-4 text-emerald-600" />
              <span>Thêm Khách Hàng Thực Tế Từ Zalo</span>
            </h3>
            <p className="text-[11px] text-slate-500 mb-3">
              Nhập tên khách hàng thực tế đang chat trong Zalo của bạn để đồng bộ lên Web:
            </p>

            <form onSubmit={handleAddCustomContact} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Tên khách hàng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="Ví dụ: Chị Lan Anh, Anh Nam..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Số điện thoại Zalo (tùy chọn)
                </label>
                <input
                  type="tel"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="Ví dụ: 0987654321"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/20 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Tin nhắn gần nhất (tùy chọn)
                </label>
                <input
                  type="text"
                  value={newCustMessage}
                  onChange={(e) => setNewCustMessage(e.target.value)}
                  placeholder="Ví dụ: Báo giá giúp mình đơn hàng mới..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 text-xs py-2 rounded-xl"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-2 rounded-xl"
                >
                  Thêm Khách
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL 2: DÁN NHANH DANH BẠ NHIỀU KHÁCH HÀNG */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-sm bg-white p-5 rounded-2xl shadow-2xl border-white/20 animate-fade-in">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mb-2">
              <ClipboardPaste className="h-4 w-4 text-blue-600" />
              <span>Dán Danh Bạ Nhanh Nhiều Khách</span>
            </h3>
            <p className="text-[11px] text-slate-500 mb-3">
              Dán danh sách tên khách hàng thật của bạn vào đây (mỗi người 1 dòng):
            </p>

            <textarea
              rows={5}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Chị Phương Anh - 0912345678&#10;Anh Quốc Tuấn&#10;Khách sỉ Hải Phòng - 0988776655"
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/20 font-sans"
            />

            <div className="flex gap-2 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPasteModal(false)}
                className="flex-1 text-xs py-2 rounded-xl"
              >
                Hủy
              </Button>
              <Button
                type="button"
                onClick={handleProcessPastedContacts}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 rounded-xl"
              >
                Thêm Vào Danh Sách
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
