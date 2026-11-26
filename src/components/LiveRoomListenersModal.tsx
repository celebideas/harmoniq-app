import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Search,
  MessageCircle,
  MapPin,
  Music,
  Play,
} from 'lucide-react';
import { Song, LoungeUser, PlatformType } from '../types';
import { sanitizeFormattedLocation } from '../services/locationService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  song: Song;
  listeners: LoungeUser[];
  onSelectUser: (user: LoungeUser) => void;
  onStartChatWithUser: (user: LoungeUser) => void;
  onStartCoListen?: (user: LoungeUser) => void;
  onToggleFriend?: (user: LoungeUser) => void;
  activePlatform: PlatformType;
  themeMode?: 'dark' | 'light';
}

export const LiveRoomListenersModal: React.FC<Props> = ({
  isOpen,
  onClose,
  song,
  listeners,
  onSelectUser,
  onStartChatWithUser,
  onStartCoListen,
  themeMode,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<
    'all' | '1km' | '5km' | 'city' | 'kadikoy' | 'ytm' | 'friends'
  >('all');
  const [coverError, setCoverError] = useState(false);

  useEffect(() => {
    setCoverError(false);
  }, [song.coverUrl, song.id]);

  const isLight =
    themeMode === 'light' ||
    (!themeMode &&
      typeof document !== 'undefined' &&
      document.documentElement.classList.contains('light'));

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const filteredListeners = useMemo(() => {
    return listeners.filter((user) => {
      const formattedCity = sanitizeFormattedLocation(user.city);
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        user.name.toLowerCase().includes(q) ||
        formattedCity.toLowerCase().includes(q) ||
        user.city.toLowerCase().includes(q) ||
        (user.bio && user.bio.toLowerCase().includes(q)) ||
        (user.statusBubble && user.statusBubble.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (filterMode === '1km') return user.distanceKm <= 1.0;
      if (filterMode === '5km') return user.distanceKm <= 5.0;
      if (filterMode === 'city') return user.distanceKm <= 15.0;
      if (filterMode === 'kadikoy') {
        const lowerCity = `${formattedCity} ${user.city}`.toLowerCase();
        return lowerCity.includes('kadıköy') || lowerCity.includes('moda');
      }
      if (filterMode === 'ytm') return user.platform === 'youtube_music';
      if (filterMode === 'friends') return user.friendStatus === 'friends';

      return true;
    }).sort((a, b) => a.currentSecond - b.currentSecond);
  }, [listeners, searchQuery, filterMode]);

  if (!isOpen) return null;

  const activeChipClass =
    'studio-btn-primary bg-[#111113] dark:bg-white text-white dark:text-[#0B0B0D] font-semibold rounded-xl shadow-sm border border-[#111113]/35 dark:border-white/35';
  const inactiveChipClass = isLight
    ? 'bg-[#F1EFEA] text-[#63636B] hover:text-[#111113] hover:bg-[#E6E4DF] border border-[#E2DFD9] rounded-xl font-semibold'
    : 'bg-[#1C1C22] text-[#8E8E98] hover:text-[#F5F5F7] hover:bg-[#24242C] border border-white/[0.08] rounded-xl font-semibold';

  const modalContent = (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xl animate-backdrop-enter"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-2xl rounded-3xl p-5 sm:p-7 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden space-y-4 border animate-modal-enter ${
          isLight
            ? 'bg-white border-[#E6E4DF] text-[#111113]'
            : 'bg-[#141418] border-white/[0.08] text-[#F5F5F7]'
        }`}
      >
        {/* Top Header */}
        <div
          className={`flex items-center justify-between pb-3.5 border-b ${
            isLight ? 'border-[#E6E4DF]' : 'border-white/[0.08]'
          }`}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Song Cover Thumbnail with Clean Fallback */}
            <div
              className={`w-12 h-12 rounded-2xl overflow-hidden shrink-0 shadow-sm border ${
                isLight ? 'border-[#E6E4DF]' : 'border-white/[0.1]'
              }`}
            >
              {song.coverUrl && !coverError ? (
                <img
                  src={song.coverUrl}
                  alt={song.album || song.title}
                  onError={() => setCoverError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className={`w-full h-full bg-gradient-to-br ${
                    song.coverGradient || 'from-zinc-700 to-zinc-900'
                  } flex items-center justify-center text-white`}
                >
                  <Music className="w-5 h-5" />
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isLight ? 'bg-[#16A34A]' : 'bg-[#22C55E]'
                  }`}
                />
                <span
                  className={`text-xs font-bold uppercase tracking-wider ${
                    isLight ? 'text-[#111113]' : 'text-[#F5F5F7]'
                  }`}
                >
                  Canlı Dinleyici Odası
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs tabular-nums border ${
                    isLight
                      ? 'bg-[#F1EFEA] text-[#111113] border-[#E2DFD9]'
                      : 'bg-[#1C1C22] text-[#F5F5F7] border-white/[0.08]'
                  }`}
                >
                  {listeners.length} Dinleyici Aktif
                </span>
              </div>
              <h3
                className={`text-base sm:text-lg font-heading font-extrabold truncate mt-0.5 ${
                  isLight ? 'text-[#111113]' : 'text-[#F5F5F7]'
                }`}
              >
                {song.title} ·{' '}
                <span className={`font-normal ${isLight ? 'text-[#63636B]' : 'text-[#8E8E98]'}`}>
                  {song.artist}
                </span>
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-xl active:scale-[0.96] transition-transform duration-100 ease-out cursor-pointer ${
              isLight
                ? 'text-[#63636B] hover:text-[#111113] hover:bg-[#F1EFEA]'
                : 'text-[#8E8E98] hover:text-[#F5F5F7] hover:bg-[#1C1C22]'
            }`}
            title="Kapat"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search
            className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
              isLight ? 'text-[#8E847A]' : 'text-[#8E8E98]'
            }`}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Odadaki kişiler arasında ara (İsim, şehir, not...)"
            className={`w-full pl-10 pr-10 py-2.5 rounded-2xl text-xs border transition focus:outline-none focus:border-[#111113]/40 dark:focus:border-white/30 ${
              isLight
                ? 'bg-[#FAF9F6] border-[#E6E4DF] text-[#111113] placeholder-[#8E847A]'
                : 'bg-[#1C1C22] border-white/[0.08] text-[#F5F5F7] placeholder-[#8E8E98]'
            }`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className={`absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer ${
                isLight ? 'text-[#63636B] hover:text-[#111113]' : 'text-[#8E8E98] hover:text-[#F5F5F7]'
              }`}
              aria-label="Aramayı temizle"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 pr-6 text-xs [mask-image:linear-gradient(to_right,black_90%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_right,black_90%,transparent_100%)]">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 active:scale-[0.96] transition-transform duration-100 ease-out shrink-0 cursor-pointer ${
              filterMode === 'all' ? activeChipClass : inactiveChipClass
            }`}
          >
            Tüm Dinleyiciler ({listeners.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('1km')}
            className={`px-3 py-1.5 active:scale-[0.96] transition-transform duration-100 ease-out shrink-0 flex items-center gap-1.5 cursor-pointer ${
              filterMode === '1km' ? activeChipClass : inactiveChipClass
            }`}
          >
            <MapPin className="w-3 h-3 shrink-0" />
            <span>1 km (Yürüme)</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('5km')}
            className={`px-3 py-1.5 active:scale-[0.96] transition-transform duration-100 ease-out shrink-0 flex items-center gap-1.5 cursor-pointer ${
              filterMode === '5km' ? activeChipClass : inactiveChipClass
            }`}
          >
            <MapPin className="w-3 h-3 shrink-0" />
            <span>5 km (İlçe)</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('kadikoy')}
            className={`px-3 py-1.5 active:scale-[0.96] transition-transform duration-100 ease-out shrink-0 cursor-pointer ${
              filterMode === 'kadikoy' ? activeChipClass : inactiveChipClass
            }`}
          >
            Kadıköy
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('ytm')}
            className={`px-3 py-1.5 active:scale-[0.96] transition-transform duration-100 ease-out shrink-0 flex items-center gap-1.5 cursor-pointer ${
              filterMode === 'ytm' ? activeChipClass : inactiveChipClass
            }`}
          >
            <Play className="w-3 h-3 shrink-0 fill-current" />
            <span>YouTube Music</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('friends')}
            className={`px-3 py-1.5 active:scale-[0.96] transition-transform duration-100 ease-out shrink-0 cursor-pointer ${
              filterMode === 'friends' ? activeChipClass : inactiveChipClass
            }`}
          >
            Arkadaşlarım
          </button>
        </div>

        {/* Fixed Top Summary Row */}
        <div
          className={`flex items-center justify-between gap-2 px-1 pt-0.5 text-xs ${
            isLight ? 'text-[#63636B]' : 'text-[#8E8E98]'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isLight ? 'bg-[#16A34A]' : 'bg-[#22C55E]'
              }`}
            />
            <span className={`font-semibold truncate ${isLight ? 'text-[#111113]' : 'text-[#F5F5F7]'}`}>
              {filteredListeners.length} kişi şu an bu parçada
            </span>
          </div>
          <span className="text-xs font-medium shrink-0">Sırala: Saniye</span>
        </div>

        {/* Scrollable Symmetric Studio List of Active Listeners */}
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pr-1">
          {filteredListeners.length > 0 ? (
            filteredListeners.map((user) => {
              const displayCity = sanitizeFormattedLocation(user.city);

              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#1C1C22]/60 border border-white/[0.05] transition hover:bg-[#1C1C22]"
                >
                  {/* Left: Thin Emerald Live Ring Avatar + Name + City, District */}
                  <button
                    type="button"
                    onClick={() => {
                      onSelectUser(user);
                      onClose();
                    }}
                    className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                  >
                    <div className="relative shrink-0">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.name}
                          className={`w-9 h-9 rounded-full object-cover ring-[1.5px] ring-emerald-500/80 ring-offset-2 ${
                            isLight ? 'ring-offset-[#F1EFEA]' : 'ring-offset-[#1C1C22]'
                          }`}
                        />
                      ) : (
                        <div
                          className={`avatar-circle w-9 h-9 rounded-full bg-gradient-to-tr ${user.avatarGradient} flex items-center justify-center text-white font-bold text-xs ring-[1.5px] ring-emerald-500/80 ring-offset-2 ${
                            isLight ? 'ring-offset-[#F1EFEA]' : 'ring-offset-[#1C1C22]'
                          }`}
                        >
                          {user.avatarSeed}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-sm font-semibold truncate ${
                          isLight ? 'text-[#111113]' : 'text-[#F5F5F7]'
                        }`}
                      >
                        {user.name}
                      </div>
                      <div className="text-xs text-zinc-400 truncate">
                        {displayCity}
                      </div>
                    </div>
                  </button>

                  {/* Middle/Right: Monospace Second Badge + Compact Equal Katıl & Chat Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs tabular-nums px-2 py-1 rounded-lg bg-white/[0.06] text-[#F5F5F7]">
                      {formatTime(user.currentSecond)}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        if (onStartCoListen) {
                          onStartCoListen(user);
                        } else {
                          onSelectUser(user);
                        }
                        onClose();
                      }}
                      className="studio-btn-primary h-8 px-3 rounded-lg bg-[#111113] dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-[#0B0B0D] text-xs font-semibold transition active:scale-95 cursor-pointer"
                      title={`${user.name} ile birlikte dinle`}
                    >
                      Katıl
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onStartChatWithUser(user);
                        onClose();
                      }}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center border transition active:scale-95 cursor-pointer ${
                        isLight
                          ? 'bg-white hover:bg-[#E6E4DF] border-[#E2DFD9] text-[#111113]'
                          : 'bg-[#141418] hover:bg-white/10 border-white/[0.08] text-[#F5F5F7]'
                      }`}
                      title={`${user.name} ile sohbet et`}
                      aria-label={`${user.name} ile sohbet et`}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div
              className={`p-8 text-center space-y-2 rounded-2xl border ${
                isLight
                  ? 'bg-[#FAF9F6] border-[#E6E4DF]'
                  : 'bg-[#1C1C22] border-white/[0.07]'
              }`}
            >
              <p className={`text-xs ${isLight ? 'text-[#63636B]' : 'text-[#8E8E98]'}`}>
                {searchQuery
                  ? `"${searchQuery}" aramasına uygun dinleyici bulunamadı.`
                  : 'Seçili filtreye uygun dinleyici bulunamadı.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setFilterMode('all');
                }}
                className={`text-xs hover:underline font-semibold cursor-pointer ${
                  isLight ? 'text-[#111113]' : 'text-[#F5F5F7]'
                }`}
              >
                Filtreleri Temizle
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
