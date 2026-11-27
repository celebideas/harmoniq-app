const LISTENHUB_TAB_PATTERNS = [
  'https://harmoniq-app-fawn.vercel.app/*',
  'http://localhost:*/*',
  'https://*.listenhub.app/*',
  'https://*.run.app/*',
];

const YOUTUBE_TAB_PATTERNS = [
  'https://music.youtube.com/*',
  'https://www.youtube.com/watch*',
];

let lastPlaybackPayload = null;
let lastYoutubeTabId = null;

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

function broadcastControlToYouTubeTabs(action) {
  const sentIds = new Set();

  const sendToTab = (tabId) => {
    if (typeof tabId !== 'number' || sentIds.has(tabId)) return;
    sentIds.add(tabId);
    chrome.tabs
      .sendMessage(tabId, {
        type: 'LISTENHUB_CONTROL_EXTERNAL',
        action,
      })
      .catch(() => {
        // Ignore tabs that were closed or navigated away
      });
  };

  if (typeof lastYoutubeTabId === 'number') {
    sendToTab(lastYoutubeTabId);
  }

  chrome.tabs.query({ url: YOUTUBE_TAB_PATTERNS }, (tabs) => {
    if (chrome.runtime.lastError || !Array.isArray(tabs)) return;
    for (const tab of tabs) {
      sendToTab(tab.id);
    }
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== 'object') return false;

  if (message.type === 'YT_PLAYBACK_UPDATE' && message.payload) {
    lastPlaybackPayload = message.payload;
    if (sender && sender.tab && typeof sender.tab.id === 'number') {
      lastYoutubeTabId = sender.tab.id;
    }
    broadcastToListenHubTabs({
      type: 'LISTENHUB_EXT_PLAYBACK',
      payload: message.payload,
    });
    sendResponse({ ok: true });
    return false;
  }

  if (
    message.type === 'LISTENHUB_CONTROL_EXTERNAL' &&
    (message.action === 'mute' || message.action === 'unmute')
  ) {
    broadcastControlToYouTubeTabs(message.action);
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
