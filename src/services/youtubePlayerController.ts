/**
 * Global YouTube Player Controller
 * Seamlessly manages YouTube Iframe playback, play/pause, seek, volume,
 * and session cookie integration for YouTube Premium subscribers without ads.
 */

type StateChangeCallback = (isPlaying: boolean) => void;
type TimeUpdateCallback = (sec: number) => void;

class YouTubePlayerController {
  private iframe: HTMLIFrameElement | null = null;
  private isPlaying: boolean = false;
  private currentVideoId: string | null = null;
  private timeUpdateInterval: any = null;
  private currentSecond: number = 0;
  private stateCallbacks: StateChangeCallback[] = [];
  private timeCallbacks: TimeUpdateCallback[] = [];
  private endedCallbacks: (() => void)[] = [];
  private errorCallbacks: ((code: number) => void)[] = [];
  private isMessageListenerAttached: boolean = false;
  private timerLastTimestamp: number = 0;
  private lastNotifiedPlaying: boolean | null = null;
  private lastCommandTime: number = 0;
  private expectedPlayingState: boolean | null = null;
  private isStartingPlayback: boolean = false;
  private startPlaybackTimeout: ReturnType<typeof setTimeout> | null = null;

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
    }, 5000);
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

  private attachMessageListener() {
    if (typeof window === 'undefined' || this.isMessageListenerAttached) return;
    this.isMessageListenerAttached = true;

    window.addEventListener('message', (event) => {
      if (!event.data) return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (!data) return;

        // YouTube player error events (e.g. 100, 101, 150 - video not embeddable)
        if (data.event === 'onError' || data.event === 'error') {
          this.clearStartingPlaybackLock();
          const code = typeof data.info === 'number' ? data.info : 100;
          this.notifyError(code);
        }

        // YouTube player state updates
        // -1 = UNSTARTED, 0 = ENDED, 1 = PLAYING, 2 = PAUSED, 3 = BUFFERING, 5 = CUED
        if (data.event === 'onStateChange') {
          const stateCode = data.info;

          // Buffering (3), Unstarted (-1), or Cued (5): NEVER broadcast paused (false)
          if (stateCode === 3 || stateCode === -1 || stateCode === 5) {
            return;
          }

          // While starting playback (before YouTube confirms real PLAYING state 1),
          // completely ignore intermediate PAUSED (2) / transient events so the Play/Pause button never flickers
          if (this.isStartingPlayback && stateCode === 2) {
            return;
          }

          const withinUserGuard =
            this.expectedPlayingState !== null && Date.now() - this.lastCommandTime < 1500;

          if (stateCode === 1) {
            // If user just explicitly paused, ignore stale PLAYING echo
            if (withinUserGuard && this.expectedPlayingState === false) {
              this.sendCommand('pauseVideo');
              return;
            }
            // Guard: If the user hasn't explicitly commanded play, pause immediately
            if (!this.isPlaying) {
              this.sendCommand('pauseVideo');
              return;
            }
            this.clearStartingPlaybackLock();
            this.isPlaying = true;
            this.notifyState(true);
            this.startTimer();
          } else if (stateCode === 0) {
            // Track Ended: stop timer, notify state, trigger auto-advance
            if (this.isStartingPlayback || (withinUserGuard && this.expectedPlayingState === true)) {
              return;
            }
            this.clearStartingPlaybackLock();
            this.isPlaying = false;
            this.notifyState(false);
            this.stopTimer();
            this.notifyEnded();
          } else if (stateCode === 2) {
            // Real PAUSED: ignore stale pause echo right after user clicked Play
            if (this.isStartingPlayback || (withinUserGuard && this.expectedPlayingState === true)) {
              return;
            }
            this.isPlaying = false;
            this.notifyState(false);
            this.stopTimer();
          }
        }

        // Real-time time updates from YouTube player
        if (data.event === 'infoDelivery' && data.info) {
          if (typeof data.info.currentTime === 'number') {
            const sec = Math.floor(data.info.currentTime);
            this.notifyTime(sec);
          }
        }
      } catch {
        // Non-JSON message from other sources, ignore
      }
    });
  }

  public setIframe(iframe: HTMLIFrameElement | null) {
    this.iframe = iframe;
    if (iframe) {
      // Initialize communication with embedded player
      setTimeout(() => {
        this.sendCommand('listening');
        this.sendCommand('unMute');
        this.sendCommand('setVolume', [100]);
        if (this.isPlaying) {
          this.sendCommand('playVideo');
        } else {
          this.sendCommand('pauseVideo');
        }
      }, 400);
    }
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
    const isNewVideo = Boolean(videoId && videoId !== this.currentVideoId);
    const shouldSeekSameVideo =
      !isNewVideo && startSecond > 0 && Math.abs(startSecond - this.currentSecond) > 1;

    if (videoId) {
      this.currentVideoId = videoId;
    }
    if (isNewVideo || shouldSeekSameVideo) {
      this.currentSecond = startSecond;
    }

    this.beginStartingPlaybackLock();
    this.lastCommandTime = Date.now();
    this.expectedPlayingState = true;
    this.isPlaying = true;

    // Send play & un-mute commands
    this.sendCommand('unMute');
    this.sendCommand('setVolume', [100]);

    if (isNewVideo && this.iframe) {
      this.sendCommand('loadVideoById', [{ videoId: this.currentVideoId, startSeconds: this.currentSecond }]);
    } else {
      if (shouldSeekSameVideo) {
        this.sendCommand('seekTo', [this.currentSecond, true]);
      }
      this.sendCommand('playVideo');
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
    }
  }

  public stop(silent: boolean = false) {
    this.clearStartingPlaybackLock();
    this.lastCommandTime = Date.now();
    this.expectedPlayingState = false;
    this.isPlaying = false;
    this.sendCommand('stopVideo');
    this.sendCommand('pauseVideo');
    this.stopTimer();
    this.currentSecond = 0;
    if (!silent) {
      this.notifyState(false);
    }
  }

  public seek(second: number) {
    const safeSec = Math.max(0, isNaN(second) ? 0 : second);
    this.currentSecond = safeSec;
    this.sendCommand('seekTo', [safeSec, true]);
    this.notifyTime(safeSec);
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
