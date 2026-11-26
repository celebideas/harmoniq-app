import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Song, LoungeUser, PrivacyMode } from '../types';
import {
  X,
  Users,
  Zap,
  Link2,
  Shield,
  MapPin,
  Headphones,
  ChevronDown,
  ChevronRight,
  Check,
  Send,
  MessageCircle,
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
  onOpenRoomListeners?: () => void;
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
  onOpenRoomListeners,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeClusterId, setActiveClusterId] = useState<string | null>(null);
  const [syncedUser, setSyncedUser] = useState<LoungeUser | null>(null);
  const [whisperUserId, setWhisperUserId] = useState<string | null>(null);
  const [whisperedNotice, setWhisperedNotice] = useState<{ userId: string; songTitle: string } | null>(null);

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

  const visibleUsers = useMemo(() => {
    return privacyMode === 'friends_only'
      ? users.filter((u) => u.friendStatus === 'friends')
      : users;
  }, [privacyMode, users]);

  const whisperSuggestions = useMemo(() => {
    const pool = candidateSongs && candidateSongs.length > 0 ? candidateSongs : SAMPLE_SONGS;
    return pool.filter((s) => s.id !== song.id && s.title !== song.title).slice(0, 3);
  }, [candidateSongs, song]);

  // Proximity Clustering Algorithm (12s window)
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

  // Signature "Live Pulse Echo": detect cluster or listener within ±3 seconds of mySecond
  const coincidingCluster = useMemo(() => {
    if (privacyMode === 'private') return null;
    return (
      clusters.find(
        (c) =>
          Math.abs(mySecond - c.centerSecond) <= 3 ||
          c.users.some((u) => Math.abs(mySecond - u.currentSecond) <= 3)
      ) || null
    );
  }, [clusters, mySecond, privacyMode]);

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
    onShowToast?.(`${user.name} ile ${formatTime(user.currentSecond)} saniyesine kilitlendin`);
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
    onShowToast?.(`${user.name} kullanıcısına "${track.title}" önerildi`);
    setTimeout(() => {
      setWhisperedNotice(null);
    }, 3500);
  };

  const echoLeadUser = coincidingCluster?.users[0] || null;
  const echoExtraCount = coincidingCluster ? Math.max(0, coincidingCluster.users.length - 1) : 0;

  return (
    <div
      ref={containerRef}
      onClick={() => {
        setActiveClusterId(null);
        setWhisperUserId(null);
      }}
      className="rounded-2xl bg-white dark:bg-[#171412] border border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08] shadow-[0_4px_20px_rgba(24,21,18,0.04)] dark:shadow-none p-4 sm:p-5 space-y-3 select-none relative overflow-hidden"
    >
      {/* 1. Minimal Studio Header */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="font-semibold text-[#181512] dark:text-[#FAF7F2] text-xs sm:text-sm truncate tracking-tight">
            Şarkı Zaman Rayı
          </span>
          <div className="text-[11px] font-mono font-medium tabular-nums text-[#6B635B] dark:text-[#A39A91] shrink-0">
            <span className="text-[#181512] dark:text-[#FAF7F2] font-semibold">
              {formatTime(mySecond)}
            </span>
            <span className="mx-1 opacity-50">/</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {onOpenRoomListeners ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic(12);
              onOpenRoomListeners();
            }}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#D96B2C] dark:text-[#F49A5E] hover:opacity-80 active:scale-[0.97] transition cursor-pointer shrink-0"
            title="Odadaki tüm dinleyicileri gör"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] dark:bg-[#22C55E]" />
            <span className="font-mono tabular-nums">
              {privacyMode === 'private'
                ? 'Hayalet Mod · Liste'
                : `${visibleUsers.length + 1} kişi · Liste`}
            </span>
            <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#16A34A]/10 dark:bg-[#22C55E]/10 border border-[#16A34A]/20 dark:border-[#22C55E]/20 text-[11px] font-mono tabular-nums font-medium text-[#16A34A] dark:text-[#22C55E] shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] dark:bg-[#22C55E]" />
            <span>
              {privacyMode === 'private'
                ? 'Hayalet Mod'
                : `${visibleUsers.length + 1} kişi rayda`}
            </span>
          </span>
        )}
      </div>

      {/* Active Sync Lock Banner */}
      {syncedUser && (
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#16A34A]/10 dark:bg-[#22C55E]/10 border border-[#16A34A]/25 dark:border-[#22C55E]/25 text-xs text-[#16A34A] dark:text-[#22C55E]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] dark:bg-[#22C55E] shrink-0" />
            <span className="font-semibold truncate">
              {syncedUser.name} ile senkronize dinleniyor
            </span>
            <span className="text-[10px] font-mono tabular-nums opacity-80">
              {formatTime(syncedUser.currentSecond)}
            </span>
          </div>
          <button
            type="button"
            onClick={handleBreakSync}
            className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-[#16A34A]/15 dark:bg-[#22C55E]/15 hover:bg-[#16A34A]/25 transition cursor-pointer shrink-0 flex items-center gap-1"
          >
            <span>Ayır</span>
            <X className="w-3 h-3" strokeWidth={1.75} />
          </button>
        </div>
      )}

      {/* 2. Ultra-Clean Acoustic Timeline Rail */}
      <div className="relative pt-9 pb-4 px-2">
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
          className="relative h-1.5 w-full rounded-full bg-[#EAE4DC] dark:bg-[#FFF0E1]/15 cursor-pointer transition group/rail"
          title="Şarkıda istediğin saniyeye atlamak için dokun"
        >
          {/* Analog Copper-Amber Played Track Progress */}
          <div
            className="h-full bg-gradient-to-r from-[#E87A3E] to-[#D97706] rounded-full transition-[width] duration-200"
            style={{ width: `${getPercent(mySecond)}%` }}
          />

          {/* Senkron Bağ Çizgisi */}
          {syncedUser && (
            <div
              className="absolute top-1/2 -translate-y-1/2 h-1.5 pointer-events-none z-15 flex items-center transition-all duration-300"
              style={{
                left: `${Math.min(getPercent(mySecond), getPercent(syncedUser.currentSecond))}%`,
                width: `${Math.max(2, Math.abs(getPercent(mySecond) - getPercent(syncedUser.currentSecond)))}%`,
              }}
            >
              <div className="w-full h-1 rounded-full bg-[#16A34A] dark:bg-[#22C55E]" />
            </div>
          )}

          {/* Clustered Listener Pins */}
          {clusters.map((cluster) => {
            const leftPct = getPercent(cluster.centerSecond);
            const isClusterActive = activeClusterId === cluster.id;
            const isCoinciding = coincidingCluster?.id === cluster.id;
            const isMultiUser = cluster.users.length > 1;
            const primaryUser = cluster.users[0];
            const hasSynced = syncedUser && cluster.users.some((u) => u.id === syncedUser.id);
            const hasRealUser = cluster.users.some((u) => u.isRealUser);

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
                {/* Signature Live Pulse Echo — subtle 1s acoustic ring when within ±3s */}
                {isCoinciding && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -inset-1 rounded-full border border-[#16A34A] dark:border-[#22C55E] animate-pulse-echo"
                  />
                )}

                {isMultiUser ? (
                  <div className="relative group/pin">
                    <div
                      className={`w-7 h-7 rounded-full bg-gradient-to-tr ${primaryUser.avatarGradient} border-2 ${
                        isCoinciding || hasSynced || hasRealUser
                          ? 'border-[#16A34A] dark:border-[#22C55E] ring-2 ring-[#22C55E]/30'
                          : isClusterActive
                          ? 'border-[#E87A3E]'
                          : 'border-white dark:border-[#171412]'
                      } flex items-center justify-center text-force-white text-[10px] font-bold relative z-10 shadow-sm`}
                    >
                      {primaryUser.avatarUrl ? (
                        <img
                          src={primaryUser.avatarUrl}
                          alt={primaryUser.name}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        primaryUser.avatarSeed
                      )}
                      <span className="absolute -top-2 -right-2.5 px-1.5 py-0.2 rounded-full bg-gradient-to-br from-[#E87A3E] to-[#D97706] text-white font-mono font-bold text-[9px] border border-white dark:border-[#171412] tabular-nums shadow-xs">
                        +{cluster.users.length - 1}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`w-7 h-7 rounded-full bg-gradient-to-tr ${primaryUser.avatarGradient} border-2 ${
                      isCoinciding || hasSynced || hasRealUser
                        ? 'border-[#16A34A] dark:border-[#22C55E] ring-2 ring-[#22C55E]/30'
                        : isClusterActive
                        ? 'border-[#E87A3E]'
                        : 'border-white dark:border-[#171412]'
                    } flex items-center justify-center text-force-white text-[10px] font-bold overflow-hidden shadow-sm`}
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

          {/* KULLANICININ KENDİ CANLI İBRESİ ("Sen") — Single Live Accent (#22C55E) */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-30 pointer-events-none"
            style={{ left: `${getPercent(mySecond)}%` }}
          >
            <div className="relative flex flex-col items-center">
              <div className="w-7 h-7 rounded-full bg-[#16A34A] dark:bg-[#22C55E] text-white dark:text-[#0E0C0B] text-[9px] font-extrabold shadow-[0_0_12px_rgba(34,197,94,0.45)] ring-2 ring-white dark:ring-[#171412] flex items-center justify-center relative z-10">
                Sen
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Signature Live Pulse Echo — Poetic single-line notice directly beneath the rail */}
      {coincidingCluster && echoLeadUser && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            triggerHaptic(12);
            setActiveClusterId(coincidingCluster.id);
          }}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#16A34A]/[0.07] dark:bg-[#22C55E]/[0.08] hover:bg-[#16A34A]/[0.12] dark:hover:bg-[#22C55E]/[0.14] border border-[#16A34A]/20 dark:border-[#22C55E]/20 text-left transition cursor-pointer"
        >
          <span className="flex items-center gap-2 text-xs text-[#181512] dark:text-[#FAF7F2] min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] dark:bg-[#22C55E] shrink-0" />
            <span className="truncate font-medium">
              {echoExtraCount > 0
                ? `Şu an ${echoLeadUser.name.split(' ')[0]} ve ${echoExtraCount} kişiyle aynı saniyedesin`
                : `Şu an ${echoLeadUser.name.split(' ')[0]} ile aynı saniyedesin`}
            </span>
          </span>
          <span className="text-[11px] font-mono tabular-nums text-[#16A34A] dark:text-[#22C55E] shrink-0">
            {formatTime(mySecond)}
          </span>
        </button>
      )}

      {/* 3. Selected Listener / Cluster Preview Card */}
      {activeCluster && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative rounded-2xl p-3.5 sm:p-4 space-y-3 bg-[#F2EDE6] dark:bg-[#211D1A] border border-[#E2D9CE] dark:border-[#FFF0E1]/[0.08] max-w-full"
        >
          <div
            className="absolute -top-1.5 w-3 h-3 bg-[#F2EDE6] dark:bg-[#211D1A] border-t border-l border-[#E2D9CE] dark:border-[#FFF0E1]/[0.08] rotate-45 -translate-x-1/2 pointer-events-none transition-all duration-200"
            style={{ left: `${Math.min(92, Math.max(8, getPercent(activeCluster.centerSecond)))}%` }}
          />

          {activeCluster.users.length > 1 && (
            <div className="flex items-center justify-between pb-2 border-b border-[#E2D9CE] dark:border-[#FFF0E1]/[0.08] text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-[#181512] dark:text-[#FAF7F2]">
                <Users className="w-3.5 h-3.5 text-[#6B635B] dark:text-[#A39A91]" strokeWidth={1.75} />
                <span>
                  <span className="font-mono tabular-nums">{formatTime(activeCluster.centerSecond)}</span> saniyesinde{' '}
                  {activeCluster.users.length} dinleyici
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveClusterId(null)}
                className="text-[#6B635B] dark:text-[#A39A91] hover:text-[#181512] dark:hover:text-[#FAF7F2] p-1 rounded-lg cursor-pointer"
                aria-label="Kapat"
              >
                <X className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
            </div>
          )}

          <div className="space-y-2.5 max-h-80 overflow-y-auto no-scrollbar">
            {activeCluster.users.map((user) => {
              const userTimeFormatted = formatTime(user.currentSecond);
              const quoteNote =
                user.statusBubble || `${userTimeFormatted} bölümünde dinliyor`;

              return (
                <div
                  key={user.id}
                  className="p-3 rounded-xl bg-white dark:bg-[#171412] border border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08] space-y-2.5"
                >
                  {/* Top Row */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div
                      onClick={() => onSelectUser(user)}
                      className="flex items-center gap-2.5 min-w-0 cursor-pointer group/u"
                    >
                      <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08]">
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
                        <span className="text-sm font-bold text-[#181512] dark:text-[#FAF7F2] group-hover/u:opacity-75 transition">
                          {user.name}, {user.age}
                        </span>

                        {user.isRealUser && (
                          <span className="px-1.5 py-0.5 rounded-md bg-[#16A34A]/15 dark:bg-[#22C55E]/15 text-[#16A34A] dark:text-[#22C55E] text-[10px] font-mono font-semibold flex items-center gap-1 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] dark:bg-[#22C55E]" />
                            <span>Canlı</span>
                          </span>
                        )}

                        <span className="px-1.5 py-0.5 rounded-md bg-[#16A34A]/10 dark:bg-[#22C55E]/15 text-[#16A34A] dark:text-[#22C55E] text-[10px] font-mono font-semibold flex items-center gap-1 shrink-0 tabular-nums">
                          <Shield className="w-2.5 h-2.5" strokeWidth={1.75} />
                          <span>{user.trustScore || 99}</span>
                        </span>

                        <span className="px-1.5 py-0.5 rounded-md bg-[#F2EDE6] dark:bg-[#211D1A] text-[#181512] dark:text-[#FAF7F2] text-[10px] font-mono font-semibold flex items-center gap-0.5 shrink-0 tabular-nums">
                          <Zap className="w-2.5 h-2.5 text-[#E87A3E]" strokeWidth={1.75} />
                          <span>%{user.compatibilityScore || 94}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="px-2 py-0.5 rounded-md bg-[#F2EDE6] dark:bg-[#211D1A] text-[#6B635B] dark:text-[#A39A91] text-[11px] font-mono tabular-nums font-medium">
                        {user.distanceKm} km
                      </span>
                      {activeCluster.users.length === 1 && (
                        <button
                          type="button"
                          onClick={() => setActiveClusterId(null)}
                          className="p-1 text-[#6B635B] dark:text-[#A39A91] hover:text-[#181512] dark:hover:text-[#FAF7F2] rounded-lg cursor-pointer"
                          aria-label="Kapat"
                        >
                          <X className="w-3.5 h-3.5" strokeWidth={1.75} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Location & Quote */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5 text-[#6B635B] dark:text-[#A39A91] font-medium">
                      <MapPin className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                      <span>{user.city}</span>
                    </div>
                    <p className="text-xs italic text-[#181512] dark:text-[#FAF7F2] bg-[#F2EDE6]/80 dark:bg-[#211D1A] px-2.5 py-1.5 rounded-lg border border-[#E2D9CE] dark:border-[#FFF0E1]/[0.06]">
                      "{quoteNote}"
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => handleSyncWithUser(user)}
                      className="studio-btn-primary py-2 px-2.5 rounded-xl bg-gradient-to-br from-[#E87A3E] to-[#D97706] hover:brightness-105 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 shadow-lg shadow-amber-950/20"
                    >
                      <Link2 className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                      <span className="truncate font-mono tabular-nums">
                        {userTimeFormatted} Anına Katıl
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
                      className="py-2 px-2.5 rounded-xl bg-[#F2EDE6] hover:bg-[#E8E0D5] dark:bg-[#211D1A] dark:hover:bg-[#FFF0E1]/10 text-[#181512] dark:text-[#FAF7F2] border border-[#E2D9CE] dark:border-[#FFF0E1]/[0.08] font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
                    >
                      <MessageCircle className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                      <span>Mesaj Gönder</span>
                    </button>
                  </div>

                  {/* Whisper Next Track */}
                  {onWhisperTrack && (
                    <div className="pt-0.5">
                      <button
                        type="button"
                        onClick={() =>
                          setWhisperUserId(whisperUserId === user.id ? null : user.id)
                        }
                        className="w-full py-1.5 px-2.5 rounded-xl text-[11px] font-medium flex items-center justify-between gap-1.5 bg-[#F2EDE6]/80 dark:bg-[#211D1A] text-[#6B635B] dark:text-[#A39A91] hover:text-[#181512] dark:hover:text-[#FAF7F2] transition cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5">
                          <Headphones className="w-3.5 h-3.5" strokeWidth={1.75} />
                          <span>Sıradaki Şarkıyı Öner</span>
                        </div>
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform ${
                            whisperUserId === user.id ? 'rotate-180' : ''
                          }`}
                          strokeWidth={1.75}
                        />
                      </button>

                      {whisperUserId === user.id && (
                        <div className="mt-1.5 p-2 rounded-xl bg-[#FAF8F4] dark:bg-[#0E0C0B] border border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08] space-y-1.5">
                          {whisperedNotice?.userId === user.id && (
                            <div className="p-1.5 rounded-lg bg-[#16A34A]/15 dark:bg-[#22C55E]/15 text-[#16A34A] dark:text-[#22C55E] text-[11px] font-semibold flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5" strokeWidth={1.75} />
                              <span className="truncate">
                                "{whisperedNotice.songTitle}" önerildi
                              </span>
                            </div>
                          )}
                          {whisperSuggestions.map((cand) => (
                            <div
                              key={cand.id}
                              onClick={() => handleWhisperCandidate(user, cand)}
                              className="p-1.5 rounded-lg hover:bg-[#F2EDE6] dark:hover:bg-[#211D1A] flex items-center justify-between gap-2 cursor-pointer transition"
                            >
                              <div className="min-w-0">
                                <div className="text-[11px] font-semibold text-[#181512] dark:text-[#FAF7F2] truncate">
                                  {cand.title}
                                </div>
                                <div className="text-[10px] text-[#6B635B] dark:text-[#A39A91] truncate">
                                  {cand.artist}
                                </div>
                              </div>
                              <span className="px-2 py-0.5 rounded-md bg-[#F2EDE6] dark:bg-[#211D1A] text-[#181512] dark:text-[#FAF7F2] font-semibold text-[10px] shrink-0 flex items-center gap-1">
                                <span>Öner</span>
                                <Send className="w-2.5 h-2.5" strokeWidth={1.75} />
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
    </div>
  );
};
