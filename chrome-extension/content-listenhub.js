(() => {
  const EXTENSION_VERSION = '1.0.0';

  function sendPingToApp() {
    window.postMessage(
      {
        type: 'LISTENHUB_EXT_PING',
        version: EXTENSION_VERSION,
      },
      '*'
    );
  }

  function forwardPlaybackToApp(payload) {
    if (!payload || typeof payload !== 'object') return;
    window.postMessage(
      {
        type: 'LISTENHUB_EXT_PLAYBACK',
        payload,
      },
      '*'
    );
  }

  // Announce extension presence immediately and keep heartbeat fresh
  sendPingToApp();
  setInterval(sendPingToApp, 30000);

  // Pull latest known playback state on tab load
  try {
    chrome.runtime.sendMessage({ type: 'LISTENHUB_EXT_HELLO' }, (response) => {
      if (chrome.runtime.lastError) return;
      sendPingToApp();
      if (response && response.lastPayload) {
        forwardPlaybackToApp(response.lastPayload);
      }
    });
  } catch {
    // ignore startup errors
  }

  // Relay live playback updates from background service worker to ListenHub page
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message !== 'object') return false;

    if (
      (message.type === 'LISTENHUB_EXT_PLAYBACK' || message.type === 'YT_PLAYBACK_UPDATE') &&
      message.payload
    ) {
      forwardPlaybackToApp(message.payload);
      sendResponse({ ok: true });
    }

    return false;
  });
})();
