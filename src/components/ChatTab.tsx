import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Send,
  Clock,
  ChevronRight,
  Shield,
  Music,
  Zap,
  Play,
  Sparkles,
  Plus,
  Search,
  X,
  Disc3,
  Check,
  Headphones,
  MessageSquare,
} from 'lucide-react';
import { LoungeConversation, LoungeUser, Song, ChatMessage } from '../types';

interface Props {
  conversations: LoungeConversation[];
  activeChatUser: LoungeUser | null;
  onSelectConversation: (conv: LoungeConversation) => void;
  onBackToList: () => void;
  onSendMessage: (matchId: string, text: string, isIcebreaker?: boolean) => void;
  onSendSongMessage?: (matchId: string, song: Song, comment?: string, timestampSecond?: number) => void;
  onPlayMoment?: (track: Song, second: number) => void;
  onPlaySong?: (song: Song) => void;
  onStartChatWithUser?: (user: LoungeUser, initialText?: string) => void;
  onOpenUserProfile?: (user: LoungeUser) => void;
  recentListeners?: LoungeUser[];
  currentSong?: Song;
  currentSecond?: number;
  allSongs?: Song[];
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
}) => {
  const [inputText, setInputText] = useState('');
  const [showSongPickerModal, setShowSongPickerModal] = useState(false);
  const [songSearchTerm, setSongSearchTerm] = useState('');
  const [selectedSongToShare, setSelectedSongToShare] = useState<Song | null>(null);
  const [songComment, setSongComment] = useState('');
  const [shareTimestampSecond, setShareTimestampSecond] = useState<number>(0);
  const [isCoListeningActive, setIsCoListeningActive] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find(
    (c) => activeChatUser && c.user.id === activeChatUser.id
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv?.messages]);

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
    const defaultComment = `🎸 Bu şarkının ${formatTime(shareTimestampSecond)} saniyesini dinle!`;
    const finalComment = songComment.trim() || defaultComment;
    if (onSendSongMessage) {
      onSendSongMessage(activeConv.matchId, selectedSongToShare, finalComment, shareTimestampSecond);
    } else {
      onSendMessage(activeConv.matchId, finalComment, false);
    }
    setShowSongPickerModal(false);
    setSelectedSongToShare(null);
    setSongComment('');
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 1. Üst "Aktif Frekans Eşleşmeleri": Son 30-45s veya yüksek uyumlu dinleyiciler
  const activeFrequencyUsers = recentListeners.filter((u) => {
    const isSelf = u.id === 'me';
    const isHighMatch = (u.compatibilityScore || 0) >= 88;
    const isRecentHeartbeat = (u.lastHeartbeatAgoSeconds || 0) <= 45;
    return !isSelf && (isHighMatch || isRecentHeartbeat);
  });

  // 2. Boş Alan / Hızlı Buzkırıcı Önerileri: Henüz sohbet başlatılmamış son karşılaşılan 2-3 dinleyici
  const existingChatUserIds = new Set(conversations.map((c) => c.user.id));
  const suggestedIcebreakerUsers = recentListeners
    .filter((u) => u.id !== 'me' && !existingChatUserIds.has(u.id))
    .slice(0, 3);

  // Şarkı önerisi için filtrelenmiş şarkılar
  const filteredShareSongs = allSongs.filter(
    (s) =>
      s.title.toLowerCase().includes(songSearchTerm.toLowerCase()) ||
      s.artist.toLowerCase().includes(songSearchTerm.toLowerCase()) ||
      s.genre.toLowerCase().includes(songSearchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full h-full min-h-[580px] px-3.5 sm:px-6 py-5">
      {activeConv && activeChatUser ? (
        /* ==================== SOHBET İÇİ (CHAT DETAIL) ==================== */
        <div className="flex-1 flex flex-col bg-zinc-950/80 border border-white/[0.08] rounded-3xl overflow-hidden shadow-2xl backdrop-blur-2xl">
          {/* Top Header */}
          <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between bg-zinc-900/60 backdrop-blur-xl">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={onBackToList}
                className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-white/[0.08] transition cursor-pointer active:scale-95"
                aria-label="Geri Dön"
                title="Sohbetlere Dön"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div
                onClick={() => onOpenUserProfile && onOpenUserProfile(activeChatUser)}
                className="relative cursor-pointer group/user flex items-center gap-2.5"
                title="Profili Görüntüle"
              >
                <div className="relative">
                  <div
                    className={`w-10 h-10 rounded-full bg-gradient-to-tr ${activeChatUser.avatarGradient} flex items-center justify-center text-white font-bold text-xs shrink-0 ring-1 ring-white/10 overflow-hidden`}
                  >
                    {activeChatUser.avatarUrl ? (
                      <img
                        src={activeChatUser.avatarUrl}
                        alt={activeChatUser.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      activeChatUser.avatarSeed
                    )}
                  </div>
                  {activeChatUser.isOnline && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-zinc-950 animate-pulse" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white truncate group-hover:text-emerald-300 transition">
                      {activeChatUser.name}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold flex items-center gap-0.5">
                      <Shield className="w-2.5 h-2.5" />
                      %{activeChatUser.trustScore || 98}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400 truncate flex items-center gap-1.5 mt-0.5">
                    <span>{activeChatUser.city}</span>
                    <span className="text-zinc-600">·</span>
                    <span className="text-zinc-500">
                      {activeChatUser.platform === 'spotify'
                        ? 'Spotify'
                        : activeChatUser.platform === 'apple_music'
                        ? 'Apple Music'
                        : 'YouTube Music'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {onOpenUserProfile && (
              <button
                type="button"
                onClick={() => onOpenUserProfile(activeChatUser)}
                className="px-2.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-zinc-200 transition cursor-pointer active:scale-95 border border-white/10"
              >
                Profil
              </button>
            )}
          </div>

          {/* =====================================================================
              TEK ŞERİT SABİT ORTAK FREKANS & TANIŞMA ANI BARI (COMPACT GLASS STRIP)
             ===================================================================== */}
          {(() => {
            const isDumanTrack =
              activeConv.matchedTrack.id === 'song-duman' ||
              activeConv.matchedTrack.title.toLowerCase().includes('kırmış kalbini');
            const encounterSec =
              isDumanTrack && (activeConv.matchedSecond === 142 || activeConv.matchedSecond === 102 || !activeConv.matchedSecond)
                ? 102
                : activeConv.matchedSecond || 102;
            const formattedEncounterTime = isDumanTrack ? '01:42' : formatTime(encounterSec);
            const encounterProgressPct = Math.min(
              92,
              Math.max(18, Math.round((encounterSec / (activeConv.matchedTrack.durationSeconds || 252)) * 100))
            );

            return (
              <div className="mx-3.5 mt-2.5 p-2.5 rounded-xl bg-gradient-to-r from-emerald-950/85 via-zinc-900/90 to-zinc-950/90 border border-emerald-500/30 backdrop-blur-xl relative overflow-hidden shadow-[0_4px_20px_rgba(16,185,129,0.12)]">
                <div className="flex items-center justify-between gap-2.5 relative z-10">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Small Album Cover (w-10 h-10 rounded-lg) */}
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-zinc-900 shrink-0 ring-1 ring-emerald-500/35 shadow-md">
                      {activeConv.matchedTrack.coverUrl ? (
                        <img
                          src={activeConv.matchedTrack.coverUrl}
                          alt={activeConv.matchedTrack.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className={`w-full h-full bg-gradient-to-tr ${activeConv.matchedTrack.coverGradient}`}
                        />
                      )}
                      <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                        <Music className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                    </div>

                    {/* Center: Encounter Text & Thin Progress Bar */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/35 text-[9px] font-bold shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Ortak Frekans & Tanışma Anı</span>
                        </span>
                      </div>
                      <h2 className="text-xs font-bold text-white truncate mt-0.5">
                        🎸 {activeConv.matchedTrack.title} • {formattedEncounterTime} gitar solosunda karşılaştınız
                      </h2>
                      {/* Thin Progress Bar */}
                      <div className="mt-1.5 w-full h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-lime-400 rounded-full transition-all duration-300"
                          style={{ width: `${encounterProgressPct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right: Single-click ▶ 01:42'den Dinle Button */}
                  {onPlayMoment && (
                    <button
                      type="button"
                      onClick={() => {
                        onPlayMoment(activeConv.matchedTrack, encounterSec);
                        setIsCoListeningActive(true);
                      }}
                      className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-md active:scale-95 ${
                        isCoListeningActive && currentSong?.id === activeConv.matchedTrack.id
                          ? 'bg-gradient-to-r from-emerald-500 to-lime-400 text-zinc-950 ring-2 ring-emerald-400/50'
                          : 'bg-emerald-400 hover:bg-emerald-300 text-zinc-950'
                      }`}
                      title={`${activeConv.matchedTrack.title} şarkısını ${formattedEncounterTime} anından dinle`}
                    >
                      <span>▶ {formattedEncounterTime}'den Dinle</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Messages Stream */}
          <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-3.5 min-h-[220px]">
            {activeConv.messages.map((msg, idx) => {
              const isMe = msg.senderId === 'me';
              // Audio card inside chat bubbles ONLY renders when the user explicitly shared a song via the + / 🎵 button (never on initial encounter message or icebreakers)
              const shouldShowSharedSongCard =
                Boolean(msg.sharedSong) && idx > 0 && !msg.isIcebreaker;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[88%] sm:max-w-[80%] rounded-2xl text-xs leading-relaxed transition ${
                      isMe
                        ? 'bg-gradient-to-br from-white to-zinc-200 text-zinc-950 font-medium rounded-br-xs shadow-md p-3.5'
                        : 'bg-white/[0.07] border border-white/[0.08] text-zinc-100 rounded-bl-xs shadow-sm p-3.5'
                    }`}
                  >
                    {/* Kullanıcı + / 🎵 butonuyla yeni bir şarkı/saniye paylaştığında oluşan ses kartı */}
                    {shouldShowSharedSongCard && msg.sharedSong && (
                      <div
                        onClick={() => {
                          if (msg.sharedTimestampSecond !== undefined && onPlayMoment) {
                            onPlayMoment(msg.sharedSong!, msg.sharedTimestampSecond);
                          } else if (onPlaySong) {
                            onPlaySong(msg.sharedSong!);
                          }
                        }}
                        className="mb-2 p-2.5 rounded-xl flex items-center justify-between gap-2.5 cursor-pointer transition active:scale-98 group border bg-zinc-950/95 border-emerald-500/40 text-white hover:border-emerald-400 shadow-md"
                        title="Bu saniyeden başlat"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-zinc-900 shrink-0 ring-1 ring-white/10">
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
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                            </div>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-white truncate group-hover:text-emerald-300 transition">
                                {msg.sharedSong.title}
                              </span>
                              {msg.sharedTimestampSecond !== undefined && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/35 text-[10px] font-mono font-bold shrink-0">
                                  {formatTime(msg.sharedTimestampSecond)}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-400 truncate">
                              {msg.sharedSong.artist}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (msg.sharedTimestampSecond !== undefined && onPlayMoment) {
                              onPlayMoment(msg.sharedSong!, msg.sharedTimestampSecond);
                            } else if (onPlaySong) {
                              onPlaySong(msg.sharedSong!);
                            }
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold text-[11px] flex items-center gap-1 shrink-0 shadow-sm transition active:scale-95 cursor-pointer"
                        >
                          <Play className="w-2.5 h-2.5 fill-current" />
                          <span>
                            {msg.sharedTimestampSecond !== undefined
                              ? `${formatTime(msg.sharedTimestampSecond)}'den Dinle`
                              : 'Dinle'}
                          </span>
                        </button>
                      </div>
                    )}

                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                  <span className="text-[10px] text-zinc-500 mt-1 px-1 flex items-center gap-1">
                    {msg.isIcebreaker && <Sparkles className="w-2.5 h-2.5 text-amber-400" />}
                    <span>{msg.timestamp}</span>
                  </span>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* MÜZİKAL BUZKIRICILAR (Musical Icebreakers Chips Bar) */}
          <div className="px-3 py-2 border-t border-white/[0.06] bg-black/25 flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider shrink-0 flex items-center gap-1 pl-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Buzkırıcı:
            </span>
            <button
              type="button"
              onClick={() => handleSendIcebreaker('01:42 solosu hakkında ne düşünüyorsun? 🎸')}
              className="px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.12] active:scale-95 text-zinc-200 hover:text-white text-xs shrink-0 whitespace-nowrap transition cursor-pointer border border-white/[0.06]"
            >
              01:42 solosu harika 🎸
            </button>
            <button
              type="button"
              onClick={() => handleSendIcebreaker('Bu şarkı bitince sıradaki parçayı sen önerir misin? 🎧')}
              className="px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.12] active:scale-95 text-zinc-200 hover:text-white text-xs shrink-0 whitespace-nowrap transition cursor-pointer border border-white/[0.06]"
            >
              Sıradaki şarkıyı sen seç 🎧
            </button>
            <button
              type="button"
              onClick={() => handleSendIcebreaker('Bu grubun hiç canlı konserine gittin mi? 🎫')}
              className="px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.12] active:scale-95 text-zinc-200 hover:text-white text-xs shrink-0 whitespace-nowrap transition cursor-pointer border border-white/[0.06]"
            >
              Konserine gittin mi? 🎫
            </button>
            <button
              type="button"
              onClick={() => handleSendIcebreaker('Bu albüm plak koleksiyonumda en sevdiklerimden biri 💿')}
              className="px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.12] active:scale-95 text-zinc-200 hover:text-white text-xs shrink-0 whitespace-nowrap transition cursor-pointer border border-white/[0.06]"
            >
              Plak koleksiyonu 💿
            </button>
          </div>

          {/* Input & Action Bar */}
          <form
            onSubmit={handleSend}
            className="p-3 sm:p-3.5 border-t border-white/[0.08] flex items-center gap-2 bg-zinc-900/60"
          >
            {/* Saniye & Şarkı Paylaş Button */}
            <button
              type="button"
              onClick={() => {
                const targetSong = currentSong || allSongs[0] || null;
                setSelectedSongToShare(targetSong);
                const sec = currentSecond || 0;
                setShareTimestampSecond(sec);
                setSongComment(`🎸 Bu şarkının ${formatTime(sec)} saniyesini dinle!`);
                setShowSongPickerModal(true);
              }}
              className="px-2.5 sm:px-3 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-lime-500/10 hover:from-emerald-500/30 hover:to-lime-500/20 active:scale-95 text-emerald-300 hover:text-white border border-emerald-500/30 transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-sm"
              title="Şu anki şarkının bu saniyesini ses kartı olarak sohbete gönder"
            >
              <Music className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold hidden sm:inline">Saniye Paylaş</span>
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Mesaj yaz veya müzikal bir his paylaş..."
              className="flex-1 py-2.5 px-4 bg-white/[0.04] border border-white/[0.08] rounded-2xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/30 transition"
            />

            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2.5 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-30 disabled:pointer-events-none text-zinc-950 font-bold rounded-2xl transition cursor-pointer active:scale-95 shadow-md shrink-0"
              aria-label="Gönder"
              title="Gönder"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      ) : (
        /* ==================== SOHBET LİSTESİ (CONVERSATIONS LIST) ==================== */
        <div className="space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-heading font-extrabold text-white tracking-tight">
                  Mesajlar
                </h1>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Aynı şarkıda ve frekansta karşılaştığın dinleyicilerle canlı bağların
                </p>
              </div>

              <div className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{conversations.length} Sohbet</span>
              </div>
            </div>
          </div>

          {/* 1. ÜST "AKTİF FREKANS EŞLEŞMELERİ" ŞERİDİ (Story-like Active Frequency Matches) */}
          {activeFrequencyUsers.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-white tracking-tight">
                  <Zap className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                  <span>Şu An Frekansta Olanlar</span>
                  <span className="text-[10px] text-zinc-500 font-normal">
                    (Son 45 saniyede karşılaştıkların)
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  {activeFrequencyUsers.length} Aktif
                </span>
              </div>

              {/* Horizontal Story Carousel */}
              <div className="flex items-center gap-3.5 overflow-x-auto no-scrollbar scroll-smooth py-1 px-1">
                {activeFrequencyUsers.map((user) => {
                  const existingConv = conversations.find((c) => c.user.id === user.id);
                  return (
                    <div
                      key={user.id}
                      onClick={() => {
                        if (existingConv) {
                          onSelectConversation(existingConv);
                        } else if (onStartChatWithUser) {
                          onStartChatWithUser(
                            user,
                            `Selam ${user.name}! ${currentSong?.title || 'bu şarkı'} anında aynı frekanstayız ⚡`
                          );
                        }
                      }}
                      className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer transition active:scale-95"
                    >
                      {/* Avatar with glowing pulsating ring */}
                      <div className="relative">
                        <div className="w-14 h-14 rounded-full p-[2.5px] bg-gradient-to-tr from-emerald-400 via-teal-400 to-lime-300 shadow-[0_0_15px_rgba(52,211,153,0.35)] animate-pulse">
                          <div
                            className={`w-full h-full rounded-full bg-gradient-to-tr ${user.avatarGradient} flex items-center justify-center text-white font-bold text-sm ring-2 ring-zinc-950 overflow-hidden`}
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

                        {/* Affinity Badge */}
                        <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-zinc-950 border border-emerald-500 text-[10px] font-bold text-emerald-400 shadow-sm flex items-center gap-0.5">
                          <Zap className="w-2.5 h-2.5 fill-current" />
                          <span>%{user.compatibilityScore || 96}</span>
                        </div>
                      </div>

                      {/* User Name & Mini Song Tag */}
                      <span className="text-xs font-semibold text-zinc-200 group-hover:text-emerald-300 transition max-w-[70px] truncate text-center">
                        {user.name.split(' ')[0]}
                      </span>
                      <span className="text-[10px] text-zinc-400 max-w-[76px] truncate text-center flex items-center justify-center gap-0.5 bg-white/[0.04] px-1.5 py-0.5 rounded-full border border-white/[0.06]">
                        <Music className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                        <span className="truncate">
                          {user.currentSong?.title || currentSong?.title || 'Rock'}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. SOHBET LİSTESİ KARTLARI (Enhanced Conversation Cards) */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-1">
              Gelen Kutusu
            </h2>

            <div className="divide-y divide-white/[0.06] border-y border-white/[0.08] bg-zinc-950/40 rounded-2xl overflow-hidden px-2">
              {conversations.map((conv) => (
                <div
                  key={conv.matchId}
                  onClick={() => onSelectConversation(conv)}
                  className="py-3.5 px-3 flex items-center justify-between gap-3 group cursor-pointer hover:bg-white/[0.03] -mx-1 rounded-2xl transition"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Avatar with Live Indicator */}
                    <div className="relative shrink-0">
                      <div
                        className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${conv.user.avatarGradient} flex items-center justify-center text-white font-bold text-sm ring-1 ring-white/10 overflow-hidden shadow-md`}
                      >
                        {conv.user.avatarUrl ? (
                          <img
                            src={conv.user.avatarUrl}
                            alt={conv.user.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          conv.user.avatarSeed
                        )}
                      </div>

                      {/* Online/Listening Live Pulsing Ring */}
                      {conv.user.isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 ring-2 ring-zinc-950 flex items-center justify-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-950 animate-ping" />
                        </span>
                      )}
                    </div>

                    {/* Middle Info Block */}
                    <div className="min-w-0 flex-1">
                      {/* Top Row: Name + Trust Score + Location + Timestamp */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white group-hover:text-emerald-300 transition truncate">
                          {conv.user.name}
                        </span>

                        <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold flex items-center gap-0.5 shrink-0">
                          <Shield className="w-2.5 h-2.5" />
                          %{conv.user.trustScore || 98}
                        </span>

                        <span className="text-xs text-zinc-500 truncate hidden xs:inline">
                          · {conv.user.city}
                        </span>

                        <span className="text-xs text-zinc-500 ml-auto shrink-0">
                          {conv.lastMessageTime}
                        </span>
                      </div>

                      {/* Unified Single-Strip Encounter & Live Listening Badge */}
                      <div className="mt-1">
                        <div className="px-2.5 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-zinc-300 text-[11px] font-medium inline-flex items-center gap-1.5 max-w-full">
                          <Music className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="truncate">
                            {conv.matchedTrack.title} • {formatTime(conv.matchedSecond)}'de buluştunuz
                          </span>
                          {conv.user.isOnline && (
                            <>
                              <span className="text-zinc-600 shrink-0">·</span>
                              <span className="text-emerald-400 font-semibold inline-flex items-center gap-1 shrink-0">
                                <Headphones className="w-3 h-3 text-emerald-400" />
                                <span>Canlı</span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Last Message Preview */}
                      <div className="text-xs text-zinc-400 truncate mt-1">
                        {conv.lastMessage}
                      </div>
                    </div>
                  </div>

                  {/* Right side: Unread dot + Chevron */}
                  <div className="flex items-center gap-2 shrink-0">
                    {conv.unreadCount > 0 && (
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                    )}
                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. BOŞ ALAN / HIZLI BUZKIRICI ÖNERİLERİ (Empty / Low-Item State Card) */}
          {conversations.length <= 3 && suggestedIcebreakerUsers.length > 0 && (
            <div className="mt-6 rounded-3xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.08] p-5 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      Son Karşılaştığın Frekanslar – Buzkırıcı Gönder
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Az önce aynı odada bulunduğun dinleyicilerle tek tıkla müzikal sohbet başlat
                    </p>
                  </div>
                </div>
              </div>

              {/* Suggested User Cards */}
              <div className="space-y-3">
                {suggestedIcebreakerUsers.map((user) => (
                  <div
                    key={user.id}
                    className="p-3.5 rounded-2xl bg-zinc-950/70 border border-white/[0.06] hover:border-emerald-500/30 transition shadow-sm space-y-2.5"
                  >
                    {/* User Info Line */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-full bg-gradient-to-tr ${user.avatarGradient} flex items-center justify-center text-white font-bold text-xs shrink-0 ring-1 ring-white/10 overflow-hidden`}
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

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white truncate">
                              {user.name}
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 text-[9px] font-bold border border-emerald-500/30 flex items-center gap-0.5">
                              <Shield className="w-2.5 h-2.5" />
                              %{user.trustScore || 97}
                            </span>
                          </div>
                          <div className="text-[10px] text-zinc-400 truncate flex items-center gap-1">
                            <span>{user.city}</span>
                            <span>·</span>
                            <span className="text-emerald-400 font-semibold">
                              %{user.compatibilityScore || 96} Uyum
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Context Encounter Pill */}
                      <span className="text-[10px] text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.06] shrink-0 truncate max-w-[140px]">
                        🎵 {currentSong?.title || 'Duman'} ({formatTime(user.currentSecond || 142)})
                      </span>
                    </div>

                    {/* 1-Click Icebreaker Action Buttons */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          onStartChatWithUser &&
                          onStartChatWithUser(
                            user,
                            '01:42 solosu hakkında ne düşünüyorsun? 🎸'
                          )
                        }
                        className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-emerald-400 hover:text-zinc-950 text-zinc-300 text-[11px] font-medium border border-white/[0.08] transition cursor-pointer active:scale-95 shrink-0 whitespace-nowrap"
                      >
                        01:42 solosu hakkında ne düşünüyorsun? 🎸
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onStartChatWithUser &&
                          onStartChatWithUser(user, 'Sıradaki şarkıyı sen seç 🎧')
                        }
                        className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-emerald-400 hover:text-zinc-950 text-zinc-300 text-[11px] font-medium border border-white/[0.08] transition cursor-pointer active:scale-95 shrink-0 whitespace-nowrap"
                      >
                        Sıradaki şarkıyı sen seç 🎧
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onStartChatWithUser &&
                          onStartChatWithUser(user, 'Aynı frekanstayız, selam! ⚡')
                        }
                        className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-emerald-400 hover:text-zinc-950 text-zinc-300 text-[11px] font-medium border border-white/[0.08] transition cursor-pointer active:scale-95 shrink-0 whitespace-nowrap"
                      >
                        Aynı frekanstayız, selam! ⚡
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== CANLI SANİYE & SES KARTI GÖNDER MODALI ==================== */}
      {showSongPickerModal && activeConv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-zinc-950 border border-emerald-500/30 rounded-3xl flex flex-col shadow-2xl overflow-hidden max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-zinc-950/90">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-sm">
                  <Zap className="w-5 h-5 text-emerald-400 fill-emerald-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>Canlı Saniye & Ses Kartı Gönder</span>
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    {activeChatUser?.name} ile şarkının spesifik bir anını oynatılabilir ses kartı olarak paylaş
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSongPickerModal(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                aria-label="Kapat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 no-scrollbar">
              {/* O An Dinlenen Parça & Saniye Seçici Hero Card */}
              {selectedSongToShare && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-zinc-900/80 to-zinc-950 border border-emerald-500/30 space-y-3.5 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-zinc-900 shrink-0 ring-1 ring-emerald-500/30">
                      {selectedSongToShare.coverUrl ? (
                        <img
                          src={selectedSongToShare.coverUrl}
                          alt={selectedSongToShare.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-tr ${selectedSongToShare.coverGradient}`} />
                      )}
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <Music className="w-4 h-4 text-emerald-400" />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Seçili Parça & Saniye</span>
                      </div>
                      <div className="text-sm font-bold text-white truncate">
                        {selectedSongToShare.title}
                      </div>
                      <div className="text-xs text-zinc-400 truncate">
                        {selectedSongToShare.artist} · {selectedSongToShare.genre}
                      </div>
                    </div>

                    {/* Saniye Göstergesi Rozeti */}
                    <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono font-bold text-xs shrink-0 flex items-center gap-1 shadow-inner">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{formatTime(shareTimestampSecond)}</span>
                    </div>
                  </div>

                  {/* Saniye Slider (Scrubber) */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 font-medium">
                      <span>Paylaşılacak Saniyeyi Kaydır:</span>
                      <span className="text-emerald-400 font-mono font-bold">
                        {formatTime(shareTimestampSecond)} / {formatTime(selectedSongToShare.durationSeconds || 240)}
                      </span>
                    </div>

                    <input
                      type="range"
                      min={0}
                      max={selectedSongToShare.durationSeconds || 240}
                      value={shareTimestampSecond}
                      onChange={(e) => {
                        const sec = Number(e.target.value);
                        setShareTimestampSecond(sec);
                        setSongComment(`🎸 Bu şarkının ${formatTime(sec)} saniyesini dinle!`);
                      }}
                      className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-400 focus:outline-none"
                    />

                    <div className="flex items-center justify-between text-[9px] text-zinc-500 font-mono">
                      <span>00:00</span>
                      <span>50%</span>
                      <span>{formatTime(selectedSongToShare.durationSeconds || 240)}</span>
                    </div>
                  </div>

                  {/* Hızlı Sıcak Noktalar (Hotspots Chips) */}
                  <div className="space-y-1.5 pt-1 border-t border-white/[0.06]">
                    <div className="text-[10px] text-zinc-400 font-semibold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>Hızlı Saniye Önerileri:</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const sec = currentSecond || 0;
                          setShareTimestampSecond(sec);
                          setSongComment(`🎸 Bu şarkının ${formatTime(sec)} saniyesini dinle!`);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition cursor-pointer flex items-center gap-1 ${
                          shareTimestampSecond === (currentSecond || 0)
                            ? 'bg-emerald-400 text-zinc-950 shadow-sm'
                            : 'bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 border border-white/[0.08]'
                        }`}
                      >
                        <span>📍 Şu Anki Saniye ({formatTime(currentSecond || 0)})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShareTimestampSecond(28);
                          setSongComment('⚡ Giriş melodisi ilk saniyeden yakalıyor, dinle!');
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition cursor-pointer flex items-center gap-1 ${
                          shareTimestampSecond === 28
                            ? 'bg-emerald-400 text-zinc-950 shadow-sm'
                            : 'bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 border border-white/[0.08]'
                        }`}
                      >
                        <span>⚡ 00:28 (Giriş)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShareTimestampSecond(85);
                          setSongComment('🔥 Nakarat ve vokaller harika birleşiyor!');
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition cursor-pointer flex items-center gap-1 ${
                          shareTimestampSecond === 85
                            ? 'bg-emerald-400 text-zinc-950 shadow-sm'
                            : 'bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 border border-white/[0.08]'
                        }`}
                      >
                        <span>🔥 01:25 (Nakarat)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShareTimestampSecond(102);
                          setSongComment('🎸 Bu şarkının 01:42 saniyesini dinle! Gitar solosu tüyleri diken diken ediyor.');
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition cursor-pointer flex items-center gap-1 ${
                          shareTimestampSecond === 102
                            ? 'bg-emerald-400 text-zinc-950 shadow-sm'
                            : 'bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 border border-white/[0.08]'
                        }`}
                      >
                        <span>🎸 01:42 (Gitar Solosu)</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Mesaj / Yorum Notu */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Sohbet Notu:</span>
                </label>
                <input
                  type="text"
                  value={songComment}
                  onChange={(e) => setSongComment(e.target.value)}
                  placeholder={`🎸 Bu şarkının ${formatTime(shareTimestampSecond)} saniyesini dinle!`}
                  className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-2xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition shadow-inner"
                />
              </div>

              {/* Farklı Parça Arama ve Seçme (İsteğe Bağlı) */}
              <div className="pt-2 border-t border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-zinc-400">
                    Farklı Bir Şarkı Seçmek İster misin?
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    {filteredShareSongs.length} Parça
                  </span>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                  <input
                    type="text"
                    value={songSearchTerm}
                    onChange={(e) => setSongSearchTerm(e.target.value)}
                    placeholder="Şarkı veya sanatçı adı ara..."
                    className="w-full pl-9 pr-3.5 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/40"
                  />
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto no-scrollbar pr-1">
                  {filteredShareSongs.slice(0, 8).map((song) => {
                    const isSelected = selectedSongToShare?.id === song.id;
                    return (
                      <div
                        key={song.id}
                        onClick={() => {
                          setSelectedSongToShare(song);
                          setShareTimestampSecond(0);
                          setSongComment(`🎸 Bu şarkının 00:00 saniyesini dinle!`);
                        }}
                        className={`p-2 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2.5 ${
                          isSelected
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-white'
                            : 'bg-white/[0.02] border-white/[0.06] text-zinc-300 hover:bg-white/[0.05]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
                            {song.coverUrl ? (
                              <img
                                src={song.coverUrl}
                                alt={song.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className={`w-full h-full bg-gradient-to-tr ${song.coverGradient}`} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold truncate">
                              {song.title}
                            </div>
                            <div className="text-[10px] text-zinc-400 truncate">
                              {song.artist}
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-emerald-400 text-zinc-950 flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 border-t border-white/10 bg-zinc-950/90 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowSongPickerModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white transition cursor-pointer"
              >
                Vazgeç
              </button>

              <button
                type="button"
                disabled={!selectedSongToShare}
                onClick={handleShareSongConfirm}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-400 to-lime-400 hover:from-emerald-300 hover:to-lime-300 disabled:opacity-40 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-[0_4px_16px_rgba(52,211,153,0.3)] active:scale-95"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>⚡ Saniyeli Ses Kartını Sohbete Gönder</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
