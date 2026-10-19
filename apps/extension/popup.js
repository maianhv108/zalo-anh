const DEFAULT_SERVER_URL = 'http://localhost:4000/api/v1';

document.addEventListener('DOMContentLoaded', async () => {
  const salesSelect = document.getElementById('salesSelect');
  const autoSyncToggle = document.getElementById('autoSyncToggle');
  const btnSyncNow = document.getElementById('btnSyncNow');
  const btnOpenWebapp = document.getElementById('btnOpenWebapp');
  const statusText = document.getElementById('statusText');
  const badgeLabel = document.getElementById('badgeLabel');
  const statusBadge = document.getElementById('statusBadge');
  const statCustomers = document.getElementById('statCustomers');
  const statMessages = document.getElementById('statMessages');

  // 1. Tải cấu hình đã lưu
  const stored = await chrome.storage.local.get(['serverUrl', 'salesCode', 'autoSync']);
  const serverUrl = stored.serverUrl || DEFAULT_SERVER_URL;
  let currentSalesCode = stored.salesCode || 'SALE01';
  const isAutoSync = stored.autoSync !== false;
  autoSyncToggle.checked = isAutoSync;
  if (stored.autoSync === undefined) {
    await chrome.storage.local.set({ autoSync: true });
  }

  // 2. Tải danh sách Sale từ Server API
  try {
    statusText.innerText = 'Đang kết nối Server...';
    const res = await fetch(`${serverUrl}/integrations/extension/sales-list`);
    if (!res.ok) throw new Error('Không thể tải danh sách Sale');
    const data = await res.json();

    salesSelect.innerHTML = '';
    if (data.sales && data.sales.length > 0) {
      data.sales.forEach((s) => {
        const opt = document.createElement('option');
        opt.value = s.code;
        opt.textContent = `${s.code} - ${s.name} (${s.phone || 'Zalo'})`;
        if (s.code === currentSalesCode) opt.selected = true;
        salesSelect.appendChild(opt);
      });
      currentSalesCode = salesSelect.value;
      await chrome.storage.local.set({ salesCode: currentSalesCode });
    }

    statusText.innerText = 'Sẵn sàng đồng bộ Zalo Web';
    badgeLabel.innerText = 'Online';
    statusBadge.className = 'badge-status status-active';

    // Tải số liệu thống kê
    loadStats(serverUrl, currentSalesCode);
  } catch (err) {
    statusText.innerText = 'Chưa bật Webapp (Port 4000)';
    badgeLabel.innerText = 'Offline';
    statusBadge.className = 'badge-status status-error';
    salesSelect.innerHTML = '<option value="SALE01">SALE01 - Mặc định</option>';
  }

  // 3. Khi đổi nhân viên Sale
  salesSelect.addEventListener('change', async () => {
    currentSalesCode = salesSelect.value;
    await chrome.storage.local.set({ salesCode: currentSalesCode });
    loadStats(serverUrl, currentSalesCode);
  });

  // 4. Khi bật/tắt Tự động đồng bộ
  autoSyncToggle.addEventListener('change', async () => {
    await chrome.storage.local.set({ autoSync: autoSyncToggle.checked });
  });

  // 5. Nút Đồng bộ ngay cuộc trò chuyện đang mở
  btnSyncNow.addEventListener('click', async () => {
    btnSyncNow.innerText = '⏳ Đang quét & đồng bộ...';
    btnSyncNow.disabled = true;

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url || !tab.url.includes('chat.zalo.me')) {
        alert('Vui lòng mở tab Zalo Web (chat.zalo.me) trước khi bấm đồng bộ nhé!');
        btnSyncNow.innerText = '⚡ Đồng Bộ Cuộc Trò Chuyện Đang Mở';
        btnSyncNow.disabled = false;
        return;
      }

      chrome.tabs.sendMessage(tab.id, { action: 'TRIGGER_MANUAL_SYNC' }, (response) => {
        btnSyncNow.innerText = '⚡ Đồng Bộ Cuộc Trò Chuyện Đang Mở';
        btnSyncNow.disabled = false;

        if (chrome.runtime.lastError) {
          alert('Chưa tải xong Zalo Web. Hãy bấm F5 tải lại tab chat.zalo.me rồi thử lại nha!');
        } else if (response && response.success) {
          alert(`✅ ${response.message || 'Đồng bộ thành công lên Webapp!'}`);
          loadStats(serverUrl, currentSalesCode);
        } else {
          alert(`⚠️ ${response?.error || 'Không tìm thấy cuộc trò chuyện đang mở'}`);
        }
      });
    } catch (e) {
      btnSyncNow.innerText = '⚡ Đồng Bộ Cuộc Trò Chuyện Đang Mở';
      btnSyncNow.disabled = false;
      alert(`Lỗi: ${e.message}`);
    }
  });

  // 6. Nút Mở Webapp Quản lý
  btnOpenWebapp.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:3000' });
  });

  // 7. Cài đặt Server URL (Dành cho máy Sale)
  const toggleServerSettings = document.getElementById('toggleServerSettings');
  const serverSettingsBox = document.getElementById('serverSettingsBox');
  const serverSettingToggleLabel = document.getElementById('serverSettingToggleLabel');
  const serverUrlInput = document.getElementById('serverUrlInput');
  const btnPresetLocal = document.getElementById('btnPresetLocal');
  const btnPresetWifi = document.getElementById('btnPresetWifi');
  const btnSaveServer = document.getElementById('btnSaveServer');

  if (serverUrlInput) serverUrlInput.value = serverUrl;

  if (toggleServerSettings) {
    toggleServerSettings.addEventListener('click', () => {
      const isHidden = serverSettingsBox.style.display === 'none';
      serverSettingsBox.style.display = isHidden ? 'block' : 'none';
      serverSettingToggleLabel.innerText = isHidden ? 'Thu gọn' : 'Tùy chỉnh';
    });
  }

  if (btnPresetLocal) {
    btnPresetLocal.addEventListener('click', () => {
      serverUrlInput.value = 'http://localhost:4000/api/v1';
    });
  }

  if (btnPresetWifi) {
    btnPresetWifi.addEventListener('click', () => {
      serverUrlInput.value = 'http://192.168.1.65:4000/api/v1';
    });
  }

  if (btnSaveServer) {
    btnSaveServer.addEventListener('click', async () => {
      const newUrl = serverUrlInput.value.trim();
      if (!newUrl) return;
      await chrome.storage.local.set({ serverUrl: newUrl });
      alert('Đã lưu địa chỉ máy chủ! Tiện ích sẽ tải lại.');
      window.location.reload();
    });
  }

  async function loadStats(url, code) {
    try {
      const res = await fetch(`${url}/integrations/extension/status?salesCode=${code}`);
      if (res.ok) {
        const d = await res.json();
        statCustomers.innerText = d.stats?.customerCount || '0';
        statMessages.innerText = d.stats?.messageCount || '0';
      }
    } catch (e) {
      // ignore
    }
  }
});
