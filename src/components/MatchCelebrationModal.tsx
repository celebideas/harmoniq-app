import React from 'react';
import { Sparkles, Music, Disc3, MessageCircle, Headphones, X } from 'lucide-react';
import { UserProfile, Song } from '../types';

interface Props {
  matchedUser: UserProfile | null;
  matchedSong: Song;
  onClose: () => void;
  onStartChat: (user: UserProfile) => void;
  onSyncListen: (user: UserProfile, song: Song) => void;
}

export const MatchCelebrationModal: React.FC<Props> = ({
  matchedUser,
  matchedSong,
  onClose,
  onStartChat,
  onSyncListen,
}) => {
  if (!matchedUser) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
      <div className="relative w-full max-w-sm bg-gradient-to-b from-slate-900 to-slate-950 border border-indigo-500/30 rounded-3xl p-6 text-center shadow-2xl overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-indigo-500/20 blur-3xl rounded-full pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition min-w-[40px] min-h-[40px] flex items-center justify-center"
          aria-label="Kapat"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Match Header */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-semibold mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Müzikal Frekansınız Eşleşti!</span>
        </div>

        <h3 className="text-2xl font-extrabold text-white tracking-tight">
          {matchedUser.name} ile Eşleştin!
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Müzik DNA uyumunuz <strong className="text-emerald-400">%{matchedUser.compatibilityScore}</strong>
        </p>

        {/* Dual Vinyl / Avatar Animation */}
        <div className="relative my-6 flex items-center justify-center">
          {/* User 1 avatar */}
          <div className="relative z-10 w-20 h-20 rounded-full border-4 border-slate-900 bg-gradient-to-tr from-indigo-600 to-violet-800 flex items-center justify-center text-white font-bold text-lg shadow-xl -mr-3">
            <span>Sen</span>
          </div>

          {/* Center spinning vinyl record */}
          <div className="relative z-20 w-16 h-16 rounded-full bg-slate-950 border-2 border-indigo-400/50 flex items-center justify-center animate-spin" style={{ animationDuration: '6s' }}>
            <Disc3 className="w-10 h-10 text-indigo-400" />
            <div className="absolute w-4 h-4 rounded-full bg-rose-500" />
          </div>

          {/* Matched User avatar */}
          <div className={`relative z-10 w-20 h-20 rounded-full border-4 border-slate-900 bg-gradient-to-tr ${matchedUser.avatarGradient} flex items-center justify-center text-white font-bold text-lg shadow-xl -ml-3`}>
            <span>{matchedUser.avatarSeed}</span>
          </div>
        </div>

        {/* Matched Song Card */}
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 mb-6 text-left flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-700 flex items-center justify-center text-white shrink-0 shadow-md">
            {matchedSong.coverUrl ? (
              <img
                src={matchedSong.coverUrl}
                alt={matchedSong.album}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className={`w-full h-full bg-gradient-to-tr ${matchedSong.coverGradient} flex items-center justify-center`}>
                <Music className="w-6 h-6" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider block">
              Ortak Parça
            </span>
            <div className="text-sm font-bold text-white truncate">
              {matchedSong.title}
            </div>
            <div className="text-xs text-slate-400 truncate">
              {matchedSong.artist}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <button
            onClick={() => onSyncListen(matchedUser, matchedSong)}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-rose-600 hover:from-indigo-500 hover:to-rose-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition active:scale-[0.98]"
          >
            <Headphones className="w-4 h-4" />
            <span>Şimdi Birlikte Dinleyin</span>
          </button>

          <button
            onClick={() => onStartChat(matchedUser)}
            className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm flex items-center justify-center gap-2 transition active:scale-[0.98]"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Mesaj Gönder</span>
          </button>
        </div>
      </div>
    </div>
  );
};
