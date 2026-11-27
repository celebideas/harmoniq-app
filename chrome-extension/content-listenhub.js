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

  // Bidirectional control: catch mute/unmute commands from ListenHub app and forward to background worker
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.type !== 'LISTENHUB_CONTROL_EXTERNAL') return;
    if (data.action !== 'mute' && data.action !== 'unmute') return;

    try {
      chrome.runtime.sendMessage({
        type: 'LISTENHUB_CONTROL_EXTERNAL',
        action: data.action,
      });
    } catch {
      // ignore if extension worker is waking up
    }
  });

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
