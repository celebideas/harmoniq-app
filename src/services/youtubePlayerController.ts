/**
 * Global YouTube Player Controller
 * Seamlessly manages YouTube Iframe playback, play/pause, seek, volume,
 * and session cookie integration for YouTube Premium subscribers without ads.
 */

type StateChangeCallback = (isPlaying: boolean) => void;
type TimeUpdateCallback = (sec: number) => void;
type DurationChangeCallback = (durationSec: number) => void;

class YouTubePlayerController {
  private iframe: HTMLIFrameElement | null = null;
  private isPlaying: boolean = false;
  private currentVideoId: string | null = null;
  private timeUpdateInterval: any = null;
  private currentSecond: number = 0;
  private stateCallbacks: StateChangeCallback[] = [];
  private timeCallbacks: TimeUpdateCallback[] = [];
  private durationCallbacks: DurationChangeCallback[] = [];
  private endedCallbacks: (() => void)[] = [];
  private errorCallbacks: ((code: number) => void)[] = [];
  private isMessageListenerAttached: boolean = false;
  private timerLastTimestamp: number = 0;
  private lastNotifiedPlaying: boolean | null = null;
  private lastNotifiedDuration: number | null = null;
  private lastCommandTime: number = 0;
  private expectedPlayingState: boolean | null = null;
  private isStartingPlayback: boolean = false;
  private startPlaybackTimeout: ReturnType<typeof setTimeout> | null = null;
  private pendingSeekSecond: number | null = null;
  private lastActualYouTubeSecond: number | null = null;
  private lastInfoDeliveryTime: number = 0;
  private iframeAttachedAt: number = 0;
  private targetVolume: number = 80;

  constructor() {
    this.attachMessageListener();
    this.attachVisibilityListener();
  }

  private beginStartingPlaybackLock() {
    this.isStartingPlayback = true;
    if (this.startPlaybackTimeout) {
      clearTimeout(this.startPlaybackTimeout);
    }
    this.startPlaybackTimeout = setTimeout(() => {
      this.isStartingPlayback = false;
      this.startPlaybackTimeout = null;
    }, 3500);
  }

  private clearStartingPlaybackLock() {
    this.isStartingPlayback = false;
    if (this.startPlaybackTimeout) {
      clearTimeout(this.startPlaybackTimeout);
      this.startPlaybackTimeout = null;
    }
  }

