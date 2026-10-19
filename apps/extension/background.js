// Service worker background proxy cho Sales Zalo CRM Extension

const DEFAULT_SERVER_URL = 'http://localhost:4000/api/v1';

// Lắng nghe message từ content script hoặc popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'SYNC_CONVERSATION') {
    handleSyncConversation(request.payload)
      .then((res) => sendResponse({ success: true, data: res }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
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
  const result = await chrome.storage.local.get(['serverUrl']);
  return result.serverUrl || DEFAULT_SERVER_URL;
}

async function handleSyncConversation(payload) {
  const baseUrl = await getServerUrl();
  const endpoint = `${baseUrl}/integrations/extension/sync`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Lỗi máy chủ (${response.status}): ${errorText}`);
  }

  return await response.json();
}

async function handleCheckServer(url) {
  const endpoint = `${url}/integrations/extension/sales-list`;
  const response = await fetch(endpoint, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`Không thể kết nối tới máy chủ API: ${response.status}`);
  }
  return await response.json();
}
