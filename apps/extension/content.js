// Content Script chạy trực tiếp trên chat.zalo.me và oa.zalo.me

(function () {
  const isOaPage = window.location.hostname.includes('oa.zalo.me');
  console.log(`[TourLuk Sync Extension] Content script đã kích hoạt trên: ${window.location.hostname} (Chế độ: ${isOaPage ? 'Zalo OA Doanh Nghiệp' : 'Zalo Cá Nhân'})`);

  // Tự động nhận diện salesCode khi khởi chạy từ Trình giả lập thiết bị đa tài khoản
  let currentSalesCode = 'SALE02';
  try {
    const hash = window.location.hash || '';
    if (hash.includes('salesCode=')) {
      const paramCode = new URLSearchParams(hash.replace(/^#/, '')).get('salesCode');
      if (paramCode) {
        currentSalesCode = paramCode;
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ salesCode: paramCode });
        }
        localStorage.setItem('tourluk_salesCode', paramCode);
        console.log(`[TourLuk Device Simulator] Tự động gán mã Sale từ thiết bị giả lập: ${paramCode}`);
      }
    }
  } catch (e) {
    console.warn('[TourLuk Sync] Không thể đọc hash URL:', e);
  }

  const SYSTEM_EXCLUDE_WORDS = [
    'trang chủ', 'chat', 'chatbot', 'nội dung', 'chiến dịch', 'thống kê', 'khách hàng',
    'quản lý', 'khác', 'zalo official', 'official account', 'tourluk official', 'tourluk',
    'tin chính', 'nhóm', 'trạng thái', 'nhân viên', 'nhãn', 'thứ hai', 'thứ ba', 'thứ tư',
    'thứ năm', 'thứ sáu', 'thứ bảy', 'chủ nhật', 'tin nhắn', 'chưa có tin nhắn'
  ];

  function isForbidden(str) {
    if (!str) return true;
    const s = str.trim().toLowerCase();
    if (s.length < 2 || s.length > 50) return true;
    return SYSTEM_EXCLUDE_WORDS.some((w) => s === w || s.startsWith(w));
  }

  let lastSyncedCustomer = '';
  let lastSyncedMessageCount = 0;
  let lastSyncedLastMessageText = '';
  let isSyncingNow = false;
  let syncTimeout = null;

  // 1. Tạo và chèn Floating Widget hiển thị trạng thái và nút đồng bộ
  function injectFloatingWidget() {
    const existingWidget = document.getElementById('sales-zalo-crm-widget');
    if (existingWidget) {
      existingWidget.remove();
    }
    const existingToast = document.getElementById('crm-sync-toast');
    if (existingToast) {
      existingToast.remove();
    }

    const widget = document.createElement('div');
    widget.id = 'sales-zalo-crm-widget';
    widget.innerHTML = `
      <div class="crm-badge-dot" style="${isOaPage ? 'background: #38bdf8; box-shadow: 0 0 8px #38bdf8;' : ''}"></div>
      <span class="crm-widget-text" id="crm-widget-label">${isOaPage ? 'TourLuk OA: Sẵn sàng' : 'TourLuk Sync: Sẵn sàng'}</span>
      <button class="crm-sync-btn" id="crm-btn-sync-trigger" style="${isOaPage ? 'background: #0284c7;' : ''}" title="Chỉ đồng bộ riêng cuộc trò chuyện của khách hàng đang mở">
        ⚡ ${isOaPage ? 'Đồng Bộ Khách OA Này' : 'Đồng Bộ Khách Này'}
      </button>
      <button class="crm-sync-btn" id="crm-btn-sync-all" style="background: #334155;" title="Tự động lần lượt đồng bộ toàn bộ danh sách khách ở cột trái">
        🔄 ${isOaPage ? 'Đồng Bộ Tất Cả Đoạn Chat OA' : 'Đồng Bộ Tất Cả Đoạn Chat'}
      </button>
    `;
    document.body.appendChild(widget);

    // Toast thông báo
    const toast = document.createElement('div');
    toast.id = 'crm-sync-toast';
    toast.innerHTML = '<span>✅ Đã đồng bộ tin nhắn lên TourLuk CRM!</span>';
    document.body.appendChild(toast);

    // Gắn sự kiện click nút đồng bộ nhanh
    document.getElementById('crm-btn-sync-trigger').addEventListener('click', () => {
      triggerSync(true);
    });

    // Gắn sự kiện quét tất cả tin nhắn cũ
    document.getElementById('crm-btn-sync-all').addEventListener('click', () => {
      syncAllConversations();
    });

    // Cập nhật tên Sale / OA hiển thị trên Widget
    const updateLabel = (code) => {
      const label = document.getElementById('crm-widget-label');
      if (!label) return;
      if (isOaPage) {
        label.innerText = 'TourLuk: Zalo OA';
      } else {
        label.innerText = `TourLuk: ${code || currentSalesCode || 'SALE'}`;
      }
    };

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['salesCode'], (res) => {
        updateLabel(res?.salesCode || currentSalesCode);
      });
    } else {
      updateLabel(localStorage.getItem('tourluk_salesCode') || currentSalesCode);
    }
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
    }, 4000);
  }

  // 3. Trích xuất thông tin khách hàng đang mở trên Zalo Web / Zalo OA
  function getActiveCustomerInfo() {
    let name = '';
    let avatarUrl = '';

    if (isOaPage) {
      // --- XỬ LÝ CHUYÊN BIỆT CHO ZALO OA (oa.zalo.me/chat) ---

      // Cách 1: Tìm phần tử text tiêu đề trong khung chat header chính (toạ độ: top từ 40px đến 130px, left từ 300px đến 700px)
      const allTextNodes = document.querySelectorAll('div, span, b, strong, h1, h2, h3, h4');
      for (const el of allTextNodes) {
        // Chỉ lấy thẻ văn bản đơn
        if (el.children.length > 0) continue;
        const rect = el.getBoundingClientRect();
        // Vùng header chat (bên phải danh sách khách, trên phần tin nhắn)
        if (rect.top >= 40 && rect.top <= 130 && rect.left >= 300 && rect.left <= 750) {
          const txt = el.textContent.trim();
          if (
            txt &&
            !isForbidden(txt) &&
            !txt.includes('Chỉ định') &&
            !txt.includes('Gắn nhãn') &&
            !txt.includes('TourLuk') &&
            !txt.includes('Official')
          ) {
            name = txt;
            break;
          }
        }
      }

      // Cách 2: Tìm text ngay trên hoặc cạnh dropdown "Chỉ định nhân viên"
      if (!name) {
        const assignEl = Array.from(document.querySelectorAll('div, span, button')).find(
          (e) => e.textContent.includes('Chỉ định nhân viên') && e.children.length === 0,
        );
        if (assignEl) {
          let p = assignEl.parentElement;
          for (let i = 0; i < 4; i++) {
            if (!p) break;
            const candidates = p.querySelectorAll('div, span, b, strong');
            for (const c of candidates) {
              if (c.children.length === 0) {
                const txt = c.textContent.trim();
                if (txt && !isForbidden(txt) && !txt.includes('Chỉ định') && !txt.includes('Gắn nhãn')) {
                  name = txt;
                  break;
                }
              }
            }
            if (name) break;
            p = p.parentElement;
          }
        }
      }

      // Cách 3: Lấy từ item đang active ở cột danh sách bên trái (left < 320)
      if (!name) {
        const leftItems = document.querySelectorAll('[class*="item"], [class*="conv"], [class*="chat"]');
        for (const item of leftItems) {
          const rect = item.getBoundingClientRect();
          if (rect.left < 320 && rect.width > 120 && rect.height > 35) {
            const cls = (item.getAttribute('class') || '') + ' ' + (item.getAttribute('style') || '');
            if (cls.includes('active') || cls.includes('select') || cls.includes('rgb(') || cls.includes('#')) {
              const nameEl = item.querySelector('[class*="name"], [class*="title"], b, strong');
              if (nameEl) {
                const txt = nameEl.textContent.trim();
                if (txt && !isForbidden(txt)) {
                  name = txt;
                  break;
                }
              }
            }
          }
        }
      }

      // Cách 4: Lấy item đầu tiên ở cột danh sách nếu không có class active
      if (!name) {
        const allCandidates = document.querySelectorAll('div, span, b, strong');
        for (const el of allCandidates) {
          if (el.children.length > 0) continue;
          const rect = el.getBoundingClientRect();
          // Nằm trong danh sách chat (cột trái, top từ 130px đến 250px)
          if (rect.left >= 50 && rect.left <= 280 && rect.top >= 130 && rect.top <= 250) {
            const txt = el.textContent.trim();
            if (txt && !isForbidden(txt) && !txt.includes(':') && !txt.includes('/')) {
              name = txt;
              break;
            }
          }
        }
      }

      // Avatar trong vùng chat header
      const headerAvatar = document.querySelector('img[src*="avatar"], img[src*="zalo"], [class*="avatar"] img');
      if (headerAvatar) avatarUrl = headerAvatar.src;
    } else {
      // --- XỬ LÝ CHO ZALO CÁ NHÂN (chat.zalo.me) ---
      const headerEl =
        document.querySelector('.chat-box__header__title') ||
        document.querySelector('.header-title') ||
        document.querySelector('[data-id="chat-title"]') ||
        document.querySelector('.chat-title') ||
        document.querySelector('.truncate.title') ||
        document.querySelector('.nav-title');

      if (headerEl && headerEl.textContent.trim()) {
        const txt = headerEl.textContent.trim();
        if (!isForbidden(txt)) name = txt;
      }

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
          if (titleEl && !isForbidden(titleEl.textContent.trim())) {
            name = titleEl.textContent.trim();
          }
        }
      }

      const avatarEl =
        document.querySelector('.chat-box__header img') ||
        document.querySelector('.header img') ||
        document.querySelector('.conv-item.active img');
      if (avatarEl) avatarUrl = avatarEl.src;
    }

    // Fallback URL UID
    if (!name && isOaPage) {
      const urlUid = new URLSearchParams(window.location.search).get('uid');
      if (urlUid) {
        name = `Khách Zalo OA (${urlUid.slice(-4)})`;
      }
    }

    return { name, avatarUrl };
  }

  // Chuyển đổi ảnh Zalo Web (blob:, same-origin hoặc canvas) sang định dạng Base64 thực tế
  async function getImageBase64(imgEl) {
    if (!imgEl || !imgEl.src) return null;
    if (imgEl.src.startsWith('data:image/')) return imgEl.src;

    // Ưu tiên 1: Đọc blob: qua fetch với timeout
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(imgEl.src, { signal: controller.signal });
      clearTimeout(timeoutId);
      const blob = await res.blob();
      if (blob && blob.size > 50) {
        return await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
      }
    } catch (e) {}

    // Ưu tiên 2: Vẽ qua Canvas
    try {
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(imgEl.naturalWidth || imgEl.width || 400, 1200);
      canvas.height = Math.min(imgEl.naturalHeight || imgEl.height || 400, 1200);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.85);
    } catch (e) {}
    return null;
  }

  // 4. Trích xuất các tin nhắn hiển thị trong cuộc trò chuyện hiện tại
  async function extractVisibleMessages() {
    const messages = [];

    if (isOaPage) {
      // --- TRÍCH XUẤT TIN NHẮN TRÊN ZALO OA (oa.zalo.me/chat) ---
      const activeCust = getActiveCustomerInfo();
      const currentCustName = (activeCust.name || '').trim();

      // 1. Xác định toạ độ vùng tin nhắn trung tâm (loại trừ cột danh sách khách bên trái và header)
      let chatLeftBound = 310;
      let chatTopBound = 90;
      let chatBottomBound = window.innerHeight - 80;

      // Tìm mép phải cột danh sách hội thoại bên trái
      const convList = document.querySelector('[class*="conv-list"], [class*="chat-list"], #conversationList');
      if (convList) {
        const r = convList.getBoundingClientRect();
        if (r.right > 200 && r.right < 500) chatLeftBound = r.right;
      }

      // Mép trên: Header của khung chat kết thúc khoảng y = 100 - 130px
      const chatHeader = document.querySelector('.chat-box__header, [class*="chat-header"], [class*="header"]');
      if (chatHeader) {
        const r = chatHeader.getBoundingClientRect();
        if (r.bottom > 50 && r.bottom < 180) chatTopBound = r.bottom;
      }

      // Mép dưới: Thanh công cụ hoặc ô nhập tin nhắn
      const inputEl = document.querySelector('textarea, [contenteditable="true"], input[placeholder*="tin nhắn"], [placeholder*="Nhập"]');
      if (inputEl) {
        const r = inputEl.getBoundingClientRect();
        if (r.top > 200) chatBottomBound = r.top - 10;
      }

      const candidates = [];

      // Dùng TreeWalker quét tất cả Text node thực sự hiển thị trên DOM
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
      let node;
      while ((node = walker.nextNode())) {
        const rawText = node.textContent.trim();
        if (rawText.length < 2 || rawText.length > 3000) continue;

        const parent = node.parentElement;
        if (!parent) continue;

        // Bỏ qua widget tiện ích của chúng ta và toast
        if (parent.closest('#sales-zalo-crm-widget, #crm-sync-toast')) continue;
        if (parent.closest('script, style, noscript')) continue;

        const rect = parent.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;

        // Bỏ qua nếu nằm trong cột danh sách hội thoại bên trái
        if (rect.right < chatLeftBound) continue;
        if (rect.left < chatLeftBound - 20) continue;

        // Bỏ qua nếu nằm ở header trên cùng hoặc dưới ô gõ phím
        if (rect.bottom < chatTopBound) continue;
        if (rect.top > chatBottomBound + 10) continue;

        // Lọc bỏ thời gian: 15:55, 13:23...
        if (/^\d{1,2}:\d{2}$/.test(rawText)) continue;
        // Lọc bỏ ngày tháng phân cách: "15:55 Thứ hai, 12 tháng 10 năm 2026", "Thứ hai"...
        if (/thứ\s+[a-z0-9]+|tháng\s+\d+|hôm nay|hôm qua/i.test(rawText) && rawText.length < 60) continue;

        // Lọc bỏ text chức năng hệ thống
        if (
          rawText.includes('Chỉ định nhân viên') ||
          rawText.includes('Gắn nhãn quy trình') ||
          rawText.includes('Tin tiếp theo bạn gửi') ||
          rawText.includes('Tìm hiểu thêm') ||
          rawText.includes('Nhập nội dung tin nhắn') ||
          rawText.includes('Official Account Manager') ||
          rawText.includes('TourLuk Official') ||
          rawText.includes('Zalo Official')
        ) {
          continue;
        }

        // Bỏ qua nếu text chính là tên của khách hàng (hiển thị trên avatar/header)
        if (currentCustName && rawText.toLowerCase() === currentCustName.toLowerCase()) {
          continue;
        }

        // Chuẩn hoá text: bỏ dấu '>' ở cuối quote
        let cleanText = rawText.replace(/>\s*$/, '').trim();
        if (cleanText.length < 2) continue;

        candidates.push({
          parent,
          text: cleanText,
          top: rect.top,
          left: rect.left,
          right: rect.right,
          bottom: rect.bottom,
        });
      }

      // Sắp xếp các tin theo thứ tự từ trên xuống dưới (thứ tự thời gian)
      candidates.sort((a, b) => a.top - b.top);

      const chatCenter = chatLeftBound + (window.innerWidth - chatLeftBound) / 2;

      candidates.forEach((cand) => {
        // Tránh trùng lặp nếu cùng một đoạn text ở vị trí sát nhau (< 10px chiều dọc)
        const isDuplicate = messages.some(
          (m) => m.text === cand.text && Math.abs(m._top - cand.top) < 10
        );
        if (!isDuplicate) {
          // Xác định chiều tin nhắn:
          let isOutbound = false;

          // Kiểm tra style màu nền và class
          let p = cand.parent;
          for (let i = 0; i < 4 && p && p !== document.body; i++) {
            const cls = (p.className || '').toString().toLowerCase();
            if (cls.includes('outbound') || cls.includes('right') || cls.includes('me') || cls.includes('sent')) {
              isOutbound = true;
              break;
            }
            try {
              const bg = window.getComputedStyle(p).backgroundColor || '';
              if (bg.includes('rgb(')) {
                const match = bg.match(/\d+/g);
                if (match && match.length >= 3) {
                  const [r, g, b] = match.map(Number);
                  if (b > r + 15 && b > 180) {
                    isOutbound = true;
                    break;
                  }
                }
              }
            } catch (e) {
              // ignore
            }
            p = p.parentElement;
          }

          // Fallback vị trí ngang: nếu nằm lệch sang nửa bên phải của khung chat
          if (!isOutbound && (cand.left > chatCenter - 50 || cand.right > chatCenter + 80)) {
            isOutbound = true;
          }

          messages.push({
            direction: isOutbound ? 'OUTBOUND' : 'INBOUND',
            text: cand.text,
            timestamp: new Date().toISOString(),
            _top: cand.top,
          });
        }
      });

      // Xoá trường tạm _top
      messages.forEach((m) => delete m._top);

      // Fallback: Nếu TreeWalker vẫn không bắt được thì lấy tin nhắn xem trước từ cột trái (nhưng loại trừ tên khách)
      if (messages.length === 0) {
        const activeItem = document.querySelector(
          '[class*="item"][class*="active"], [class*="conv"][class*="active"], [class*="item"][style*="background"]'
        );
        if (activeItem) {
          const els = Array.from(activeItem.querySelectorAll('p, span, div'));
          for (const el of els) {
            const t = el.textContent.trim();
            if (
              t.length >= 2 &&
              !isForbidden(t) &&
              t.toLowerCase() !== currentCustName.toLowerCase() &&
              !t.includes('Chưa quan tâm') &&
              !t.includes('QC Tin nhắn') &&
              !t.includes(':') &&
              !t.includes('/')
            ) {
              messages.push({
                direction: 'INBOUND',
                text: t,
                timestamp: new Date().toISOString(),
              });
              break;
            }
          }
        }
      }
    } else {
      // --- TRÍCH XUẤT CHO ZALO CÁ NHÂN (chat.zalo.me) ---
      // TUYỆT ĐỐI KHÔNG quét .msg-item vì trên Zalo Web, .msg-item là danh sách cuộc trò chuyện ở cột bên trái!
      // Tin nhắn thật sự trong khung chat luôn có class .chat-message và toạ độ nằm ở khung bên phải (left >= 360px).
      const chatContainer =
        document.querySelector('#messageViewScroll') ||
        document.querySelector('.message-view__scroll') ||
        document.querySelector('#chatView') ||
        document.querySelector('.message-view');

      const candidateEls = chatContainer
        ? chatContainer.querySelectorAll('.chat-message, .chat-message-v2, .message-view__item, [data-id^="msg_"], .card--message')
        : document.querySelectorAll('.chat-message, .chat-message-v2, .message-view__item, [data-id^="msg_"]');

      for (const el of candidateEls) {
        // 1. Kiểm tra toạ độ: Bắt buộc phải nằm ở vùng nội dung chat bên phải (left >= 360)
        const rect = el.getBoundingClientRect();
        if (rect.left < 360) continue;

        // 2. Loại trừ mọi phần tử thuộc sidebar, conversation list, tabs
        if (el.closest('#conversationList, .conv-list, [class*="conv-item"], .thread-list, .sidebar, #sidebar, nav')) continue;

        const isOutbound =
          el.classList.contains('me') ||
          el.classList.contains('msg-item--me') ||
          el.className.includes('--me') ||
          el.className.includes('outbound');

        const textEl =
          el.querySelector('.text-message') ||
          el.querySelector('.bubble-text') ||
          el.querySelector('.content-text') ||
          el.querySelector('[class*="text-message"]') ||
          el.querySelector('.card--text') ||
          el.querySelector('.rel') ||
          el.querySelector('.text');

        let text = '';
        if (textEl) text = textEl.innerText.trim();
        else {
          const bubble = el.querySelector('.bubble, .msg-content');
          if (bubble) text = bubble.innerText.trim();
        }

        // Trích xuất hình ảnh thực tế nếu có (hỗ trợ đầy đủ blob:, .zimg-el, Zalo CDN zadn.vn, v.v.)
        let imageBase64 = null;
        let imageUrl = null;

        // 1. Quét tìm tất cả các ảnh trong thẻ tin nhắn (loại trừ avatar và emoji/sticker nhỏ)
        const candidateImgs = Array.from(el.querySelectorAll('img')).filter((im) => {
          const s = (im.src || im.currentSrc || '').toLowerCase();
          const cls = (im.className || '').toLowerCase();
          if (s.includes('avatar') || s.includes('ava-talk') || cls.includes('avatar') || cls.includes('a-child')) return false;
          if (s.includes('emoji') || s.includes('icon') || cls.includes('emoji')) return false;
          return true;
        });

        let imgEl = candidateImgs[0] || null;
        if (!imgEl) {
          imgEl = el.querySelector(
            'img.fit_contain, img.zimg-el, img[class*="zimg"], .img-center-box img, [id*="MESSAGE_LIST"] img, .chat-message-image img, .bubble-image img, .card--picture img, .media-img img'
          );
        }

        let rawImgSrc = null;
        if (imgEl) {
          rawImgSrc = imgEl.currentSrc || imgEl.src || imgEl.getAttribute('data-src') || imgEl.getAttribute('src');
        }

        // Nếu không có thẻ img, kiểm tra style background-image
        if (!rawImgSrc) {
          const bgEls = el.querySelectorAll('[style*="background"]');
          for (const b of bgEls) {
            const style = b.getAttribute('style') || '';
            const match = style.match(/url\(["']?([^"')]+)["']?\)/);
            if (match && match[1]) {
              const u = match[1].toLowerCase();
              if (!u.includes('avatar') && !u.includes('ava-talk') && !u.includes('icon') && !u.includes('emoji')) {
                rawImgSrc = match[1];
                break;
              }
            }
          }
        }

        // Kiểm tra thẻ <a> liên kết đến ảnh gốc chất lượng cao
        const photoLink = el.querySelector('a[href*="zadn.vn"], a[href*="zdn.vn"], a[href*="photo"], a[href*="img"], a[href*=".jpg"], a[href*=".png"]');
        if (photoLink && photoLink.href && !photoLink.href.includes('avatar') && !photoLink.href.includes('ava-talk')) {
          rawImgSrc = photoLink.href;
        }

        if (rawImgSrc) {
          if (rawImgSrc.startsWith('//')) rawImgSrc = 'https:' + rawImgSrc;

          if (rawImgSrc.startsWith('blob:') || rawImgSrc.startsWith('data:')) {
            if (imgEl) imageBase64 = await getImageBase64(imgEl);
          } else if (rawImgSrc.startsWith('http')) {
            imageUrl = rawImgSrc;
            if (imgEl) {
              const b64 = await getImageBase64(imgEl);
              if (b64) imageBase64 = b64;
            }
          }
          if (!text) text = '[Hình ảnh]';
        }

        if (!text) {
          if (el.querySelector('img[src*="sticker"], [class*="sticker"]')) text = '[Nhãn dán/Sticker]';
          else if (el.querySelector('img')) text = '[Hình ảnh]';
          else if (el.querySelector('[class*="file"], [class*="attach"]')) text = '[Tập tin đính kèm]';
        }

        // Bỏ qua tin nhắn đã thu hồi trên Zalo để giữ nguyên vẹn tin nhắn gốc đã lưu trên Webapp
        const isRecalled =
          text.includes('đã được thu hồi') ||
          text.includes('đã bị thu hồi') ||
          text.includes('thu hồi tin nhắn') ||
          text.trim() === 'Tin nhắn đã được thu hồi';

        // Lọc bỏ văn bản xem trước của sidebar nếu lọt vào (chứa "ngày", "Bạn:", v.v.)
        const isSidebarItem =
          (text.includes('ngày') && text.includes('Bạn:')) ||
          text.includes('Chưa có trong danh bạ') ||
          text.includes('Tin nhắn từ người lạ');

        if (
          (text || imageBase64 || imageUrl) &&
          !isRecalled &&
          !isSidebarItem &&
          !text.includes('Chưa có tin nhắn') &&
          !text.includes('[Tin nhắn đang đồng bộ]') &&
          !text.startsWith('Hôm nay') &&
          !text.startsWith('Hôm qua')
        ) {
          messages.push({
            direction: isOutbound ? 'OUTBOUND' : 'INBOUND',
            text: text || '[Hình ảnh]',
            imageBase64: imageBase64 || undefined,
            imageUrl: imageUrl || undefined,
          });
        }
      }
    }

    const result = messages.slice(-150);
    const nowBase = Date.now();
    const len = result.length;
    result.forEach((m, idx) => {
      // Đảm bảo tin nhắn dưới cùng (idx = len - 1) luôn có thời gian mới nhất (nowBase)
      // Các tin nhắn phía trước lùi dần 1 giây mỗi tin
      m.timestamp = new Date(nowBase - (len - 1 - idx) * 1000).toISOString();
    });
    return result;
  }

  let isBatchSyncing = false;

  // Quét và tự động đồng bộ hàng loạt tất cả các khách hàng ở cột trái
  async function syncAllConversations() {
    if (isBatchSyncing) {
      showToast('Đang quét danh sách hội thoại, vui lòng chờ trong giây lát...', false);
      return;
    }

    // Tìm tất cả item hội thoại ở cột bên trái
    let items = Array.from(document.querySelectorAll('div, li, [class*="item"]')).filter((el) => {
      const r = el.getBoundingClientRect();
      return r.left < 320 && r.top > 120 && r.height >= 40 && r.height <= 95 && r.width > 120;
    });

    if (items.length === 0) {
      items = Array.from(document.querySelectorAll('.conv-item, [class*="conv-item"], .thread-item, [class*="chat-item"]'));
    }

    if (items.length === 0) {
      showToast('Chưa tìm thấy danh sách hội thoại Zalo ở cột trái!', false);
      return;
    }

    isBatchSyncing = true;
    showToast(`Bắt đầu đồng bộ ${items.length} cuộc trò chuyện...`);

    let count = 0;
    for (let i = 0; i < Math.min(items.length, 50); i++) {
      const item = items[i];
      try {
        item.click();
        await new Promise((r) => setTimeout(r, 1300));
        await triggerSync(false);
        count++;
      } catch (e) {
        // continue
      }
    }

    isBatchSyncing = false;
    showToast(`✅ Đã đồng bộ thành công ${count} khách hàng và tin nhắn lên Webapp!`);
  }

  // 5. Thực hiện gửi dữ liệu về máy chủ Webapp
  async function triggerSync(isManual = false, overrideSalesCode = null) {
    if (isSyncingNow && !isManual) return;
    const { name, avatarUrl } = getActiveCustomerInfo();

    if (!name || isForbidden(name)) {
      if (isManual) {
        showToast('Vui lòng bấm chọn một cuộc trò chuyện với khách để đồng bộ!', false);
      }
      return { success: false, error: 'Chưa mở cuộc trò chuyện với khách nào' };
    }

    const messages = await extractVisibleMessages();
    if (messages.length === 0) {
      if (isManual) {
        showToast(`Đang mở chat với "${name}" nhưng chưa thấy nội dung tin nhắn!`, false);
      }
      return { success: false, error: 'Chưa có tin nhắn' };
    }

    // Lấy salesCode từ storage hoặc theo chế độ OA
    let storedSalesCode = currentSalesCode;
    let storedAutoSync = true;
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const stored = await chrome.storage.local.get(['salesCode', 'autoSync']);
        if (stored?.salesCode) storedSalesCode = stored.salesCode;
        if (stored?.autoSync !== undefined) storedAutoSync = stored.autoSync;
      } else {
        const localCode = localStorage.getItem('tourluk_salesCode');
        if (localCode) storedSalesCode = localCode;
      }
    } catch (e) {}

    let salesCode = isOaPage ? 'OA' : (overrideSalesCode || storedSalesCode || 'SALE01');

    if (!isManual && storedAutoSync === false) {
      return { success: false, error: 'Tự động đồng bộ đang tắt' };
    }

    const payload = {
      salesCode,
      isOa: isOaPage || salesCode === 'OA',
      channelType: (isOaPage || salesCode === 'OA') ? 'ZALO_OA' : 'ZALO',
      customer: {
        name,
        avatarUrl,
      },
      messages,
    };

    isSyncingNow = true;
    const safetyTimer = setTimeout(() => {
      isSyncingNow = false;
    }, 4500);

    const onSyncResult = (response) => {
      clearTimeout(safetyTimer);
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
          const isOaMode = isOaPage || salesCode === 'OA';
          showToast(`Đã đồng bộ ${isOaMode ? 'Zalo OA' : 'Sale'} khách "${name}" (${messages.length} tin) lên Webapp!`);
        }
      } else {
        console.warn('[TourLuk Sync] Lỗi đồng bộ:', response?.error);
        if (isManual) {
          let errMsg = response?.error || 'Không kết nối được Webapp';
          if (errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError') || errMsg.includes('connection')) {
            errMsg = 'Không kết nối được Webapp (Port 4000). Vui lòng kiểm tra hệ thống đang mở';
          }
          showToast(`Lỗi: ${errMsg}`, false);
        }
      }
    };

    try {
      window.__tourluk_on_sync_done = onSyncResult;

      if (typeof window.__tourluk_native_sync === 'function') {
        window.__tourluk_native_sync(JSON.stringify(payload));
      } else if (typeof chrome !== 'undefined' && chrome?.runtime?.sendMessage) {
        try {
          chrome.runtime.sendMessage({ action: 'SYNC_CONVERSATION', payload }, (res) => {
            if (typeof chrome !== 'undefined' && chrome.runtime?.lastError) {
              const err = chrome.runtime.lastError.message || 'Lỗi kết nối tiện ích';
              onSyncResult({ success: false, error: err });
            } else {
              onSyncResult(res);
            }
          });
        } catch (runtimeErr) {
          onSyncResult({ success: false, error: 'Tiện ích cần làm mới. Vui lòng F5 trang Zalo' });
        }
      } else {
        // Tránh fetch() trực tiếp từ HTTPS chat.zalo.me vì bị chặn Mixed Content
        console.warn('[TourLuk Sync] Đang chờ cầu nối CDP...');
        if (isManual) {
          showToast('Đang kết nối lại cầu nối đồng bộ CRM...', false);
        }
      }
      return { success: true, message: `Đã gửi đồng bộ khách "${name}" (${messages.length} tin) lên Webapp!` };
    } catch (e) {
      clearTimeout(safetyTimer);
      isSyncingNow = false;
      console.error('[TourLuk Sync] Exception:', e);
      let errMsg = e.message || 'Lỗi không xác định';
      if (errMsg.includes('Extension context invalidated')) {
        errMsg = 'Tiện ích vừa cập nhật. Vui lòng F5 (tải lại trang) Zalo!';
      }
      if (isManual) showToast(`Lỗi: ${errMsg}`, false);
      return { success: false, error: errMsg };
    }
  }

  // 6. Kiểm tra và tự động đồng bộ ngay nếu có tin nhắn mới hoặc đổi khách
  async function checkAndAutoSync() {
    if (isSyncingNow || isBatchSyncing) return;
    const { name } = getActiveCustomerInfo();
    if (!name || isForbidden(name)) return;

    const messages = await extractVisibleMessages();
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
      syncTimeout = setTimeout(checkAndAutoSync, 350);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Kênh 2: Lắng nghe phím Enter khi gõ gửi tin nhắn
    document.addEventListener(
      'keydown',
      (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          setTimeout(checkAndAutoSync, 250);
          setTimeout(checkAndAutoSync, 800);
          setTimeout(checkAndAutoSync, 1500);
        }
      },
      true,
    );

    // Kênh 3: Lắng nghe click chuột vào nút gửi hoặc chọn cuộc trò chuyện khác
    document.addEventListener(
      'click',
      () => {
        setTimeout(checkAndAutoSync, 300);
        setTimeout(checkAndAutoSync, 1000);
      },
      true,
    );

    // Kênh 4: Heartbeat Polling định kỳ mỗi 1.5 giây để không bao giờ bỏ sót tin nhắn
    setInterval(checkAndAutoSync, 1500);
  }

  // 8. Lắng nghe lệnh từ Popup Extension
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage && chrome.runtime.onMessage.addListener) {
    chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
      if (req.action === 'TRIGGER_MANUAL_SYNC') {
        triggerSync(true, req.salesCode).then((res) => sendResponse(res));
        return true;
      }
    });
  }

  // Khởi động ngay lập tức không cần chờ đợi
  injectFloatingWidget();
  setupRealtimeListeners();

  // Đảm bảo chạy lại khi trang hoàn tất load
  window.addEventListener('load', () => {
    injectFloatingWidget();
  });

  // 24/7 Auto-healer: Luôn đảm bảo thanh đồng bộ tồn tại trên màn hình Zalo Web
  setInterval(() => {
    if (!document.getElementById('sales-zalo-crm-widget')) {
      injectFloatingWidget();
    }
  }, 1000);
})();
