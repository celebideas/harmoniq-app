import React, { useState, useEffect } from 'react';
import { Sparkles, MapPin, Music, Check, Headphones, Compass, ArrowRight, X } from 'lucide-react';
import { requestNativeGpsLocation } from '../services/locationService';

interface OnboardingModalProps {
  isOpen: boolean;
  initialName?: string;
  onComplete: (data: {
    name: string;
    avatarUrl?: string;
    avatarGradient: string;
    avatarSeed: string;
    genres: string[];
    city: string;
  }) => void;
  onSkipAsGuest: () => void;
}

const PRESET_AVATARS = [
  {
    id: 'av_1',
    name: 'Neon Cyber',
    gradient: 'from-purple-600 via-fuchsia-600 to-pink-500',
    seed: 'NC',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'av_2',
    name: 'Emerald Echo',
    gradient: 'from-emerald-500 via-teal-600 to-cyan-600',
    seed: 'EE',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'av_3',
    name: 'Sunset Velvet',
    gradient: 'from-amber-500 via-orange-600 to-rose-600',
    seed: 'SV',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'av_4',
    name: 'Deep Synth',
    gradient: 'from-blue-600 via-indigo-600 to-purple-800',
    seed: 'DS',
    url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'av_5',
    name: 'Lo-Fi Vinyl',
    gradient: 'from-rose-600 via-pink-600 to-purple-600',
    seed: 'LV',
    url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&auto=format&fit=crop&q=80',
  },
];

const PRESET_GENRES = [
  'Türkçe Rock',
  'Alternatif & Indie',
  'Synthwave & Darkwave',
  'Anadolu Rock',
  'Lo-Fi & Akustik',
  'Hip-Hop / Rap',
];

