(() => {
  const POLL_INTERVAL_MS = 1500;
  let lastSentSignature = '';
  let boundVideoEl = null;
  let listenHubMutedLock = false;

  function cleanTitle(raw) {
    return (raw || '')
      .replace(/\s*[\(\[](official\s*video|official\s*audio|official\s*music\s*video|lyrics|4k|hd|mv)[\)\]]/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function cleanArtist(raw) {
    return (raw || '')
      .replace(/\s*-\s*Topic$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function pickLargestArtwork(artworkList) {
    if (!Array.isArray(artworkList) || artworkList.length === 0) return undefined;
    const valid = artworkList.filter((item) => item && typeof item.src === 'string' && item.src.startsWith('http'));
    if (valid.length === 0) return undefined;
    return valid[valid.length - 1].src;
  }

  function applyVideoMuteState(muted) {
    listenHubMutedLock = Boolean(muted);
    const videos = document.querySelectorAll('video');
    videos.forEach((video) => {
      try {
        video.muted = listenHubMutedLock;
      } catch {
        // ignore media element errors
      }
    });
  }

  function readPlaybackState() {
    const video = document.querySelector('video');
    if (!video) return null;

    const isYtMusic = location.hostname === 'music.youtube.com';
    const mediaMeta = navigator.mediaSession && navigator.mediaSession.metadata;

    let title = mediaMeta && mediaMeta.title ? String(mediaMeta.title) : '';
    let artist = mediaMeta && mediaMeta.artist ? String(mediaMeta.artist) : '';
    let album = mediaMeta && mediaMeta.album ? String(mediaMeta.album) : '';
    let coverUrl = pickLargestArtwork(mediaMeta && mediaMeta.artwork);

    if (isYtMusic) {
      const playerBar = document.querySelector('ytmusic-player-bar');
      if (playerBar) {
        if (!title) {
          const titleEl = playerBar.querySelector('.title.ytmusic-player-bar, yt-formatted-string.title');
          title = titleEl && titleEl.textContent ? titleEl.textContent.trim() : '';
        }
        if (!artist) {
          const bylineEl = playerBar.querySelector('.byline.ytmusic-player-bar, .subtitle yt-formatted-string');
          const rawByline = bylineEl && bylineEl.textContent ? bylineEl.textContent.trim() : '';
          artist = rawByline.split('•')[0] || '';
        }
        if (!coverUrl) {
          const imgEl = playerBar.querySelector('img.image, img');
          if (imgEl && imgEl.src && imgEl.src.startsWith('http')) {
            coverUrl = imgEl.src;
          }
        }
      }
    } else {
      if (!title) {
        const heading =
          document.querySelector('h1.ytd-watch-metadata yt-formatted-string') ||
          document.querySelector('h1.ytd-watch-metadata');
        title = heading && heading.textContent ? heading.textContent.trim() : '';
      }
      if (!artist) {
        const channelEl =
          document.querySelector('ytd-watch-metadata ytd-channel-name a') ||
          document.querySelector('#owner #channel-name a');
        artist = channelEl && channelEl.textContent ? channelEl.textContent.trim() : '';
      }
      if (!coverUrl) {
        const vid = new URLSearchParams(location.search).get('v');
        if (vid && /^[a-zA-Z0-9_-]{11}$/.test(vid)) {
          coverUrl = `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;
        }
      }
    }

    title = cleanTitle(title);
    artist = cleanArtist(artist) || 'YouTube Music';

    if (!title) return null;

    const rawDuration = Number(video.duration);
    const durationSec = Number.isFinite(rawDuration) && rawDuration > 0 ? Math.round(rawDuration) : 210;
    const rawCurrent = Number(video.currentTime);
    const currentSecond = Number.isFinite(rawCurrent) && rawCurrent >= 0 ? Math.floor(rawCurrent) : 0;
    const isPlaying = !video.paused && !video.ended && video.readyState >= 2;

    return {
      title,
      artist,
      album: album || undefined,
      coverUrl,
      currentSecond,
      durationSec,
      isPlaying,
      updatedAt: Date.now(),
    };
  }

  function pushUpdate(force = false) {
    const payload = readPlaybackState();
    if (!payload) return;

    const signature = `${payload.title}|${payload.artist}|${payload.isPlaying}|${payload.currentSecond}|${payload.durationSec}`;
    if (!force && signature === lastSentSignature) return;
    lastSentSignature = signature;

    try {
      chrome.runtime.sendMessage({
        type: 'YT_PLAYBACK_UPDATE',
        payload,
      });
    } catch {
      // Extension context may be reloading
    }
  }

  function attachVideoEvents() {
    const video = document.querySelector('video');
    if (!video) return;

    // Keep background video silently muted while ListenHub owns audio output
    if (listenHubMutedLock && !video.muted) {
      video.muted = true;
    }

    if (video === boundVideoEl) return;
    boundVideoEl = video;

    ['play', 'pause', 'seeked', 'loadedmetadata'].forEach((evtName) => {
      video.addEventListener(
        evtName,
        () => {
          if (listenHubMutedLock && !video.muted) {
            video.muted = true;
          }
          pushUpdate(true);
        },
        { passive: true }
      );
    });
  }

  // Listen for mute / unmute commands from ListenHub via background.js
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || message.type !== 'LISTENHUB_CONTROL_EXTERNAL') return false;
    if (message.action === 'mute') {
      applyVideoMuteState(true);
      sendResponse({ ok: true, muted: true });
    } else if (message.action === 'unmute') {
      applyVideoMuteState(false);
      sendResponse({ ok: true, muted: false });
    }
    return false;
  });

  attachVideoEvents();
  pushUpdate(true);

  setInterval(() => {
    attachVideoEvents();
    pushUpdate(false);
  }, POLL_INTERVAL_MS);
})();
