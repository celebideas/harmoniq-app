import React, { useState } from 'react';
import { X, Send, Radio, ShieldCheck, MapPin, Music, Sparkles, MessageCircle, Heart, UserPlus, UserCheck, Clock, Lock, Globe } from 'lucide-react';
import { LoungeUser, Song } from '../types';

interface Props {
  user: LoungeUser | null;
  song: Song;
  onClose: () => void;
  onSendFrequency: (user: LoungeUser, icebreakerText?: string) => void;
  onToggleFriend?: (user: LoungeUser) => void;
}

export const MiniProfileDrawer: React.FC<Props> = ({
  user,
  song,
  onClose,
  onSendFrequency,
  onToggleFriend,
}) => {
  const [friendActionSent, setFriendActionSent] = useState(false);
  const [hasLikedStatus, setHasLikedStatus] = useState(user?.hasLikedStatus || false);
  const [statusLikesCount, setStatusLikesCount] = useState(user?.statusLikesCount || 8);

  if (!user) return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getPlatformLabel = (p: string) => {
    switch (p) {
      case 'youtube_music':
        return { name: 'YouTube Music', color: 'text-red-400 bg-red-500/10 border-red-500/20' };
      case 'spotify':
        return { name: 'Spotify', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
      case 'apple_music':
        return { name: 'Apple Music', color: 'text-pink-400 bg-pink-500/10 border-pink-500/20' };
      default:
        return { name: 'Medya Oynatıcı', color: 'text-neutral-400 bg-neutral-800' };
    }
  };

  const platformInfo = getPlatformLabel(user.platform);

  const handleFriendClick = () => {
    if (onToggleFriend) {
      onToggleFriend(user);
      setFriendActionSent(true);
      setTimeout(() => setFriendActionSent(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-lg bg-[#0C0C0E] border border-white/[0.08] rounded-t-[32px] sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[86vh] overflow-y-auto no-scrollbar pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {/* Grab bar for mobile */}
        <div className="sm:hidden w-10 h-1 bg-white/20 rounded-full mx-auto -mt-1 mb-3" />

        {/* Top Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${user.avatarGradient} flex items-center justify-center text-white font-bold text-lg ring-1 ring-white/10 shadow-lg shrink-0`}>
              {user.avatarSeed}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-heading font-bold text-white tracking-tight truncate">
                  {user.name}, {user.age}
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-medium ${platformInfo.color}`}>
                  {platformInfo.name}
                </span>
                {user.privacyMode === 'private' ? (
                  <span className="px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-400 text-[10px] font-medium flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" />
                    <span>Gizli</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-400 text-[10px] font-medium flex items-center gap-1">
                    <Globe className="w-2.5 h-2.5" />
                    <span>Açık</span>
                  </span>
                )}
              </div>
              <div className="text-xs text-zinc-400 mt-1 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span className="truncate">{user.city}</span>
                <span className="text-zinc-600">·</span>
                <span className="text-lime-400 font-semibold shrink-0">{user.distanceKm} km yakında</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Arkadaş Ekle / İstek Gönder Butonu */}
            <button
              onClick={handleFriendClick}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 min-h-[40px] cursor-pointer ${
                user.friendStatus === 'friends'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : user.friendStatus === 'pending' || friendActionSent
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/[0.08] text-white'
              }`}
              title={user.privacyMode === 'private' ? 'Gizli hesap olduğu için arkadaşlık isteği iletilir' : 'Arkadaşlarına ekle'}
            >
              {user.friendStatus === 'friends' ? (
                <>
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Arkadaşsınız</span>
                </>
              ) : user.friendStatus === 'pending' || friendActionSent ? (
                <>
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>İstek Yollandı</span>
                </>
              ) : user.privacyMode === 'private' ? (
                <>
                  <UserPlus className="w-3.5 h-3.5 text-amber-400" />
                  <span>İstek Gönder</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5 text-lime-400" />
                  <span>Arkadaş Ekle</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-white/[0.06] active:scale-95 transition min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
              aria-label="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Current Playback Sensation */}
        <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-700/80 shrink-0 shadow-md">
              {song.coverUrl ? (
                <img
                  src={song.coverUrl}
                  alt={song.album}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={`w-full h-full bg-gradient-to-tr ${song.coverGradient} flex items-center justify-center text-white`}>
                  <Music className="w-5 h-5" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400 font-medium">Şarkıdaki Konumu:</span>
                <span className="text-amber-400 font-bold text-sm tabular-nums">
                  {formatTime(user.currentSecond)} / {formatTime(song.durationSeconds)}
                </span>
              </div>
              <div className="text-xs font-semibold text-white truncate mt-0.5">
                {song.title}
              </div>
              <div className="text-[11px] text-neutral-400 truncate">
                {song.artist} · <span className="text-neutral-500">{song.genre}</span>
              </div>
            </div>
          </div>

          {user.statusBubble && (
            <div className="bg-neutral-900/90 p-3 rounded-2xl border border-neutral-800 space-y-2">
              <p className="text-xs text-lime-300 font-medium">
                💬 "{user.statusBubble}"
              </p>
              <div className="flex items-center justify-between pt-1 border-t border-neutral-800/80">
                <span className="text-[11px] text-neutral-400">
                  🔥 {statusLikesCount} dinleyici katıldı
                </span>
                <button
                  onClick={() => {
                    if (hasLikedStatus) {
                      setHasLikedStatus(false);
                      setStatusLikesCount((prev) => Math.max(0, prev - 1));
                    } else {
                      setHasLikedStatus(true);
                      setStatusLikesCount((prev) => prev + 1);
                    }
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                    hasLikedStatus
                      ? 'bg-lime-400 text-neutral-950 shadow'
                      : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                  }`}
                >
                  <span>{hasLikedStatus ? '✓ Katıldın' : '+1 Katılıyorum'}</span>
                  <span className="font-mono">({statusLikesCount})</span>
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-0.5">
            <span className="text-neutral-500">{song.album}</span>
            <span className="text-emerald-400 flex items-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Canlı Dinliyor
            </span>
          </div>
        </div>

        {/* Personalized Taste Compatibility Bar */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-lime-950/40 via-neutral-950 to-neutral-950 border border-lime-400/30 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-lime-400" />
              <span>YouTube Music Zevk Uyumu</span>
            </span>
            <span className="text-lime-300 font-extrabold font-mono text-xs">
              %{user.compatibilityScore || 94} Eşleşme
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-lime-400 to-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${user.compatibilityScore || 94}%` }}
            />
          </div>

          <div className="text-[11px] text-neutral-400 flex items-center gap-1">
            <span className="text-lime-400">Ortak Frekans:</span>
            <span className="text-neutral-300 font-medium truncate">
              {user.sharedWithUserArtists && user.sharedWithUserArtists.length > 0
                ? user.sharedWithUserArtists.join(', ')
                : user.topArtists.slice(0, 2).join(', ')}
            </span>
          </div>
        </div>

        {/* Bio */}
        <p className="text-xs text-neutral-300 leading-relaxed">
          {user.bio}
        </p>

        {/* Shared Artists */}
        <div className="space-y-1.5 text-xs">
          <span className="text-neutral-400 text-xs font-semibold">
            Favori Sanatçılar:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {user.topArtists.map((artist, idx) => (
              <span key={idx} className="px-2.5 py-1 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-300 text-xs font-medium">
                {artist}
              </span>
            ))}
          </div>
        </div>

        {/* Müzikal Buzkırıcılar */}
        <div className="space-y-2 pt-2 border-t border-white/[0.06]">
          <span className="text-xs text-zinc-400 font-semibold block">
            Müzikal Buzkırıcı Gönder:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => onSendFrequency(user, `Ben de ${formatTime(user.currentSecond)} saniyesindeyim, harika zamanlama!`)}
              className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] hover:border-lime-400/40 text-left text-zinc-200 transition active:scale-[0.98] font-medium min-h-[44px] cursor-pointer"
            >
              ⏱️ "Bu saniyede ben de varım!"
            </button>
            <button
              type="button"
              onClick={() => onSendFrequency(user, 'Bu şarkı bittikten sonra sıradaki parçayı sen önerir misin?')}
              className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] hover:border-lime-400/40 text-left text-zinc-200 transition active:scale-[0.98] font-medium min-h-[44px] cursor-pointer"
            >
              🎵 "Sıradaki şarkıyı öner"
            </button>
          </div>
        </div>

        {/* Primary CTA */}
        <button
          type="button"
          onClick={() => onSendFrequency(user)}
          className="w-full py-3.5 px-4 rounded-2xl bg-accent-theme text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-2 shadow-lg shadow-black/40 active:scale-95 min-h-[48px] cursor-pointer"
        >
          <Radio className="w-4 h-4 stroke-[2.5]" />
          <span>Frekans Gönder ve Sohbeti Aç</span>
        </button>
      </div>
    </div>
  );
};
