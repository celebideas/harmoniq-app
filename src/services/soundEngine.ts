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
  private durationChangeCallbacks: ((durationSec: number) => void)[] = [];
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
  private onPlayPauseHandler: ((play: boolean) => void) | null = null;
  private onSeekHandler: ((sec: number) => void) | null = null;

  // Tiny silent audio payload to keep system MediaSession notification alive during YouTube playback
  private silentAudioUri: string = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
  private isUsingSilentAudio: boolean = false;
  private lastUserActionTime: number = 0;
  private expectedPlayingState: boolean | null = null;
  private lastNotifiedPlaying: boolean | null = null;
  private isLoadingTrack: boolean = false;
  private trackLoadTimeout: ReturnType<typeof setTimeout> | null = null;
  private previewTimeOffset: number = 0;
  private isPendingMetadataSeek: boolean = false;
  private volume: number = 0.8;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('listenhub_volume');
        if (saved !== null) {
          const parsed = Number(saved);
          if (Number.isFinite(parsed)) {
            this.volume = Math.max(0, Math.min(1, parsed));
          }
        }
      } catch {
        // ignore storage errors
      }
      ytController.setVolume(Math.round(this.volume * 100));
      this.initAudioElement();
      this.attachVisibilityListener();
    }

    // Connect YouTube controller events (bidirectional sync with YouTube iframe)
    ytController.onTimeUpdate((sec) => {
      if (this.currentSong?.youtubeVideoId || ytController.getCurrentVideoId()) {
        this.simulatedSecond = sec;
        this.notifyTimeUpdate(sec);
      }
    });

    ytController.onStateChange((playing) => {
      if (this.currentSong?.youtubeVideoId || ytController.getCurrentVideoId()) {
        if (playing) {
          this.clearTrackLoadingLock();
        }
        if (this.shouldIgnoreExternalState(playing)) {
          return;
        }
        // Once confirmed or externally toggled via YouTube iframe, clear stale guard lock
        this.expectedPlayingState = null;
        this.isPlaying = playing;
        this.notifyStateChange(playing);
        this.syncMediaSessionPlaybackState(playing);
        if (playing) {
          this.setIsLoading(false);
        }
      }
    });

    ytController.onDurationChange((durationSec) => {
      if (
        (this.currentSong?.youtubeVideoId || ytController.getCurrentVideoId()) &&
        durationSec > 30
      ) {
        if (this.currentSong) {
          this.currentSong = { ...this.currentSong, durationSeconds: durationSec };
          this.updatePositionState(this.getCurrentTime(), durationSec);
        }
        this.notifyDurationChange(durationSec);
      }
    });

    ytController.onEnded(() => {
      this.clearTrackLoadingLock();
      if (this.currentSong?.youtubeVideoId && this.onNextTrackHandler) {
        this.onNextTrackHandler();
      }
    });

    ytController.onError((_code) => {
      this.clearTrackLoadingLock();
      this.setIsLoading(false);
      if (this.currentSong?.youtubeVideoId) {
        this.triggerErrorFallback(this.currentSong);
      }
    });
  }

  public primeSong(song: Song | null) {
    if (!song) {
      if (!this.isPlaying) {
        this.currentSong = null;
        ytController.setActiveVideoId(null);
      }
      return;
    }
    if (!this.currentSong || (!this.isPlaying && this.currentSong.id !== song.id)) {
      this.currentSong = song;
      if (song.youtubeVideoId) {
        ytController.setActiveVideoId(song.youtubeVideoId);
      }
    }
  }

  private startTrackLoadingLock() {
    this.isLoadingTrack = true;
    if (this.trackLoadTimeout) {
      clearTimeout(this.trackLoadTimeout);
    }
    this.trackLoadTimeout = setTimeout(() => {
      this.isLoadingTrack = false;
      this.trackLoadTimeout = null;
    }, 3500);
  }

  private clearTrackLoadingLock() {
    this.isLoadingTrack = false;
    if (this.trackLoadTimeout) {
      clearTimeout(this.trackLoadTimeout);
      this.trackLoadTimeout = null;
    }
  }

  private mediaSessionSetupDone: boolean = false;
  private lastMetadataSongId: string = '';

  public setMediaSessionActions(handlers: {
    onPrevTrack?: () => void;
    onNextTrack?: () => void;
    onTogglePlay?: () => void;
    onPlayPause?: (play: boolean) => void;
    onSeek?: (sec: number) => void;
  }) {
    this.onPrevTrackHandler = handlers.onPrevTrack || null;
    this.onNextTrackHandler = handlers.onNextTrack || null;
    this.onTogglePlayHandler = handlers.onTogglePlay || null;
    this.onPlayPauseHandler = handlers.onPlayPause || null;
    this.onSeekHandler = handlers.onSeek || null;
    this.initMediaSessionOnce();
  }

  public updateMediaSession(song: Song, playingState?: boolean) {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    this.initMediaSessionOnce();

    const effectivePlaying = playingState !== undefined ? playingState : this.isPlaying;

    // Only update metadata when track changes to prevent OS notification buttons from flickering
    if (this.lastMetadataSongId === song.id) {
      this.syncMediaSessionPlaybackState(effectivePlaying);
      return;
    }
    this.lastMetadataSongId = song.id;

    try {
      const artworks: { src: string; sizes: string; type: string }[] = [];
      if (song.coverUrl) {
        artworks.push(
          { src: song.coverUrl, sizes: '300x300', type: 'image/jpeg' },
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
        album: song.album || 'ListenHub Canlı Frekans',
        artwork: artworks,
      });

      this.syncMediaSessionPlaybackState(effectivePlaying);
      if (song.durationSeconds) {
        this.updatePositionState(this.getCurrentTime(), song.durationSeconds);
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
        if (this.onPlayPauseHandler) {
          this.onPlayPauseHandler(true);
        } else if (this.onTogglePlayHandler) {
          this.onTogglePlayHandler();
        } else {
          this.resume();
        }
      });

      // Pause Action (Kalıcı ve sabit)
      navigator.mediaSession.setActionHandler('pause', () => {
        if (this.onPlayPauseHandler) {
          this.onPlayPauseHandler(false);
        } else if (this.onTogglePlayHandler) {
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
      if (!this.audio || this.isUsingSilentAudio || this.currentSong?.youtubeVideoId) return;
      if (this.isPendingMetadataSeek) return;
      const sec = Math.floor(this.audio.currentTime + this.previewTimeOffset);
      this.simulatedSecond = sec;
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
      // Silent MediaSession WAV guard: keep looping silently during YouTube playback without ending track or flipping state
      if (this.isUsingSilentAudio || this.currentSong?.youtubeVideoId || this.audio?.src === this.silentAudioUri) {
        if (this.isPlaying && this.audio) {
          this.audio.loop = true;
          this.audio.currentTime = 0;
          this.audio.play().catch(() => {});
        }
        return;
      }
      if (!this.hasTriggeredEndForCurrentSong) {
        this.hasTriggeredEndForCurrentSong = true;
        this.handleTrackEnded();
      }
    });

    this.audio.addEventListener('play', () => {
      if (this.isUsingSilentAudio || this.currentSong?.youtubeVideoId || this.audio?.src === this.silentAudioUri) {
        return;
      }
      this.clearTrackLoadingLock();
      if (this.shouldIgnoreExternalState(true)) return;
      this.isPlaying = true;
      this.setIsLoading(false);
      this.notifyStateChange(true);
    });

    this.audio.addEventListener('playing', () => {
      if (this.isUsingSilentAudio || this.currentSong?.youtubeVideoId || this.audio?.src === this.silentAudioUri) {
        return;
      }
      this.clearTrackLoadingLock();
      this.setIsLoading(false);
    });

    this.audio.addEventListener('pause', () => {
      // Ignore synthetic pause events fired while loading a new track or when silent MediaSession WAV pauses
      if (
        this.isLoadingTrack ||
        !this.audio ||
        this.audio.readyState < 2 ||
        this.isUsingSilentAudio ||
        this.currentSong?.youtubeVideoId ||
        this.audio.src === this.silentAudioUri
      ) {
        return;
      }
      if (this.shouldIgnoreExternalState(false)) return;
      this.isPlaying = false;
      this.notifyStateChange(false);
    });

    this.audio.addEventListener('waiting', () => {
      if (this.isUsingSilentAudio || this.currentSong?.youtubeVideoId || this.audio?.src === this.silentAudioUri) {
        return;
      }
      this.setIsLoading(true);
    });

    this.audio.addEventListener('canplay', () => {
      if (this.isUsingSilentAudio || this.currentSong?.youtubeVideoId || this.audio?.src === this.silentAudioUri) {
        return;
      }
      this.setIsLoading(false);
    });

    this.audio.addEventListener('error', (e) => {
      if (this.isUsingSilentAudio || this.currentSong?.youtubeVideoId || this.audio?.src === this.silentAudioUri) {
        return;
      }
      console.warn('Real audio stream notice:', e);
      this.clearTrackLoadingLock();
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

  public onDurationChange(callback: (durationSec: number) => void) {
    this.durationChangeCallbacks.push(callback);
    return () => {
      this.durationChangeCallbacks = this.durationChangeCallbacks.filter((cb) => cb !== callback);
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
    console.info(`[ListenHub SoundEngine] Auto-fallback for song "${failedSong.title}", advancing gracefully to next track...`);
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

  private shouldIgnoreExternalState(incomingPlaying: boolean): boolean {
    if (this.expectedPlayingState !== null) {
      if (incomingPlaying === this.expectedPlayingState) {
        this.expectedPlayingState = null;
        return false;
      }
      if (Date.now() - this.lastUserActionTime < 850) {
        return true;
      }
    }
    return false;
  }

  private notifyTimeUpdate(sec: number) {
    this.timeUpdateCallbacks.forEach((cb) => cb(sec));
  }

  private notifyDurationChange(durationSec: number) {
    this.durationChangeCallbacks.forEach((cb) => cb(durationSec));
  }

  private notifyStateChange(playing: boolean) {
    if (this.lastNotifiedPlaying === playing) return;
    this.lastNotifiedPlaying = playing;
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
    const safeStart = Math.max(0, Math.floor(startSecond || 0));

    // Rule 1: If the same track is ALREADY loaded, NEVER reload audio.src or re-send loadVideoById!
    const isSameLoadedSong =
      this.currentSong !== null &&
      (this.currentSong.id === song.id ||
        (Boolean(song.youtubeVideoId) &&
          this.currentSong.youtubeVideoId === song.youtubeVideoId));

    if (isSameLoadedSong) {
      this.seekTo(safeStart);
      if (!this.isPlaying) {
        this.resume();
      }
      return true;
    }

    const requestId = ++this.currentRequestId;
    const playbackId = `pb_${requestId}_${song.id}_${Date.now()}`;
    this.activePlaybackId = playbackId;
    this.hasTriggeredEndForCurrentSong = false;
    this.previewTimeOffset = 0;
    this.simulatedSecond = safeStart;
    this.isPendingMetadataSeek = safeStart > 0 && !song.youtubeVideoId;

    // Lock expected playing state and track loading immediately so teardown/load of previous track never flickers UI
    this.startTrackLoadingLock();
    this.lastUserActionTime = Date.now();
    this.expectedPlayingState = true;

    this.initAudioElement();
    this.setIsLoading(true);

    // Stop and unload previous native audio silently to avoid overlapping audio
    const switchingToYouTube = Boolean(song.youtubeVideoId);
    if (this.audio) {
      try {
        if (!switchingToYouTube || this.audio.src !== this.silentAudioUri) {
          this.isUsingSilentAudio = true; // suppress pause callback while tearing down
          this.audio.pause();
          this.audio.removeAttribute('src');
          this.audio.load();
        }
      } catch {}
    }

    // Strictly stop previous YouTube playback silently (without emitting paused state)
    ytController.stop(true);
    ytController.pause(true);

    this.stopSimulatedTimer();

    this.currentSong = song;
    this.updateMediaSession(song, true);
    if (safeStart > 0) {
      this.notifyTimeUpdate(safeStart);
    }

    // CASE 1: YouTube Track
    if (song.youtubeVideoId) {
      if (this.activePlaybackId !== playbackId) {
        return false;
      }

      // Play a silent audio loop so iOS / Android browser media session stays pinned in notification tray
      this.isUsingSilentAudio = true;
      if (this.audio) {
        try {
          if (this.audio.src !== this.silentAudioUri) {
            this.audio.src = this.silentAudioUri;
          }
          this.audio.loop = true;
          this.audio.volume = 0.001;
          this.audio.play().catch(() => {});
        } catch {}
      }

      if (this.activePlaybackId !== playbackId) {
        return false;
      }

      this.isPlaying = true;
      this.notifyStateChange(true);
      this.syncMediaSessionPlaybackState(true);
      ytController.play(song.youtubeVideoId, safeStart);
      this.setIsLoading(false);
      return true;
    }

    // CASE 2: Native Audio Track (MP3/AAC/M4A/iTunes preview)
    this.isUsingSilentAudio = false;
    let url = song.audioUrl;
    if (!url) {
      const found = SAMPLE_SONGS.find((s) => s.id === song.id);
      url = found?.audioUrl;
    }

    if (url && this.audio) {
      try {
        this.audio.loop = false;
        this.audio.muted = this.volume === 0;
        this.audio.volume = this.volume;

        let pendingStart: number | null = safeStart > 0 ? safeStart : null;

        const applyNativeSeek = () => {
          if (!this.audio || this.activePlaybackId !== playbackId) return;
          if (pendingStart === null || pendingStart <= 0) {
            this.isPendingMetadataSeek = false;
            return;
          }

          // Clear pending target and detach both listeners BEFORE setting currentTime
          // so browser-emitted canplay/seeked events can NEVER trigger an infinite seek loop!
          const target = pendingStart;
          pendingStart = null;
          this.isPendingMetadataSeek = false;
          this.audio.removeEventListener('loadedmetadata', applyNativeSeek);
          this.audio.removeEventListener('canplay', applyNativeSeek);

          const dur = this.audio.duration;
          if (Number.isFinite(dur) && dur > 0) {
            if (dur > target) {
              this.previewTimeOffset = 0;
              this.audio.currentTime = target;
            } else if (dur <= 35 && target >= dur) {
              const proportionalSec = Math.max(
                0,
                Math.min(dur - 2, Math.floor((target / (song.durationSeconds || 240)) * dur))
              );
              this.previewTimeOffset = target - proportionalSec;
              this.audio.currentTime = proportionalSec;
            } else {
              this.previewTimeOffset = 0;
              this.audio.currentTime = Math.max(0, dur - 2);
            }
          }
          this.simulatedSecond = target;
          this.notifyTimeUpdate(target);
        };

        const isNewSrc = this.audio.src !== url;
        if (isNewSrc) {
          this.audio.src = url;
          this.audio.load();
        }

        if (pendingStart !== null) {
          if (this.audio.readyState >= 1) {
            applyNativeSeek();
          } else {
            this.audio.addEventListener('loadedmetadata', applyNativeSeek, { once: true });
          }
        } else {
          this.isPendingMetadataSeek = false;
        }

        await this.audio.play();
        if (pendingStart !== null && this.activePlaybackId === playbackId && this.audio.readyState >= 1) {
          applyNativeSeek();
        }

        // Check if a newer track was commanded while waiting for audio play Promise
        if (this.activePlaybackId !== playbackId) {
          if (this.audio) {
            this.audio.pause();
            this.audio.removeAttribute('src');
          }
          return false;
        }

        this.clearTrackLoadingLock();
        this.isPlaying = true;
        this.notifyStateChange(true);
        this.syncMediaSessionPlaybackState(true);
        this.setIsLoading(false);
        return true;
      } catch (err: any) {
        if (this.activePlaybackId !== playbackId) return false;
        console.warn('Audio play request notice:', err);
        this.isPendingMetadataSeek = false;
        this.clearTrackLoadingLock();
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
      this.isPendingMetadataSeek = false;
      if (this.audio) {
        this.audio.pause();
        this.audio.removeAttribute('src');
      }
      this.clearTrackLoadingLock();
      this.isPlaying = true;
      this.notifyStateChange(true);
      this.syncMediaSessionPlaybackState(true);
      this.startSimulatedTimer(safeStart, song.durationSeconds || 240);
      this.setIsLoading(false);
      return true;
    }
  }

  public playSongSnippet(songId: string, _soundType?: string, optionalSong?: Song): void {
    const song = optionalSong || SAMPLE_SONGS.find((s) => s.id === songId) || SAMPLE_SONGS[0];
    this.playSong(song, 0);
  }

  public pause(): void {
    this.clearTrackLoadingLock();
    this.lastUserActionTime = Date.now();
    this.expectedPlayingState = false;
    this.setIsLoading(false);
    if (this.audio && !this.audio.paused) {
      this.audio.pause();
    }
    ytController.pause(true);
    this.stopSimulatedTimer();
    this.isPlaying = false;
    this.notifyStateChange(false);
    this.syncMediaSessionPlaybackState(false);
  }

  public resume(): void {
    this.lastUserActionTime = Date.now();
    this.expectedPlayingState = true;
    if (this.currentSong?.youtubeVideoId) {
      this.isUsingSilentAudio = true;
      const resumeSec = ytController.getCurrentTime() || this.simulatedSecond || 0;
      ytController.play(this.currentSong.youtubeVideoId, resumeSec);
      if (this.audio) {
        if (this.audio.src !== this.silentAudioUri) {
          this.audio.src = this.silentAudioUri;
        }
        this.audio.loop = true;
        this.audio.volume = 0.001;
        this.audio.play().catch(() => {});
      }
    } else if (this.currentSong?.audioUrl && this.audio) {
      this.isUsingSilentAudio = false;
      this.audio.loop = false;
      this.audio.muted = this.volume === 0;
      this.audio.volume = this.volume;
      this.audio.play().catch((err) => console.warn('Audio resume:', err));
    } else {
      this.startSimulatedTimer(this.simulatedSecond, this.currentSong?.durationSeconds || 240);
    }
    this.isPlaying = true;
    this.setIsLoading(false);
    this.notifyStateChange(true);
    this.syncMediaSessionPlaybackState(true);
  }

  public stop(): void {
    this.clearTrackLoadingLock();
    this.lastUserActionTime = Date.now();
    this.expectedPlayingState = false;
    this.activePlaybackId = '';
    this.setIsLoading(false);
    if (this.audio) {
      this.audio.pause();
      this.audio.removeAttribute('src');
      this.audio.currentTime = 0;
    }
    this.isUsingSilentAudio = false;
    ytController.stop(true);
    ytController.pause(true);
    this.stopSimulatedTimer();
    this.simulatedSecond = 0;
    this.isPlaying = false;
    this.notifyStateChange(false);
    this.syncMediaSessionPlaybackState(false);
  }

  public seekTo(second: number): void {
    this.seek(second);
  }

  public seek(second: number): void {
    const safeSec = Math.max(0, isNaN(second) ? 0 : Math.floor(second));
    this.simulatedSecond = safeSec;
    this.isPendingMetadataSeek = false;

    if (this.currentSong?.youtubeVideoId) {
      ytController.seek(safeSec);
    } else if (this.audio && this.audio.src && !this.isUsingSilentAudio) {
      try {
        const dur = this.audio.duration;
        if (Number.isFinite(dur) && dur > 0) {
          if (dur > safeSec) {
            this.previewTimeOffset = 0;
            this.audio.currentTime = safeSec;
          } else if (dur <= 35 && safeSec >= dur) {
            const proportionalSec = Math.max(
              0,
              Math.min(
                dur - 2,
                Math.floor((safeSec / (this.currentSong?.durationSeconds || 240)) * dur)
              )
            );
            this.previewTimeOffset = safeSec - proportionalSec;
            this.audio.currentTime = proportionalSec;
          } else {
            this.previewTimeOffset = 0;
            this.audio.currentTime = Math.max(0, dur - 2);
          }
        } else {
          this.audio.currentTime = safeSec;
        }
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
    if (this.audio && this.audio.src && !this.audio.paused && !this.isUsingSilentAudio) {
      return Math.floor(this.audio.currentTime + this.previewTimeOffset);
    }
    return this.simulatedSecond;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentSongId(): string | null {
    return this.currentSong?.id || null;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(1, Number.isFinite(volume) ? volume : 0.8));
    this.volume = clamped;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('listenhub_volume', String(clamped));
      } catch {
        // ignore storage errors
      }
    }
    if (this.audio && !this.isUsingSilentAudio) {
      this.audio.muted = clamped === 0;
      this.audio.volume = clamped;
    }
    ytController.setVolume(Math.round(clamped * 100));
  }
}

export const soundEngine = new RealMusicEngine();
