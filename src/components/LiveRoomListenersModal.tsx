import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Users,
  Radio,
  Flame,
  MessageCircle,
  UserPlus,
  UserCheck,
  Clock,
  Sparkles,
  CheckCircle2,
  Lock,
  Globe,
  Compass,
} from 'lucide-react';
import { Song, LoungeUser, PlatformType } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  song: Song;
  listeners: LoungeUser[];
  onSelectUser: (user: LoungeUser) => void;
  onStartChatWithUser: (user: LoungeUser) => void;
  onToggleFriend?: (user: LoungeUser) => void;
  activePlatform: PlatformType;
}

export const LiveRoomListenersModal: React.FC<Props> = ({
  isOpen,
  onClose,
  song,
  listeners,
  onSelectUser,
  onStartChatWithUser,
  onToggleFriend,
  activePlatform,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | '1km' | '5km' | 'city' | 'solo' | 'kadikoy' | 'ytm' | 'friends'>('all');

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Filtered listeners based on search query and quick filters
  const filteredListeners = useMemo(() => {
    return listeners.filter((user) => {
      // 1. Text Search matching name, city, bio, status
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        user.name.toLowerCase().includes(q) ||
        user.city.toLowerCase().includes(q) ||
        (user.bio && user.bio.toLowerCase().includes(q)) ||
        (user.statusBubble && user.statusBubble.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      // 2. Quick Category / Distance Filter
      if (filterMode === '1km') {
        return user.distanceKm <= 1.0;
      }
      if (filterMode === '5km') {
        return user.distanceKm <= 5.0;
      }
      if (filterMode === 'city') {
        return user.distanceKm <= 15.0;
      }
      if (filterMode === 'solo') {
        return Math.abs(user.currentSecond - 142) <= 10;
      }
      if (filterMode === 'kadikoy') {
        return user.city.toLowerCase().includes('kadıköy') || user.city.toLowerCase().includes('moda');
      }
      if (filterMode === 'ytm') {
        return user.platform === 'youtube_music';
      }
      if (filterMode === 'friends') {
        return user.friendStatus === 'friends';
      }

      return true;
    });
  }, [listeners, searchQuery, filterMode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-neutral-950 border border-neutral-800 rounded-3xl p-5 sm:p-7 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden space-y-4">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Song Cover Thumbnail */}
            <div className="w-12 h-12 rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-700 shrink-0 shadow">
              {song.coverUrl ? (
                <img src={song.coverUrl} alt={song.album} className="w-full h-full object-cover" />
              ) : (
                <div className={`w-full h-full bg-gradient-to-tr ${song.coverGradient}`} />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
                <span className="text-[11px] font-bold text-lime-400 uppercase tracking-wider">
                  Canlı Dinleyici Odası
                </span>
                <span className="px-2 py-0.5 rounded-full bg-neutral-900 text-neutral-300 text-[10px] font-mono border border-neutral-800">
                  {listeners.length} Dinleyici Aktif
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-heading font-extrabold text-white truncate mt-0.5">
                {song.title} · <span className="text-neutral-400 font-normal">{song.artist}</span>
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-2xl text-neutral-400 hover:text-white hover:bg-neutral-900 transition"
            title="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar ("Kişi aradığında...") */}
        <div className="relative">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Odadaki kişiler arasında ara (İsim, Kadıköy, Solo, Şiir...)"
            className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-neutral-900/90 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-lime-400 focus:bg-neutral-900 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-[11px]">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition shrink-0 ${
              filterMode === 'all'
                ? 'bg-lime-400 text-neutral-950 shadow'
                : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
            }`}
          >
            Tüm Dinleyiciler ({listeners.length})
          </button>
          <button
            onClick={() => setFilterMode('1km')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition shrink-0 flex items-center gap-1 ${
              filterMode === '1km'
                ? 'bg-lime-400 text-neutral-950 shadow'
                : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
            }`}
          >
            <span>📍 1 km (Yürüme)</span>
          </button>
          <button
            onClick={() => setFilterMode('5km')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition shrink-0 flex items-center gap-1 ${
              filterMode === '5km'
                ? 'bg-lime-400 text-neutral-950 shadow'
                : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
            }`}
          >
            <span>📍 5 km (İlçe)</span>
          </button>
          <button
            onClick={() => setFilterMode('solo')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition shrink-0 flex items-center gap-1 ${
              filterMode === 'solo'
                ? 'bg-lime-400 text-neutral-950 shadow'
                : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
            }`}
          >
            <span>🎸 01:42 Solosunda Olanlar</span>
          </button>
          <button
            onClick={() => setFilterMode('kadikoy')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition shrink-0 ${
              filterMode === 'kadikoy'
                ? 'bg-lime-400 text-neutral-950 shadow'
                : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
            }`}
          >
            Kadıköy & Moda
          </button>
          <button
            onClick={() => setFilterMode('ytm')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition shrink-0 flex items-center gap-1 ${
              filterMode === 'ytm'
                ? 'bg-lime-400 text-neutral-950 shadow'
                : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
            }`}
          >
            <span>▶ YouTube Music</span>
          </button>
          <button
            onClick={() => setFilterMode('friends')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition shrink-0 ${
              filterMode === 'friends'
                ? 'bg-lime-400 text-neutral-950 shadow'
                : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
            }`}
          >
            Arkadaşlarım
          </button>
        </div>

        {/* Scrollable List of 14 Active Listener Accounts */}
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-2.5 pr-1">
          {filteredListeners.length > 0 ? (
            filteredListeners.map((user) => {
              const isAtSolo = Math.abs(user.currentSecond - 142) <= 5;
              return (
                <div
                  key={user.id}
                  className="p-3.5 rounded-2xl bg-neutral-900/80 border border-neutral-800/80 hover:border-neutral-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
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
                      <div
                        className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${user.avatarGradient} flex items-center justify-center text-white font-bold text-sm shadow`}
                      >
                        {user.avatarSeed}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-lime-400 border-2 border-neutral-950" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white group-hover:text-lime-300 transition-colors truncate">
                          {user.name}, {user.age}
                        </span>

                        {user.friendStatus === 'friends' && (
                          <span className="text-[10px] px-2 py-0.2 rounded-full bg-lime-400/20 text-lime-400 font-bold border border-lime-400/30">
                            Arkadaş
                          </span>
                        )}

                        <span className="text-[10px] px-2 py-0.2 rounded-full bg-neutral-950 text-neutral-300 font-mono border border-neutral-800 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5 text-lime-400" />
                          <span>{formatTime(user.currentSecond)}</span>
                          {isAtSolo && <span className="text-lime-400">· Solo 🎸</span>}
                        </span>

                        <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                          <span>{user.platform === 'youtube_music' ? '▶ YouTube Music' : '● Spotify'}</span>
                        </span>

                        <span className="text-[10px] px-2 py-0.2 rounded-full bg-lime-400/15 text-lime-300 font-bold border border-lime-400/30 flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5 text-lime-400" />
                          <span>%{user.compatibilityScore || 94} Zevk Uyumu</span>
                        </span>
                      </div>

                      <div className="text-xs text-neutral-400 mt-0.5 truncate">
                        {user.city} · <span className="text-neutral-500">{user.distanceKm} km yakında</span>
                      </div>

                      {user.statusBubble && (
                        <p className="text-xs text-neutral-300 mt-1 italic leading-relaxed line-clamp-1">
                          "{user.statusBubble}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Action Buttons: DM Sohbet & Arkadaş Ekle */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto pt-1 sm:pt-0">
                    {/* Chat / DM button */}
                    <button
                      onClick={() => {
                        onStartChatWithUser(user);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition border border-neutral-700/60"
                      title={`${user.name} ile doğrudan sohbete geç`}
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-lime-400" />
                      <span>Sohbet Et</span>
                    </button>

                    {/* Friend Toggle */}
                    {onToggleFriend && (
                      <button
                        onClick={() => onToggleFriend(user)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow ${
                          user.friendStatus === 'friends'
                            ? 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-red-400'
                            : user.friendStatus === 'pending'
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : 'bg-lime-400 hover:bg-lime-300 text-neutral-950'
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
            <div className="p-8 text-center space-y-2 bg-neutral-900/40 rounded-2xl border border-neutral-800/80">
              <p className="text-xs text-neutral-400">
                "{searchQuery}" aramasına uygun dinleyici bulunamadı.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterMode('all');
                }}
                className="text-xs text-lime-400 hover:underline font-semibold"
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
