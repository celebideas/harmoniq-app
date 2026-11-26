import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
import { sanitizeFormattedLocation } from '../services/locationService';

interface Props {
  user: LoungeUser | null;
  song: Song | null;
  onClose: () => void;
  onSendFrequency: (user: LoungeUser, icebreakerText?: string) => void;
  onToggleFriend?: (user: LoungeUser) => void;
  onAcceptIncomingRequest?: (user: LoungeUser) => void;
  themeMode?: 'dark' | 'light';
}

const stripStrayEmojis = (text: string) =>
  text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').replace(/\s{2,}/g, ' ').trim();

export const MiniProfileDrawer: React.FC<Props> = ({
  user,
  song,
  onClose,
  onSendFrequency,
  onToggleFriend,
  onAcceptIncomingRequest,
  themeMode,
}) => {
  const [friendActionSent, setFriendActionSent] = useState(false);
  const [hasLikedStatus, setHasLikedStatus] = useState(user?.hasLikedStatus || false);
  const [statusLikesCount, setStatusLikesCount] = useState(user?.statusLikesCount || 8);
  const [coverError, setCoverError] = useState(false);

  const displaySong = user?.currentSong || song;

  useEffect(() => {
    setHasLikedStatus(user?.hasLikedStatus || false);
    setStatusLikesCount(user?.statusLikesCount || 8);
    setFriendActionSent(false);
  }, [user?.id]);

  useEffect(() => {
    setCoverError(false);
  }, [displaySong?.coverUrl, displaySong?.id]);

  if (!user) return null;

  const isLight =
    themeMode === 'light' ||
    (!themeMode &&
      typeof document !== 'undefined' &&
      document.documentElement.classList.contains('light'));

  const displayCity = sanitizeFormattedLocation(user.city);
  const cleanedStatusBubble = user.statusBubble ? stripStrayEmojis(user.statusBubble) : '';

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getPlatformLabel = (p: string) => {
    switch (p) {
      case 'youtube_music':
        return { name: 'YouTube Music', color: isLight ? 'text-rose-600' : 'text-rose-400' };
      case 'spotify':
        return { name: 'Spotify', color: isLight ? 'text-emerald-700' : 'text-emerald-400' };
      case 'apple_music':
        return { name: 'Apple Music', color: isLight ? 'text-pink-600' : 'text-pink-400' };
      default:
        return { name: 'ListenHub', color: isLight ? 'text-[#63636B]' : 'text-[#8E8E98]' };
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

  const drawerContent = (
    <div
      className="fixed inset-0 z-[125] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-backdrop-enter select-none"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-lg rounded-t-[28px] sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[86vh] overflow-y-auto no-scrollbar pb-[max(1.5rem,env(safe-area-inset-bottom))] border animate-modal-enter ${
          isLight
            ? 'bg-white border-[#E6E4DF] text-[#111113]'
            : 'bg-[#141418] border-white/[0.08] text-[#F5F5F7]'
        }`}
      >
        <div
          className={`sm:hidden w-10 h-1 rounded-full mx-auto -mt-1 mb-3 ${
            isLight ? 'bg-[#111113]/15' : 'bg-white/20'
          }`}
        />

        {/* Top Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative shrink-0">
              <div
                className={`avatar-circle w-14 h-14 rounded-full bg-gradient-to-tr ${user.avatarGradient} flex items-center justify-center text-white font-bold text-lg shadow-md overflow-hidden ${
                  user.isOnline
                    ? `ring-[1.5px] ring-emerald-500/80 ring-offset-2 ${
                        isLight ? 'ring-offset-white' : 'ring-offset-[#141418]'
                      }`
                    : isLight
                    ? 'ring-1 ring-black/10'
                    : 'ring-1 ring-white/10'
                }`}
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                ) : (
                  user.avatarSeed
                )}
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3
                  className={`text-lg font-heading font-bold tracking-tight truncate ${
                    isLight ? 'text-[#111113]' : 'text-[#F5F5F7]'
                  }`}
                >
                  {user.name}
                  {!user.isRealUser && user.age ? `, ${user.age}` : ''}
                </h3>
                {user.isRealUser && (
                  <span
                    className={`text-[11px] font-bold tracking-wide ${
                      isLight ? 'text-[#16A34A]' : 'text-[#22C55E]'
                    }`}
                  >
                    · Gerçek Üye
                  </span>
                )}
              </div>

              <div
                className={`text-xs mt-0.5 flex items-center gap-1.5 flex-wrap ${
                  isLight ? 'text-[#63636B]' : 'text-[#8E8E98]'
                }`}
              >
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

              <div
                className={`text-xs mt-1 flex items-center gap-1.5 ${
                  isLight ? 'text-[#63636B]' : 'text-[#8E8E98]'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 shrink-0 text-[#111113] dark:text-[#F5F5F7]" />
                <span className="truncate">{displayCity}</span>
                {!user.isRealUser && (
                  <>
                    <span>·</span>
                    <span
                      className={`font-semibold shrink-0 tabular-nums ${
                        isLight ? 'text-[#111113]' : 'text-[#F5F5F7]'
                      }`}
                    >
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
              className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-transform duration-100 ease-out active:scale-[0.96] min-h-[42px] cursor-pointer ${
                isFriends
                  ? isLight
                    ? 'bg-emerald-500/12 border-emerald-500/30 text-emerald-700'
                    : 'bg-emerald-500/12 border-emerald-500/30 text-emerald-400'
                  : isPendingReceived
                  ? 'studio-btn-primary bg-[#111113] dark:bg-white text-white dark:text-[#0B0B0D] border-[#111113]/35 dark:border-white/35 font-semibold'
                  : isPendingSent
                  ? isLight
                    ? 'bg-[#111113]/[0.08] dark:bg-white/[0.10] border-[#111113]/25 dark:border-white/25 text-[#111113]'
                    : 'bg-[#111113]/[0.08] dark:bg-white/[0.10] border-[#111113]/25 dark:border-white/25 text-[#F5F5F7]'
                  : isLight
                  ? 'bg-[#F1EFEA] hover:bg-[#E6E4DF] border-[#E2DFD9] text-[#111113]'
                  : 'bg-[#1C1C22] hover:bg-[#24242C] border-white/10 text-[#F5F5F7]'
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
                  <UserCheck className="w-3.5 h-3.5 text-[#16A34A] dark:text-[#22C55E]" />
                  <span>Arkadaşsınız</span>
                </>
              ) : isPendingReceived ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Kabul Et</span>
                </>
              ) : isPendingSent ? (
                <>
                  <Clock className="w-3.5 h-3.5 text-[#111113] dark:text-[#F5F5F7]" />
                  <span>İstek Yollandı</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5 text-[#111113] dark:text-[#F5F5F7]" />
                  <span>Arkadaş Ekle</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-xl active:scale-[0.96] transition-transform duration-100 ease-out min-w-[42px] min-h-[42px] flex items-center justify-center cursor-pointer ${
                isLight
                  ? 'text-[#63636B] hover:text-[#111113] hover:bg-[#F1EFEA]'
                  : 'text-[#8E8E98] hover:text-[#F5F5F7] hover:bg-[#1C1C22]'
              }`}
              aria-label="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Current Playback Card */}
        <div
          className={`p-4 rounded-2xl border space-y-3 ${
            isLight
              ? 'bg-[#FAF9F6] border-[#E6E4DF]'
              : 'bg-[#1C1C22] border-white/[0.07]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl overflow-hidden border shrink-0 shadow-sm ${
                isLight ? 'border-[#E6E4DF]' : 'border-white/10'
              }`}
            >
              {displaySong?.coverUrl && !coverError ? (
                <img
                  src={displaySong.coverUrl}
                  alt={displaySong.album || displaySong.title}
                  onError={() => setCoverError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className={`w-full h-full bg-gradient-to-br ${
                    displaySong?.coverGradient || 'from-zinc-700 to-zinc-900'
                  } flex items-center justify-center text-white`}
                >
                  <Music className="w-5 h-5" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between text-xs">
                <span className={`font-medium ${isLight ? 'text-[#63636B]' : 'text-[#8E8E98]'}`}>
                  Şarkıdaki Konumu
                </span>
                <span
                  className={`font-mono font-bold text-sm tabular-nums ${
                    isLight ? 'text-[#111113]' : 'text-[#F5F5F7]'
                  }`}
                >
                  {formatTime(user.currentSecond)} / {formatTime(displaySong?.durationSeconds || 220)}
                </span>
              </div>
              <div
                className={`text-xs font-semibold truncate mt-0.5 ${
                  isLight ? 'text-[#111113]' : 'text-[#F5F5F7]'
                }`}
              >
                {displaySong?.title || 'Canlı Dinleme'}
              </div>
              <div className={`text-[11px] truncate ${isLight ? 'text-[#63636B]' : 'text-[#8E8E98]'}`}>
                {displaySong ? `${displaySong.artist} · ${displaySong.genre}` : 'ListenHub Ağı'}
              </div>
            </div>
          </div>

          {cleanedStatusBubble && (
            <div
              className={`p-3 rounded-2xl border space-y-2 ${
                isLight
                  ? 'bg-white border-[#E6E4DF]'
                  : 'bg-[#141418] border-white/[0.07]'
              }`}
            >
              <p
                className={`text-xs font-medium leading-relaxed ${
                  isLight ? 'text-[#111113]' : 'text-[#F5F5F7]'
                }`}
              >
                &ldquo;{cleanedStatusBubble}&rdquo;
              </p>
              <div
                className={`flex items-center justify-between pt-2 border-t ${
                  isLight ? 'border-[#E6E4DF]' : 'border-white/[0.06]'
                }`}
              >
                <span
                  className={`text-[11px] tabular-nums ${
                    isLight ? 'text-[#63636B]' : 'text-[#8E8E98]'
                  }`}
                >
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
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-transform duration-100 ease-out active:scale-[0.96] cursor-pointer ${
                    hasLikedStatus
                      ? 'studio-btn-primary bg-[#111113] dark:bg-white text-white dark:text-[#0B0B0D] shadow-sm'
                      : isLight
                      ? 'bg-[#F1EFEA] hover:bg-[#E6E4DF] text-[#111113]'
                      : 'bg-[#1C1C22] hover:bg-[#24242C] text-[#F5F5F7]'
                  }`}
                >
                  <span>{hasLikedStatus ? 'Katıldın' : '+1 Katılıyorum'}</span>
                  <span className="tabular-nums">({statusLikesCount})</span>
                </button>
              </div>
            </div>
          )}

          <div
            className={`flex items-center justify-between text-[11px] pt-0.5 ${
              isLight ? 'text-[#63636B]' : 'text-[#8E8E98]'
            }`}
          >
            <span className="truncate">{displaySong?.album || 'ListenHub'}</span>
            <span
              className={`flex items-center gap-1.5 font-medium shrink-0 ${
                isLight ? 'text-[#16A34A]' : 'text-[#22C55E]'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isLight ? 'bg-[#16A34A]' : 'bg-[#22C55E]'
                }`}
              />
              {user.isOnline ? 'Canlı Dinliyor' : 'Yakın zamanda aktifti'}
            </span>
          </div>
        </div>

        {/* Personalized Taste Compatibility Bar (Pure Studio Monochrome) */}
        <div
          className={`p-3.5 rounded-2xl border space-y-2 ${
            isLight
              ? 'bg-[#F1EFEA] border-[#E2DFD9]'
              : 'bg-[#1C1C22] border-white/[0.08]'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span
              className={`font-bold flex items-center gap-1.5 ${
                isLight ? 'text-[#111113]' : 'text-[#F5F5F7]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#111113] dark:text-[#F5F5F7]" />
              <span>Müzik Frekansı Uyumu</span>
            </span>
            <span
              className={`font-extrabold tabular-nums text-xs ${
                isLight ? 'text-[#111113]' : 'text-[#F5F5F7]'
              }`}
            >
              %{user.compatibilityScore || 94} Eşleşme
            </span>
          </div>

          <div
            className={`w-full h-1.5 rounded-full overflow-hidden ${
              isLight ? 'bg-[#E6E4DF]' : 'bg-white/10'
            }`}
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isLight ? 'bg-[#111113]' : 'bg-white'
              }`}
              style={{ width: `${user.compatibilityScore || 94}%` }}
            />
          </div>

          <div
            className={`text-[11px] flex items-center gap-1 ${
              isLight ? 'text-[#63636B]' : 'text-[#8E8E98]'
            }`}
          >
            <span className={`font-semibold shrink-0 ${isLight ? 'text-[#111113]' : 'text-[#F5F5F7]'}`}>
              Ortak Frekans:
            </span>
            <span className={`font-medium truncate ${isLight ? 'text-[#111113]' : 'text-[#F5F5F7]'}`}>
              {user.sharedWithUserArtists && user.sharedWithUserArtists.length > 0
                ? user.sharedWithUserArtists.join(', ')
                : user.topGenres && user.topGenres.length > 0
                ? user.topGenres.join(', ')
                : user.topArtists.slice(0, 3).join(', ')}
            </span>
          </div>
        </div>

        {/* Bio */}
        <p className={`text-xs leading-relaxed ${isLight ? 'text-[#4B443E]' : 'text-[#D6CFC7]'}`}>
          {user.bio}
        </p>

        {/* Shared Artists / Genres */}
        {(user.topGenres?.length || user.topArtists.length) > 0 && (
          <div className="space-y-1.5 text-xs">
            <span className={`text-xs font-semibold ${isLight ? 'text-[#63636B]' : 'text-[#8E8E98]'}`}>
              {user.topGenres && user.topGenres.length > 0
                ? 'Favori Türler & Sanatçılar'
                : 'Favori Sanatçılar'}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(user.topGenres && user.topGenres.length > 0 ? user.topGenres : user.topArtists).map(
                (item, idx) => (
                  <span
                    key={idx}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-medium ${
                      isLight
                        ? 'bg-[#FAF9F6] border-[#E6E4DF] text-[#111113]'
                        : 'bg-[#1C1C22] border-white/[0.08] text-[#F5F5F7]'
                    }`}
                  >
                    {item}
                  </span>
                )
              )}
            </div>
          </div>
        )}

        {/* Müzikal Buzkırıcılar */}
        <div
          className={`space-y-2 pt-3 border-t ${
            isLight ? 'border-[#E6E4DF]' : 'border-white/[0.08]'
          }`}
        >
          <span
            className={`text-xs font-semibold block ${
              isLight ? 'text-[#63636B]' : 'text-[#8E8E98]'
            }`}
          >
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
              className={`p-3 rounded-xl border text-left transition-transform duration-100 ease-out active:scale-[0.96] font-medium min-h-[44px] cursor-pointer ${
                isLight
                  ? 'bg-[#FAF9F6] hover:bg-[#F1EFEA] border-[#E6E4DF] hover:border-[#111113]/30 dark:hover:border-white/30 text-[#111113]'
                  : 'bg-[#1C1C22] hover:bg-[#24242C] border-white/[0.08] hover:border-[#111113]/30 dark:hover:border-white/30 text-[#F5F5F7]'
              }`}
            >
              &ldquo;Bu saniyede ben de varım!&rdquo;
            </button>
            <button
              type="button"
              onClick={() =>
                onSendFrequency(user, 'Bu şarkı bittikten sonra sıradaki parçayı sen önerir misin?')
              }
              className={`p-3 rounded-xl border text-left transition-transform duration-100 ease-out active:scale-[0.96] font-medium min-h-[44px] cursor-pointer ${
                isLight
                  ? 'bg-[#FAF9F6] hover:bg-[#F1EFEA] border-[#E6E4DF] hover:border-[#111113]/30 dark:hover:border-white/30 text-[#111113]'
                  : 'bg-[#1C1C22] hover:bg-[#24242C] border-white/[0.08] hover:border-[#111113]/30 dark:hover:border-white/30 text-[#F5F5F7]'
              }`}
            >
              &ldquo;Sıradaki şarkıyı sen öner&rdquo;
            </button>
          </div>
        </div>

        {/* Primary CTA (Warm Copper / Amber) */}
        <button
          type="button"
          onClick={() => onSendFrequency(user)}
          className="studio-btn-primary w-full py-3.5 px-4 rounded-xl bg-[#111113] dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-[#0B0B0D] font-semibold text-xs uppercase tracking-wider transition-transform duration-100 ease-out flex items-center justify-center gap-2 shadow-sm active:scale-[0.96] min-h-[48px] cursor-pointer"
        >
          <Radio className="w-4 h-4 stroke-[2.25]" />
          <span>Frekans Gönder ve Sohbeti Aç</span>
        </button>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(drawerContent, document.body) : drawerContent;
};
