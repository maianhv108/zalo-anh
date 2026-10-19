// Content Script chạy trực tiếp trên chat.zalo.me

(function () {
  console.log('[Sales Zalo CRM Extension] Content script đã kích hoạt trên Zalo Web.');

  let lastSyncedCustomer = '';
  let lastSyncedMessageCount = 0;
  let lastSyncedLastMessageText = '';
  let isSyncingNow = false;
  let syncTimeout = null;

  // 1. Tạo và chèn Floating Widget hiển thị trạng thái và nút đồng bộ
  function injectFloatingWidget() {
    if (document.getElementById('sales-zalo-crm-widget')) return;

    const widget = document.createElement('div');
    widget.id = 'sales-zalo-crm-widget';
    widget.innerHTML = `
      <div class="crm-badge-dot"></div>
      <span class="crm-widget-text" id="crm-widget-label">TourLuk Sync: Đang kết nối</span>
      <button class="crm-sync-btn" id="crm-btn-sync-trigger" title="Đồng bộ toàn bộ tin nhắn cũ của khách này">
        ⚡ Đồng Bộ Khách Này
      </button>
      <button class="crm-sync-btn" id="crm-btn-sync-all" style="background: #334155;" title="Tự động quét và đồng bộ toàn bộ danh sách khách cũ ở cột trái">
        🔄 Quét Hết Khách Cũ
      </button>
    `;
    document.body.appendChild(widget);

    // Toast thông báo
    const toast = document.createElement('div');
    toast.id = 'crm-sync-toast';
    toast.innerHTML = '<span>✅ Đã đồng bộ tin nhắn lên TourLuk Tool Zalo!</span>';
    document.body.appendChild(toast);

    // Gắn sự kiện click nút đồng bộ nhanh
    document.getElementById('crm-btn-sync-trigger').addEventListener('click', () => {
      triggerSync(true);
    });

    // Gắn sự kiện quét tất cả tin nhắn cũ
    document.getElementById('crm-btn-sync-all').addEventListener('click', () => {
      syncAllConversations();
    });

    // Cập nhật tên Sale hiển thị trên Widget
    chrome.storage.local.get(['salesCode'], (res) => {
      const code = res.salesCode || 'SALE';
      const label = document.getElementById('crm-widget-label');
      if (label) label.innerText = `TourLuk: ${code}`;
    });
  }

  // 2. Hiển thị Toast thông báo nhanh
  function showToast(msg, isSuccess = true) {
    const toast = document.getElementById('crm-sync-toast');
    if (!toast) return;
    toast.innerHTML = `<span>${isSuccess ? '✅' : '⚠️'} ${msg}</span>`;
    toast.style.borderLeftColor = isSuccess ? '#22c55e' : '#ef4444';
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3500);
  }

  // 3. Trích xuất thông tin khách hàng đang mở trên Zalo Web
  function getActiveCustomerInfo() {
    // Tìm tiêu đề tên người chat trong khung chat Zalo
    let name = '';
    const headerEl =
      document.querySelector('.chat-box__header__title') ||
      document.querySelector('.header-title') ||
      document.querySelector('[data-id="chat-title"]') ||
      document.querySelector('.chat-title') ||
      document.querySelector('.truncate.title') ||
      document.querySelector('.nav-title');

    if (headerEl && headerEl.textContent.trim()) {
      name = headerEl.textContent.trim();
    }

    // Fallback: Tìm trong danh sách hội thoại đang active ở cột trái
    if (!name) {
      const activeConv =
        document.querySelector('.conv-item.active') ||
        document.querySelector('[class*="conv-item"][class*="active"]') ||
        document.querySelector('[class*="thread-item"][class*="selected"]');
      if (activeConv) {
        const titleEl =
          activeConv.querySelector('.conv-item-title__name') ||
          activeConv.querySelector('.title') ||
          activeConv.querySelector('.name');
        if (titleEl) name = titleEl.textContent.trim();
      }
    }

    // Avatar
    const avatarEl =
      document.querySelector('.chat-box__header img') ||
      document.querySelector('.header img') ||
      document.querySelector('.conv-item.active img');
    const avatarUrl = avatarEl ? avatarEl.src : '';

    return { name, avatarUrl };
  }

  // 4. Trích xuất các tin nhắn hiển thị trong cuộc trò chuyện hiện tại (Chỉ trong khung chat chính)
  function extractVisibleMessages() {
    const messages = [];

    // Tìm container khung chat chính (ở giữa/phải, TUYỆT ĐỐI KHÔNG LẤY TỪ CỘT DANH SÁCH BÊN TRÁI)
    const chatContainer =
      document.querySelector('#messageViewScroll') ||
      document.querySelector('.message-view__scroll') ||
      document.querySelector('#chatView') ||
      document.querySelector('.message-view') ||
      document.querySelector('.chat-box__content') ||
      document.querySelector('.chat-message-list') ||
      document.querySelector('.chat-box');

    // Nếu có chatContainer, chỉ tìm các thẻ tin nhắn bên trong nó
    const candidateEls = chatContainer
      ? chatContainer.querySelectorAll('.msg-item, .chat-message, [data-id^="msg_"], .message-view__item, .card--message')
      : document.querySelectorAll('.msg-item, .chat-message, [data-id^="msg_"], .message-view__item');

    candidateEls.forEach((el) => {
      // LOẠI TRỪ 100% CÁC PHẦN TỬ THUỘC SIDEBAR TRÁI HOẶC DANH SÁCH HỘI THOẠI
      if (
        el.closest(
          '#conversationList, .conv-list, [class*="conv-item"], [class*="conv-list"], [class*="sidebar"], .thread-list, [data-id="conversation-list"]',
        )
      ) {
        return;
      }

      // Xác định chiều tin nhắn: Tin mình gửi (OUTBOUND) hay khách gửi đến (INBOUND)
      const isOutbound =
        el.classList.contains('me') ||
        el.classList.contains('msg-item--me') ||
        el.className.includes('--me') ||
        el.className.includes('outbound') ||
        el.querySelector('[class*="--me"]') !== null;

      // Lấy nội dung text tin nhắn
      const textEl =
        el.querySelector('.text-message') ||
        el.querySelector('.bubble-text') ||
        el.querySelector('.content-text') ||
        el.querySelector('[class*="text-message"]') ||
        el.querySelector('.text') ||
        el.querySelector('[data-translate-inner]');

      let text = '';
      if (textEl) {
        text = textEl.innerText.trim();
      } else {
        const bubble = el.querySelector('.bubble, .msg-content');
        if (bubble) text = bubble.innerText.trim();
      }

      // Lọc bỏ các thông báo hệ thống và preview thừa từ danh bạ
      if (
        text &&
        text.length > 0 &&
        text.length < 5000 &&
        !text.includes('Chưa có tin nhắn') &&
        !text.includes('[Tin nhắn đang đồng bộ]') &&
        !text.startsWith('Hôm nay') &&
        !text.startsWith('Hôm qua') &&
        !text.includes('chia sẻ vị trí')
      ) {
        messages.push({
          direction: isOutbound ? 'OUTBOUND' : 'INBOUND',
          text: text,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Lấy tối đa 150 tin nhắn cũ và mới trong cuộc trò chuyện này
    return messages.slice(-150);
  }

  let isBatchSyncing = false;

  // Quét và tự động đồng bộ hàng loạt tất cả các khách hàng cũ ở cột trái
  async function syncAllConversations() {
    if (isBatchSyncing) {
      showToast('Đang quét danh sách hội thoại cũ, vui lòng chờ trong giây lát...', false);
      return;
    }

    const items = document.querySelectorAll(
      '.conv-item, [class*="conv-item"], .thread-item, [data-id^="conv_"]',
    );

    if (items.length === 0) {
      showToast('Chưa tìm thấy danh sách hội thoại Zalo ở cột trái!', false);
      return;
    }

    isBatchSyncing = true;
    showToast(`Bắt đầu đồng bộ ${items.length} cuộc trò chuyện cũ...`);

    let count = 0;
    for (let i = 0; i < Math.min(items.length, 50); i++) {
      const item = items[i];
      try {
        item.click();
        await new Promise((r) => setTimeout(r, 1200));
        await triggerSync(false);
        count++;
      } catch (e) {
        // continue
      }
    }

    isBatchSyncing = false;
    showToast(`✅ Đã đồng bộ thành công ${count} khách hàng và toàn bộ tin nhắn cũ lên Webapp!`);
  }

  // 5. Thực hiện gửi dữ liệu về máy chủ Webapp
  async function triggerSync(isManual = false) {
    if (isSyncingNow && !isManual) return;
    const { name, avatarUrl } = getActiveCustomerInfo();

    if (!name) {
      if (isManual) {
        showToast('Vui lòng bấm chọn một cuộc trò chuyện trên Zalo để đồng bộ!', false);
      }
      return { success: false, error: 'Chưa mở cuộc trò chuyện nào trên Zalo' };
    }

    const messages = extractVisibleMessages();
    if (messages.length === 0) {
      if (isManual) {
        showToast(`Đang mở chat với "${name}" nhưng chưa có tin nhắn text!`, false);
      }
      return { success: false, error: 'Chưa có tin nhắn' };
    }

    // Lấy salesCode từ storage
    const stored = await chrome.storage.local.get(['salesCode', 'autoSync']);
    const salesCode = stored.salesCode || 'SALE01';

    if (!isManual && stored.autoSync === false) {
      return { success: false, error: 'Tự động đồng bộ đang tắt' };
    }

    const payload = {
      salesCode,
      customer: {
        name,
        avatarUrl,
      },
      messages,
    };

    isSyncingNow = true;
    try {
      chrome.runtime.sendMessage(
        { action: 'SYNC_CONVERSATION', payload },
        (response) => {
          isSyncingNow = false;
          if (response && response.success) {
            lastSyncedCustomer = name;
            lastSyncedMessageCount = messages.length;
            lastSyncedLastMessageText = messages.length > 0 ? messages[messages.length - 1].text : '';

            // Cập nhật nhãn thời gian trên widget nổi
            const label = document.getElementById('crm-widget-label');
            if (label) {
              const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              label.innerText = `TourLuk: Đã sync lúc ${timeStr}`;
            }

            if (isManual) {
              showToast(`Đã đồng bộ khách "${name}" (${messages.length} tin) lên Webapp!`);
            }
          } else {
            console.warn('[TourLuk Sync] Lỗi đồng bộ:', response?.error);
            if (isManual) {
              showToast(`Lỗi: ${response?.error || 'Không kết nối được Webapp'}`, false);
            }
          }
        },
      );
      return { success: true, message: `Đã gửi đồng bộ khách "${name}" lên Webapp!` };
    } catch (e) {
      isSyncingNow = false;
      console.error('[TourLuk Sync] Exception:', e);
      if (isManual) showToast(`Lỗi: ${e.message}`, false);
      return { success: false, error: e.message };
    }
  }

  // 6. Kiểm tra và tự động đồng bộ ngay nếu có tin nhắn mới hoặc đổi khách
  function checkAndAutoSync() {
    if (isSyncingNow || isBatchSyncing) return;
    const { name } = getActiveCustomerInfo();
    if (!name) return;

    const messages = extractVisibleMessages();
    if (messages.length === 0) return;

    const lastMsgText = messages[messages.length - 1]?.text || '';
    const isNewCustomer = name !== lastSyncedCustomer;
    const hasNewMessage =
      messages.length !== lastSyncedMessageCount || lastMsgText !== lastSyncedLastMessageText;

    if (isNewCustomer || hasNewMessage) {
      console.log(`[TourLuk Realtime] Phát hiện thay đổi -> Sync ngay: Khách=${name}, Tổng tin=${messages.length}`);
      triggerSync(false);
    }
  }

  // 7. Tự động theo dõi đa tầng: Observer + Enter keydown + Click + Interval Polling
  function setupRealtimeListeners() {
    // Kênh 1: MutationObserver theo dõi thay đổi DOM
    const observer = new MutationObserver(() => {
      clearTimeout(syncTimeout);
      syncTimeout = setTimeout(checkAndAutoSync, 800);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Kênh 2: Lắng nghe phím Enter khi gõ gửi tin nhắn
    document.addEventListener(
      'keydown',
      (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          setTimeout(checkAndAutoSync, 600);
          setTimeout(checkAndAutoSync, 1500);
        }
      },
      true,
    );

    // Kênh 3: Lắng nghe click chuột vào nút gửi hoặc chọn cuộc trò chuyện khác
    document.addEventListener(
      'click',
      () => {
        setTimeout(checkAndAutoSync, 700);
        setTimeout(checkAndAutoSync, 1800);
      },
      true,
    );

    // Kênh 4: Heartbeat Polling định kỳ mỗi 2.5 giây để không bao giờ bỏ sót tin nhắn
    setInterval(checkAndAutoSync, 2500);
  }

  // 8. Lắng nghe lệnh từ Popup Extension
  chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    if (req.action === 'TRIGGER_MANUAL_SYNC') {
      triggerSync(true).then((res) => sendResponse(res));
      return true;
    }
  });

  // Khởi động khi tải xong trang Zalo Web
  window.addEventListener('load', () => {
    setTimeout(() => {
      injectFloatingWidget();
      setupRealtimeListeners();
    }, 1500);
  });

  // Chạy ngay nếu trang đã sẵn sàng
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(() => {
      injectFloatingWidget();
      setupRealtimeListeners();
    }, 1500);
  }
})();
