// Service worker background proxy cho Sales Zalo CRM Extension

const DEFAULT_SERVER_URL = 'http://localhost:4000/api/v1';
const FALLBACK_SERVER_URL = 'http://127.0.0.1:4000/api/v1';

// Lắng nghe message từ content script hoặc popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'SYNC_CONVERSATION') {
    handleSyncConversation(request.payload)
      .then((res) => sendResponse({ success: true, data: res }))
      .catch((err) => {
        console.error('[TourLuk Background] Lỗi đồng bộ:', err);
        sendResponse({ success: false, error: err.message || 'Không thể kết nối máy chủ Webapp' });
      });
    return true; // Giữ sendResponse bất đồng bộ
  }

  if (request.action === 'CHECK_SERVER') {
    handleCheckServer(request.serverUrl || DEFAULT_SERVER_URL)
      .then((res) => sendResponse({ success: true, data: res }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

async function getServerUrl() {
  try {
    const result = await chrome.storage.local.get(['serverUrl']);
    return result.serverUrl || DEFAULT_SERVER_URL;
  } catch (e) {
    return DEFAULT_SERVER_URL;
  }
}

async function fetchWithFallback(path, options) {
  const primaryUrl = await getServerUrl();
  const urlsToTry = [
    `${primaryUrl}${path}`,
    `${FALLBACK_SERVER_URL}${path}`,
  ];

  let lastError = null;
  for (const url of urlsToTry) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout cho payload ảnh

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Máy chủ API (${response.status}): ${errorText}`);
      }
      return await response.json();
    } catch (err) {
      lastError = err;
      console.warn(`[TourLuk Background] Thử kết nối ${url} không thành công:`, err.message);
    }
  }

  if (lastError && (lastError.name === 'AbortError' || lastError.message.includes('abort'))) {
    throw new Error('Quá thời gian kết nối máy chủ (Timeout sau 20s)');
  }
  if (lastError && lastError.message.includes('Failed to fetch')) {
    throw new Error('Không thể kết nối đến Webapp (Port 4000). Vui lòng đảm bảo server đang bật');
  }
  throw lastError || new Error('Không thể kết nối đến Webapp');
}

// Tự động tải ảnh Zalo CDN sang Base64 trong service worker (vượt qua mọi giới hạn CORS trình duyệt)
async function enrichPayloadWithImages(payload) {
  if (!payload || !payload.messages || !Array.isArray(payload.messages)) return;
  for (const msg of payload.messages) {
    if (!msg.imageBase64 && msg.imageUrl && (msg.imageUrl.startsWith('http://') || msg.imageUrl.startsWith('https://'))) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(msg.imageUrl, { signal: controller.signal });
        clearTimeout(timeout);
        if (res.ok) {
          const blob = await res.blob();
          const base64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
          if (base64 && base64.startsWith('data:image')) {
            msg.imageBase64 = base64;
          }
        }
      } catch (err) {
        console.warn('[TourLuk Background] Không thể nạp Base64 từ URL ảnh:', err.message);
      }
    }
  }
}

async function handleSyncConversation(payload) {
  try {
    await enrichPayloadWithImages(payload);
  } catch (e) {}

  return await fetchWithFallback('/integrations/extension/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

async function handleCheckServer(url) {
  const endpoint = `${url}/integrations/extension/sales-list`;
  const response = await fetch(endpoint, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`Không thể kết nối tới máy chủ API: ${response.status}`);
  }
  return await response.json();
}
