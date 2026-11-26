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
import { sanitizeFormattedLocation } from '../services/locationService';

interface Props {
  user: LoungeUser | null;
  song: Song;
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
  }, [displaySong.coverUrl, displaySong.id]);

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
        return { name: 'ListenHub', color: isLight ? 'text-[#6B635B]' : 'text-[#A39A91]' };
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
        className={`relative w-full max-w-lg rounded-t-[28px] sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[86vh] overflow-y-auto no-scrollbar pb-[max(1.5rem,env(safe-area-inset-bottom))] border ${
          isLight
            ? 'bg-white border-[#EAE4DC] text-[#181512]'
            : 'bg-[#171412] border-[#FFF0E1]/[0.08] text-[#FAF7F2]'
        }`}
      >
        <div
          className={`sm:hidden w-10 h-1 rounded-full mx-auto -mt-1 mb-3 ${
            isLight ? 'bg-[#181512]/15' : 'bg-[#FFF0E1]/20'
          }`}
        />

        {/* Top Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative shrink-0">
              <div
                className={`avatar-circle w-14 h-14 rounded-2xl bg-gradient-to-tr ${user.avatarGradient} flex items-center justify-center text-white font-bold text-lg ring-1 shadow-md overflow-hidden ${
                  isLight ? 'ring-black/10' : 'ring-[#FFF0E1]/10'
                }`}
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  user.avatarSeed
                )}
              </div>
              {user.isOnline && (
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ring-2 ${
                    isLight ? 'bg-[#16A34A] ring-white' : 'bg-[#22C55E] ring-[#171412]'
                  }`}
                />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3
                  className={`text-lg font-heading font-bold tracking-tight truncate ${
                    isLight ? 'text-[#181512]' : 'text-[#FAF7F2]'
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
                  isLight ? 'text-[#6B635B]' : 'text-[#A39A91]'
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
                  isLight ? 'text-[#6B635B]' : 'text-[#A39A91]'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 shrink-0 text-[#E87A3E]" />
                <span className="truncate">{displayCity}</span>
                {!user.isRealUser && (
                  <>
                    <span>·</span>
                    <span
                      className={`font-semibold shrink-0 tabular-nums ${
                        isLight ? 'text-[#D96B2C]' : 'text-[#F49A5E]'
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
              className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 min-h-[42px] cursor-pointer ${
                isFriends
                  ? isLight
                    ? 'bg-emerald-500/12 border-emerald-500/30 text-emerald-700'
                    : 'bg-emerald-500/12 border-emerald-500/30 text-emerald-400'
                  : isPendingReceived
                  ? 'studio-btn-primary bg-gradient-to-br from-[#E87A3E] to-[#D97706] text-white border-[#E87A3E] font-semibold'
                  : isPendingSent
                  ? isLight
                    ? 'bg-[#E87A3E]/15 border-[#E87A3E]/35 text-[#D96B2C]'
                    : 'bg-[#E87A3E]/15 border-[#E87A3E]/35 text-[#F49A5E]'
                  : isLight
                  ? 'bg-[#F2EDE6] hover:bg-[#EAE4DC] border-[#E2D9CE] text-[#181512]'
                  : 'bg-[#211D1A] hover:bg-[#2B2521] border-[#FFF0E1]/10 text-[#FAF7F2]'
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
                  <Clock className="w-3.5 h-3.5 text-[#E87A3E]" />
                  <span>İstek Yollandı</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5 text-[#E87A3E]" />
                  <span>Arkadaş Ekle</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-xl active:scale-95 transition min-w-[42px] min-h-[42px] flex items-center justify-center cursor-pointer ${
                isLight
                  ? 'text-[#6B635B] hover:text-[#181512] hover:bg-[#F2EDE6]'
                  : 'text-[#A39A91] hover:text-[#FAF7F2] hover:bg-[#211D1A]'
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
              ? 'bg-[#FAF8F4] border-[#EAE4DC]'
              : 'bg-[#211D1A] border-[#FFF0E1]/[0.07]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl overflow-hidden border shrink-0 shadow-sm ${
                isLight ? 'border-[#EAE4DC]' : 'border-[#FFF0E1]/10'
              }`}
            >
              {displaySong.coverUrl && !coverError ? (
                <img
                  src={displaySong.coverUrl}
                  alt={displaySong.album || displaySong.title}
                  onError={() => setCoverError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className={`w-full h-full bg-gradient-to-br ${
                    displaySong.coverGradient || 'from-[#E87A3E] to-[#D97706]'
                  } flex items-center justify-center text-white`}
                >
                  <Music className="w-5 h-5" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between text-xs">
                <span className={`font-medium ${isLight ? 'text-[#6B635B]' : 'text-[#A39A91]'}`}>
                  Şarkıdaki Konumu
                </span>
                <span
                  className={`font-mono font-bold text-sm tabular-nums ${
                    isLight ? 'text-[#D96B2C]' : 'text-[#F49A5E]'
                  }`}
                >
                  {formatTime(user.currentSecond)} / {formatTime(displaySong.durationSeconds || 220)}
                </span>
              </div>
              <div
                className={`text-xs font-semibold truncate mt-0.5 ${
                  isLight ? 'text-[#181512]' : 'text-[#FAF7F2]'
                }`}
              >
                {displaySong.title}
              </div>
              <div className={`text-[11px] truncate ${isLight ? 'text-[#6B635B]' : 'text-[#A39A91]'}`}>
                {displaySong.artist} · {displaySong.genre}
              </div>
            </div>
          </div>

          {cleanedStatusBubble && (
            <div
              className={`p-3 rounded-2xl border space-y-2 ${
                isLight
                  ? 'bg-white border-[#EAE4DC]'
                  : 'bg-[#171412] border-[#FFF0E1]/[0.07]'
              }`}
            >
              <p
                className={`text-xs font-medium leading-relaxed ${
                  isLight ? 'text-[#181512]' : 'text-[#FAF7F2]'
                }`}
              >
                &ldquo;{cleanedStatusBubble}&rdquo;
              </p>
              <div
                className={`flex items-center justify-between pt-2 border-t ${
                  isLight ? 'border-[#EAE4DC]' : 'border-[#FFF0E1]/[0.06]'
                }`}
              >
                <span
                  className={`text-[11px] tabular-nums ${
                    isLight ? 'text-[#6B635B]' : 'text-[#A39A91]'
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
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    hasLikedStatus
                      ? 'studio-btn-primary bg-gradient-to-br from-[#E87A3E] to-[#D97706] text-white shadow-sm'
                      : isLight
                      ? 'bg-[#F2EDE6] hover:bg-[#EAE4DC] text-[#181512]'
                      : 'bg-[#211D1A] hover:bg-[#2B2521] text-[#FAF7F2]'
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
              isLight ? 'text-[#6B635B]' : 'text-[#A39A91]'
            }`}
          >
            <span className="truncate">{displaySong.album}</span>
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

        {/* Personalized Taste Compatibility Bar (Warm Copper / Amber) */}
        <div
          className={`p-3.5 rounded-2xl border space-y-2 ${
            isLight
              ? 'bg-[#E87A3E]/[0.08] border-[#E87A3E]/25'
              : 'bg-[#E87A3E]/[0.1] border-[#E87A3E]/25'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span
              className={`font-bold flex items-center gap-1.5 ${
                isLight ? 'text-[#181512]' : 'text-[#FAF7F2]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#E87A3E]" />
              <span>Müzik Frekansı Uyumu</span>
            </span>
            <span
              className={`font-extrabold tabular-nums text-xs ${
                isLight ? 'text-[#D96B2C]' : 'text-[#F49A5E]'
              }`}
            >
              %{user.compatibilityScore || 94} Eşleşme
            </span>
          </div>

          <div
            className={`w-full h-1.5 rounded-full overflow-hidden ${
              isLight ? 'bg-[#EAE4DC]' : 'bg-[#FFF0E1]/10'
            }`}
          >
            <div
              className="h-full bg-gradient-to-r from-[#E87A3E] to-[#F59E0B] rounded-full transition-all duration-500"
              style={{ width: `${user.compatibilityScore || 94}%` }}
            />
          </div>

          <div
            className={`text-[11px] flex items-center gap-1 ${
              isLight ? 'text-[#6B635B]' : 'text-[#A39A91]'
            }`}
          >
            <span className={`font-semibold shrink-0 ${isLight ? 'text-[#D96B2C]' : 'text-[#F49A5E]'}`}>
              Ortak Frekans:
            </span>
            <span className={`font-medium truncate ${isLight ? 'text-[#181512]' : 'text-[#FAF7F2]'}`}>
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
            <span className={`text-xs font-semibold ${isLight ? 'text-[#6B635B]' : 'text-[#A39A91]'}`}>
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
                        ? 'bg-[#FAF8F4] border-[#EAE4DC] text-[#181512]'
                        : 'bg-[#211D1A] border-[#FFF0E1]/[0.08] text-[#FAF7F2]'
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
            isLight ? 'border-[#EAE4DC]' : 'border-[#FFF0E1]/[0.08]'
          }`}
        >
          <span
            className={`text-xs font-semibold block ${
              isLight ? 'text-[#6B635B]' : 'text-[#A39A91]'
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
              className={`p-3 rounded-xl border text-left transition active:scale-[0.98] font-medium min-h-[44px] cursor-pointer ${
                isLight
                  ? 'bg-[#FAF8F4] hover:bg-[#F2EDE6] border-[#EAE4DC] hover:border-[#E87A3E]/45 text-[#181512]'
                  : 'bg-[#211D1A] hover:bg-[#2B2521] border-[#FFF0E1]/[0.08] hover:border-[#E87A3E]/45 text-[#FAF7F2]'
              }`}
            >
              &ldquo;Bu saniyede ben de varım!&rdquo;
            </button>
            <button
              type="button"
              onClick={() =>
                onSendFrequency(user, 'Bu şarkı bittikten sonra sıradaki parçayı sen önerir misin?')
              }
              className={`p-3 rounded-xl border text-left transition active:scale-[0.98] font-medium min-h-[44px] cursor-pointer ${
                isLight
                  ? 'bg-[#FAF8F4] hover:bg-[#F2EDE6] border-[#EAE4DC] hover:border-[#E87A3E]/45 text-[#181512]'
                  : 'bg-[#211D1A] hover:bg-[#2B2521] border-[#FFF0E1]/[0.08] hover:border-[#E87A3E]/45 text-[#FAF7F2]'
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
          className="studio-btn-primary w-full py-3.5 px-4 rounded-xl bg-gradient-to-br from-[#E87A3E] to-[#D97706] hover:brightness-105 text-white font-semibold text-xs uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-2 shadow-lg shadow-amber-950/20 active:scale-95 min-h-[48px] cursor-pointer"
        >
          <Radio className="w-4 h-4 stroke-[2.25]" />
          <span>Frekans Gönder ve Sohbeti Aç</span>
        </button>
      </div>
    </div>
  );
};
