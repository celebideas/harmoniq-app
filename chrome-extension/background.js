const LISTENHUB_TAB_PATTERNS = [
  'https://harmoniq-app-fawn.vercel.app/*',
  'http://localhost:*/*',
  'https://*.listenhub.app/*',
  'https://*.run.app/*',
];

let lastPlaybackPayload = null;

function broadcastToListenHubTabs(message) {
  chrome.tabs.query({ url: LISTENHUB_TAB_PATTERNS }, (tabs) => {
    if (chrome.runtime.lastError || !Array.isArray(tabs)) return;
    for (const tab of tabs) {
      if (typeof tab.id !== 'number') continue;
      chrome.tabs.sendMessage(tab.id, message).catch(() => {
        // Ignore tabs without active receiver
      });
    }
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== 'object') return false;

  if (message.type === 'YT_PLAYBACK_UPDATE' && message.payload) {
    lastPlaybackPayload = message.payload;
    broadcastToListenHubTabs({
      type: 'LISTENHUB_EXT_PLAYBACK',
      payload: message.payload,
    });
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === 'LISTENHUB_EXT_HELLO') {
    sendResponse({
      ok: true,
      connected: true,
      lastPayload: lastPlaybackPayload,
    });
    return false;
  }

  return false;
});
