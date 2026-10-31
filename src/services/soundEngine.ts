/**
 * Real Studio Audio Player Engine
 * Streams authentic master studio recordings for songs directly
 * through HTMLAudioElement with high-fidelity sound, and orchestrates
 * the global YouTube controller for YouTube Music tracks.
 */

import { Song } from '../types';
import { SAMPLE_SONGS } from '../data/mockData';
import { ytController } from './youtubePlayerController';

class RealMusicEngine {
  private audio: HTMLAudioElement | null = null;
  private currentSong: Song | null = null;
  private isPlaying: boolean = false;
  private isLoading: boolean = false;
  private currentRequestId: number = 0;
  private activePlaybackId: string = '';
  private hasTriggeredEndForCurrentSong: boolean = false;
  private timeUpdateCallbacks: ((sec: number) => void)[] = [];
  private stateChangeCallbacks: ((playing: boolean) => void)[] = [];
  private loadingCallbacks: ((loading: boolean) => void)[] = [];
  private errorFallbackHandler: ((failedSong: Song) => void) | null = null;
  private simulatedInterval: any = null;
  private simulatedSecond: number = 0;
  private playStartedTimestamp: number = 0;
  private playStartSecond: number = 0;
  private isVisibilityListenerAttached: boolean = false;
  private onPrevTrackHandler: (() => void) | null = null;
  private onNextTrackHandler: (() => void) | null = null;
  private onTogglePlayHandler: (() => void) | null = null;
  private onSeekHandler: ((sec: number) => void) | null = null;

  // Tiny silent audio payload to keep system MediaSession notification alive during YouTube playback
  private silentAudioUri: string = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

  constructor() {
    if (typeof window !== 'undefined') {
      this.initAudioElement();
      this.attachVisibilityListener();
    }

    // Connect YouTube controller events
    ytController.onTimeUpdate((sec) => {
      if (this.currentSong?.youtubeVideoId) {
        this.notifyTimeUpdate(sec);
      }
    });

    ytController.onStateChange((playing) => {
      if (this.currentSong?.youtubeVideoId) {
        this.isPlaying = playing;
        this.notifyStateChange(playing);
        this.syncMediaSessionPlaybackState(playing);
        if (playing) {
          this.setIsLoading(false);
        }
      }
    });

    ytController.onEnded(() => {
      if (this.currentSong?.youtubeVideoId && this.onNextTrackHandler) {
        this.onNextTrackHandler();
      }
    });

    ytController.onError((_code) => {
      this.setIsLoading(false);
      if (this.currentSong?.youtubeVideoId) {
        this.triggerErrorFallback(this.currentSong);
      }
    });
  }

  private mediaSessionSetupDone: boolean = false;
  private lastMetadataSongId: string = '';

  public setMediaSessionActions(handlers: {
    onPrevTrack?: () => void;
    onNextTrack?: () => void;
    onTogglePlay?: () => void;
    onSeek?: (sec: number) => void;
  }) {
    this.onPrevTrackHandler = handlers.onPrevTrack || null;
    this.onNextTrackHandler = handlers.onNextTrack || null;
    this.onTogglePlayHandler = handlers.onTogglePlay || null;
    this.onSeekHandler = handlers.onSeek || null;
    this.initMediaSessionOnce();
  }

  public updateMediaSession(song: Song) {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    this.initMediaSessionOnce();

    // Only update metadata when track changes to prevent OS notification buttons from flickering
    if (this.lastMetadataSongId === song.id) {
      this.syncMediaSessionPlaybackState(this.isPlaying);
      return;
    }
    this.lastMetadataSongId = song.id;

    try {
      const artworks: { src: string; sizes: string; type: string }[] = [];
      if (song.coverUrl) {
        artworks.push(
          { src: song.coverUrl, sizes: '96x96', type: 'image/jpeg' },
          { src: song.coverUrl, sizes: '128x128', type: 'image/jpeg' },
          { src: song.coverUrl, sizes: '192x192', type: 'image/jpeg' },
          { src: song.coverUrl, sizes: '256x256', type: 'image/jpeg' },
          { src: song.coverUrl, sizes: '512x512', type: 'image/jpeg' }
        );
      } else {
        artworks.push(
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
        );
      }

      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title,
        artist: song.artist,
        album: song.album || 'Harmoniq Müzik Frekansı',
        artwork: artworks,
      });

