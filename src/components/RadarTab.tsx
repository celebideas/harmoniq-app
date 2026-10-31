import React, { useState, useEffect } from 'react';
import {
  Heart,
  X,
  Play,
  Pause,
  Star,
  ShieldCheck,
  Disc3,
  MapPin,
  RotateCcw,
  Headphones,
  CheckCircle2,
  Sliders,
  Volume2,
  Radio,
  Share2
} from 'lucide-react';
import { UserProfile, IntentType, Song } from '../types';
import { soundEngine } from '../services/soundEngine';
import { AnalogDeck } from './AnalogDeck';

interface Props {
  profiles: UserProfile[];
  myCurrentSong: Song;
  onLike: (profile: UserProfile) => void;
  onSuperLike: (profile: UserProfile) => void;
  onPass: (profile: UserProfile) => void;
  onResetProfiles: () => void;
}

export const RadarTab: React.FC<Props> = ({
  profiles,
  myCurrentSong,
  onLike,
  onSuperLike,
  onPass,
  onResetProfiles,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIntent, setSelectedIntent] = useState<IntentType | 'all'>('all');
  const [onlyLiveListening, setOnlyLiveListening] = useState(true);
  const [isPlayingSnippet, setIsPlayingSnippet] = useState(false);
  const [playingSongId, setPlayingSongId] = useState<string | null>(null);

  // Filter profiles
  const filteredProfiles = profiles.filter((p) => {
    if (selectedIntent !== 'all' && p.intent !== selectedIntent) return false;
    if (onlyLiveListening && !p.isListeningNow) return false;
    return true;
  });

  const currentProfile = filteredProfiles[currentIndex] || null;

  useEffect(() => {
    return () => {
      soundEngine.stop();
    };
  }, []);

  const handleTogglePlay = (song: Song) => {
    if (isPlayingSnippet && playingSongId === song.id) {
      soundEngine.stop();
      setIsPlayingSnippet(false);
      setPlayingSongId(null);
    } else {
      setIsPlayingSnippet(true);
      setPlayingSongId(song.id);
      soundEngine.playSongSnippet(song.id, song.soundType);
    }
  };

  const handleAction = (type: 'pass' | 'like' | 'super') => {
    soundEngine.stop();
    setIsPlayingSnippet(false);
    setPlayingSongId(null);

    if (!currentProfile) return;

    if (type === 'pass') {
      onPass(currentProfile);
    } else if (type === 'like') {
      onLike(currentProfile);
    } else if (type === 'super') {
      onSuperLike(currentProfile);
    }

    setCurrentIndex((prev) => prev + 1);
  };

  const intentOptions: { id: IntentType | 'all'; label: string; code: string }[] = [
    { id: 'all', label: 'Tüm Janralar', code: 'CH.00' },
    { id: 'concert_buddy', label: 'Konser Yoldaşı', code: 'CH.01' },
    { id: 'music_discovery', label: 'Müzik Keşfi', code: 'CH.02' },
    { id: 'romantic', label: 'Müzikal Flört', code: 'CH.03' },
    { id: 'jam_band', label: 'Jam & Grup', code: 'CH.04' },
  ];

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-5">
      {/* Hardware-styled Intent Selector & Live Anti-Bot Switch */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-3.5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-neutral-400">
            <Sliders className="w-3.5 h-3.5 text-lime-400" />
            <span className="font-semibold text-neutral-200">ANALOG NİYET MATRİSİ:</span>
            <span className="text-neutral-500">Sadece aynı niyeti seçenlerle eşleş</span>
          </div>

          {/* Anti-Bot Real-time Toggle */}
          <div className="flex items-center justify-between sm:justify-end gap-2 bg-neutral-950 px-3 py-1.5 rounded-xl border border-neutral-800">
            <div className="flex items-center gap-1.5 text-[11px] text-neutral-300">
              <span className="w-2 h-2 rounded-full bg-lime-400 animate-ping" />
              <span>Canlı Dinleyenler Filtresi</span>
            </div>
            <button
              onClick={() => {
                setOnlyLiveListening(!onlyLiveListening);
                setCurrentIndex(0);
              }}
              className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full transition-colors ${
                onlyLiveListening ? 'bg-lime-400' : 'bg-neutral-700'
              }`}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-neutral-950 transition duration-150 ${
                  onlyLiveListening ? 'translate-x-4' : 'translate-x-0.5 mt-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Tactile Hardware Tabs for Intent */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-xs font-mono">
          {intentOptions.map((opt) => {
            const isSelected = selectedIntent === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => {
                  setSelectedIntent(opt.id);
                  setCurrentIndex(0);
                }}
                className={`px-3 py-2 rounded-xl text-left transition flex flex-col justify-between ${
                  isSelected
                    ? 'bg-neutral-800 text-lime-400 border border-neutral-700 shadow-sm font-bold'
                    : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 border border-neutral-800/80'
                }`}
              >
                <span className="text-[9px] text-neutral-500">{opt.code}</span>
                <span className="truncate text-[11px]">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Gatefold Vinyl Sleeve & Match Card */}
      {currentProfile ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-neutral-800">
          {/* Left Bay: Analog Turntable Deck & Live Audio */}
          <div className="p-5 lg:p-6 lg:w-[48%] flex flex-col justify-between space-y-4 bg-neutral-950/60">
            {/* Header meta */}
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-neutral-500">
                LISTENING LIVE // SPOTIFY CONNECT
              </span>
              <span className="text-lime-400 font-bold">
                %{currentProfile.compatibilityScore} UYUM
              </span>
            </div>

            {/* Turntable Deck */}
            <AnalogDeck
              song={currentProfile.currentSong}
              isPlaying={isPlayingSnippet && playingSongId === currentProfile.currentSong.id}
              onTogglePlay={() => handleTogglePlay(currentProfile.currentSong)}
              progressSeconds={currentProfile.songProgressSeconds}
            />

            {/* Live Synchronicity Callout if same track */}
            {currentProfile.currentSong.id === myCurrentSong.id ? (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-mono text-amber-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span>CANLI FREKANS ÇAKIŞMASI: Şu an ikiniz de aynı parçayı dinliyorsunuz!</span>
              </div>
            ) : (
              <div className="text-[11px] font-mono text-neutral-400 flex items-center justify-between px-1">
                <span>Şarkı Konumu: {currentProfile.songProgressSeconds}s</span>
                <span className="text-neutral-500">Doğrulanmış Canlı Seans</span>
              </div>
            )}
          </div>

          {/* Right Bay: Listener Dossier & Music DNA Matrix */}
          <div className="p-5 lg:p-6 lg:w-[52%] flex flex-col justify-between space-y-5 bg-neutral-900/80">
            {/* User Identity Header */}
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${currentProfile.avatarGradient} flex items-center justify-center text-white font-mono font-bold text-lg border border-neutral-700 shadow-md shrink-0`}>
                    {currentProfile.avatarSeed}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                      <span>{currentProfile.name}</span>
                      <span className="text-neutral-400 font-mono text-sm font-normal">/{currentProfile.age}</span>
                    </h2>
                    <div className="text-xs font-mono text-neutral-400 mt-0.5 flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-neutral-500" />
                      <span>{currentProfile.city}</span>
                      <span>·</span>
                      <span className="text-neutral-500">{currentProfile.distanceKm} km</span>
                    </div>
                  </div>
                </div>

                {/* Stamped Trust Score */}
                <div className="text-right font-mono">
                  <div className="text-xs font-bold text-lime-400 flex items-center gap-1 justify-end">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>%{currentProfile.trustScore}</span>
                  </div>
                  <span className="text-[10px] text-neutral-500 uppercase tracking-wider">
                    Güven Skoru
                  </span>
                </div>
              </div>

              {/* Bio / Listener Statement */}
              <p className="text-xs text-neutral-300 leading-relaxed mt-4 p-3 bg-neutral-950/80 rounded-xl border border-neutral-800/80">
                "{currentProfile.bio}"
              </p>
            </div>

            {/* Music DNA & Catalog Overlap */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-neutral-400 font-bold uppercase tracking-wider">
                  ORTAK MÜZİK DNA'SI
                </span>
                <span className="text-lime-400">
                  {currentProfile.sharedArtists.length} Ortak Sanatçı
                </span>
              </div>

              {/* Stamped Vinyl Tags */}
              <div className="flex flex-wrap gap-1.5 font-mono">
                {currentProfile.sharedArtists.map((artist: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-700 text-neutral-200 text-xs font-medium"
                  >
                    ★ {artist}
                  </span>
                ))}
                {currentProfile.sharedGenres.map((genre: string, idx: number) => (
                  <span
                    key={`g-${idx}`}
                    className="px-2 py-0.5 rounded-lg bg-neutral-800 text-neutral-400 text-[11px]"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>

            {/* Hardware-styled Tactile Action Controls */}
            <div className="pt-3 border-t border-neutral-800 flex items-center justify-between gap-3 font-mono">
              {/* Eject / Pass */}
              <button
                onClick={() => handleAction('pass')}
                className="flex-1 py-3 px-4 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white text-xs font-bold transition flex items-center justify-center gap-2 active:scale-98"
                title="Pas Geç"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
                <span>PAS GEÇ</span>
              </button>

              {/* Super Match */}
              <button
                onClick={() => handleAction('super')}
                className="py-3 px-4 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-amber-400 hover:text-amber-300 text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-98"
                title="Süper Frekans Gönder"
              >
                <Star className="w-4 h-4 fill-amber-400" />
                <span className="hidden sm:inline">SÜPER FREKANS</span>
              </button>

              {/* Cue & Match */}
              <button
                onClick={() => handleAction('like')}
                className="flex-1 py-3 px-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 text-xs font-black tracking-wider transition flex items-center justify-center gap-2 shadow-lg shadow-lime-400/20 active:scale-98"
                title="Frekansı Yakala ve Eşleş"
              >
                <Heart className="w-4 h-4 fill-neutral-950" />
                <span>EŞLEŞ</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty Deck State */
        <div className="p-12 bg-neutral-900 border border-neutral-800 rounded-3xl text-center space-y-4 font-mono">
          <Disc3 className="w-12 h-12 text-lime-400 mx-auto animate-spin" style={{ animationDuration: '8s' }} />
          <h3 className="text-lg font-bold text-white tracking-wider">
            RADARDAKİ SEANS TAMAMLANDI
          </h3>
          <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
            Makromusic'in sahte bot profillerini kullanmıyoruz. Sadece şu anda gerçekten müzik dinleyen gerçek insanlar listelenir.
          </p>
          <div className="pt-2">
            <button
              onClick={() => {
                setSelectedIntent('all');
                setOnlyLiveListening(false);
                onResetProfiles();
                setCurrentIndex(0);
              }}
              className="px-5 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-bold text-xs inline-flex items-center gap-2 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RADARI YENİDEN TARA</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