const QUICK_CITIES = ['İstanbul', 'İzmir', 'Ankara', 'Antalya', 'Eskişehir'];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  initialName,
  onComplete,
  onSkipAsGuest,
}) => {
  const [name, setName] = useState(initialName || 'Müzik Kaşifi');
  const [selectedAvatarId, setSelectedAvatarId] = useState(PRESET_AVATARS[0].id);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([
    'Türkçe Rock',
    'Alternatif & Indie',
  ]);
  const [city, setCity] = useState('İstanbul, Kadıköy');
  const [isDetectingGps, setIsDetectingGps] = useState(false);

  useEffect(() => {
    if (isOpen && initialName && initialName.trim()) {
      setName(initialName.trim());
    }
  }, [isOpen, initialName]);

  if (!isOpen) return null;

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) => {
      if (prev.includes(genre)) {
        return prev.filter((g) => g !== genre);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), genre];
      }
      return [...prev, genre];
    });
  };

  const handleGpsDetect = async () => {
    setIsDetectingGps(true);
    try {
      const res = await requestNativeGpsLocation();
      if (res.location && res.location.fullLocation) {
        setCity(res.location.fullLocation);
      }
    } catch {
      // ignore
    } finally {
      setIsDetectingGps(false);
    }
  };

  const handleFinish = () => {
    const chosenAvatar = PRESET_AVATARS.find((a) => a.id === selectedAvatarId) || PRESET_AVATARS[0];
    const cleanName = name.trim() || 'Müzik Kaşifi';
    const seed = cleanName
      .split(' ')
      .map((s) => s[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'MK';

    onComplete({
      name: cleanName,
      avatarUrl: chosenAvatar.url,
      avatarGradient: chosenAvatar.gradient,
      avatarSeed: seed,
      genres: selectedGenres.length > 0 ? selectedGenres : ['Alternatif & Indie'],
      city: city.trim() || 'İstanbul, Kadıköy',
    });
  };

  const activeAvatarObj = PRESET_AVATARS.find((a) => a.id === selectedAvatarId) || PRESET_AVATARS[0];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/70 dark:bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white/95 dark:bg-[#12101A]/95 border border-[#E4E2EC] dark:border-purple-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto no-scrollbar backdrop-blur-2xl">
        {/* Top Header & Guest Pass */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/12 dark:bg-purple-500/15 border border-purple-500/30 text-purple-700 dark:text-purple-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Hoş Geldin · Hızlı Frekans Kurulumu</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
              Frekans Kimliğini Oluştur
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Şarkıların aynı saniyesinde buluşacağın dinleyicilere kendini tanıt.
            </p>
          </div>

          <button
            type="button"
            onClick={onSkipAsGuest}
            className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white px-2.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 transition border border-[#E4E2EC] dark:border-white/10 shrink-0 cursor-pointer font-medium"
          >
            Misafir Olarak Geç
          </button>
        </div>

        {/* ADIM 1: Rumuz ve Avatar Seçimi */}
        <div className="space-y-3 p-4 rounded-2xl bg-[#F5F4F8] dark:bg-white/[0.03] border border-[#E4E2EC] dark:border-white/[0.06]">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
              <Headphones className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              1. Rumuzun ve Avatarın
            </span>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">Adım 1/3</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-13 h-13 rounded-2xl overflow-hidden shrink-0 border-2 border-purple-500 shadow-md">
              <img
                src={activeAvatarObj.url}
                alt={activeAvatarObj.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">
                Görünecek Adın / Rumuzun
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn: Gece Yolcusu, Melodi Sever"
                maxLength={24}
                className="w-full mt-0.5 px-3 py-2 rounded-xl bg-white dark:bg-black/40 border border-[#E4E2EC] dark:border-white/10 text-zinc-900 dark:text-white text-sm focus:outline-none focus:border-purple-500 transition"
              />
            </div>
          </div>

          {/* 5 Hazır Avatar Seçici */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Hazır Avatarlardan Seç:</span>
            <div className="grid grid-cols-5 gap-2">
              {PRESET_AVATARS.map((av) => {
                const isSelected = selectedAvatarId === av.id;
                return (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => setSelectedAvatarId(av.id)}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition cursor-pointer group ${
                      isSelected
                        ? 'border-purple-500 ring-2 ring-purple-500/40 scale-105'
                        : 'border-zinc-200 dark:border-white/10 hover:border-purple-400/60 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img src={av.url} alt={av.name} className="w-full h-full object-cover" />
                    {isSelected && (
                      <div className="absolute inset-0 bg-purple-900/40 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ADIM 2: Müzik Türleri Seçimi (En fazla 3) */}
        <div className="space-y-2.5 p-4 rounded-2xl bg-[#F5F4F8] dark:bg-white/[0.03] border border-[#E4E2EC] dark:border-white/[0.06]">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400" />
              2. En Çok Dinlediğin Türler ({selectedGenres.length}/3)
            </span>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">Adım 2/3</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {PRESET_GENRES.map((g) => {
              const isSelected = selectedGenres.includes(g);
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleGenre(g)}
                  className={`text-xs px-3 py-1.5 rounded-xl border transition cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-purple-600/15 dark:bg-purple-600/30 border-purple-500 text-purple-800 dark:text-purple-200 font-semibold shadow-sm'
                      : 'bg-white dark:bg-white/5 border-[#E4E2EC] dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:border-purple-400/50'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-purple-600 dark:text-purple-300" />}
                  <span>{g}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ADIM 3: Şehir ve Konum Seçimi */}
        <div className="space-y-2.5 p-4 rounded-2xl bg-[#F5F4F8] dark:bg-white/[0.03] border border-[#E4E2EC] dark:border-white/[0.06]">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              3. Müzik Frekansı Şehrin
            </span>
            <button
              type="button"
              onClick={handleGpsDetect}
              disabled={isDetectingGps}
              className="text-[11px] text-emerald-700 dark:text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer transition disabled:opacity-50"
            >
              <Compass className={`w-3 h-3 ${isDetectingGps ? 'animate-spin' : ''}`} />
              <span>{isDetectingGps ? 'Bulunuyor...' : '📍 GPS ile Bul'}</span>
            </button>
          </div>

          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Örn: İstanbul, Kadıköy veya İzmir"
            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/40 border border-[#E4E2EC] dark:border-white/10 text-zinc-900 dark:text-white text-sm focus:outline-none focus:border-purple-500 transition"
          />

          <div className="flex flex-wrap gap-1.5 pt-1">
            {QUICK_CITIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCity(`${c}, Merkez`)}
                className={`text-[11px] px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                  city.includes(c)
                    ? 'bg-emerald-500/15 dark:bg-emerald-500/20 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-semibold'
                    : 'bg-white dark:bg-white/5 border-[#E4E2EC] dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* CTA BUTONU */}
        <button
          type="button"
          onClick={handleFinish}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-500 text-white font-black text-sm tracking-wide shadow-xl shadow-purple-600/30 hover:opacity-95 active:scale-[0.99] transition cursor-pointer flex items-center justify-center gap-2"
        >
          <span>⚡ Frekansa Bağlan</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
