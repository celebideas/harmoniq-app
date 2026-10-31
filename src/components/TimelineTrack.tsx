import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Song, LoungeUser, PrivacyMode, TimelineMarker } from '../types';
import {
  X,
  Users,
  Clock,
  Zap,
  Link2,
  Shield,
  MapPin,
  Headphones,
  ChevronDown,
  Check,
  Send,
} from 'lucide-react';
import { triggerHaptic } from '../services/themeService';
import { SAMPLE_SONGS } from '../data/mockData';

interface Props {
  song: Song;
  mySecond: number;
  users: LoungeUser[];
  privacyMode?: PrivacyMode;
  onSelectUser: (user: LoungeUser) => void;
  onDirectChat?: (user: LoungeUser) => void;
  onSeekSecond?: (sec: number) => void;
  onToggleFriend?: (user: LoungeUser) => void;
  onChangePrivacyMode?: (mode: PrivacyMode) => void;
  candidateSongs?: Song[];
  onWhisperTrack?: (user: LoungeUser, track: Song, note?: string) => void;
  onShowToast?: (msg: string) => void;
}

interface TimelineCluster {
  id: string;
  centerSecond: number;
  users: LoungeUser[];
}

export const TimelineTrack: React.FC<Props> = ({
  song,
  mySecond,
  users,
  privacyMode = 'public',
  onSelectUser,
  onDirectChat,
  onSeekSecond,
  candidateSongs,
  onWhisperTrack,
  onShowToast,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeClusterId, setActiveClusterId] = useState<string | null>(null);
  const [syncedUser, setSyncedUser] = useState<LoungeUser | null>(null);
  const [whisperUserId, setWhisperUserId] = useState<string | null>(null);
  const [whisperedNotice, setWhisperedNotice] = useState<{ userId: string; songTitle: string } | null>(null);

  // Close active balloon/preview when clicking anywhere outside
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveClusterId(null);
        setWhisperUserId(null);
      }
    };
    document.addEventListener('mousedown', handleGlobalClick);
    document.addEventListener('touchstart', handleGlobalClick);
    return () => {
      document.removeEventListener('mousedown', handleGlobalClick);
      document.removeEventListener('touchstart', handleGlobalClick);
    };
  }, []);

  const duration = song.durationSeconds || 210;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getPercent = (sec: number) => {
    return Math.min(100, Math.max(0, (sec / duration) * 100));
  };

  // Dynamic 4-section markers scaled to current song duration & genre
  const dynamicMarkers: TimelineMarker[] = useMemo(() => {
    const dur = song.durationSeconds || 210;
    const genreLower = (song.genre || '').toLowerCase();
    const isElectronicOrPop =
      genreLower.includes('synth') ||
      genreLower.includes('electronic') ||
      genreLower.includes('pop') ||
      genreLower.includes('rap') ||
      genreLower.includes('hip-hop');

    return [
      { second: Math.round(dur * 0.08), label: 'Giriş Melodisi', emoji: '⚡' },
      { second: Math.round(dur * 0.32), label: 'Nakarat', emoji: '🔥' },
      {
        second: Math.round(dur * 0.62),
        label: isElectronicOrPop ? 'Synth / Bass Drop' : 'Gitar Solosu',
        emoji: isElectronicOrPop ? '🎹' : '🎸',
      },
      { second: Math.round(dur * 0.85), label: 'Final Akışı', emoji: '✨' },
    ];
  }, [song.id, song.durationSeconds, song.genre]);

  // Filter based on privacy mode
  const visibleUsers = useMemo(() => {
    return privacyMode === 'friends_only'
      ? users.filter((u) => u.friendStatus === 'friends')
      : users;
  }, [privacyMode, users]);

  // Curate 3 candidate tracks for "Sıradaki Şarkıyı Öner (Whisper Next Track)"
  const whisperSuggestions = useMemo(() => {
    const pool = candidateSongs && candidateSongs.length > 0 ? candidateSongs : SAMPLE_SONGS;
    return pool.filter((s) => s.id !== song.id && s.title !== song.title).slice(0, 3);
  }, [candidateSongs, song]);

  // Proximity Clustering Algorithm:
  // Group listeners that are within 12 seconds of each other into +3, +10 clusters
  const thresholdSeconds = 12;

  const clusters: TimelineCluster[] = useMemo(() => {
    const result: TimelineCluster[] = [];
    const sorted = [...visibleUsers].sort((a, b) => a.currentSecond - b.currentSecond);

    for (const user of sorted) {
      const last = result[result.length - 1];
      if (last && Math.abs(user.currentSecond - last.centerSecond) <= thresholdSeconds) {
        last.users.push(user);
        last.centerSecond = Math.round(
          last.users.reduce((acc, u) => acc + u.currentSecond, 0) / last.users.length
        );
      } else {
        result.push({
          id: `cluster-${user.id}`,
          centerSecond: user.currentSecond,
          users: [user],
        });
      }
    }
    return result;
  }, [visibleUsers]);

  const activeCluster = useMemo(() => {
    if (!activeClusterId) return null;
    return clusters.find((c) => c.id === activeClusterId) || null;
  }, [clusters, activeClusterId]);

  const handleClusterClick = (e: React.MouseEvent, cluster: TimelineCluster) => {
    e.stopPropagation();
    triggerHaptic(15);
    setActiveClusterId((prev) => (prev === cluster.id ? null : cluster.id));
  };

  const handleSyncWithUser = (user: LoungeUser) => {
    triggerHaptic(30);
    setSyncedUser(user);
    if (onSeekSecond) {
      onSeekSecond(user.currentSecond);
    }
    onShowToast?.(
      `🔗 ${user.name} ile ${formatTime(user.currentSecond)} saniyesine kilitlendin!`
    );
  };

  const handleBreakSync = () => {
    triggerHaptic(15);
    setSyncedUser(null);
    onShowToast?.('Senkron dinleme sonlandırıldı.');
  };

  const handleWhisperCandidate = (user: LoungeUser, track: Song) => {
    triggerHaptic(20);
    onWhisperTrack?.(user, track, 'Bu şarkı bittiğinde şuna geçmelisin');
    setWhisperedNotice({ userId: user.id, songTitle: track.title });
    onShowToast?.(`🎧 ${user.name} kullanıcısına "${track.title}" fısıldandı!`);
    setTimeout(() => {
      setWhisperedNotice(null);
    }, 3500);
  };

  return (
    <div
      ref={containerRef}
      onClick={() => {
        setActiveClusterId(null);
        setWhisperUserId(null);
      }}
      className="surface-card rounded-2xl p-4 sm:p-5 space-y-3.5 select-none relative overflow-hidden"
    >
      {/* 1. Header: Şarkı Zaman Rayı & Canlı Zaman Bilgisi */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
          <span className="font-heading font-bold text-zinc-900 dark:text-white text-xs sm:text-sm">
            Şarkı Zaman Rayı
          </span>
          <span className="text-zinc-400">·</span>
          <span className="text-[#646073] dark:text-[#9E9AA8] font-medium">
            {privacyMode === 'private'
              ? '👻 Hayalet Mod'
              : `${visibleUsers.length + 1} Dinleyici Rayda`}
          </span>
        </div>

        <div className="font-mono text-xs tabular-nums text-[#646073] dark:text-[#9E9AA8]">
          <span className="text-purple-600 dark:text-purple-400 font-bold">
            {formatTime(mySecond)}
          </span>
          <span className="mx-1">/</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Sync Status Banner (Active Lock State) */}
      {syncedUser && (
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-600 dark:text-emerald-300 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-semibold truncate">
              {syncedUser.name} ile senkronize dinleniyor
            </span>
            <span className="text-[10px] font-mono opacity-80">
              [{formatTime(syncedUser.currentSecond)}]
            </span>
          </div>
          <button
            type="button"
            onClick={handleBreakSync}
            className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 transition cursor-pointer shrink-0 border border-emerald-500/30"
          >
            Ayır ✕
          </button>
        </div>
      )}

      {/* 2. Etkileşimli Zaman Rayı (00:00 - Süre) */}
      <div className="relative pt-11 pb-6 px-1">
        <div
          onClick={(e) => {
            if (!onSeekSecond) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const newSec = Math.round((clickX / rect.width) * duration);
            triggerHaptic(15);
            onSeekSecond(newSec);
            setActiveClusterId(null);
            setWhisperUserId(null);
          }}
          className="relative h-2.5 bg-zinc-200 dark:bg-[#1E1B2E] rounded-full cursor-pointer border border-zinc-300/80 dark:border-white/[0.09] hover:border-purple-500/40 transition shadow-inner group/rail"
          title="Şarkıda istediğin saniyeye atlamak için dokun"
        >
          {/* Çalan Kısım İlerleme Şeridi (Electric Violet Gradient) */}
          <div
            className="h-full bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 rounded-full transition-all duration-200 shadow-[0_0_12px_rgba(147,51,234,0.45)]"
            style={{ width: `${getPercent(mySecond)}%` }}
          />

          {/* Senkron Bağ Çizgisi */}
          {syncedUser && (
            <div
              className="absolute top-1/2 -translate-y-1/2 h-3 pointer-events-none z-15 flex items-center transition-all duration-300"
              style={{
                left: `${Math.min(getPercent(mySecond), getPercent(syncedUser.currentSecond))}%`,
                width: `${Math.max(2, Math.abs(getPercent(mySecond) - getPercent(syncedUser.currentSecond)))}%`,
              }}
            >
              <div className="w-full h-1.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.9)] animate-pulse" />
            </div>
          )}

          {/* Şarkı Zirve / Solo Noktaları (Warm Amber #F59E0B) */}
          {dynamicMarkers.map((marker, idx) => {
            const leftPct = getPercent(marker.second);
            return (
              <div
                key={idx}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-3.5 bg-amber-500 rounded-full pointer-events-none shadow-[0_0_8px_rgba(245,158,11,0.75)] z-10"
                style={{ left: `${leftPct}%` }}
                title={`${marker.emoji} ${marker.label} (${formatTime(marker.second)})`}
              />
            );
          })}

          {/* CLUSTERED LISTENER AVATAR PINS (12s Proximity Grouping -> +3, +10) */}
          {clusters.map((cluster) => {
            const leftPct = getPercent(cluster.centerSecond);
            const isClusterActive = activeClusterId === cluster.id;
            const isMultiUser = cluster.users.length > 1;
            const primaryUser = cluster.users[0];
            const hasSynced = syncedUser && cluster.users.some((u) => u.id === syncedUser.id);

            return (
              <div
                key={cluster.id}
                onClick={(e) => handleClusterClick(e, cluster)}
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 cursor-pointer transition-transform ${
                  isClusterActive ? 'scale-115 z-30' : 'hover:scale-110'
                }`}
                style={{ left: `${leftPct}%` }}
                title={`${cluster.users.map((u) => u.name).join(', ')} (${formatTime(cluster.centerSecond)})`}
              >
                {isMultiUser ? (
                  <div className="relative group/pin">
                    <div
                      className={`absolute -top-1 -left-1 w-7 h-7 rounded-full bg-gradient-to-tr ${
                        cluster.users[1]?.avatarGradient || 'from-purple-700 to-pink-700'
                      } opacity-60 border-2 border-zinc-950`}
                    />
                    <div
                      className={`w-7 h-7 rounded-full bg-gradient-to-tr ${primaryUser.avatarGradient} shadow-lg border-2 ${
                        hasSynced
                          ? 'border-emerald-400 ring-2 ring-emerald-400/70'
                          : isClusterActive
                          ? 'border-purple-500 ring-2 ring-purple-500/40'
                          : 'border-zinc-950'
                      } flex items-center justify-center text-force-white text-[10px] font-bold relative z-10`}
                    >
                      {primaryUser.avatarSeed}
                      <span className="absolute -top-2 -right-2.5 px-1.5 py-0.2 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 text-force-white font-black text-[9px] shadow-md border border-zinc-950 tabular-nums">
                        +{cluster.users.length - 1}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`w-7 h-7 rounded-full bg-gradient-to-tr ${primaryUser.avatarGradient} shadow-md border-2 ${
                      hasSynced
                        ? 'border-emerald-400 ring-2 ring-emerald-400/70'
                        : isClusterActive
                        ? 'border-purple-500 ring-2 ring-purple-500/40'
                        : 'border-zinc-950'
                    } flex items-center justify-center text-force-white text-[10px] font-bold overflow-hidden`}
                  >
                    {primaryUser.avatarUrl ? (
                      <img
                        src={primaryUser.avatarUrl}
                        alt={primaryUser.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      primaryUser.avatarSeed
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* KULLANICININ KENDİ CANLI İBRESİ ("Sen") */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-30 pointer-events-none"
            style={{ left: `${getPercent(mySecond)}%` }}
          >
            <div className="relative flex flex-col items-center">
              <span className="absolute -inset-1 rounded-full bg-purple-500/40 animate-ping pointer-events-none" />
              <div className="px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 text-force-white text-[10px] font-black shadow-[0_0_14px_rgba(147,51,234,0.5)] flex items-center gap-1 relative z-10">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span>Sen</span>
              </div>
              <div className="w-2.5 h-2.5 rounded-full bg-purple-500 border-2 border-zinc-950 mt-0.5 relative z-10 shadow-sm" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. SEÇİLİ KİŞİ / KÜME KARTI (2-Satırlı Ferah Önizleme Balonu - Kenara Taşmaz) */}
      {activeCluster && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative surface-inner rounded-2xl p-3.5 sm:p-4 space-y-3 border border-purple-500/40 shadow-xl animate-in fade-in slide-in-from-top-1 duration-150 max-w-full"
        >
          {/* Dynamic Clamped Pointer Arrow pointing to the clicked pin */}
          <div
            className="absolute -top-1.5 w-3 h-3 bg-white dark:bg-[#14121E] border-t border-l border-purple-500/50 rotate-45 -translate-x-1/2 pointer-events-none transition-all duration-200 shadow-sm"
            style={{ left: `${Math.min(92, Math.max(8, getPercent(activeCluster.centerSecond)))}%` }}
          />

          {activeCluster.users.length > 1 && (
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06] text-xs">
              <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-white">
                <Users className="w-3.5 h-3.5 text-purple-500" />
                <span>
                  {formatTime(activeCluster.centerSecond)} Saniyesinde {activeCluster.users.length} Dinleyici
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveClusterId(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="space-y-3 max-h-80 overflow-y-auto no-scrollbar">
            {activeCluster.users.map((user) => {
              const userTimeFormatted = formatTime(user.currentSecond);
              const quoteNote =
                user.statusBubble ||
                `${userTimeFormatted} solosunda tüyler diken diken 🎸`;

              return (
                <div
                  key={user.id}
                  className="p-3 rounded-xl bg-white/80 dark:bg-[#14121E]/90 border border-zinc-200/80 dark:border-white/[0.07] space-y-2.5 shadow-sm"
                >
                  {/* ÜST SATIR: Sol tarafta avatar, yanında tam isim ve yaş, yanında 🛡️ 99 ve ⚡ %94 Uyum rozetleri; sağda yeşil mesafe etiketi */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div
                      onClick={() => onSelectUser(user)}
                      className="flex items-center gap-2.5 min-w-0 cursor-pointer group/u"
                    >
                      <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 ring-1 ring-white/15 relative">
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div
                            className={`w-full h-full bg-gradient-to-tr ${user.avatarGradient} flex items-center justify-center text-xs font-bold text-force-white`}
                          >
                            {user.avatarSeed}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center flex-wrap gap-1.5 min-w-0">
                        <span className="text-sm font-bold text-zinc-900 dark:text-white group-hover/u:text-purple-500 transition">
                          {user.name}, {user.age}
                        </span>

                        <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-0.5 shrink-0">
                          <Shield className="w-2.5 h-2.5" />
                          <span>🛡️ {user.trustScore || 99}</span>
                        </span>

                        <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-0.5 shrink-0">
                          <Zap className="w-2.5 h-2.5 fill-current" />
                          <span>⚡ %{user.compatibilityScore || 94} Uyum</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-mono font-bold">
                        {user.distanceKm} km
                      </span>
                      {activeCluster.users.length === 1 && (
                        <button
                          type="button"
                          onClick={() => setActiveClusterId(null)}
                          className="p-1 text-zinc-400 hover:text-white rounded-lg cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ORTA SATIR: Konum (📍 Selçuk / Moda) ve kişinin o saniyede bıraktığı tırnak içi not */}
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 text-[#646073] dark:text-[#9E9AA8] font-medium">
                      <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>📍 {user.city}</span>
                    </div>
                    <p className="text-xs italic text-zinc-700 dark:text-zinc-200 bg-black/5 dark:bg-white/[0.03] px-2.5 py-1.5 rounded-lg border border-black/5 dark:border-white/[0.05]">
                      "{quoteNote}"
                    </p>
                  </div>

                  {/* ALT SATIR (2 Aksiyon Butonu): 🔗 01:42 Saniyesine Katıl & 👋 Frekans Gönder */}
                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => handleSyncWithUser(user)}
                      className="py-2 px-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 text-force-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer active:scale-95"
                    >
                      <Link2 className="w-3.5 h-3.5 shrink-0 text-force-white" />
                      <span className="truncate text-force-white">
                        🔗 {userTimeFormatted} Saniyesine Katıl
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic(20);
                        setActiveClusterId(null);
                        if (onDirectChat) {
                          onDirectChat(user);
                        } else {
                          onSelectUser(user);
                        }
                      }}
                      className="py-2 px-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
                    >
                      <span>👋 Frekans Gönder</span>
                    </button>
                  </div>

                  {/* Sıradaki Şarkıyı Öner (Whisper Next Track) */}
                  {onWhisperTrack && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          setWhisperUserId(whisperUserId === user.id ? null : user.id)
                        }
                        className="w-full py-1.5 px-2.5 rounded-xl text-[11px] font-semibold flex items-center justify-between gap-1.5 bg-black/5 dark:bg-white/[0.04] text-[#646073] dark:text-[#9E9AA8] hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5">
                          <Headphones className="w-3.5 h-3.5 text-purple-500" />
                          <span>🎧 Sıradaki Şarkıyı Fısılda</span>
                        </div>
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform ${
                            whisperUserId === user.id ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {whisperUserId === user.id && (
                        <div className="mt-1.5 p-2 rounded-xl bg-black/20 border border-white/[0.06] space-y-1.5">
                          {whisperedNotice?.userId === user.id && (
                            <div className="p-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[11px] font-semibold flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5" />
                              <span className="truncate">
                                "{whisperedNotice.songTitle}" fısıldandı!
                              </span>
                            </div>
                          )}
                          {whisperSuggestions.map((cand) => (
                            <div
                              key={cand.id}
                              onClick={() => handleWhisperCandidate(user, cand)}
                              className="p-1.5 rounded-lg hover:bg-white/[0.06] flex items-center justify-between gap-2 cursor-pointer transition"
                            >
                              <div className="min-w-0">
                                <div className="text-[11px] font-semibold text-zinc-900 dark:text-white truncate">
                                  {cand.title}
                                </div>
                                <div className="text-[10px] text-[#646073] dark:text-[#9E9AA8] truncate">
                                  {cand.artist}
                                </div>
                              </div>
                              <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-400 font-bold text-[10px] shrink-0 flex items-center gap-1">
                                <span>Fısılda</span>
                                <Send className="w-2.5 h-2.5" />
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Şarkının Dinamik Bölümleri (Warm Amber Solo Vurgusu) */}
      <div className="pt-2 border-t border-zinc-200/80 dark:border-white/[0.06] relative">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth pr-6 py-0.5">
          <span className="text-[11px] text-[#646073] dark:text-[#9E9AA8] font-semibold shrink-0 mr-1 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-500" />
            <span>Bölümler:</span>
          </span>
          {dynamicMarkers.map((marker) => {
            const isActive = Math.abs(mySecond - marker.second) < 12;
            const isSolo = marker.label.toLowerCase().includes('solo') || marker.label.toLowerCase().includes('drop');
            return (
              <button
                key={`${song.id}-${marker.second}`}
                type="button"
                onClick={() => {
                  triggerHaptic(15);
                  onSeekSecond?.(marker.second);
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-medium shrink-0 flex items-center gap-1.5 transition cursor-pointer active:scale-95 ${
                  isActive
                    ? 'bg-amber-500 text-zinc-950 font-bold shadow-xs'
                    : isSolo
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-semibold'
                    : 'bg-black/5 dark:bg-white/[0.04] hover:bg-white/[0.08] text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/[0.06]'
                }`}
                title={`${marker.label} anına atla`}
              >
                <span>{marker.emoji}</span>
                <span>{marker.label}</span>
                <span className="text-[10px] opacity-75 font-mono tabular-nums">
                  {formatTime(marker.second)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
