import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  Send,
  Clock,
  ChevronRight,
  Music,
  Zap,
  Play,
  Sparkles,
  Plus,
  Search,
  X,
  Check,
  Headphones,
  MessageSquare,
  Users,
  UserPlus,
  UserCheck,
  UserMinus,
  LogIn,
  Loader2,
  Cloud,
} from 'lucide-react';
import { LoungeConversation, LoungeUser, Song, FriendRequest } from '../types';
import { searchTracks } from '../services/musicResolver';
import { LiveMiniEqualizer } from './LiveMiniEqualizer';

type SocialPaneTab = 'chats' | 'friends' | 'requests';

interface Props {
  conversations: LoungeConversation[];
  activeChatUser: LoungeUser | null;
  onSelectConversation: (conv: LoungeConversation) => void;
  onBackToList: () => void;
  onSendMessage: (matchId: string, text: string, isIcebreaker?: boolean) => void;
  onSendSongMessage?: (
    matchId: string,
    song: Song,
    comment?: string,
    timestampSecond?: number
  ) => void;
  onPlayMoment?: (track: Song, second: number) => void;
  onPlaySong?: (song: Song) => void;
  onStartChatWithUser?: (user: LoungeUser, initialText?: string) => void;
  onOpenUserProfile?: (user: LoungeUser) => void;
  recentListeners?: LoungeUser[];
  currentSong?: Song;
  currentSecond?: number;
  allSongs?: Song[];
  // Real-time cloud social props
  isCloudAuthenticated?: boolean;
  isAuthLoading?: boolean;
  onGoogleSignIn?: () => void;
  discoverableCloudUsers?: LoungeUser[];
  friendsList?: LoungeUser[];
  incomingRequests?: FriendRequest[];
  outgoingRequests?: FriendRequest[];
  onToggleFriend?: (user: LoungeUser) => void;
  onAcceptFriendRequest?: (requestId: string) => void;
  onDeclineFriendRequest?: (requestId: string) => void;
  onCancelSentRequest?: (userId: string) => void;
}

