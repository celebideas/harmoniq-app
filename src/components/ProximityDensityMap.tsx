import React, { useState, useMemo, useEffect } from 'react';
import {
  Compass,
  MapPin,
  Radio,
  Users,
  Flame,
  Zap,
  Navigation,
  MessageCircle,
  ExternalLink,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { LoungeUser, Song } from '../types';
import {
  buildCityClusters,
  CityClusterInfo,
  detectCityKey,
  checkGeolocationPermissionState,
  requestNativeGpsLocation,
  GeolocationPermissionStatus,
} from '../services/locationService';

export type DistanceFilter = '1km' | '5km' | 'city' | 'all';

interface Props {
  users: LoungeUser[];
  activeFilter: DistanceFilter;
  onChangeFilter: (filter: DistanceFilter) => void;
  onSelectUser: (user: LoungeUser) => void;
  onDirectChat?: (user: LoungeUser) => void;
  onSeekSecond?: (sec: number) => void;
  currentSong: Song;
  myCity?: string;
  onChangeCity?: (city: string) => void;
}

export const ProximityDensityMap: React.FC<Props> = ({
  users,
  activeFilter,
  onChangeFilter,
  onSelectUser,
  onDirectChat,
  onSeekSecond,
  currentSong,
  myCity = 'İstanbul, Kadıköy',
  onChangeCity,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [activeClusterId, setActiveClusterId] = useState<string | null>(null);
  const [gpsPermState, setGpsPermState] = useState<GeolocationPermissionStatus>('prompt');
  const [isRequestingGps, setIsRequestingGps] = useState(false);
  const [gpsStatusNote, setGpsStatusNote] = useState<string | null>(null);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    checkGeolocationPermissionState().then((state) => {
      setGpsPermState(state);
    });
  }, []);

  const handleRequestMapGpsPermission = async () => {
    setIsRequestingGps(true);
    setGpsStatusNote(null);
    try {
      const res = await requestNativeGpsLocation();
      setGpsPermState(res.permissionState);
      if (onChangeCity && res.location?.fullLocation) {
        onChangeCity(res.location.fullLocation);
      }
      if (res.gpsGranted) {
        setGpsStatusNote(`📍 Cihaz GPS konumu doğrulandı: ${res.location.fullLocation}`);
      } else {
        setGpsStatusNote(
          res.errorReason || `🌐 Şebeke/IP konumu aktif: ${res.location.fullLocation}`
        );
      }
      setTimeout(() => setGpsStatusNote(null), 5000);
    } finally {
      setIsRequestingGps(false);
    }
  };

  const selectedUser = useMemo(() => {
    if (!selectedUserId) return null;
    return users.find((u) => u.id === selectedUserId) || null;
  }, [users, selectedUserId]);

  // Filter users based on distance
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (activeFilter === '1km') return u.distanceKm <= 1.0;
      if (activeFilter === '5km') return u.distanceKm <= 5.0;
      if (activeFilter === 'city') return u.distanceKm <= 15.0;
      return true; // 'all'
    });
  }, [users, activeFilter]);

  // Group into geographic density clusters synchronized with selected city
  const clusters: CityClusterInfo[] = useMemo(() => {
    return buildCityClusters(users, myCity);
  }, [users, myCity]);

  const activeCityKey = detectCityKey(myCity);
  const quickCities = [
    { key: 'selcuk', label: 'Selçuk', full: 'Selçuk, İzmir' },
    { key: 'izmir', label: 'İzmir', full: 'İzmir, Alsancak' },
    { key: 'antalya', label: 'Antalya', full: 'Antalya, Muratpaşa' },
    { key: 'ankara', label: 'Ankara', full: 'Ankara, Çankaya' },
    { key: 'istanbul', label: 'İstanbul', full: 'İstanbul, Kadıköy' },
  ];

  // Deterministic polar-to-cartesian projection for users on radar
  // Returns normalized { x: [0, 100], y: [0, 100], ringDistancePercent }
  const userPositions = useMemo(() => {
    // Determine maximum scale based on active filter
    let maxDistanceScale = 15;
    if (activeFilter === '1km') maxDistanceScale = 1.2;
    else if (activeFilter === '5km') maxDistanceScale = 6;
    else if (activeFilter === 'city') maxDistanceScale = 18;
    else maxDistanceScale = 550; // all Turkey

    return users.map((u, idx) => {
      // Fixed bearing angles per user to keep visual stability
      const predefinedAngles: Record<string, number> = {
        'user-arda': 110,   // Bahariye (SE)
        'user-ece': 135,    // Çarşı (SE)
        'user-kaan': 200,   // Rıhtım (SW)
        'user-mert': 230,   // Kadıköy (SW)
        'user-defne': 175,  // Moda (S)
        'user-sinan': 80,   // Kadıköy East
        'user-deniz': 310,  // Karaköy (NW)
        'user-beren': 345,  // Üsküdar (N)
        'user-can': 325,    // Beşiktaş (NW)
        'user-burak': 300,  // Cihangir (NW)
        'user-zeynep': 355, // Şişli (N)
        'user-cem': 180,    // Bursa (S)
        'user-melis': 120,  // Eskişehir (SE)
        'user-eren': 225,   // İzmir (SW)
        'user-selin': 85,   // Ankara (E)
        'user-tolga': 160,  // Antalya (S)
      };

      const angleDeg = predefinedAngles[u.id] ?? ((idx * 65 + 40) % 360);
      const angleRad = (angleDeg - 90) * (Math.PI / 180); // 0 deg is North

      // Calculate radial distance ratio [0.15, 0.88]
      const distRatio = Math.min(1, Math.max(0.12, u.distanceKm / maxDistanceScale));
      const rPercent = 14 + distRatio * 74; // mapped into SVG circle radius

      const x = 50 + (rPercent / 2) * Math.cos(angleRad);
      const y = 50 + (rPercent / 2) * Math.sin(angleRad);

      const inActiveRange =
        activeFilter === '1km' ? u.distanceKm <= 1.0 :
        activeFilter === '5km' ? u.distanceKm <= 5.0 :
        activeFilter === 'city' ? u.distanceKm <= 15.0 : true;

      return {
        user: u,
        x,
        y,
        angleDeg,
        inActiveRange,
      };
    });
  }, [users, activeFilter]);

  return (
    <div className="space-y-4">
      {/* Visual Proximity & Density Map Canvas */}
      <div className="relative rounded-3xl bg-white/95 dark:bg-[#14121E]/95 border border-[#E4E2EC] dark:border-white/[0.08] p-4 sm:p-6 overflow-hidden shadow-2xl select-none">
        {/* Subtle Ambient Background Gradient */}
        <div className="absolute inset-0 bg-radial from-purple-500/5 via-transparent to-transparent pointer-events-none" />

        {/* Header inside Map Card with City Synchronizer & GPS Permission Trigger */}
        <div className="relative z-10 flex flex-col gap-2.5 pb-3 border-b border-zinc-200/80 dark:border-white/[0.06] text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="font-heading font-bold text-zinc-900 dark:text-white text-sm">
                Canlı Frekans & Yoğunluk Haritası
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                disabled={isRequestingGps}
                onClick={handleRequestMapGpsPermission}
                className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-semibold transition cursor-pointer active:scale-95 ${
                  gpsPermState === 'granted'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25'
                    : 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/35 hover:bg-purple-500/25'
                }`}
                title="Tarayıcı veya telefon konum iznini etkinleştir / GPS ile bul"
              >
                <Navigation className={`w-3 h-3 ${isRequestingGps ? 'animate-spin' : ''}`} />
                <span>
                  {isRequestingGps
                    ? 'Konum Soruluyor...'
                    : gpsPermState === 'granted'
                    ? 'GPS Açık • Yenile'
                    : 'Konum İzni Ver (GPS)'}
                </span>
              </button>

              <div className="flex items-center gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-white/[0.04] px-2.5 py-1 rounded-full border border-zinc-200 dark:border-white/[0.08]">
                <Compass className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                <span className="truncate max-w-[150px] font-medium">Merkez: {myCity}</span>
              </div>
            </div>
          </div>

          {gpsStatusNote && (
            <div className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/10 text-[11px] text-zinc-800 dark:text-zinc-200 flex items-center justify-between gap-2">
              <span>{gpsStatusNote}</span>
              <button
                type="button"
                onClick={() => setGpsStatusNote(null)}
                className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Quick City Selector Pills (Selçuk, İzmir, Antalya, Ankara, İstanbul) */}
          {onChangeCity && (
            <div className="flex items-center justify-between gap-2 pt-0.5 overflow-x-auto no-scrollbar">
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium shrink-0">Şehir Odağı:</span>
              <div className="flex items-center gap-1.5">
                {quickCities.map((c) => {
                  const isCurrent = activeCityKey === c.key;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => onChangeCity(c.full)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer shrink-0 active:scale-95 ${
                        isCurrent
                          ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold shadow-sm'
                          : 'bg-zinc-100 dark:bg-white/[0.04] hover:bg-zinc-200 dark:hover:bg-white/[0.09] text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-white/[0.06]'
                      }`}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 3. Interactive Radar Display */}
        <div className="relative w-full max-w-[320px] xs:max-w-[360px] sm:max-w-[420px] aspect-square mx-auto my-3 flex items-center justify-center">
          {/* Radar Background Circles (Concentric Rings) */}
          <div className="absolute inset-0 rounded-full border border-white/[0.09] bg-[#0B0A11] backdrop-blur-sm shadow-inner" />

          {/* 15km / Outer Ring */}
          <div className={`absolute w-[86%] h-[86%] rounded-full border transition-colors duration-500 ${
            activeFilter === 'city' ? 'border-purple-500/50 bg-purple-500/[0.03]' : 'border-white/[0.07]'
          }`}>
            <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[9px] font-mono text-zinc-400 bg-zinc-950 px-1 rounded">
              15 km
            </span>
          </div>

          {/* 5km Ring */}
          <div className={`absolute w-[58%] h-[58%] rounded-full border transition-colors duration-500 ${
            activeFilter === '5km' ? 'border-purple-500/60 bg-purple-500/[0.05]' : 'border-white/[0.08]'
          }`}>
            <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[9px] font-mono text-zinc-400 bg-zinc-950 px-1 rounded">
              5 km
            </span>
          </div>

          {/* 1km Ring */}
          <div className={`absolute w-[30%] h-[30%] rounded-full border transition-colors duration-500 ${
            activeFilter === '1km' ? 'border-purple-500/80 bg-purple-500/[0.08]' : 'border-white/[0.09]'
          }`}>
            <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[9px] font-mono text-zinc-400 bg-zinc-950 px-1 rounded">
              1 km
            </span>
          </div>

          {/* Crosshairs */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-full h-px bg-white/[0.04]" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="h-full w-px bg-white/[0.04]" />
          </div>

          {/* Radar Sweep Effect (Rotating Beam) */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none animate-spin"
            style={{
              animationDuration: '10s',
              background: 'conic-gradient(from 0deg, transparent 0deg, transparent 310deg, rgba(16, 185, 129, 0.14) 360deg)',
            }}
          />

          {/* High Density Hotspot Halo */}
          <div
            className="absolute w-28 h-28 rounded-full bg-purple-500/10 blur-xl pointer-events-none"
            style={{
              top: '48%',
              left: '52%',
              transform: 'translate(-50%, -50%)',
            }}
          />

          {/* Medium Density Hotspot Halo */}
          <div
            className="absolute w-24 h-24 rounded-full bg-emerald-500/10 blur-xl pointer-events-none"
            style={{
              top: '28%',
              left: '32%',
              transform: 'translate(-50%, -50%)',
            }}
          />

          {/* Center Point: The User ("Sen") */}
          <div className="absolute z-20 flex flex-col items-center justify-center pointer-events-none">
            <div className="relative flex items-center justify-center">
              <span className="animate-ping absolute w-6 h-6 rounded-full bg-emerald-400 opacity-60" />
              <div className="w-4 h-4 rounded-full bg-emerald-500 text-zinc-950 flex items-center justify-center shadow-lg ring-2 ring-white/20">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-950" />
              </div>
            </div>
            <span className="mt-1 text-[10px] font-bold text-white bg-black/80 px-1.5 py-0.5 rounded-full border border-white/10">
              Sen
            </span>
          </div>

          {/* Render User Node Pins on Radar */}
          {userPositions.map(({ user, x, y, inActiveRange }) => {
            const isSelected = selectedUser?.id === user.id;

            return (
              <div
                key={user.id}
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className={`absolute z-20 transition-all duration-300 ${
                  inActiveRange ? 'opacity-100 scale-100' : 'opacity-25 scale-75 blur-[0.3px]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUserId((prev) => (prev === user.id ? null : user.id));
                  }}
                  className={`relative group p-0.5 rounded-full transition-transform active:scale-95 cursor-pointer ${
                    isSelected
                      ? 'ring-2 ring-purple-500 scale-110 shadow-lg shadow-purple-500/30'
                      : 'hover:scale-110 hover:ring-2 hover:ring-white/40'
                  }`}
                  title={`${user.name} (${user.distanceKm} km - ${user.city})`}
                >
                  {/* User Avatar */}
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover ring-1 ring-black"
                    />
                  ) : (
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr ${user.avatarGradient} flex items-center justify-center text-white text-[10px] font-bold shadow ring-1 ring-black`}
                    >
                      {user.avatarSeed}
                    </div>
                  )}

                  {/* Online / Active Sync Dot */}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-1.5 ring-black" />

                  {/* Compact Distance Badge on Node */}
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-mono font-semibold px-1 py-0.2 rounded bg-black/80 text-zinc-300 border border-white/10 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                    {user.distanceKm}km
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        {/* 4. Active Selected User Info Callout Banner (2-Row Spacious Card when a pin is clicked) */}
        {selectedUser && (
          <div className="relative z-30 p-4 rounded-2xl bg-[#ECEAF2]/90 dark:bg-[#1E1B2E]/90 border border-[#DFDCE8] dark:border-white/15 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-200 mt-2 space-y-3 shadow-xl">
            {/* Üst Satır: Sol tarafta avatar, tam okunur isim ve yaş, yanında 🛡️ 99 ve ⚡ %94 Uyum rozetleri, en sağda zümrüt yeşili mesafe rozeti */}
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {selectedUser.avatarUrl ? (
                  <img
                    src={selectedUser.avatarUrl}
                    alt={selectedUser.name}
                    className="w-11 h-11 rounded-full object-cover shrink-0 ring-2 ring-purple-500/40"
                  />
                ) : (
                  <div
                    className={`w-11 h-11 rounded-full bg-gradient-to-tr ${selectedUser.avatarGradient} flex items-center justify-center text-white font-bold text-xs shrink-0 ring-2 ring-purple-500/40`}
                  >
                    {selectedUser.avatarSeed}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center flex-wrap gap-1.5">
                    <span className="font-heading font-bold text-zinc-900 dark:text-white text-sm">
                      {selectedUser.name}, {selectedUser.age}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold shrink-0">
                      🛡️ {selectedUser.trustScore || 99}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold shrink-0">
                      ⚡ %{selectedUser.compatibilityScore || 94} Uyum
                    </span>
                  </div>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold shrink-0">
                {selectedUser.distanceKm} km
              </span>
            </div>

            {/* Orta Satır: Konum ve tırnak içinde kullanıcının o saniyeye bıraktığı not */}
            <div className="space-y-1">
              <p className="text-xs text-zinc-600 dark:text-zinc-300 font-medium">
                📍 {selectedUser.city}
              </p>
              <p className="text-xs text-zinc-700 dark:text-zinc-200 italic bg-white/60 dark:bg-black/30 px-3 py-1.5 rounded-xl border border-zinc-200/80 dark:border-white/[0.06]">
                "{selectedUser.statusBubble || `${formatTime(selectedUser.currentSecond)} anında aynı frekansta dinliyor 🎸`}"
              </p>
            </div>

            {/* Alt Satır (2 Net Aksiyon Butonu): Sol buton 🔗 01:42 Saniyesine Katıl, sağ buton 👋 Frekans Gönder */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (onSeekSecond) {
                    onSeekSecond(selectedUser.currentSecond);
                  }
                }}
                className="py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 hover:brightness-110 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md active:scale-95"
              >
                <span>🔗 {formatTime(selectedUser.currentSecond)} Saniyesine Katıl</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onDirectChat) {
                    onDirectChat(selectedUser);
                  } else {
                    onSelectUser(selectedUser);
                  }
                }}
                className="py-2 px-3 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 hover:opacity-90 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
              >
                <span>👋 Frekans Gönder</span>
              </button>
            </div>
          </div>
        )}

        {/* 5. Density Hotspot Zones & Cluster Indicators */}
        <div className="relative z-10 pt-4 border-t border-white/[0.06] space-y-2">
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Yoğunluk Kümeleri ({myCity.split(',')[0].trim()}):</span>
            </span>
            <span className="truncate max-w-[160px]">Şarkı: {currentSong.title}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {clusters.map((cluster) => {
              const isActive = activeClusterId === cluster.id;
              return (
                <button
                  key={cluster.id}
                  type="button"
                  onClick={() => {
                    setActiveClusterId((prev) => (prev === cluster.id ? null : cluster.id));
                    if (cluster.users[0]) {
                      setSelectedUserId(cluster.users[0].id);
                    }
                  }}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer active:scale-95 ${
                    isActive
                      ? 'bg-white/[0.08] border-accent-theme/60 text-white shadow-sm'
                      : 'bg-white/[0.02] border-white/[0.06] text-zinc-300 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-xs truncate" title={cluster.name}>
                      {cluster.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-white/[0.08] text-white shrink-0">
                      {cluster.count} kişi
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-1">
                    <span>Ort. {cluster.avgDistance} km</span>
                    <span className={`font-medium ${
                      cluster.density === 'high' ? 'text-amber-400' :
                      cluster.density === 'medium' ? 'text-cyan-400' : 'text-zinc-500'
                    }`}>
                      {cluster.density === 'high' ? '🔥 Yüksek' :
                       cluster.density === 'medium' ? '⚡ Orta' : '📍 Dağınık'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
