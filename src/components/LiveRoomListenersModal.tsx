import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Search,
  MessageCircle,
  UserPlus,
  UserCheck,
  Clock,
  Sparkles,
  MapPin,
  Music,
  Play,
  Disc3,
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
  onToggleFriend?: (user: LoungeUser) => void;
  activePlatform: PlatformType;
  themeMode?: 'dark' | 'light';
}

const stripStrayEmojis = (text: string) =>
  text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').replace(/\s{2,}/g, ' ').trim();

export const LiveRoomListenersModal: React.FC<Props> = ({
  isOpen,
  onClose,
  song,
  listeners,
  onSelectUser,
  onStartChatWithUser,
  onToggleFriend,
  themeMode,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<
    'all' | '1km' | '5km' | 'city' | 'solo' | 'kadikoy' | 'ytm' | 'friends'
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
      if (filterMode === 'solo') return Math.abs(user.currentSecond - 142) <= 10;
      if (filterMode === 'kadikoy') {
        const lowerCity = `${formattedCity} ${user.city}`.toLowerCase();
        return lowerCity.includes('kadıköy') || lowerCity.includes('moda');
      }
      if (filterMode === 'ytm') return user.platform === 'youtube_music';
      if (filterMode === 'friends') return user.friendStatus === 'friends';

      return true;
    });
  }, [listeners, searchQuery, filterMode]);

  if (!isOpen) return null;

  const activeChipClass =
    'studio-btn-primary bg-gradient-to-br from-[#E87A3E] to-[#D97706] text-white font-semibold rounded-xl shadow-sm border border-[#E87A3E]';
  const inactiveChipClass = isLight
    ? 'bg-[#F2EDE6] text-[#6B635B] hover:text-[#181512] hover:bg-[#EAE4DC] border border-[#E2D9CE] rounded-xl font-semibold'
    : 'bg-[#211D1A] text-[#A39A91] hover:text-[#FAF7F2] hover:bg-[#2B2521] border border-[#FFF0E1]/[0.08] rounded-xl font-semibold';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xl animate-backdrop-enter"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-2xl rounded-3xl p-5 sm:p-7 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden space-y-4 border animate-modal-enter ${
          isLight
            ? 'bg-white border-[#EAE4DC] text-[#181512]'
            : 'bg-[#171412] border-[#FFF0E1]/[0.08] text-[#FAF7F2]'
        }`}
      >
        {/* Top Header */}
        <div
          className={`flex items-center justify-between pb-3.5 border-b ${
            isLight ? 'border-[#EAE4DC]' : 'border-[#FFF0E1]/[0.08]'
          }`}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Song Cover Thumbnail with Clean Fallback */}
            <div
              className={`w-12 h-12 rounded-2xl overflow-hidden shrink-0 shadow-sm border ${
                isLight ? 'border-[#EAE4DC]' : 'border-[#FFF0E1]/[0.1]'
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
                    song.coverGradient || 'from-[#E87A3E] to-[#D97706]'
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
                  className={`text-[11px] font-bold uppercase tracking-wider ${
                    isLight ? 'text-[#D96B2C]' : 'text-[#F49A5E]'
                  }`}
                >
                  Canlı Dinleyici Odası
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                    isLight
                      ? 'bg-[#F2EDE6] text-[#181512] border-[#E2D9CE]'
                      : 'bg-[#211D1A] text-[#FAF7F2] border-[#FFF0E1]/[0.08]'
                  }`}
                >
                  {listeners.length} Dinleyici Aktif
                </span>
              </div>
              <h3
                className={`text-base sm:text-lg font-heading font-extrabold truncate mt-0.5 ${
                  isLight ? 'text-[#181512]' : 'text-[#FAF7F2]'
                }`}
              >
                {song.title} ·{' '}
                <span className={`font-normal ${isLight ? 'text-[#6B635B]' : 'text-[#A39A91]'}`}>
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
                ? 'text-[#6B635B] hover:text-[#181512] hover:bg-[#F2EDE6]'
                : 'text-[#A39A91] hover:text-[#FAF7F2] hover:bg-[#211D1A]'
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
              isLight ? 'text-[#8E847A]' : 'text-[#A39A91]'
            }`}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Odadaki kişiler arasında ara (İsim, Kadıköy, Solo...)"
            className={`w-full pl-10 pr-10 py-2.5 rounded-2xl text-xs border transition focus:outline-none focus:border-[#E87A3E] ${
              isLight
                ? 'bg-[#FAF8F4] border-[#EAE4DC] text-[#181512] placeholder-[#8E847A]'
                : 'bg-[#211D1A] border-[#FFF0E1]/[0.08] text-[#FAF7F2] placeholder-[#A39A91]'
            }`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className={`absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer ${
                isLight ? 'text-[#6B635B] hover:text-[#181512]' : 'text-[#A39A91] hover:text-[#FAF7F2]'
              }`}
              aria-label="Aramayı temizle"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-[11px]">
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
            onClick={() => setFilterMode('solo')}
            className={`px-3 py-1.5 active:scale-[0.96] transition-transform duration-100 ease-out shrink-0 flex items-center gap-1.5 cursor-pointer ${
              filterMode === 'solo' ? activeChipClass : inactiveChipClass
            }`}
          >
            <Music className="w-3 h-3 shrink-0" />
            <span>01:42 Solosunda Olanlar</span>
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

        {/* Scrollable List of Active Listeners */}
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-2.5 pr-1">
          {filteredListeners.length > 0 ? (
            filteredListeners.map((user) => {
              const isAtSolo = Math.abs(user.currentSecond - 142) <= 5;
              const displayCity = sanitizeFormattedLocation(user.city);
              const cleanedQuote = user.statusBubble ? stripStrayEmojis(user.statusBubble) : '';

              return (
                <div
                  key={user.id}
                  className={`p-3.5 rounded-2xl transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group border ${
                    user.isRealUser
                      ? isLight
                        ? 'bg-emerald-50/70 border-emerald-500/35'
                        : 'bg-emerald-950/20 border-emerald-500/35'
                      : isLight
                      ? 'bg-[#FAF8F4] border-[#EAE4DC] hover:border-[#E87A3E]/40'
                      : 'bg-[#211D1A] border-[#FFF0E1]/[0.07] hover:border-[#E87A3E]/35'
                  }`}
                >
                  {/* Left: User Avatar & Metadata */}
                  <div
                    onClick={() => {
                      onSelectUser(user);
                      onClose();
                    }}
                    className="flex items-start gap-3 min-w-0 cursor-pointer flex-1"
                  >
                    <div className="relative shrink-0">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.name}
                          className={`w-11 h-11 rounded-2xl object-cover shadow-sm ${
                            user.isRealUser ? 'ring-2 ring-emerald-500/70' : ''
                          }`}
                        />
                      ) : (
                        <div
                          className={`avatar-circle w-11 h-11 rounded-2xl bg-gradient-to-tr ${user.avatarGradient} flex items-center justify-center text-white font-bold text-sm shadow-sm ${
                            user.isRealUser ? 'ring-2 ring-emerald-500/70' : ''
                          }`}
                        >
                          {user.avatarSeed}
                        </div>
                      )}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${
                          isLight
                            ? 'border-[#FAF8F4] bg-[#16A34A]'
                            : 'border-[#211D1A] bg-[#22C55E]'
                        }`}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-sm font-bold transition-colors truncate ${
                            isLight
                              ? 'text-[#181512] group-hover:text-[#D96B2C]'
                              : 'text-[#FAF7F2] group-hover:text-[#F49A5E]'
                          }`}
                        >
                          {user.name}
                          {!user.isRealUser && user.age ? `, ${user.age}` : ''}
                        </span>

                        {user.isRealUser && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold border inline-flex items-center gap-1 tracking-wide ${
                              isLight
                                ? 'bg-emerald-500/12 text-emerald-700 border-emerald-500/30'
                                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isLight ? 'bg-[#16A34A]' : 'bg-[#22C55E]'
                              }`}
                            />
                            <span>GERÇEK CANLI</span>
                          </span>
                        )}

                        {user.friendStatus === 'friends' && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                              isLight
                                ? 'bg-[#E87A3E]/15 text-[#D96B2C] border-[#E87A3E]/25'
                                : 'bg-[#E87A3E]/15 text-[#F49A5E] border-[#E87A3E]/25'
                            }`}
                          >
                            Arkadaş
                          </span>
                        )}

                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-mono border flex items-center gap-1 ${
                            isLight
                              ? 'bg-white text-[#181512] border-[#E2D9CE]'
                              : 'bg-[#171412] text-[#FAF7F2] border-[#FFF0E1]/[0.08]'
                          }`}
                        >
                          <Clock className="w-2.5 h-2.5 text-[#E87A3E]" />
                          <span>{formatTime(user.currentSecond)}</span>
                          {isAtSolo && (
                            <span className={isLight ? 'text-[#D96B2C]' : 'text-[#F49A5E]'}>
                              · Solo
                            </span>
                          )}
                        </span>

                        <span
                          className={`text-[10px] flex items-center gap-1 ${
                            isLight ? 'text-[#6B635B]' : 'text-[#A39A91]'
                          }`}
                        >
                          {user.platform === 'youtube_music' ? (
                            <>
                              <Play className="w-2.5 h-2.5 fill-current text-rose-500" />
                              <span>YouTube Music</span>
                            </>
                          ) : (
                            <>
                              <Disc3 className="w-2.5 h-2.5 text-[#16A34A] dark:text-[#22C55E]" />
                              <span>Spotify</span>
                            </>
                          )}
                        </span>

                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold border flex items-center gap-1 ${
                            isLight
                              ? 'bg-[#E87A3E]/15 text-[#D96B2C] border-[#E87A3E]/25'
                              : 'bg-[#E87A3E]/15 text-[#F49A5E] border-[#E87A3E]/25'
                          }`}
                        >
                          <Sparkles className="w-2.5 h-2.5 text-[#E87A3E]" />
                          <span>%{user.compatibilityScore || 94} Zevk Uyumu</span>
                        </span>
                      </div>

                      <div
                        className={`text-xs mt-1 flex items-center gap-1 truncate ${
                          isLight ? 'text-[#6B635B]' : 'text-[#A39A91]'
                        }`}
                      >
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{displayCity}</span>
                        <span>·</span>
                        <span className="shrink-0 tabular-nums">{user.distanceKm} km yakında</span>
                      </div>

                      {cleanedQuote && (
                        <p
                          className={`text-xs mt-1 italic leading-relaxed line-clamp-1 ${
                            isLight ? 'text-[#4B443E]' : 'text-[#D6CFC7]'
                          }`}
                        >
                          &ldquo;{cleanedQuote}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Action Buttons: DM Sohbet & Arkadaş Ekle */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto pt-1 sm:pt-0">
                    {/* Chat / DM Secondary Button */}
                    <button
                      type="button"
                      onClick={() => {
                        onStartChatWithUser(user);
                        onClose();
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 active:scale-[0.96] transition-transform duration-100 ease-out border cursor-pointer ${
                        isLight
                          ? 'bg-[#F2EDE6] hover:bg-[#EAE4DC] text-[#181512] border-[#E2D9CE]'
                          : 'bg-[#171412] hover:bg-[#2B2521] text-[#FAF7F2] border-[#FFF0E1]/10'
                      }`}
                      title={`${user.name} ile doğrudan sohbete geç`}
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-[#E87A3E]" />
                      <span>Sohbet Et</span>
                    </button>

                    {/* Friend Toggle */}
                    {onToggleFriend && (
                      <button
                        type="button"
                        onClick={() => onToggleFriend(user)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold active:scale-[0.96] transition-transform duration-100 ease-out flex items-center gap-1.5 cursor-pointer ${
                          user.friendStatus === 'friends'
                            ? isLight
                              ? 'bg-[#F2EDE6] text-[#6B635B] border border-[#E2D9CE] hover:text-rose-600'
                              : 'bg-[#171412] text-[#A39A91] border border-[#FFF0E1]/10 hover:text-rose-400'
                            : user.friendStatus === 'pending'
                            ? isLight
                              ? 'bg-[#E87A3E]/15 text-[#D96B2C] border border-[#E87A3E]/30'
                              : 'bg-[#E87A3E]/15 text-[#F49A5E] border border-[#E87A3E]/30'
                            : 'studio-btn-primary bg-gradient-to-br from-[#E87A3E] to-[#D97706] hover:brightness-105 text-white shadow-sm'
                        }`}
                      >
                        {user.friendStatus === 'friends' ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Arkadaş</span>
                          </>
                        ) : user.friendStatus === 'pending' ? (
                          <>
                            <Clock className="w-3.5 h-3.5" />
                            <span>İstek İletildi</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Arkadaş Ekle</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div
              className={`p-8 text-center space-y-2 rounded-2xl border ${
                isLight
                  ? 'bg-[#FAF8F4] border-[#EAE4DC]'
                  : 'bg-[#211D1A] border-[#FFF0E1]/[0.07]'
              }`}
            >
              <p className={`text-xs ${isLight ? 'text-[#6B635B]' : 'text-[#A39A91]'}`}>
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
                  isLight ? 'text-[#D96B2C]' : 'text-[#F49A5E]'
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
};