export const ChatTab: React.FC<Props> = ({
  conversations,
  activeChatUser,
  onSelectConversation,
  onBackToList,
  onSendMessage,
  onSendSongMessage,
  onPlayMoment,
  onPlaySong,
  onStartChatWithUser,
  onOpenUserProfile,
  recentListeners = [],
  currentSong,
  currentSecond = 0,
  allSongs = [],
  isCloudAuthenticated = false,
  isAuthLoading = false,
  onGoogleSignIn,
  discoverableCloudUsers = [],
  friendsList = [],
  incomingRequests = [],
  outgoingRequests = [],
  onToggleFriend,
  onAcceptFriendRequest,
  onDeclineFriendRequest,
  onCancelSentRequest,
}) => {
  const [socialTab, setSocialTab] = useState<SocialPaneTab>('chats');
  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [showSongPickerModal, setShowSongPickerModal] = useState(false);
  const [songSearchTerm, setSongSearchTerm] = useState('');
  const [remoteShareSongs, setRemoteShareSongs] = useState<Song[]>([]);
  const [isSearchingShareSongs, setIsSearchingShareSongs] = useState(false);
  const [selectedSongToShare, setSelectedSongToShare] = useState<Song | null>(null);
  const [songComment, setSongComment] = useState('');
  const [shareTimestampSecond, setShareTimestampSecond] = useState<number>(0);
  const [isCoListeningActive, setIsCoListeningActive] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Live 350ms debounced catalog search for "An Ekle / Ses Kartı Paylaş"
  useEffect(() => {
    if (!showSongPickerModal) {
      setRemoteShareSongs([]);
      setIsSearchingShareSongs(false);
      return;
    }
    const q = songSearchTerm.trim();
    if (q.length < 2) {
      setRemoteShareSongs([]);
      setIsSearchingShareSongs(false);
      return;
    }

    let cancelled = false;
    setIsSearchingShareSongs(true);
    const timer = setTimeout(() => {
      searchTracks(q, 12)
        .then((tracks) => {
          if (!cancelled) {
            setRemoteShareSongs(tracks);
            setIsSearchingShareSongs(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setRemoteShareSongs([]);
            setIsSearchingShareSongs(false);
          }
        });
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [showSongPickerModal, songSearchTerm]);

  const activeConv = useMemo(
    () => conversations.find((c) => activeChatUser && c.user.id === activeChatUser.id),
    [conversations, activeChatUser]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv?.messages?.length, activeConv?.matchId]);

  const formatTime = (secs: number) => {
    const safe = Math.max(0, Math.floor(secs || 0));
    const m = Math.floor(safe / 60);
    const s = safe % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeConv) return;
    onSendMessage(activeConv.matchId, inputText.trim());
    setInputText('');
  };

  const handleSendIcebreaker = (text: string) => {
    if (!activeConv) return;
    onSendMessage(activeConv.matchId, text, true);
  };

  const handleShareSongConfirm = () => {
    if (!activeConv || !selectedSongToShare) return;
    const safeTimestamp = Math.max(0, Math.floor(Number(shareTimestampSecond) || 0));
    const defaultComment = `Bu şarkının ${formatTime(safeTimestamp)} saniyesini dinle!`;
    const finalComment = songComment.trim() || defaultComment;
    if (onSendSongMessage) {
      onSendSongMessage(
        activeConv.matchId,
        selectedSongToShare,
        finalComment,
        safeTimestamp
      );
    } else {
      onSendMessage(activeConv.matchId, finalComment, false);
    }
    setShowSongPickerModal(false);
    setSelectedSongToShare(null);
    setSongComment('');
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();

  // Filter conversations & discoverable cloud users by search query
  const filteredConversations = useMemo(() => {
    if (!normalizedQuery) return conversations;
    return conversations.filter(
      (c) =>
        c.user.name.toLowerCase().includes(normalizedQuery) ||
        (c.user.handle || '').toLowerCase().includes(normalizedQuery) ||
        c.user.city.toLowerCase().includes(normalizedQuery) ||
        c.matchedTrack.title.toLowerCase().includes(normalizedQuery)
    );
  }, [conversations, normalizedQuery]);

  const filteredCloudDirectory = useMemo(() => {
    if (!normalizedQuery) return discoverableCloudUsers;
    return discoverableCloudUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(normalizedQuery) ||
        (u.handle || '').toLowerCase().includes(normalizedQuery) ||
        u.city.toLowerCase().includes(normalizedQuery) ||
        (u.topGenres || []).some((g) => g.toLowerCase().includes(normalizedQuery))
    );
  }, [discoverableCloudUsers, normalizedQuery]);

  const filteredFriends = useMemo(() => {
    if (!normalizedQuery) return friendsList;
    return friendsList.filter(
      (f) =>
        f.name.toLowerCase().includes(normalizedQuery) ||
        (f.handle || '').toLowerCase().includes(normalizedQuery) ||
        f.city.toLowerCase().includes(normalizedQuery)
    );
  }, [friendsList, normalizedQuery]);

  const totalRequestsCount = incomingRequests.length + outgoingRequests.length;

  const activeFrequencyUsers = useMemo(
    () =>
      recentListeners
        .filter((u) => {
          const isSelf = u.id === 'me';
          const isHighMatch = (u.compatibilityScore || 0) >= 88;
          const isRecentHeartbeat = (u.lastHeartbeatAgoSeconds || 0) <= 45;
          return !isSelf && (u.isRealUser || isHighMatch || isRecentHeartbeat);
        })
        .slice(0, 8),
    [recentListeners]
  );

  const filteredShareSongs = useMemo(() => {
    const q = songSearchTerm.trim().toLowerCase();
    const localMatches = allSongs.filter(
      (s) =>
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        s.genre.toLowerCase().includes(q)
    );
    if (q.length < 2) return localMatches;

    const merged: Song[] = [];
    const seen = new Set<string>();
    const pushUnique = (song: Song) => {
      const key = `${song.artist.trim().toLowerCase()}::${song.title.trim().toLowerCase()}`;
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(song);
    };

    localMatches.forEach(pushUnique);
    remoteShareSongs.forEach(pushUnique);
    return merged;
  }, [allSongs, songSearchTerm, remoteShareSongs]);

  const renderUserAvatar = (user: LoungeUser, sizeClass = 'w-11 h-11') => (
    <div className="relative shrink-0">
      <div
        className={`${sizeClass} rounded-2xl bg-gradient-to-tr ${user.avatarGradient} flex items-center justify-center text-white font-bold text-xs border border-[#E8E6E1] dark:border-white/[0.08] overflow-hidden`}
      >
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
        ) : (
          user.avatarSeed
        )}
      </div>
      {user.isOnline && (
        <span
          className="absolute -bottom-1 -right-1 px-1 py-0.5 rounded-md bg-white dark:bg-[#141418] border border-[#E8E6E1] dark:border-white/[0.1] shadow-xs flex items-center justify-center"
          title="Canlı dinliyor"
        >
          <LiveMiniEqualizer />
        </span>
      )}
    </div>
  );

  const renderFriendActionButton = (user: LoungeUser) => {
    if (user.friendStatus === 'friends') {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFriend && onToggleFriend(user);
          }}
          className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition cursor-pointer min-h-[36px] flex items-center gap-1"
          title="Arkadaşlıktan çıkar"
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Arkadaş</span>
        </button>
      );
    }
    if (user.friendStatus === 'pending') {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCancelSentRequest && onCancelSentRequest(user.id);
          }}
          className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold bg-amber-500/12 text-amber-700 dark:text-amber-300 border border-amber-500/25 hover:bg-amber-500/20 transition cursor-pointer min-h-[36px] flex items-center gap-1"
          title="İsteği geri çek"
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Bekliyor</span>
        </button>
      );
    }
    if (user.friendStatus === 'pending_received') {
      const matchingReq = incomingRequests.find((r) => r.fromUser.id === user.id);
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (matchingReq && onAcceptFriendRequest) {
              onAcceptFriendRequest(matchingReq.id);
            }
          }}
          className="studio-btn-primary px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-gradient-to-br from-[#E87A3E] to-[#D97706] hover:brightness-105 text-white transition cursor-pointer min-h-[36px] flex items-center gap-1 shadow-sm"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Kabul Et</span>
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFriend && onToggleFriend(user);
        }}
        className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold bg-[#F2EDE6] hover:bg-[#E87A3E]/15 hover:text-[#D96B2C] dark:bg-[#211D1A] dark:hover:bg-[#E87A3E]/20 dark:hover:text-[#F49A5E] text-[#181512] dark:text-[#FAF7F2] border border-[#E2D9CE] dark:border-[#FFF0E1]/[0.08] transition cursor-pointer min-h-[36px] flex items-center gap-1"
      >
        <UserPlus className="w-3.5 h-3.5" />
        <span>Ekle</span>
      </button>
    );
  };

  return (
    <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-3 sm:mt-4 pb-6 space-y-5">
      {/* Desktop 2-Pane Split Layout / Mobile Single-Pane Switch */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5 lg:h-[calc(100vh-148px)] lg:min-h-[560px]">
        {/* ==================== LEFT PANE: DIRECTORY, TABS & INBOX ==================== */}
        <section
          className={`${
            activeConv && activeChatUser ? 'hidden lg:flex' : 'flex'
          } flex-col bg-white dark:bg-[#171412] border border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08] shadow-[0_4px_20px_rgba(24,21,18,0.04)] dark:shadow-none rounded-2xl overflow-hidden lg:h-full`}
        >
          {/* Left Header */}
          <div className="p-4 sm:p-5 border-b border-[#EAE4DC] dark:border-[#FFF0E1]/[0.06] space-y-3.5 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold text-[#181512] dark:text-[#FAF7F2] tracking-tight">
                  Sohbet
                </h1>
                <p className="text-[11px] text-[#6B635B] dark:text-[#A39A91]">
                  {isCloudAuthenticated
                    ? 'Bulut senkronizasyonu aktif · Gerçek zamanlı'
                    : 'Aynı şarkıdan başlayan sohbetler'}
                </p>
              </div>
              <div className="text-right font-mono tabular-nums">
                <span className="text-xs font-medium text-[#16A34A] dark:text-[#22C55E] inline-flex items-center gap-1.5">
                  <LiveMiniEqualizer />
                  <span>{conversations.length}</span>
                </span>
              </div>
            </div>

            {/* Mobile-Only Single Cloud Connect Action */}
            {!isCloudAuthenticated && onGoogleSignIn && (
              <div className="lg:hidden p-3 rounded-xl bg-[#F2EDE6] dark:bg-[#211D1A] border border-[#E2D9CE] dark:border-[#FFF0E1]/[0.08] flex items-center justify-between gap-2.5">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#181512] dark:text-[#FAF7F2] flex items-center gap-1.5">
                    <Cloud className="w-3.5 h-3.5 text-[#16A34A] dark:text-[#22C55E] shrink-0" strokeWidth={1.75} />
                    <span className="truncate">Bulut Sohbeti Aç</span>
                  </div>
                  <p className="text-[11px] text-[#6B635B] dark:text-[#A39A91] mt-0.5 truncate">
                    Cihazlar arası anlık mesajlaşma
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onGoogleSignIn}
                  disabled={isAuthLoading}
                  className="studio-btn-primary px-3 py-2 rounded-xl bg-gradient-to-br from-[#E87A3E] to-[#D97706] hover:brightness-105 disabled:opacity-60 text-white font-semibold text-xs flex items-center gap-1.5 transition active:scale-95 shrink-0 min-h-[40px] cursor-pointer shadow-lg shadow-amber-950/20"
                >
                  {isAuthLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.75} />
                  ) : (
                    <LogIn className="w-3.5 h-3.5" strokeWidth={1.75} />
                  )}
                  <span>Bağla</span>
                </button>
              </div>
            )}

            {/* Unified Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-[#6B635B] dark:text-[#A39A91] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.75} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Kullanıcı adı, isim veya şehir ara..."
                className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-[#F2EDE6] dark:bg-[#211D1A] border border-[#E2D9CE] dark:border-[#FFF0E1]/[0.08] text-xs text-[#181512] dark:text-[#FAF7F2] placeholder:text-[#6B635B] dark:placeholder:text-[#A39A91] focus:outline-none focus:border-[#E87A3E]/60 transition min-h-[42px]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#6B635B] dark:text-[#A39A91] hover:text-[#181512] dark:hover:text-[#FAF7F2] cursor-pointer"
                  aria-label="Aramayı temizle"
                >
                  <X className="w-3.5 h-3.5" strokeWidth={1.75} />
                </button>
              )}
            </div>

            {/* Segmented Tabs: Tümü | Arkadaşlar | İstekler (Zero truncation on narrow sidebar) */}
            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#F2EDE6] dark:bg-[#211D1A] border border-[#E2D9CE] dark:border-[#FFF0E1]/[0.06]">
              <button
                type="button"
                onClick={() => setSocialTab('chats')}
                className={`px-2 py-1.5 text-xs font-medium whitespace-nowrap rounded-lg flex items-center justify-center gap-1 transition cursor-pointer min-h-[36px] border ${
                  socialTab === 'chats'
                    ? 'bg-[#E87A3E]/15 text-[#D96B2C] dark:text-[#F49A5E] font-semibold border-[#E87A3E]/25'
                    : 'text-[#6B635B] dark:text-[#A39A91] hover:text-[#181512] dark:hover:text-[#FAF7F2] border-transparent'
                }`}
              >
                <span>Tümü</span>
              </button>

              <button
                type="button"
                onClick={() => setSocialTab('friends')}
                className={`px-2 py-1.5 text-xs font-medium whitespace-nowrap rounded-lg flex items-center justify-center gap-1 transition cursor-pointer min-h-[36px] border ${
                  socialTab === 'friends'
                    ? 'bg-[#E87A3E]/15 text-[#D96B2C] dark:text-[#F49A5E] font-semibold border-[#E87A3E]/25'
                    : 'text-[#6B635B] dark:text-[#A39A91] hover:text-[#181512] dark:hover:text-[#FAF7F2] border-transparent'
                }`}
              >
                <span>Arkadaşlar</span>
                {friendsList.length > 0 && (
                  <span className="text-[10px] font-mono font-semibold text-[#16A34A] dark:text-[#22C55E] tabular-nums shrink-0">
                    {friendsList.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSocialTab('requests')}
                className={`px-2 py-1.5 text-xs font-medium whitespace-nowrap rounded-lg flex items-center justify-center gap-1 transition cursor-pointer min-h-[36px] border ${
                  socialTab === 'requests'
                    ? 'bg-[#E87A3E]/15 text-[#D96B2C] dark:text-[#F49A5E] font-semibold border-[#E87A3E]/25'
                    : 'text-[#6B635B] dark:text-[#A39A91] hover:text-[#181512] dark:hover:text-[#FAF7F2] border-transparent'
                }`}
              >
                <span>İstekler</span>
                {incomingRequests.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-gradient-to-br from-[#E87A3E] to-[#D97706] text-white text-[10px] font-mono font-bold tabular-nums shrink-0">
                    {incomingRequests.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Left Scrollable Body */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-5 space-y-4">
            {/* Search matches in Real Cloud Users Directory (shown across tabs when searching) */}
            {normalizedQuery && isCloudAuthenticated && (
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 px-1 flex items-center justify-between">
                  <span>ListenHub Üye Dizini</span>
                  <span className="tabular-nums">{filteredCloudDirectory.length} sonuç</span>
                </div>
                {filteredCloudDirectory.length === 0 ? (
                  <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-[#E4E2EC] dark:border-white/[0.06] text-xs text-zinc-500 dark:text-zinc-400">
                    "{searchQuery}" ile eşleşen kayıtlı kullanıcı bulunamadı.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {filteredCloudDirectory.map((user) => (
                      <div
                        key={user.id}
                        onClick={() => onOpenUserProfile && onOpenUserProfile(user)}
                        className="p-2.5 rounded-2xl bg-zinc-50/80 dark:bg-white/[0.03] hover:bg-zinc-100 dark:hover:bg-white/[0.06] border border-[#E4E2EC] dark:border-white/[0.06] flex items-center justify-between gap-2.5 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {renderUserAvatar(user, 'w-10 h-10')}
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                              {user.name}
                            </div>
                            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                              {user.handle || user.city} · {user.city}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {renderFriendActionButton(user)}
                          {onStartChatWithUser && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onStartChatWithUser(user);
                              }}
                              className="studio-btn-primary p-2 rounded-xl bg-gradient-to-br from-[#E87A3E] to-[#D97706] hover:brightness-105 text-white transition cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center shadow-sm"
                              title="Mesaj Gönder"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 1: SOHBETLER */}
            {socialTab === 'chats' && (
              <>
                {/* Active Frequency Strip */}
                {!normalizedQuery && activeFrequencyUsers.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B635B] dark:text-[#A39A91] flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-[#E87A3E]" strokeWidth={1.75} />
                        <span>Şu An Frekansta</span>
                      </span>
                      <span className="text-[11px] font-mono font-semibold text-[#16A34A] dark:text-[#22C55E] tabular-nums">
                        {activeFrequencyUsers.length} aktif
                      </span>
                    </div>
                    <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1 px-1 pr-6 [mask-image:linear-gradient(to_right,black_88%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_right,black_88%,transparent_100%)]">
                      {activeFrequencyUsers.map((user) => {
                        const existingConv = conversations.find((c) => c.user.id === user.id);
                        return (
                          <button
                            type="button"
                            key={user.id}
                            onClick={() => {
                              if (existingConv) {
                                onSelectConversation(existingConv);
                              } else if (onStartChatWithUser) {
                                onStartChatWithUser(
                                  user,
                                  `Selam ${user.name}! ${currentSong?.title || 'bu şarkı'} anında aynı frekanstayız.`
                                );
                              }
                            }}
                            className="flex flex-col items-center gap-1 shrink-0 group cursor-pointer active:scale-95 transition"
                          >
                            <div className="relative">
                              <div className="w-12 h-12 rounded-full p-[2px] border border-[#16A34A]/50 dark:border-[#22C55E]/50">
                                <div
                                  className={`w-full h-full rounded-full bg-gradient-to-tr ${user.avatarGradient} flex items-center justify-center text-white font-bold text-xs overflow-hidden`}
                                >
                                  {user.avatarUrl ? (
                                    <img
                                      src={user.avatarUrl}
                                      alt={user.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    user.avatarSeed
                                  )}
                                </div>
                              </div>
                              <span className="absolute -bottom-0.5 -right-0.5 px-1 py-0.5 rounded-md bg-white dark:bg-[#171412] border border-[#EAE4DC] dark:border-[#FFF0E1]/[0.1] flex items-center justify-center">
                                <LiveMiniEqualizer />
                              </span>
                            </div>
                            <span className="text-[11px] font-medium text-[#181512] dark:text-[#FAF7F2] max-w-[64px] truncate">
                              {user.name.split(' ')[0]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Conversation List */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#6B635B] dark:text-[#A39A91] px-1">
                    Gelen Kutusu
                  </div>

                  {filteredConversations.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-[#F2EDE6]/70 dark:bg-[#211D1A] border border-[#E2D9CE] dark:border-[#FFF0E1]/[0.06] text-center space-y-2">
                      <MessageSquare className="w-7 h-7 text-[#6B635B] dark:text-[#A39A91] mx-auto" />
                      <p className="text-xs font-semibold text-[#181512] dark:text-[#FAF7F2]">
                        Henüz eşleşen sohbet yok
                      </p>
                      <p className="text-[11px] text-[#6B635B] dark:text-[#A39A91]">
                        Arkadaşlar sekmesinden gerçek üyeleri keşfet veya Canlı odadan bir dinleyiciye dokun.
                      </p>
                    </div>
                  ) : (
                    filteredConversations.map((conv) => {
                      const isSelected = activeConv?.matchId === conv.matchId;
                      return (
                        <button
                          type="button"
                          key={conv.matchId}
                          onClick={() => onSelectConversation(conv)}
                          className={`w-full text-left p-3 rounded-2xl flex items-center justify-between gap-3 transition cursor-pointer border ${
                            isSelected
                              ? 'bg-[#E87A3E]/12 border-[#E87A3E]/30 shadow-xs'
                              : 'bg-transparent hover:bg-[#F2EDE6]/70 dark:hover:bg-[#211D1A] border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {renderUserAvatar(conv.user, 'w-11 h-11')}

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-sm font-semibold text-[#181512] dark:text-[#FAF7F2] truncate">
                                    {conv.user.name}
                                  </span>
                                  {conv.isCloudConversation && (
                                    <span className="text-[10px] font-bold text-[#16A34A] dark:text-[#22C55E] shrink-0">
                                      · Canlı
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] font-mono text-[#6B635B] dark:text-[#A39A91] tabular-nums shrink-0">
                                  {conv.lastMessageTime}
                                </span>
                              </div>

                              <div className="text-[11px] text-[#6B635B] dark:text-[#A39A91] truncate mt-0.5 flex items-center gap-1">
                                <Music className="w-3 h-3 text-[#E87A3E] shrink-0" />
                                <span className="truncate">
                                  {conv.matchedTrack.title} · <span className="font-mono tabular-nums">{formatTime(conv.matchedSecond)}</span>
                                </span>
                              </div>

                              <div className="text-xs text-[#6B635B] dark:text-[#A39A91] truncate mt-0.5">
                                {conv.lastMessage}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {conv.unreadCount > 0 && (
                              <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-gradient-to-br from-[#E87A3E] to-[#D97706] text-white text-[10px] font-mono font-extrabold flex items-center justify-center tabular-nums">
                                {conv.unreadCount}
                              </span>
                            )}
                            <ChevronRight className="w-4 h-4 text-[#6B635B] dark:text-[#A39A91] lg:hidden" />
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            )}

            {/* TAB 2: ARKADAŞLAR & ÜYE KEŞFİ */}
            {socialTab === 'friends' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 px-1 flex items-center justify-between">
                    <span>Arkadaşların</span>
                    <span className="tabular-nums">{filteredFriends.length} kişi</span>
                  </div>

                  {filteredFriends.length === 0 ? (
                    <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-[#E4E2EC] dark:border-white/[0.06] text-center space-y-1.5">
                      <Users className="w-6 h-6 text-zinc-400 mx-auto" />
                      <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        Henüz arkadaş eklemedin
                      </p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Aşağıdaki ListenHub üyelerinden veya Canlı odadan arkadaşlık isteği gönderebilirsin.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {filteredFriends.map((friend) => (
                        <div
                          key={friend.id}
                          onClick={() => onOpenUserProfile && onOpenUserProfile(friend)}
                          className="p-2.5 rounded-2xl bg-zinc-50/70 dark:bg-white/[0.03] hover:bg-zinc-100 dark:hover:bg-white/[0.06] border border-[#E4E2EC] dark:border-white/[0.06] flex items-center justify-between gap-2.5 transition cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {renderUserAvatar(friend, 'w-10 h-10')}
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-zinc-900 dark:text-white truncate flex items-center gap-1.5">
                                <span className="truncate">{friend.name}</span>
                                {friend.isRealUser && (
                                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                    · Bulut
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                                {friend.currentSong?.title
                                  ? `${friend.currentSong.title} · ${friend.city}`
                                  : friend.city}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {onStartChatWithUser && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onStartChatWithUser(friend);
                                }}
                                className="studio-btn-primary px-2.5 py-1.5 rounded-xl bg-gradient-to-br from-[#E87A3E] to-[#D97706] hover:brightness-105 text-white font-bold text-[11px] transition cursor-pointer min-h-[36px] flex items-center gap-1 shadow-sm"
                              >
                                <Send className="w-3 h-3" />
                                <span>Mesaj</span>
                              </button>
                            )}
                            {onToggleFriend && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleFriend(friend);
                                }}
                                className="p-2 rounded-xl text-[#6B635B] dark:text-[#A39A91] hover:text-red-500 hover:bg-red-500/10 transition cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
                                title="Arkadaşlıktan çıkar"
                              >
                                <UserMinus className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Discover Real Cloud Users */}
                {isCloudAuthenticated && (
                  <div className="space-y-2 pt-2 border-t border-[#EAE4DC] dark:border-[#FFF0E1]/[0.06]">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#16A34A] dark:text-[#22C55E] px-1 flex items-center justify-between">
                      <span>Aktif ListenHub Üyeleri</span>
                      <span className="font-mono tabular-nums">{filteredCloudDirectory.length} üye</span>
                    </div>

                    {filteredCloudDirectory.length === 0 ? (
                      <div className="p-4 rounded-2xl bg-[#F2EDE6]/70 dark:bg-[#211D1A] border border-[#E2D9CE] dark:border-[#FFF0E1]/[0.06] text-xs text-[#6B635B] dark:text-[#A39A91]">
                        Şu an başka keşfedilebilir üye yok. Başka bir cihazdan veya arkadaşının Google hesabıyla giriş yapıldığında burada anında görünür.
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {filteredCloudDirectory.map((user) => (
                          <div
                            key={user.id}
                            onClick={() => onOpenUserProfile && onOpenUserProfile(user)}
                            className="p-2.5 rounded-2xl bg-[#F2EDE6]/70 dark:bg-[#211D1A] hover:bg-[#EAE4DC] dark:hover:bg-[#FFF0E1]/[0.06] border border-[#E2D9CE] dark:border-[#FFF0E1]/[0.06] flex items-center justify-between gap-2.5 transition cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              {renderUserAvatar(user, 'w-10 h-10')}
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-[#181512] dark:text-[#FAF7F2] truncate">
                                  {user.name}
                                </div>
                                <div className="text-[11px] text-[#6B635B] dark:text-[#A39A91] truncate">
                                  {user.handle} · {user.city}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {renderFriendActionButton(user)}
                              {onStartChatWithUser && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onStartChatWithUser(user);
                                  }}
                                  className="p-2 rounded-xl bg-white hover:bg-[#E87A3E]/15 hover:text-[#D96B2C] dark:bg-[#171412] dark:hover:bg-[#E87A3E]/20 dark:hover:text-[#F49A5E] text-[#181512] dark:text-[#FAF7F2] border border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08] transition cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
                                  title="Sohbet Başlat"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: ARKADAŞLIK İSTEKLERİ */}
            {socialTab === 'requests' && (
              <div className="space-y-4">
                {/* Incoming Requests */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#6B635B] dark:text-[#A39A91] px-1 flex items-center justify-between">
                    <span>Gelen İstekler</span>
                    <span className="font-mono tabular-nums">{incomingRequests.length}</span>
                  </div>

                  {incomingRequests.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-[#F2EDE6]/70 dark:bg-[#211D1A] border border-[#E2D9CE] dark:border-[#FFF0E1]/[0.06] text-xs text-[#6B635B] dark:text-[#A39A91] text-center">
                      Bekleyen gelen arkadaşlık isteğin yok.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {incomingRequests.map((req) => (
                        <div
                          key={req.id}
                          className="p-3 rounded-2xl bg-[#F2EDE6]/70 dark:bg-[#211D1A] border border-[#E2D9CE] dark:border-[#FFF0E1]/[0.08] space-y-2.5"
                        >
                          <div className="flex items-center gap-2.5">
                            {renderUserAvatar(req.fromUser, 'w-10 h-10')}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-[#181512] dark:text-[#FAF7F2] truncate">
                                  {req.fromUser.name}
                                </span>
                                <span className="text-[10px] font-mono text-[#6B635B] dark:text-[#A39A91] tabular-nums shrink-0">
                                  {req.timestamp}
                                </span>
                              </div>
                              <div className="text-[11px] text-[#6B635B] dark:text-[#A39A91] truncate">
                                {req.fromUser.city}
                                {req.songContext ? ` · ${req.songContext}` : ''}
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => onAcceptFriendRequest && onAcceptFriendRequest(req.id)}
                              className="studio-btn-primary py-2 px-3 rounded-xl bg-gradient-to-br from-[#E87A3E] to-[#D97706] hover:brightness-105 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer min-h-[40px] shadow-sm"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Kabul Et</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeclineFriendRequest && onDeclineFriendRequest(req.id)}
                              className="py-2 px-3 rounded-xl bg-white hover:bg-[#EAE4DC] dark:bg-[#171412] dark:hover:bg-[#FFF0E1]/[0.08] text-[#181512] dark:text-[#FAF7F2] border border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08] font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer min-h-[40px]"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reddet</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Outgoing Requests */}
                <div className="space-y-2 pt-2 border-t border-[#E4E2EC] dark:border-white/[0.06]">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 px-1 flex items-center justify-between">
                    <span>Gönderilen İstekler</span>
                    <span className="tabular-nums">{outgoingRequests.length}</span>
                  </div>

                  {outgoingRequests.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-[#E4E2EC] dark:border-white/[0.06] text-xs text-zinc-500 dark:text-zinc-400 text-center">
                      {totalRequestsCount === 0
                        ? 'Henüz gönderilmiş bekleyen isteğin yok.'
                        : 'Gönderilmiş bekleyen istek bulunmuyor.'}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {outgoingRequests.map((req) => {
                        const target = req.toUser || req.fromUser;
                        return (
                          <div
                            key={req.id}
                            className="p-2.5 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-[#E4E2EC] dark:border-white/[0.06] flex items-center justify-between gap-2.5"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              {renderUserAvatar(target, 'w-9 h-9')}
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                                  {target.name}
                                </div>
                                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                                  Onay bekleniyor · {req.timestamp}
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => onCancelSentRequest && onCancelSentRequest(target.id)}
                              className="px-2.5 py-1.5 rounded-xl bg-zinc-200/80 hover:bg-red-500/15 hover:text-red-500 dark:bg-white/[0.07] dark:text-zinc-300 text-zinc-700 text-[11px] font-semibold transition cursor-pointer min-h-[36px]"
                            >
                              Geri Çek
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ==================== RIGHT PANE: ACTIVE CHAT ROOM ==================== */}
        <section
          className={`${
            activeConv && activeChatUser ? 'flex' : 'hidden lg:flex'
          } flex-col bg-white dark:bg-[#171412] border border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08] shadow-[0_4px_20px_rgba(24,21,18,0.04)] dark:shadow-none rounded-2xl overflow-hidden lg:h-full min-h-[540px]`}
        >
          {activeConv && activeChatUser ? (
            <>
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08] flex items-center justify-between bg-[#FAF8F4] dark:bg-[#171412] shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={onBackToList}
                    className="lg:hidden px-2.5 py-2 text-[#181512] dark:text-[#FAF7F2] rounded-xl bg-[#F2EDE6] dark:bg-[#211D1A] hover:bg-[#EAE4DC] dark:hover:bg-[#FFF0E1]/10 transition cursor-pointer min-h-[44px] flex items-center gap-1 text-xs font-semibold shrink-0"
                    aria-label="Geri Dön"
                  >
                    <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
                    <span>Geri</span>
                  </button>

                  <div
                    onClick={() => onOpenUserProfile && onOpenUserProfile(activeChatUser)}
                    className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
                  >
                    {renderUserAvatar(activeChatUser, 'w-10 h-10')}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#181512] dark:text-[#FAF7F2] truncate">
                          {activeChatUser.name}
                        </span>
                        {activeChatUser.isOnline && <LiveMiniEqualizer />}
                      </div>
                      <div className="text-xs text-[#6B635B] dark:text-[#A39A91] truncate flex items-center gap-1.5">
                        <span>{activeChatUser.city}</span>
                        <span>·</span>
                        <span>{activeChatUser.isOnline ? 'Canlı dinliyor' : 'Çevrimdışı'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {onToggleFriend && renderFriendActionButton(activeChatUser)}
                  {onOpenUserProfile && (
                    <button
                      type="button"
                      onClick={() => onOpenUserProfile(activeChatUser)}
                      className="px-3 py-2 rounded-xl bg-[#F2EDE6] hover:bg-[#E8E0D5] dark:bg-[#211D1A] dark:hover:bg-[#FFF0E1]/10 border border-[#E2D9CE] dark:border-[#FFF0E1]/[0.06] text-xs font-semibold text-[#181512] dark:text-[#FAF7F2] transition cursor-pointer min-h-[38px]"
                    >
                      Profil
                    </button>
                  )}
                </div>
              </div>

              {/* Single-Strip Shared Track Encounter Banner ("Tanışma Anı") */}
              {(() => {
                const encounterSec = activeConv.matchedSecond || 0;
                const formattedEncounterTime = formatTime(encounterSec);
                const encounterProgressPct = Math.min(
                  92,
                  Math.max(
                    12,
                    Math.round((encounterSec / (activeConv.matchedTrack.durationSeconds || 240)) * 100)
                  )
                );

                return (
                  <div className="mx-3.5 mt-3 p-2.5 rounded-xl bg-[#F2EDE6] dark:bg-[#211D1A] border border-[#E2D9CE] dark:border-[#FFF0E1]/[0.08] flex items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-[#171412] shrink-0">
                        {activeConv.matchedTrack.coverUrl ? (
                          <img
                            src={activeConv.matchedTrack.coverUrl}
                            alt={activeConv.matchedTrack.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div
                            className={`w-full h-full bg-gradient-to-tr ${activeConv.matchedTrack.coverGradient} flex items-center justify-center text-white`}
                          >
                            <Music className="w-4 h-4" strokeWidth={1.75} />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#16A34A] dark:text-[#22C55E]">
                          Tanışma Anı
                        </div>
                        <div className="text-xs font-semibold text-[#181512] dark:text-[#FAF7F2] truncate">
                          {activeConv.matchedTrack.title} ·{' '}
                          <span className="font-mono tabular-nums">{formattedEncounterTime}</span>
                        </div>
                        <div className="mt-1 w-full h-1 bg-[#E2D9CE] dark:bg-[#FFF0E1]/12 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#E87A3E] to-[#D97706] rounded-full"
                            style={{ width: `${encounterProgressPct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {onPlayMoment && (
                      <button
                        type="button"
                        onClick={() => {
                          onPlayMoment(activeConv.matchedTrack, encounterSec);
                          setIsCoListeningActive(true);
                        }}
                        className="studio-btn-primary px-3 py-2 rounded-xl bg-gradient-to-br from-[#E87A3E] to-[#D97706] hover:brightness-105 text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0 active:scale-95 min-h-[38px] shadow-md shadow-amber-950/20"
                      >
                        <Play className="w-3 h-3 fill-current" strokeWidth={1.75} />
                        <span className="font-mono tabular-nums">{formattedEncounterTime}</span>
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* Messages Stream */}
              <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-3.5 min-h-[240px]">
                {activeConv.messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-8 space-y-2">
                    <Headphones className="w-8 h-8 text-[#6B635B] dark:text-[#A39A91]" strokeWidth={1.5} />
                    <p className="text-sm font-semibold text-[#181512] dark:text-[#FAF7F2]">
                      {activeChatUser.name} ile sohbeti başlat
                    </p>
                    <p className="text-xs text-[#6B635B] dark:text-[#A39A91] max-w-xs">
                      Şu an çalan şarkının bir saniyesini paylaş veya doğrudan yaz.
                    </p>
                  </div>
                ) : (
                  activeConv.messages.map((msg) => {
                    const isMe = msg.senderId === 'me';
                    const shouldShowSharedSongCard = Boolean(msg.sharedSong) && !msg.isIcebreaker;

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-[75%] rounded-2xl text-xs leading-relaxed p-3.5 ${
                            isMe
                              ? 'studio-btn-primary bg-gradient-to-br from-[#E87A3E] to-[#D97706] text-white font-medium rounded-br-sm shadow-sm'
                              : 'bg-[#F2EDE6] dark:bg-[#211D1A] border border-[#E2D9CE] dark:border-[#FFF0E1]/[0.06] text-[#181512] dark:text-[#FAF7F2] rounded-bl-sm'
                          }`}
                        >
                          {shouldShowSharedSongCard && msg.sharedSong && (
                            <div
                              onClick={() => {
                                const targetSec = Number(msg.sharedTimestampSecond);
                                if (
                                  msg.sharedTimestampSecond !== undefined &&
                                  Number.isFinite(targetSec) &&
                                  onPlayMoment
                                ) {
                                  onPlayMoment(msg.sharedSong!, Math.max(0, Math.floor(targetSec)));
                                } else if (onPlaySong) {
                                  onPlaySong(msg.sharedSong!);
                                }
                              }}
                              className="keep-dark mb-2.5 p-2.5 rounded-xl flex items-center justify-between gap-2.5 cursor-pointer transition border bg-[#0E0C0B] border-[#FFF0E1]/[0.12] text-white hover:border-[#E87A3E]/50"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-[#211D1A] shrink-0">
                                  {msg.sharedSong.coverUrl ? (
                                    <img
                                      src={msg.sharedSong.coverUrl}
                                      alt={msg.sharedSong.title}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div
                                      className={`w-full h-full bg-gradient-to-tr ${msg.sharedSong.coverGradient}`}
                                    />
                                  )}
                                  <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                                    <Play className="w-3.5 h-3.5 text-white fill-white" />
                                  </div>
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-semibold text-white truncate">
                                      {msg.sharedSong.title}
                                    </span>
                                    {msg.sharedTimestampSecond !== undefined && (
                                      <span className="text-[10px] font-mono font-semibold text-[#22C55E] shrink-0 tabular-nums">
                                        {formatTime(msg.sharedTimestampSecond)}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-[#A39A91] truncate">
                                    {msg.sharedSong.artist}
                                  </div>
                                </div>
                              </div>

                              <span className="px-2.5 py-1 rounded-lg bg-gradient-to-br from-[#E87A3E] to-[#D97706] text-white font-semibold text-[11px] shrink-0">
                                Dinle
                              </span>
                            </div>
                          )}

                          <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                        </div>

                        <span className="text-[10px] font-mono text-[#6B635B] dark:text-[#A39A91] mt-1 px-1 flex items-center gap-1 tabular-nums">
                          <span>{msg.timestamp}</span>
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Musical Icebreakers Bar */}
              <div className="px-3 py-2 border-t border-[#EAE4DC] dark:border-[#FFF0E1]/[0.06] bg-[#FAF8F4] dark:bg-[#0E0C0B]/40 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
                <span className="text-[10px] font-semibold text-[#6B635B] dark:text-[#A39A91] uppercase tracking-wider shrink-0 pl-1">
                  Hızlı Başlangıç
                </span>
                {[
                  'Bu şarkının solosu hakkında ne düşünüyorsun?',
                  'Sıradaki şarkıyı sen seçer misin?',
                  'Bu grubun hiç canlı konserine gittin mi?',
                ].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleSendIcebreaker(prompt)}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#F2EDE6] dark:bg-[#211D1A] dark:hover:bg-[#FFF0E1]/10 text-[#181512] dark:text-[#FAF7F2] text-xs shrink-0 whitespace-nowrap transition cursor-pointer border border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Composer */}
              <form
                onSubmit={handleSend}
                className="p-3 sm:p-3.5 border-t border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08] flex items-center gap-2 bg-[#FAF8F4] dark:bg-[#171412] shrink-0"
              >
                <button
                  type="button"
                  onClick={() => {
                    const targetSong = currentSong || allSongs[0] || null;
                    setSelectedSongToShare(targetSong);
                    const sec = currentSecond || 0;
                    setShareTimestampSecond(sec);
                    setSongComment(`Bu şarkının ${formatTime(sec)} saniyesini dinle.`);
                    setShowSongPickerModal(true);
                  }}
                  className="px-3 py-2.5 rounded-xl bg-[#F2EDE6] hover:bg-[#E8E0D5] dark:bg-[#211D1A] dark:hover:bg-[#FFF0E1]/10 text-[#181512] dark:text-[#FAF7F2] border border-[#E2D9CE] dark:border-[#FFF0E1]/[0.08] transition cursor-pointer flex items-center gap-1.5 shrink-0 min-h-[44px]"
                  title="Şarkı ve saniye paylaş"
                >
                  <Music className="w-4 h-4 text-[#E87A3E]" strokeWidth={1.75} />
                  <span className="text-xs font-semibold hidden sm:inline">An Paylaş</span>
                  <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
                </button>

                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Mesaj yaz..."
                  className="flex-1 py-2.5 px-4 bg-white dark:bg-[#211D1A] border border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08] rounded-xl text-xs text-[#181512] dark:text-[#FAF7F2] placeholder:text-[#6B635B] dark:placeholder:text-[#A39A91] focus:outline-none focus:border-[#E87A3E]/60 transition min-h-[44px]"
                />

                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="studio-btn-primary p-2.5 bg-gradient-to-br from-[#E87A3E] to-[#D97706] hover:brightness-105 disabled:opacity-30 disabled:pointer-events-none text-white font-bold rounded-xl transition cursor-pointer active:scale-95 shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center shadow-lg shadow-amber-950/20"
                  aria-label="Gönder"
                >
                  <Send className="w-4 h-4" strokeWidth={1.75} />
                </button>
              </form>
            </>
          ) : (
            /* Desktop Empty State when no conversation is selected */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#F2EDE6] dark:bg-[#211D1A] border border-[#E2D9CE] dark:border-[#FFF0E1]/[0.08] flex items-center justify-center text-[#E87A3E]">
                <MessageSquare className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h2 className="text-base font-bold text-[#181512] dark:text-[#FAF7F2]">
                  Bir Sohbet Seç
                </h2>
                <p className="text-xs text-[#6B635B] dark:text-[#A39A91] leading-relaxed">
                  Sol panelden devam eden konuşmalarını açabilir veya aynı saniyede karşılaştığın dinleyicilerle sohbet başlatabilirsin.
                </p>
              </div>
              {!isCloudAuthenticated && onGoogleSignIn && (
                <button
                  type="button"
                  onClick={onGoogleSignIn}
                  disabled={isAuthLoading}
                  className="studio-btn-primary px-5 py-3 rounded-xl bg-gradient-to-br from-[#E87A3E] to-[#D97706] hover:brightness-105 text-white font-semibold text-xs flex items-center gap-2 transition cursor-pointer min-h-[44px] shadow-lg shadow-amber-950/20"
                >
                  {isAuthLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.75} />
                  ) : (
                    <LogIn className="w-4 h-4" strokeWidth={1.75} />
                  )}
                  <span>Hesap / Bulut Sohbeti Bağla</span>
                </button>
              )}
            </div>
          )}
        </section>
      </div>

      {/* ==================== SONG & TIMESTAMP SHARE MODAL ==================== */}
      {showSongPickerModal && activeConv && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200 overflow-y-auto"
          onClick={() => setShowSongPickerModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg bg-white dark:bg-[#171412] border border-[#EAE4DC] dark:border-[#FFF0E1]/[0.1] rounded-3xl flex flex-col shadow-2xl overflow-hidden max-h-[88vh]"
          >
            <div className="px-5 py-4 border-b border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#E87A3E]/15 border border-[#E87A3E]/30 text-[#E87A3E] flex items-center justify-center">
                  <Zap className="w-4 h-4" strokeWidth={1.75} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#181512] dark:text-[#FAF7F2]">
                    Şarkı Anı & Ses Kartı Gönder
                  </h3>
                  <p className="text-[11px] text-[#6B635B] dark:text-[#A39A91]">
                    {activeChatUser?.name} ile oynatılabilir zaman damgalı şarkı paylaş
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSongPickerModal(false)}
                className="p-2 rounded-xl text-[#6B635B] dark:text-[#A39A91] hover:text-[#181512] dark:hover:text-[#FAF7F2] transition cursor-pointer"
                aria-label="Kapat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 no-scrollbar">
              {selectedSongToShare && (
                <div className="p-4 rounded-2xl bg-[#F2EDE6] dark:bg-[#211D1A] border border-[#E2D9CE] dark:border-[#FFF0E1]/[0.08] space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-[#181512] dark:text-[#FAF7F2] truncate">
                        {selectedSongToShare.title}
                      </div>
                      <div className="text-xs text-[#6B635B] dark:text-[#A39A91] truncate">
                        {selectedSongToShare.artist}
                      </div>
                    </div>
                    <div className="px-2.5 py-1 rounded-xl bg-[#E87A3E]/15 text-[#D96B2C] dark:text-[#F49A5E] font-mono font-bold text-xs tabular-nums flex items-center gap-1 shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatTime(shareTimestampSecond)}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <input
                      type="range"
                      min={0}
                      max={selectedSongToShare.durationSeconds || 240}
                      value={shareTimestampSecond}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setShareTimestampSecond(val);
                        setSongComment(`Bu şarkının ${formatTime(val)} saniyesini dinle!`);
                      }}
                      className="w-full accent-[#E87A3E] cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-[#6B635B] dark:text-[#A39A91] tabular-nums">
                      <span>00:00</span>
                      <span>{formatTime(selectedSongToShare.durationSeconds || 240)}</span>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={songComment}
                    onChange={(e) => setSongComment(e.target.value)}
                    placeholder="Kısa bir not ekle..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#171412] border border-[#EAE4DC] dark:border-[#FFF0E1]/[0.1] text-xs text-[#181512] dark:text-[#FAF7F2] focus:outline-none focus:border-[#E87A3E]"
                  />

                  <button
                    type="button"
                    onClick={handleShareSongConfirm}
                    className="studio-btn-primary w-full py-3 rounded-xl bg-gradient-to-br from-[#E87A3E] to-[#D97706] hover:brightness-105 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer min-h-[44px] shadow-lg shadow-amber-950/20"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Ses Kartını Gönder ({formatTime(shareTimestampSecond)})</span>
                  </button>
                </div>
              )}

              <div className="space-y-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={songSearchTerm}
                    onChange={(e) => setSongSearchTerm(e.target.value)}
                    placeholder="İstediğin şarkı, sanatçı veya YouTube linki ara..."
                    className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-zinc-100 dark:bg-white/[0.05] border border-zinc-200 dark:border-white/[0.08] text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                  {isSearchingShareSongs ? (
                    <Loader2 className="w-4 h-4 text-emerald-500 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                  ) : songSearchTerm.trim().length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setSongSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                      aria-label="Aramayı temizle"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : null}
                </div>

                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                  {isSearchingShareSongs && filteredShareSongs.length === 0 && (
                    <div className="py-6 flex items-center justify-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                      <span>Katalogda aranıyor...</span>
                    </div>
                  )}

                  {!isSearchingShareSongs &&
                    songSearchTerm.trim().length >= 2 &&
                    filteredShareSongs.length === 0 && (
                      <div className="py-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
                        "{songSearchTerm.trim()}" için eşleşen şarkı bulunamadı.
                      </div>
                    )}

                  {filteredShareSongs.slice(0, 18).map((song) => (
                    <button
                      key={song.id}
                      type="button"
                      onClick={() => {
                        setSelectedSongToShare(song);
                        const isSameAsNow =
                          currentSong &&
                          (currentSong.id === song.id ||
                            (currentSong.title.toLowerCase() === song.title.toLowerCase() &&
                              currentSong.artist.toLowerCase() === song.artist.toLowerCase()));
                        const initialSec = isSameAsNow ? Math.max(0, Math.floor(currentSecond)) : 0;
                        setShareTimestampSecond(initialSec);
                        setSongComment(
                          initialSec > 0
                            ? `Bu şarkının ${formatTime(initialSec)} saniyesini dinle!`
                            : `${song.artist} - ${song.title} parçasını dinlemelisin!`
                        );
                      }}
                      className={`w-full text-left p-2 rounded-xl flex items-center justify-between gap-2.5 transition cursor-pointer border ${
                        selectedSongToShare?.id === song.id
                          ? 'bg-emerald-500/12 border-emerald-500/40'
                          : 'bg-zinc-50 dark:bg-white/[0.02] border-transparent hover:bg-zinc-100 dark:hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-lg overflow-hidden bg-zinc-900 shrink-0 ring-1 ring-black/10 dark:ring-white/10">
                          {song.coverUrl ? (
                            <img
                              src={song.coverUrl}
                              alt={song.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div
                              className={`w-full h-full bg-gradient-to-tr ${song.coverGradient} flex items-center justify-center`}
                            >
                              <Music className="w-4 h-4 text-white/80" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                            {song.title}
                          </div>
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                            {song.artist}
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] text-zinc-500 tabular-nums shrink-0">
                        {formatTime(song.durationSeconds || 210)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
