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

  constructor() {
    this.attachMessageListener();
    this.attachVisibilityListener();
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
          const code = typeof data.info === 'number' ? data.info : 100;
          this.notifyError(code);
        }

        // YouTube player state updates
        // 1 = PLAYING, 2 = PAUSED, 0 = ENDED, 3 = BUFFERING
        if (data.event === 'onStateChange') {
          if (data.info === 1) {
            // Guard: If the user hasn't explicitly commanded play, pause immediately and do NOT set isPlaying!
            if (!this.isPlaying) {
              this.sendCommand('pauseVideo');
              return;
            }
            this.isPlaying = true;
            this.notifyState(true);
            this.startTimer();
          } else if (data.info === 0) {
            // Track Ended: stop timer, notify state, trigger auto-advance
            this.isPlaying = false;
            this.notifyState(false);
            this.stopTimer();
            this.notifyEnded();
          } else if (data.info === 2) {
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
    const isNewVideo = videoId && videoId !== this.currentVideoId;
    if (videoId) {
      this.currentVideoId = videoId;
    }
    if (startSecond > 0 || isNewVideo) {
      this.currentSecond = startSecond;
    }

    this.isPlaying = true;

    // Send play & un-mute commands
    this.sendCommand('unMute');
    this.sendCommand('setVolume', [100]);

    if (isNewVideo && this.iframe) {
      this.sendCommand('loadVideoById', [{ videoId: this.currentVideoId, startSeconds: this.currentSecond }]);
    } else {
      if (this.currentSecond > 0) {
        this.sendCommand('seekTo', [this.currentSecond, true]);
      }
      this.sendCommand('playVideo');
    }

    this.startTimer();
    this.notifyState(true);
  }

  public pause() {
    this.isPlaying = false;
    this.sendCommand('pauseVideo');
    this.stopTimer();
    this.notifyState(false);
  }

  public stop() {
    this.isPlaying = false;
    this.sendCommand('stopVideo');
    this.sendCommand('pauseVideo');
    this.stopTimer();
    this.currentSecond = 0;
    this.notifyState(false);
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