  private attachVisibilityListener() {
    if (typeof document === 'undefined') return;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        // Immediately sync time and ensure timer is running at full resolution
        this.sendListeningHandshake();
        this.sendCommand('getCurrentTime');
        if (this.isPlaying) {
          this.startTimer();
        }
      } else {
        // Background: throttle timer frequency to save mobile CPU/battery
        if (this.isPlaying) {
          this.startTimer();
        }
      }
    });
  }

  private handlePlayerState(stateCode: number) {
    // -1 = UNSTARTED, 0 = ENDED, 1 = PLAYING, 2 = PAUSED, 3 = BUFFERING, 5 = CUED
    // Buffering (3), Unstarted (-1), or Cued (5): NEVER broadcast paused (false)
    if (stateCode === 3 || stateCode === -1 || stateCode === 5) {
      return;
    }

    // While starting playback (before YouTube confirms real PLAYING state 1),
    // ignore intermediate PAUSED (2) / transient events so the Play/Pause button never flickers
    if (this.isStartingPlayback && stateCode === 2) {
      return;
    }

    const withinUserGuard =
      this.expectedPlayingState !== null && Date.now() - this.lastCommandTime < 900;

    if (stateCode === 1) {
      // If user just explicitly paused in the app, ignore stale PLAYING echo
      if (withinUserGuard && this.expectedPlayingState === false) {
        this.sendCommand('pauseVideo');
        return;
      }
      // Prevent unwanted browser autoplay immediately after a paused iframe mounts
      const justMountedPaused =
        !this.isPlaying &&
        this.expectedPlayingState === false &&
        Date.now() - this.iframeAttachedAt < 1000;
      if (justMountedPaused) {
        this.sendCommand('pauseVideo');
        return;
      }

      this.clearStartingPlaybackLock();
      this.expectedPlayingState = null;
      this.isPlaying = true;

      if (this.pendingSeekSecond !== null) {
        const targetSec = this.pendingSeekSecond;
        this.pendingSeekSecond = null;
        const actualTime = this.lastActualYouTubeSecond;
        if (actualTime !== null && Math.abs(actualTime - targetSec) > 5) {
          this.currentSecond = targetSec;
          this.sendCommand('seekTo', [targetSec, true]);
          this.notifyTime(targetSec);
        }
      }

      this.notifyState(true);
      this.startTimer();
    } else if (stateCode === 0) {
      // Track Ended: stop timer, notify state, trigger auto-advance
      if (this.isStartingPlayback || (withinUserGuard && this.expectedPlayingState === true)) {
        return;
      }
      this.clearStartingPlaybackLock();
      this.expectedPlayingState = null;
      this.isPlaying = false;
      this.notifyState(false);
      this.stopTimer();
      this.notifyEnded();
    } else if (stateCode === 2) {
      // Real PAUSED (including direct user click inside YouTube video iframe!)
      if (this.isStartingPlayback || (withinUserGuard && this.expectedPlayingState === true)) {
        return;
      }
      this.expectedPlayingState = null;
      this.isPlaying = false;
      this.notifyState(false);
      this.stopTimer();
    }
  }

  private attachMessageListener() {
    if (typeof window === 'undefined' || this.isMessageListenerAttached) return;
    this.isMessageListenerAttached = true;

    window.addEventListener('message', (event) => {
      if (!event.data) return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (!data || typeof data !== 'object') return;

        // YouTube player error events (e.g. 100, 101, 150 - video not embeddable)
        if (data.event === 'onError' || data.event === 'error') {
          this.clearStartingPlaybackLock();
          const code = typeof data.info === 'number' ? data.info : 100;
          this.notifyError(code);
        }

        // YouTube player ready event: register listeners, unmute, and sync play state
        if (data.event === 'onReady' || data.event === 'initialDelivery') {
          this.sendCommand('addEventListener', ['onStateChange']);
          this.sendCommand('addEventListener', ['onError']);
          this.applyCurrentVolume();
          if (data.event === 'onReady') {
            if (this.isPlaying) {
              this.sendCommand('playVideo');
            } else {
              this.sendCommand('pauseVideo');
            }
          }
        }

        // Direct onStateChange event from YouTube player
        if (data.event === 'onStateChange' && typeof data.info === 'number') {
          this.handlePlayerState(data.info);
        }

        // Real-time infoDelivery packets from YouTube player (state, currentTime, duration)
        if ((data.event === 'infoDelivery' || data.event === 'initialDelivery') && data.info) {
          const info = data.info;

          if (typeof info.playerState === 'number') {
            this.handlePlayerState(info.playerState);
          }

          if (typeof info.duration === 'number' && Number.isFinite(info.duration) && info.duration > 30) {
            const roundedDur = Math.round(info.duration);
            this.notifyDuration(roundedDur);
          }

          if (typeof info.currentTime === 'number' && Number.isFinite(info.currentTime)) {
            const sec = Math.max(0, Math.floor(info.currentTime));
            this.lastActualYouTubeSecond = sec;
            this.lastInfoDeliveryTime = Date.now();
            this.timerLastTimestamp = Date.now();
            // Ignore transient 0s echo while loading a new timestamped video
            if (this.pendingSeekSecond !== null && this.pendingSeekSecond > 3 && sec < 3) {
              return;
            }
            if (sec !== this.currentSecond) {
              this.notifyTime(sec);
            }
          }
        }
      } catch {
        // Non-JSON message from other sources, ignore
      }
    });
  }

  public sendListeningHandshake() {
    if (this.iframe && this.iframe.contentWindow) {
      try {
        this.iframe.contentWindow.postMessage(
          JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }),
          '*'
        );
        this.sendCommand('addEventListener', ['onStateChange']);
        this.sendCommand('addEventListener', ['onReady']);
        this.sendCommand('addEventListener', ['onError']);
      } catch {
        // ignore cross-origin transient timing error
      }
    }
  }

  public setActiveVideoId(videoId: string | null) {
    if (videoId && videoId !== this.currentVideoId) {
      this.currentVideoId = videoId;
      this.lastNotifiedDuration = null;
    }
  }

  public setIframe(iframe: HTMLIFrameElement | null) {
    if (this.iframe === iframe) return;
    this.iframe = iframe;
    if (iframe) {
      this.iframeAttachedAt = Date.now();
      // Establish YouTube postMessage widget handshake immediately and after mount settle
      const handshake = () => {
        if (this.iframe !== iframe) return;
        this.sendListeningHandshake();
        this.applyCurrentVolume();
      };
      setTimeout(() => {
        handshake();
        if (this.iframe !== iframe) return;
        if (this.isPlaying) {
          this.sendCommand('playVideo');
        }
      }, 250);
      setTimeout(handshake, 900);
    }
  }

  public getPendingSeekSecond(): number | null {
    return this.pendingSeekSecond;
  }

  public setPendingSeek(second: number | null) {
    this.pendingSeekSecond =
      second !== null && Number.isFinite(second) && second > 0
        ? Math.floor(second)
        : null;
  }

  public onTimeUpdate(cb: TimeUpdateCallback) {
    this.timeCallbacks.push(cb);
    return () => {
      this.timeCallbacks = this.timeCallbacks.filter((c) => c !== cb);
    };
  }

  public onStateChange(cb: StateChangeCallback) {
    this.stateCallbacks.push(cb);
    return () => {
      this.stateCallbacks = this.stateCallbacks.filter((c) => c !== cb);
    };
  }

  public onDurationChange(cb: DurationChangeCallback) {
    this.durationCallbacks.push(cb);
    return () => {
      this.durationCallbacks = this.durationCallbacks.filter((c) => c !== cb);
    };
  }

  public onEnded(cb: () => void) {
    this.endedCallbacks.push(cb);
    return () => {
      this.endedCallbacks = this.endedCallbacks.filter((c) => c !== cb);
    };
  }

  public onError(cb: (code: number) => void) {
    this.errorCallbacks.push(cb);
    return () => {
      this.errorCallbacks = this.errorCallbacks.filter((c) => c !== cb);
    };
  }

  private notifyState(playing: boolean) {
    this.isPlaying = playing;
    if (this.lastNotifiedPlaying === playing) return;
    this.lastNotifiedPlaying = playing;
    this.stateCallbacks.forEach((cb) => cb(playing));
  }

  private notifyDuration(durationSec: number) {
    if (this.lastNotifiedDuration === durationSec) return;
    this.lastNotifiedDuration = durationSec;
    this.durationCallbacks.forEach((cb) => cb(durationSec));
  }

  private notifyEnded() {
    this.endedCallbacks.forEach((cb) => cb());
  }

  private notifyError(code: number) {
    this.errorCallbacks.forEach((cb) => cb(code));
  }

  private notifyTime(sec: number) {
    this.currentSecond = sec;
    this.timeCallbacks.forEach((cb) => cb(sec));
  }

  public play(videoId?: string, startSecond: number = 0) {
    const safeStart = Math.max(0, Math.floor(startSecond || 0));
    const isNewVideo = Boolean(videoId && videoId !== this.currentVideoId);
    const shouldSeekSameVideo =
      !isNewVideo && safeStart > 0 && Math.abs(safeStart - this.currentSecond) > 1;

    if (videoId) {
      this.currentVideoId = videoId;
    }
    if (isNewVideo) {
      this.lastActualYouTubeSecond = null;
      this.lastNotifiedDuration = null;
      this.currentSecond = safeStart;
      this.pendingSeekSecond = safeStart > 0 ? safeStart : null;
    } else if (shouldSeekSameVideo) {
      this.currentSecond = safeStart;
      this.pendingSeekSecond = null;
    } else {
      this.pendingSeekSecond = null;
    }

    this.beginStartingPlaybackLock();
    this.lastCommandTime = Date.now();
    this.expectedPlayingState = true;
    this.isPlaying = true;

    // Ensure handshake + play & un-mute commands
    this.sendListeningHandshake();
    this.applyCurrentVolume();

    if (isNewVideo && this.iframe) {
      this.sendCommand('loadVideoById', [
        { videoId: this.currentVideoId, startSeconds: safeStart },
      ]);
    } else {
      if (shouldSeekSameVideo) {
        this.sendCommand('seekTo', [safeStart, true]);
      }
      this.sendCommand('playVideo');
    }

    if (isNewVideo || shouldSeekSameVideo) {
      this.notifyTime(safeStart);
    }

    this.startTimer();
    this.notifyState(true);
  }

  public pause(silent: boolean = false) {
    this.clearStartingPlaybackLock();
    this.lastCommandTime = Date.now();
    this.expectedPlayingState = false;
    this.isPlaying = false;
    this.sendCommand('pauseVideo');
    this.stopTimer();
    if (!silent) {
      this.notifyState(false);
    } else {
      this.lastNotifiedPlaying = false;
    }
  }

  public stop(silent: boolean = false) {
    this.clearStartingPlaybackLock();
    this.pendingSeekSecond = null;
    this.lastActualYouTubeSecond = null;
    this.lastNotifiedDuration = null;
    this.lastCommandTime = Date.now();
    this.expectedPlayingState = false;
    this.isPlaying = false;
    this.sendCommand('stopVideo');
    this.sendCommand('pauseVideo');
    this.stopTimer();
    this.currentSecond = 0;
    if (!silent) {
      this.notifyState(false);
    } else {
      this.lastNotifiedPlaying = false;
    }
  }

  public seek(second: number) {
    const safeSec = Math.max(0, isNaN(second) ? 0 : Math.floor(second));
    this.pendingSeekSecond = null;
    this.currentSecond = safeSec;
    this.timerLastTimestamp = Date.now();
    this.sendCommand('seekTo', [safeSec, true]);
    this.notifyTime(safeSec);
  }

  public setVolume(percent: number) {
    const clamped = Math.max(0, Math.min(100, Math.round(percent)));
    this.targetVolume = clamped;
    this.applyCurrentVolume();
  }

  public getVolume(): number {
    return this.targetVolume;
  }

  private applyCurrentVolume() {
    if (this.targetVolume <= 0) {
      this.sendCommand('setVolume', [0]);
      this.sendCommand('mute');
    } else {
      this.sendCommand('unMute');
      this.sendCommand('setVolume', [this.targetVolume]);
    }
  }

  public sendCommand(func: string, args: any[] = []) {
    if (this.iframe && this.iframe.contentWindow) {
      try {
        this.iframe.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func, args }),
          '*'
        );
      } catch (err) {
        console.warn('YouTube postMessage error:', err);
      }
    }
  }

  private startTimer() {
    this.stopTimer();
    const isHidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
    const intervalMs = isHidden ? 4000 : 1000;
    this.timerLastTimestamp = Date.now();

    this.timeUpdateInterval = setInterval(() => {
      if (!this.isPlaying) return;
      const now = Date.now();
      // When YouTube infoDelivery is actively streaming currentTime, trust YouTube's real playhead
      if (now - this.lastInfoDeliveryTime < 1500) {
        this.timerLastTimestamp = now;
        return;
      }
      const elapsedSeconds = Math.max(1, Math.round((now - this.timerLastTimestamp) / 1000));
      this.timerLastTimestamp = now;
      this.currentSecond += elapsedSeconds;
      this.notifyTime(this.currentSecond);
    }, intervalMs);
  }

  private stopTimer() {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = null;
    }
  }

  public getCurrentTime(): number {
    return this.currentSecond;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentVideoId(): string | null {
    return this.currentVideoId;
  }

  /**
   * Deep-link direct sync to official YouTube Music web or mobile app.
   * For YouTube Premium subscribers, this guarantees 100% ad-free, 256kbps audio,
   * offline capability and background screen-off listening!
   */
  public openInYouTubeMusic(videoId: string, second: number = 0) {
    const sec = Math.max(0, Math.floor(second));
    const url = `https://music.youtube.com/watch?v=${videoId}&t=${sec}s`;
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }
}

export const ytController = new YouTubePlayerController();
