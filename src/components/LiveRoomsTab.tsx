import React, { useState } from 'react';
import { Radio, Music, Play, Pause, Headphones, Users, Sparkles, MessageCircle, Volume2 } from 'lucide-react';
import { UserProfile, Song } from '../types';
import { soundEngine } from '../services/soundEngine';

interface Props {
  profiles: UserProfile[];
  myCurrentSong: Song;
  onSelectUserForChat: (user: UserProfile) => void;
  onJoinSyncRoom: (user: UserProfile, song: Song) => void;
}

export const LiveRoomsTab: React.FC<Props> = ({
  profiles,
  myCurrentSong,
  onSelectUserForChat,
  onJoinSyncRoom,
}) => {
  const [playingSongId, setPlayingSongId] = useState<string | null>(null);

  const liveProfiles = profiles.filter((p) => p.isListeningNow);

  const handleTogglePlay = (song: Song) => {
    if (playingSongId === song.id) {
      soundEngine.stop();
      setPlayingSongId(null);
    } else {
      setPlayingSongId(song.id);
      soundEngine.playSongSnippet(song.id, song.soundType);
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainder = sec % 60;
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  return (
    <div className="flex-1 flex flex-col p-4 max-w-xl mx-auto w-full space-y-4">
      {/* Live Header Banner */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/40 border border-emerald-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <span className="w-3 h-3 rounded-full bg-emerald-500 block animate-ping" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 absolute top-0.5 left-0.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                Canlı Müzik Odaları
              </h2>
              <p className="text-[11px] text-slate-400">
                Şu an saniyesi saniyesine müzik çalan gerçek kullanıcılar
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold">
            {liveProfiles.length} Çevrimiçi
          </span>
        </div>
      </div>

      {/* Your Current Live Status */}
      <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-rose-600 flex items-center justify-center text-white shrink-0 shadow-md">
            <Headphones className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
              Senin Canlı Parçan
            </span>
            <div className="text-xs font-semibold text-white truncate">
              {myCurrentSong.title}
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              {myCurrentSong.artist}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Canlı Senkron
          </span>
        </div>
      </div>

      {/* Live Users List */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
          Şu An Dinleyenler ({liveProfiles.length})
        </h3>

        {liveProfiles.map((user) => {
          const isSameSong = user.currentSong.id === myCurrentSong.id;
          const isPlayingThis = playingSongId === user.currentSong.id;

          return (
            <div
              key={user.id}
              className={`p-4 rounded-2xl border transition-all ${
                isSameSong
                  ? 'bg-indigo-950/30 border-indigo-500/40 shadow-lg shadow-indigo-950/20'
                  : 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                {/* User info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${user.avatarGradient} flex items-center justify-center text-white font-bold text-sm shrink-0 border border-slate-700 shadow`}>
                    {user.avatarSeed}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-white truncate">
                        {user.name}
                      </span>
                      <span className="text-xs text-slate-400">· {user.age}</span>
                      {isSameSong && (
                        <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                          Aynı Şarkı!
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 truncate mt-0.5">
                      {user.city} · <span className="text-emerald-400 font-medium">%{user.compatibilityScore} Uyum</span>
                    </div>
                  </div>
                </div>

                {/* Trust and Intent indicator */}
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-500 block">
                    {user.intent === 'concert_buddy' && '🎟️ Konser'}
                    {user.intent === 'music_discovery' && '🎧 Müzik'}
                    {user.intent === 'romantic' && '💫 Flört'}
                    {user.intent === 'jam_band' && '🎸 Jam'}
                  </span>
                </div>
              </div>

              {/* Live Track Player Bar */}
              <div className="mt-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    onClick={() => handleTogglePlay(user.currentSong)}
                    className="w-8 h-8 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white flex items-center justify-center shrink-0 transition"
                    title={isPlayingThis ? 'Durdur' : 'Önizleme Dinle'}
                  >
                    {isPlayingThis ? (
                      <Pause className="w-3.5 h-3.5 fill-current" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    )}
                  </button>

                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">
                      {user.currentSong.title}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {user.currentSong.artist} · {formatSeconds(user.songProgressSeconds)} / {formatSeconds(user.currentSong.durationSeconds)}
                    </div>
                  </div>
                </div>

                {/* Progress bar visual */}
                <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
                  <div className="w-20 bg-slate-800 rounded-full h-1 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (user.songProgressSeconds / user.currentSong.durationSeconds) * 100)}%`
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono">
                    Canlı Çalıyor
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  onClick={() => onJoinSyncRoom(user, user.currentSong)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition flex items-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Birlikte Dinle</span>
                </button>

                <button
                  onClick={() => onSelectUserForChat(user)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition flex items-center gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Mesaj At</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
