import React, { useState, useEffect } from 'react';
import {
  X,
  Radio,
  MapPin,
  Music,
  Sparkles,
  UserPlus,
  UserCheck,
  Clock,
  Lock,
  Globe,
  Check,
} from 'lucide-react';
import { LoungeUser, Song } from '../types';

interface Props {
  user: LoungeUser | null;
  song: Song;
  onClose: () => void;
  onSendFrequency: (user: LoungeUser, icebreakerText?: string) => void;
  onToggleFriend?: (user: LoungeUser) => void;
  onAcceptIncomingRequest?: (user: LoungeUser) => void;
}

export const MiniProfileDrawer: React.FC<Props> = ({
  user,
  song,
  onClose,
  onSendFrequency,
  onToggleFriend,
  onAcceptIncomingRequest,
}) => {
  const [friendActionSent, setFriendActionSent] = useState(false);
  const [hasLikedStatus, setHasLikedStatus] = useState(user?.hasLikedStatus || false);
  const [statusLikesCount, setStatusLikesCount] = useState(user?.statusLikesCount || 8);

  useEffect(() => {
    setHasLikedStatus(user?.hasLikedStatus || false);
    setStatusLikesCount(user?.statusLikesCount || 8);
    setFriendActionSent(false);
  }, [user?.id]);

  if (!user) return null;

  const displaySong = user.currentSong || song;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getPlatformLabel = (p: string) => {
    switch (p) {
      case 'youtube_music':
        return { name: 'YouTube Music', color: 'text-red-500 dark:text-red-400' };
      case 'spotify':
        return { name: 'Spotify', color: 'text-emerald-600 dark:text-emerald-400' };
      case 'apple_music':
        return { name: 'Apple Music', color: 'text-pink-600 dark:text-pink-400' };
      default:
        return { name: 'ListenHub', color: 'text-zinc-500 dark:text-zinc-400' };
    }
  };

  const platformInfo = getPlatformLabel(user.platform);

  const handleFriendClick = () => {
    if (user.friendStatus === 'pending_received' && onAcceptIncomingRequest) {
      onAcceptIncomingRequest(user);
      return;
    }
    if (onToggleFriend) {
      onToggleFriend(user);
      if (user.friendStatus === 'none') {
        setFriendActionSent(true);
        setTimeout(() => setFriendActionSent(false), 1800);
      }
    }
  };

  const isPendingSent = user.friendStatus === 'pending' || friendActionSent;
  const isPendingReceived = user.friendStatus === 'pending_received';
  const isFriends = user.friendStatus === 'friends';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-white dark:bg-[#0E0D15] border border-[#E4E2EC] dark:border-white/[0.08] rounded-t-[28px] sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[86vh] overflow-y-auto no-scrollbar pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <div className="sm:hidden w-10 h-1 bg-zinc-300 dark:bg-white/20 rounded-full mx-auto -mt-1 mb-3" />

        {/* Top Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative shrink-0">
              <div
                className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${user.avatarGradient} flex items-center justify-center text-white font-bold text-lg ring-1 ring-black/10 dark:ring-white/10 shadow-lg overflow-hidden`}
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  user.avatarSeed
                )}
              </div>
              {user.isOnline && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-[#0E0D15]" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-heading font-bold text-zinc-900 dark:text-white tracking-tight truncate">
                  {user.name}
                  {!user.isRealUser && user.age ? `, ${user.age}` : ''}
                </h3>
                {user.isRealUser && (
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 tracking-wide">
                    · Gerçek Üye
                  </span>
                )}
              </div>

              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                {user.handle && <span className="font-mono text-[11px]">{user.handle}</span>}
                {user.handle && <span>·</span>}
                <span className={`font-medium ${platformInfo.color}`}>{platformInfo.name}</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  {user.privacyMode === 'private' ? (
                    <>
                      <Lock className="w-3 h-3" />
                      <span>Gizli</span>
                    </>
                  ) : (
                    <>
                      <Globe className="w-3 h-3" />
                      <span>Açık</span>
                    </>
                  )}
                </span>
              </div>

              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="truncate">{user.city}</span>
                {!user.isRealUser && (
                  <>
                    <span>·</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold shrink-0 tabular-nums">
                      {user.distanceKm} km yakında
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleFriendClick}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 min-h-[44px] cursor-pointer ${
                isFriends
                  ? 'bg-emerald-500/12 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : isPendingReceived
                  ? 'bg-emerald-500 text-zinc-950 border-emerald-400 font-bold'
                  : isPendingSent
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300'
                  : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-white/[0.07] dark:hover:bg-white/[0.12] border-zinc-200 dark:border-white/[0.1] text-zinc-900 dark:text-white'
              }`}
              title={
                isFriends
                  ? 'Arkadaşlıktan çıkarmak için tıkla'
                  : isPendingReceived
                  ? 'Arkadaşlık isteğini kabul et'
                  : isPendingSent
                  ? 'Gönderilen isteği geri çek'
                  : 'Arkadaşlık isteği gönder'
              }
            >
              {isFriends ? (
                <>
                  <UserCheck className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                  <span>Arkadaşsınız</span>
                </>
              ) : isPendingReceived ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Kabul Et</span>
                </>
              ) : isPendingSent ? (
                <>
                  <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  <span>İstek Yollandı</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Arkadaş Ekle</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white rounded-xl hover:bg-zinc-100 dark:hover:bg-white/[0.06] active:scale-95 transition min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
              aria-label="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Current Playback Sensation */}
        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950/90 border border-[#E4E2EC] dark:border-white/[0.07] space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-900 border border-black/10 dark:border-white/10 shrink-0 shadow-md">
              {displaySong.coverUrl ? (
                <img
                  src={displaySong.coverUrl}
                  alt={displaySong.album}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className={`w-full h-full bg-gradient-to-tr ${displaySong.coverGradient} flex items-center justify-center text-white`}
                >
                  <Music className="w-5 h-5" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500 dark:text-zinc-400 font-medium">Şarkıdaki Konumu</span>
                <span className="text-amber-600 dark:text-amber-400 font-bold text-sm tabular-nums">
                  {formatTime(user.currentSecond)} / {formatTime(displaySong.durationSeconds || 220)}
                </span>
              </div>
              <div className="text-xs font-semibold text-zinc-900 dark:text-white truncate mt-0.5">
                {displaySong.title}
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                {displaySong.artist} · {displaySong.genre}
              </div>
            </div>
          </div>

          {user.statusBubble && (
            <div className="bg-white dark:bg-zinc-900/90 p-3 rounded-2xl border border-[#E4E2EC] dark:border-white/[0.06] space-y-2">
              <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                "{user.statusBubble}"
              </p>
              <div className="flex items-center justify-between pt-1.5 border-t border-zinc-200 dark:border-white/[0.06]">
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                  {statusLikesCount} dinleyici katıldı
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (hasLikedStatus) {
                      setHasLikedStatus(false);
                      setStatusLikesCount((prev) => Math.max(0, prev - 1));
                    } else {
                      setHasLikedStatus(true);
                      setStatusLikesCount((prev) => prev + 1);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    hasLikedStatus
                      ? 'bg-emerald-400 text-zinc-950 shadow'
                      : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-zinc-800 dark:text-zinc-200'
                  }`}
                >
                  <span>{hasLikedStatus ? 'Katıldın' : '+1 Katılıyorum'}</span>
                  <span className="tabular-nums">({statusLikesCount})</span>
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 pt-0.5">
            <span className="truncate">{displaySong.album}</span>
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-medium shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {user.isOnline ? 'Canlı Dinliyor' : 'Yakın zamanda aktifti'}
            </span>
          </div>
        </div>

        {/* Personalized Taste Compatibility Bar */}
        <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-500/25 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-900 dark:text-white font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
              <span>Müzik Frekansı Uyumu</span>
            </span>
            <span className="text-emerald-700 dark:text-emerald-300 font-extrabold tabular-nums text-xs">
              %{user.compatibilityScore || 94} Eşleşme
            </span>
          </div>

          <div className="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-lime-400 rounded-full transition-all duration-500"
              style={{ width: `${user.compatibilityScore || 94}%` }}
            />
          </div>

          <div className="text-[11px] text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
            <span className="text-emerald-700 dark:text-emerald-400 font-medium">Ortak Frekans:</span>
            <span className="text-zinc-800 dark:text-zinc-200 font-medium truncate">
              {user.sharedWithUserArtists && user.sharedWithUserArtists.length > 0
                ? user.sharedWithUserArtists.join(', ')
                : user.topGenres && user.topGenres.length > 0
                ? user.topGenres.join(', ')
                : user.topArtists.slice(0, 3).join(', ')}
            </span>
          </div>
        </div>

        {/* Bio */}
        <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">{user.bio}</p>

        {/* Shared Artists / Genres */}
        {(user.topGenres?.length || user.topArtists.length) > 0 && (
          <div className="space-y-1.5 text-xs">
            <span className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold">
              {user.topGenres && user.topGenres.length > 0 ? 'Favori Türler & Sanatçılar' : 'Favori Sanatçılar'}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(user.topGenres && user.topGenres.length > 0 ? user.topGenres : user.topArtists).map(
                (item, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-white/[0.05] border border-zinc-200 dark:border-white/[0.08] text-zinc-800 dark:text-zinc-200 text-xs font-medium"
                  >
                    {item}
                  </span>
                )
              )}
            </div>
          </div>
        )}

        {/* Müzikal Buzkırıcılar */}
        <div className="space-y-2 pt-2 border-t border-[#E4E2EC] dark:border-white/[0.06]">
          <span className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold block">
            Hızlı Müzikal Buzkırıcı
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() =>
                onSendFrequency(
                  user,
                  `Ben de ${formatTime(user.currentSecond)} saniyesindeyim, harika zamanlama!`
                )
              }
              className="p-3 rounded-xl bg-zinc-50 hover:bg-zinc-100 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-zinc-200 dark:border-white/[0.08] hover:border-emerald-500/40 text-left text-zinc-800 dark:text-zinc-200 transition active:scale-[0.98] font-medium min-h-[44px] cursor-pointer"
            >
              "Bu saniyede ben de varım!"
            </button>
            <button
              type="button"
              onClick={() =>
                onSendFrequency(user, 'Bu şarkı bittikten sonra sıradaki parçayı sen önerir misin?')
              }
              className="p-3 rounded-xl bg-zinc-50 hover:bg-zinc-100 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-zinc-200 dark:border-white/[0.08] hover:border-emerald-500/40 text-left text-zinc-800 dark:text-zinc-200 transition active:scale-[0.98] font-medium min-h-[44px] cursor-pointer"
            >
              "Sıradaki şarkıyı sen öner"
            </button>
          </div>
        </div>

        {/* Primary CTA */}
        <button
          type="button"
          onClick={() => onSendFrequency(user)}
          className="w-full py-3.5 px-4 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 min-h-[48px] cursor-pointer"
        >
          <Radio className="w-4 h-4 stroke-[2.5]" />
          <span>Frekans Gönder ve Sohbeti Aç</span>
        </button>
      </div>
    </div>
  );
};