      this.syncMediaSessionPlaybackState(this.isPlaying);
      if (song.durationSeconds) {
        this.updatePositionState(0, song.durationSeconds);
      }
    } catch (e) {
      console.warn('MediaSession metadata notice:', e);
    }
  }

  private initMediaSessionOnce() {
    if (this.mediaSessionSetupDone || typeof window === 'undefined' || !('mediaSession' in navigator)) return;
    this.mediaSessionSetupDone = true;

    try {
      // Play Action (Kalıcı ve sabit)
      navigator.mediaSession.setActionHandler('play', () => {
        if (this.onTogglePlayHandler) {
          this.onTogglePlayHandler();
        } else {
          this.resume();
        }
      });

      // Pause Action (Kalıcı ve sabit)
      navigator.mediaSession.setActionHandler('pause', () => {
        if (this.onTogglePlayHandler) {
          this.onTogglePlayHandler();
        } else {
          this.pause();
        }
      });

      // Previous Track Action (Bildirimdeki Geri / Önceki butonu - Asla kaybolmaz)
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        if (this.onPrevTrackHandler) {
          this.onPrevTrackHandler();
        } else {
          this.seek(0);
        }
      });

      // Next Track Action (Bildirimdeki İleri / Sonraki butonu - Asla kaybolmaz)
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        if (this.onNextTrackHandler) {
          this.onNextTrackHandler();
        }
      });

      // Seek To Action (Bildirim ilerleme çubuğu)
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && details.seekTime !== null) {
          if (this.onSeekHandler) {
            this.onSeekHandler(details.seekTime);
          } else {
            this.seek(details.seekTime);
          }
        }
      });

      // NOTE: Do NOT register seekforward or seekbackward.
      // On mobile OS (especially Android SystemUI), registering seekforward (+10s) and seekbackward (-10s)
      // displaces previoustrack and nexttrack from the 3-button compact notification bar,
      // causing the next/prev buttons to flicker and disappear!
    } catch (e) {
      console.warn('MediaSession setActionHandler notice:', e);
    }
  }

  public syncMediaSessionPlaybackState(playing: boolean) {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
    } catch (e) {
      // ignore
    }
  }

  public updatePositionState(currentSec: number, durationSec: number) {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
    try {
      if ('setPositionState' in navigator.mediaSession && durationSec > 0 && !isNaN(durationSec)) {
        navigator.mediaSession.setPositionState({
          duration: Math.max(1, durationSec),
          playbackRate: 1,
          position: Math.min(Math.max(0, currentSec), durationSec),
        });
      }
    } catch (e) {
      // ignore
    }
  }

  private attachVisibilityListener() {
    if (typeof document === 'undefined' || this.isVisibilityListenerAttached) return;
    this.isVisibilityListenerAttached = true;

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        // Tab became visible: immediately synchronize current position
        if (this.audio && this.audio.src && !this.audio.paused) {
          const sec = Math.floor(this.audio.currentTime);
          this.notifyTimeUpdate(sec);
        } else if (this.currentSong?.youtubeVideoId) {
          const sec = ytController.getCurrentTime();
          this.notifyTimeUpdate(sec);
        } else if (this.isPlaying && this.currentSong) {
          const elapsed = Math.floor((Date.now() - this.playStartedTimestamp) / 1000);
          this.simulatedSecond = (this.playStartSecond + elapsed) % (this.currentSong.durationSeconds || 240);
          this.notifyTimeUpdate(this.simulatedSecond);
          this.startSimulatedTimer(this.simulatedSecond, this.currentSong.durationSeconds || 240);
        }
      } else {
        // Tab hidden: throttle timer to 4s to reduce CPU / battery consumption
        if (this.simulatedInterval && this.isPlaying && this.currentSong) {
          this.startSimulatedTimer(this.simulatedSecond, this.currentSong.durationSeconds || 240);
        }
      }
    });
  }

  private initAudioElement() {
    if (this.audio) return;
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.audio.crossOrigin = 'anonymous';

    this.audio.addEventListener('timeupdate', () => {
      if (!this.audio || this.currentSong?.youtubeVideoId) return;
      const sec = Math.floor(this.audio.currentTime);
      this.notifyTimeUpdate(sec);

      // 30-Second Preview Auto-Advance:
      // If Apple Music 30-sec preview reaches the end (within 0.4s of audio.duration),
      // don't let the progress bar freeze; advance automatically to next track!
      if (
        this.audio.duration > 0 &&
        this.audio.currentTime >= this.audio.duration - 0.4 &&
        !this.hasTriggeredEndForCurrentSong
      ) {
        this.hasTriggeredEndForCurrentSong = true;
        this.handleTrackEnded();
      }
    });

    this.audio.addEventListener('ended', () => {
      if (!this.hasTriggeredEndForCurrentSong) {
        this.hasTriggeredEndForCurrentSong = true;
        this.handleTrackEnded();
      }
    });

    this.audio.addEventListener('play', () => {
      if (!this.currentSong?.youtubeVideoId) {
        this.isPlaying = true;
        this.setIsLoading(false);
        this.notifyStateChange(true);
      }
    });

    this.audio.addEventListener('playing', () => {
      this.setIsLoading(false);
    });

    this.audio.addEventListener('pause', () => {
      if (!this.currentSong?.youtubeVideoId) {
        this.isPlaying = false;
        this.notifyStateChange(false);
      }
    });

    this.audio.addEventListener('waiting', () => {
      this.setIsLoading(true);
    });

    this.audio.addEventListener('canplay', () => {
      this.setIsLoading(false);
    });

    this.audio.addEventListener('error', (e) => {
      console.warn('Real audio stream notice:', e);
      this.setIsLoading(false);
      if (this.currentSong && !this.currentSong.youtubeVideoId) {
        this.triggerErrorFallback(this.currentSong);
      }
    });
  }

  public onTimeUpdate(callback: (sec: number) => void) {
    this.timeUpdateCallbacks.push(callback);
    return () => {
      this.timeUpdateCallbacks = this.timeUpdateCallbacks.filter((cb) => cb !== callback);
    };
  }

  public onStateChange(callback: (playing: boolean) => void) {
    this.stateChangeCallbacks.push(callback);
    return () => {
      this.stateChangeCallbacks = this.stateChangeCallbacks.filter((cb) => cb !== callback);
    };
  }

  public onLoadingChange(callback: (loading: boolean) => void) {
    this.loadingCallbacks.push(callback);
    // Emit immediate current state
    callback(this.isLoading);
    return () => {
      this.loadingCallbacks = this.loadingCallbacks.filter((cb) => cb !== callback);
    };
  }

  public onErrorFallback(handler: (failedSong: Song) => void) {
    this.errorFallbackHandler = handler;
  }

  public getIsLoading(): boolean {
    return this.isLoading;
  }

  private setIsLoading(loading: boolean) {
    if (this.isLoading !== loading) {
      this.isLoading = loading;
      this.loadingCallbacks.forEach((cb) => cb(loading));
    }
  }

  private triggerErrorFallback(failedSong: Song) {
    console.info(`[Harmoniq SoundEngine] Auto-fallback for song "${failedSong.title}", advancing gracefully to next track...`);
    if (this.errorFallbackHandler) {
      this.errorFallbackHandler(failedSong);
    } else if (this.onNextTrackHandler) {
      this.onNextTrackHandler();
    }
  }

  private handleTrackEnded() {
    this.isPlaying = false;
    this.notifyStateChange(false);
    this.setIsLoading(false);
    if (this.onNextTrackHandler) {
      this.onNextTrackHandler();
    }
  }

  private notifyTimeUpdate(sec: number) {
    this.timeUpdateCallbacks.forEach((cb) => cb(sec));
  }

  private notifyStateChange(playing: boolean) {
    this.stateChangeCallbacks.forEach((cb) => cb(playing));
  }

  private startSimulatedTimer(startSec: number = 0, maxDuration: number = 240) {
    this.stopSimulatedTimer();
    this.simulatedSecond = startSec;
    this.playStartSecond = startSec;
    this.playStartedTimestamp = Date.now();
    this.notifyTimeUpdate(this.simulatedSecond);

    const isHidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
    const intervalMs = isHidden ? 4000 : 1000;

    this.simulatedInterval = setInterval(() => {
      if (!this.isPlaying) return;
      const elapsed = Math.floor((Date.now() - this.playStartedTimestamp) / 1000);
      this.simulatedSecond = (this.playStartSecond + elapsed) % maxDuration;
      this.notifyTimeUpdate(this.simulatedSecond);
    }, intervalMs);
  }

  private stopSimulatedTimer() {
    if (this.simulatedInterval) {
      clearInterval(this.simulatedInterval);
      this.simulatedInterval = null;
    }
  }

  /**
   * Play authentic track: if YouTube track, route to YouTube controller.
   * If direct audio track, route to HTMLAudioElement.
   * Strictly enforces activePlaybackId lock to prevent overlapping audio on rapid track skips.
   */
  public async playSong(song: Song, startSecond: number = 0): Promise<boolean> {
    const requestId = ++this.currentRequestId;
    const playbackId = `pb_${requestId}_${song.id}_${Date.now()}`;
    this.activePlaybackId = playbackId;
    this.hasTriggeredEndForCurrentSong = false;
    this.initAudioElement();
    this.setIsLoading(true);

    // Stop and unload previous native audio to avoid overlapping audio
    if (this.audio) {
      try {
        this.audio.pause();
        this.audio.removeAttribute('src');
        this.audio.load();
      } catch {}
    }

    // Strictly stop previous YouTube playback
    ytController.stop();
    ytController.pause();
    ytController.sendCommand('stopVideo');
    ytController.sendCommand('pauseVideo');

    this.stopSimulatedTimer();

    this.currentSong = song;
    this.updateMediaSession(song);

    // CASE 1: YouTube Track
    if (song.youtubeVideoId) {
      if (this.activePlaybackId !== playbackId) {
        return false;
      }

      // Play a silent audio loop so iOS / Android browser media session stays pinned in notification tray
      if (this.audio) {
        try {
          if (this.audio.src !== this.silentAudioUri) {
            this.audio.src = this.silentAudioUri;
            this.audio.loop = true;
            this.audio.volume = 0.001;
            this.audio.play().catch(() => {});
          }
        } catch {}
      }

      if (this.activePlaybackId !== playbackId) {
        return false;
      }

      this.isPlaying = true;
      this.notifyStateChange(true);
      this.syncMediaSessionPlaybackState(true);
      ytController.play(song.youtubeVideoId, startSecond);
      this.setIsLoading(false);
      return true;
    }

    // CASE 2: Native Audio Track (MP3/AAC/M4A/iTunes preview)
    let url = song.audioUrl;
    if (!url) {
      const found = SAMPLE_SONGS.find((s) => s.id === song.id);
      url = found?.audioUrl;
    }

    if (url && this.audio) {
      try {
        this.audio.loop = false;
        this.audio.volume = 1;
        if (this.audio.src !== url) {
          this.audio.src = url;
          this.audio.load();
        }

        if (startSecond > 0 && !isNaN(startSecond)) {
          const safeTime = this.audio.duration && startSecond >= this.audio.duration ? 0 : startSecond;
          try {
            this.audio.currentTime = safeTime;
          } catch {
            this.audio.addEventListener(
              'loadedmetadata',
              () => {
                if (this.audio && this.activePlaybackId === playbackId) {
                  const safe = this.audio.duration && startSecond >= this.audio.duration ? 0 : startSecond;
                  this.audio.currentTime = safe;
                }
              },
              { once: true }
            );
          }
        }

        await this.audio.play();

        // Check if a newer track was commanded while waiting for audio play Promise
        if (this.activePlaybackId !== playbackId) {
          if (this.audio) {
            this.audio.pause();
            this.audio.removeAttribute('src');
          }
          return false;
        }

        this.isPlaying = true;
        this.notifyStateChange(true);
        this.syncMediaSessionPlaybackState(true);
        this.setIsLoading(false);
        return true;
      } catch (err: any) {
        if (this.activePlaybackId !== playbackId) return false;
        console.warn('Audio play request notice:', err);
        this.setIsLoading(false);

        // If not deliberately cancelled by next click, trigger seamless fallback
        if (err?.name !== 'AbortError') {
          this.triggerErrorFallback(song);
          return false;
        }
        return false;
      }
    } else {
      if (this.activePlaybackId !== playbackId) return false;
      if (this.audio) {
        this.audio.pause();
        this.audio.removeAttribute('src');
      }
      this.isPlaying = true;
      this.notifyStateChange(true);
      this.syncMediaSessionPlaybackState(true);
      this.startSimulatedTimer(startSecond, song.durationSeconds || 240);
      this.setIsLoading(false);
      return true;
    }
  }

  public playSongSnippet(songId: string, _soundType?: string, optionalSong?: Song): void {
    const song = optionalSong || SAMPLE_SONGS.find((s) => s.id === songId) || SAMPLE_SONGS[0];
    this.playSong(song, 0);
  }

  public pause(): void {
    if (this.audio && !this.audio.paused) {
      this.audio.pause();
    }
    ytController.pause();
    this.stopSimulatedTimer();
    this.isPlaying = false;
    this.notifyStateChange(false);
    this.syncMediaSessionPlaybackState(false);
  }

  public resume(): void {
    if (this.currentSong?.youtubeVideoId) {
      ytController.play(this.currentSong.youtubeVideoId, this.simulatedSecond);
      if (this.audio) {
        this.audio.play().catch(() => {});
      }
    } else if (this.currentSong?.audioUrl && this.audio) {
      this.audio.play().catch((err) => console.warn('Audio resume:', err));
    } else {
      this.startSimulatedTimer(this.simulatedSecond, this.currentSong?.durationSeconds || 240);
    }
    this.isPlaying = true;
    this.notifyStateChange(true);
    this.syncMediaSessionPlaybackState(true);
  }

  public stop(): void {
    this.activePlaybackId = '';
    if (this.audio) {
      this.audio.pause();
      this.audio.removeAttribute('src');
      this.audio.currentTime = 0;
    }
    ytController.stop();
    ytController.pause();
    this.stopSimulatedTimer();
    this.simulatedSecond = 0;
    this.isPlaying = false;
    this.notifyStateChange(false);
    this.syncMediaSessionPlaybackState(false);
  }

  public seek(second: number): void {
    const safeSec = Math.max(0, isNaN(second) ? 0 : second);
    this.simulatedSecond = safeSec;

    if (this.currentSong?.youtubeVideoId) {
      ytController.seek(safeSec);
    } else if (this.audio && this.audio.src) {
      try {
        this.audio.currentTime = safeSec;
      } catch (err) {
        console.warn('Audio seek error:', err);
      }
    }
    this.notifyTimeUpdate(safeSec);
    if (this.currentSong?.durationSeconds) {
      this.updatePositionState(safeSec, this.currentSong.durationSeconds);
    }
  }

  public getCurrentTime(): number {
    if (this.currentSong?.youtubeVideoId) {
      return ytController.getCurrentTime();
    }
    if (this.audio && this.audio.src && !this.audio.paused) {
      return Math.floor(this.audio.currentTime);
    }
    return this.simulatedSecond;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public setVolume(volume: number): void {
    if (this.audio) {
      this.audio.volume = Math.max(0, Math.min(1, volume));
    }
  }
}

export const soundEngine = new RealMusicEngine();
