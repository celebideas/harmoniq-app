import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Compass,
  MapPin,
  Zap,
  MessageCircle,
  ShieldCheck,
  Music,
  X,
  Plus,
  Minus,
  Crosshair,
  Loader2,
} from 'lucide-react';
import { LoungeUser, Song } from '../types';
import {
  buildCityClusters,
  CityClusterInfo,
  detectCityKey,
  SupportedCityKey,
  requestNativeGpsLocation,
} from '../services/locationService';
import { triggerHaptic } from '../services/themeService';

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
  themeMode?: 'dark' | 'light';
}

type LatLngTuple = [number, number];

interface CityGeoSpec {
  center: LatLngTuple;
  districts: {
    high: LatLngTuple;
    medium: LatLngTuple;
    low: LatLngTuple;
    extra?: LatLngTuple;
  };
  namedDistricts: Record<string, LatLngTuple>;
}

const TURKEY_OVERVIEW_CENTER: LatLngTuple = [39.0, 32.0];
const TURKEY_OVERVIEW_ZOOM = 5.5;

const CITY_COORDS: Record<SupportedCityKey, CityGeoSpec> = {
  istanbul: {
    center: [40.9909, 29.0293], // Kadıköy / Moda
    districts: {
      high: [40.9909, 29.0293], // Kadıköy & Moda
      medium: [41.0422, 29.0067], // Beşiktaş
      low: [41.0319, 28.9833], // Cihangir
      extra: [41.0602, 28.9877], // Şişli
    },
    namedDistricts: {
      kadikoy: [40.9909, 29.0293],
      bahariye: [40.9889, 29.0291],
      carsi: [40.9917, 29.0258],
      rihtim: [40.9927, 29.0226],
      moda: [40.9834, 29.0268],
      besiktas: [41.0422, 29.0067],
      beyoglu: [41.0369, 28.9775],
      cihangir: [41.0319, 28.9833],
      sisli: [41.0602, 28.9877],
      karakoy: [41.0225, 28.9744],
      uskudar: [41.0234, 29.0152],
      bakirkoy: [40.9819, 28.8772],
      atasehir: [40.9923, 29.1244],
      bostanci: [40.9533, 29.0956],
    },
  },
  izmir: {
    center: [38.4361, 27.1419], // Konak
    districts: {
      high: [38.4361, 27.1419], // Konak
      medium: [38.4596, 27.1195], // Karşıyaka
      low: [38.4622, 27.2165], // Bornova
      extra: [38.3905, 27.0504], // Balçova
    },
    namedDistricts: {
      alsancak: [38.4361, 27.1419],
      kordon: [38.4385, 27.1398],
      karsiyaka: [38.4596, 27.1195],
      bostanli: [38.4552, 27.0972],
      bornova: [38.4622, 27.2165],
      konak: [38.4189, 27.1287],
      balcova: [38.3905, 27.0504],
      goztepe: [38.3964, 27.0882],
      guzelyali: [38.3979, 27.0785],
    },
  },
  selcuk: {
    center: [37.9508, 27.3688], // Selçuk
    districts: {
      high: [37.9508, 27.3688], // Selçuk
      medium: [37.8579, 27.2610], // Kuşadası
      low: [38.1525, 27.3646], // Torbalı
      extra: [37.9469, 27.2747],
    },
    namedDistricts: {
      selcuk: [37.9508, 27.3688],
      merkez: [37.9508, 27.3688],
      sirince: [37.9439, 27.4342],
      efes: [37.9394, 27.3414],
      pamucak: [37.9469, 27.2747],
      kusadasi: [37.8579, 27.2610],
      torbali: [38.1525, 27.3646],
    },
  },
  ankara: {
    center: [39.9035, 32.8597], // Çankaya
    districts: {
      high: [39.9035, 32.8597], // Çankaya
      medium: [39.9693, 32.8124], // Yenimahalle
      low: [39.9412, 32.8669], // Altındağ
      extra: [39.8917, 32.7848],
    },
    namedDistricts: {
      cankaya: [39.9035, 32.8597],
      yenimahalle: [39.9693, 32.8124],
      altindag: [39.9412, 32.8669],
      tunali: [39.9054, 32.8615],
      kavaklidere: [39.9096, 32.8594],
      bahcelievler: [39.9218, 32.8211],
      emek: [39.9192, 32.8152],
      kizilay: [39.9208, 32.8541],
      bilkent: [39.8689, 32.7489],
      odtu: [39.8917, 32.7848],
    },
  },
  antalya: {
    center: [36.8841, 30.7056], // Muratpaşa
    districts: {
      high: [36.8841, 30.7056], // Muratpaşa
      medium: [36.8685, 30.6378], // Konyaaltı
      low: [36.9242, 30.7176], // Kepez
      extra: [36.9061, 30.6548],
    },
    namedDistricts: {
      kaleici: [36.8841, 30.7056],
      muratpasa: [36.8862, 30.7082],
      konyaalti: [36.8685, 30.6378],
      lara: [36.8547, 30.7852],
      sirinyali: [36.8588, 30.7429],
      kultur: [36.9061, 30.6548],
      kepez: [36.9242, 30.7176],
    },
  },
  custom: {
    center: [40.9909, 29.0293],
    districts: {
      high: [40.9909, 29.0293],
      medium: [41.0225, 29.0121],
      low: [41.045, 28.995],
    },
    namedDistricts: {},
  },
};

const OTHER_TURKEY_CITY_COORDS: Record<string, LatLngTuple> = {
  istanbul: [41.0082, 28.9784],
  ankara: [39.9334, 32.8597],
  izmir: [38.4237, 27.1428],
  antalya: [36.8969, 30.7133],
  eskisehir: [39.7767, 30.5206],
  bursa: [40.1885, 29.0610],
  selcuk: [37.9508, 27.3688],
  mugla: [37.2153, 28.3636],
  bodrum: [37.0344, 27.4305],
  adana: [37.0000, 35.3213],
  trabzon: [41.0027, 39.7168],
  mersin: [36.8121, 34.6415],
  konya: [37.8746, 32.4932],
};

const normalizeTr = (text: string): string =>
  text
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');

const escapeHtml = (str: string): string =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const sanitizeImageUrl = (url?: string): string | null => {
  if (!url) return null;
  const trimmed = url.trim();
  if (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('/')
  ) {
    return trimmed;
  }
  return null;
};

const hashString = (input: string): number => {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

// Map Tailwind avatarGradient tokens to clean inline CSS gradient colors for Leaflet divIcon
const resolveAvatarGradientCss = (gradientToken?: string): string => {
  const g = (gradientToken || '').toLowerCase();
  if (g.includes('emerald') || g.includes('teal')) return 'linear-gradient(135deg, #10b981, #0f766e)';
  if (g.includes('purple') || g.includes('violet') || g.includes('fuchsia')) return 'linear-gradient(135deg, #9333ea, #ec4899)';
  if (g.includes('amber') || g.includes('orange')) return 'linear-gradient(135deg, #f59e0b, #ea580c)';
  if (g.includes('rose') || g.includes('red')) return 'linear-gradient(135deg, #f43f5e, #be123c)';
  if (g.includes('cyan') || g.includes('sky') || g.includes('blue')) return 'linear-gradient(135deg, #06b6d4, #2563eb)';
  if (g.includes('indigo')) return 'linear-gradient(135deg, #6366f1, #7c3aed)';
  if (g.includes('lime') || g.includes('green')) return 'linear-gradient(135deg, #84cc16, #15803d)';
  return 'linear-gradient(135deg, #9333ea, #db2777)';
};

const offsetLatLngByKm = (
  origin: LatLngTuple,
  distanceKm: number,
  bearingDeg: number
): LatLngTuple => {
  const rad = (bearingDeg * Math.PI) / 180;
  const dLat = (distanceKm * Math.cos(rad)) / 111.32;
  const cosLat = Math.max(0.2, Math.cos((origin[0] * Math.PI) / 180));
  const dLng = (distanceKm * Math.sin(rad)) / (111.32 * cosLat);
  return [origin[0] + dLat, origin[1] + dLng];
};

const resolveListenerLatLng = (
  user: LoungeUser,
  idx: number,
  activeCityKey: SupportedCityKey,
  originCenter: LatLngTuple
): LatLngTuple => {
  const seed = hashString(user.id || `${user.name}-${idx}`);
  const bearing = ((seed * 37 + idx * 53) % 360);
  const normCity = normalizeTr(user.city || '');
  const distKm = typeof user.distanceKm === 'number' ? user.distanceKm : 1.5;

  // Remote intercity listeners (> 15 km): map to their actual Turkish city coordinates
  if (distKm > 15) {
    for (const [cityKey, coords] of Object.entries(OTHER_TURKEY_CITY_COORDS)) {
      if (normCity.includes(cityKey)) {
        const jitterKm = 0.8 + (seed % 30) * 0.08;
        return offsetLatLngByKm(coords, jitterKm, bearing);
      }
    }
    // Fallback spread across real Turkish cities so remote users appear across Turkey
    const fallbackCities: LatLngTuple[] = [
      OTHER_TURKEY_CITY_COORDS.ankara,
      OTHER_TURKEY_CITY_COORDS.izmir,
      OTHER_TURKEY_CITY_COORDS.antalya,
      OTHER_TURKEY_CITY_COORDS.eskisehir,
      OTHER_TURKEY_CITY_COORDS.bursa,
    ];
    const picked = fallbackCities[seed % fallbackCities.length];
    return offsetLatLngByKm(picked, 1.2, bearing);
  }

  // Local listeners within the selected city (<= 15 km)
  const spec = CITY_COORDS[activeCityKey] || CITY_COORDS.istanbul;

  // 1 km walking ring: keep accurately within ~0.2 - 0.88 km of center so they sit cleanly inside the 1000m circle
  if (distKm <= 1.0) {
    const safeDist = Math.max(0.18, Math.min(0.88, distKm));
    return offsetLatLngByKm(originCenter, safeDist, bearing);
  }

  // Try matching real district name from user.city (e.g. "Beşiktaş", "Cihangir", "Karşıyaka", "Şirince")
  for (const [districtKey, coords] of Object.entries(spec.namedDistricts)) {
    if (normCity.includes(districtKey)) {
      const microOffsetKm = 0.12 + (seed % 14) * 0.03;
      return offsetLatLngByKm(coords, microOffsetKm, bearing);
    }
  }

  // Otherwise place at exact metric distance from center
  return offsetLatLngByKm(originCenter, Math.min(14.2, distKm), bearing);
};

const isValidLatLng = (coords: LatLngTuple | null | undefined): coords is LatLngTuple =>
  Array.isArray(coords) &&
  coords.length === 2 &&
  Number.isFinite(coords[0]) &&
  Number.isFinite(coords[1]) &&
  Math.abs(coords[0]) <= 90 &&
  Math.abs(coords[1]) <= 180;

const safeFlyTo = (
  map: L.Map | null,
  coords: LatLngTuple,
  zoom: number,
  duration = 0.75
) => {
  if (!map || !isValidLatLng(coords) || !Number.isFinite(zoom)) return;
  try {
    const container = map.getContainer();
    const isVisible =
      Boolean(container) && container.offsetWidth > 0 && container.offsetHeight > 0;
    if (!isVisible) {
      map.setView(coords, zoom, { animate: false });
      return;
    }
    map.invalidateSize({ animate: false });
    const size = map.getSize();
    if (!size || size.x <= 0 || size.y <= 0) {
      map.setView(coords, zoom, { animate: false });
      return;
    }
    map.flyTo(coords, zoom, { animate: true, duration });
  } catch {
    try {
      map.setView(coords, zoom, { animate: false });
    } catch {
      // ignore if map is unmounting
    }
  }
};

const getFilterMapConfig = (filter: DistanceFilter, center: LatLngTuple): {
  center: LatLngTuple;
  zoom: number;
  radiusMeters: number | null;
} => {
  const safeCenter = isValidLatLng(center) ? center : CITY_COORDS.istanbul.center;
  if (filter === '1km') return { center: safeCenter, zoom: 14, radiusMeters: 1000 };
  if (filter === '5km') return { center: safeCenter, zoom: 12, radiusMeters: 5000 };
  if (filter === 'city') return { center: safeCenter, zoom: 11, radiusMeters: 15000 };
  return { center: TURKEY_OVERVIEW_CENTER, zoom: TURKEY_OVERVIEW_ZOOM, radiusMeters: null };
};

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
  themeMode,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [activeClusterId, setActiveClusterId] = useState<string | null>(null);
  const [isRequestingGps, setIsRequestingGps] = useState(false);
  const [gpsStatusNote, setGpsStatusNote] = useState<string | null>(null);
  const [gpsCoords, setGpsCoords] = useState<LatLngTuple | null>(null);
  const [observedTheme, setObservedTheme] = useState<'dark' | 'light'>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('light') ? 'light' : 'dark';
    }
    return 'dark';
  });

  const effectiveTheme: 'dark' | 'light' = themeMode ?? observedTheme;
  const isLight = effectiveTheme === 'light';

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const listenerLayerRef = useRef<L.LayerGroup | null>(null);

  const activeCityKey = detectCityKey(myCity);

  // Resolve real geographic center (GPS coords when available for matching city, otherwise CITY_COORDS)
  const cityCenter: LatLngTuple = useMemo(() => {
    if (gpsCoords) return gpsCoords;
    const norm = normalizeTr(myCity);
    if (activeCityKey === 'custom') {
      for (const [k, coords] of Object.entries(OTHER_TURKEY_CITY_COORDS)) {
        if (norm.includes(k)) return coords;
      }
    }
    return (CITY_COORDS[activeCityKey] || CITY_COORDS.istanbul).center;
  }, [activeCityKey, myCity, gpsCoords]);

  // Fallback sync with <html class="dark" | "light"> when themeMode prop is not provided
  useEffect(() => {
    if (themeMode !== undefined || typeof document === 'undefined') return;
    const syncTheme = () => {
      const next: 'dark' | 'light' = document.documentElement.classList.contains('light')
        ? 'light'
        : 'dark';
      setObservedTheme(next);
    };
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });
    return () => observer.disconnect();
  }, [themeMode]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleRequestMapGpsPermission = useCallback(async () => {
    triggerHaptic(15);
    setIsRequestingGps(true);
    setGpsStatusNote(null);
    try {
      const res = await requestNativeGpsLocation();
      let resolvedCenter = cityCenter;
      if (
        res.gpsGranted &&
        typeof res.location?.latitude === 'number' &&
        typeof res.location?.longitude === 'number' &&
        Number.isFinite(res.location.latitude) &&
        Number.isFinite(res.location.longitude)
      ) {
        resolvedCenter = [res.location.latitude, res.location.longitude];
        setGpsCoords(resolvedCenter);
      } else {
        setGpsCoords(null);
      }
      if (onChangeCity && res.location?.fullLocation) {
        onChangeCity(res.location.fullLocation);
      }
      const cfg = getFilterMapConfig(activeFilter, resolvedCenter);
      safeFlyTo(mapRef.current, cfg.center, cfg.zoom, 0.75);

      if (res.gpsGranted) {
        setGpsStatusNote(`Cihaz GPS konumu doğrulandı: ${res.location.fullLocation}`);
      } else {
        setGpsStatusNote(
          res.errorReason || `Şebeke konumu aktif: ${res.location.fullLocation}`
        );
      }
      setTimeout(() => setGpsStatusNote(null), 5000);
    } finally {
      setIsRequestingGps(false);
    }
  }, [activeFilter, cityCenter, onChangeCity]);

  const selectedUser = useMemo(() => {
    if (!selectedUserId) return null;
    return users.find((u) => u.id === selectedUserId) || null;
  }, [users, selectedUserId]);

  // Group into geographic density clusters synchronized with selected city (3 real districts + Diğer Şehirler)
  const clusters: CityClusterInfo[] = useMemo(() => {
    return buildCityClusters(users, myCity);
  }, [users, myCity]);

  // Compute deterministic real coordinates for every listener
  const mappedListeners = useMemo(() => {
    return users.map((u, idx) => {
      const coords = resolveListenerLatLng(u, idx, activeCityKey, cityCenter);
      const inActiveRange =
        activeFilter === '1km'
          ? u.distanceKm <= 1.0
          : activeFilter === '5km'
          ? u.distanceKm <= 5.0
          : activeFilter === 'city'
          ? u.distanceKm <= 15.0
          : true;
      return {
        user: u,
        coords,
        inActiveRange,
      };
    });
  }, [users, activeCityKey, cityCenter, activeFilter]);

  // 1. Initialize Leaflet Map once on mount
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialCfg = getFilterMapConfig(activeFilter, cityCenter);
    const map = L.map(mapContainerRef.current, {
      center: initialCfg.center,
      zoom: initialCfg.zoom,
      zoomControl: false,
      zoomSnap: 0.5,
      zoomDelta: 0.5,
      minZoom: 4,
      maxZoom: 18,
      attributionControl: true,
    });

    map.attributionControl.setPrefix('');
    tileLayerRef.current = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);
    listenerLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // Ensure proper container dimensions after animations/tab reveal
    const resizeTimer = setTimeout(() => {
      if (mapContainerRef.current && mapContainerRef.current.offsetWidth > 0) {
        map.invalidateSize({ animate: false });
      }
    }, 180);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
      resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry && entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          map.invalidateSize({ animate: false });
        }
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      clearTimeout(resizeTimer);
      resizeObserver?.disconnect();
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      circleRef.current = null;
      userMarkerRef.current = null;
      listenerLayerRef.current = null;
    };
  }, []);

  // 3. Update User Center Marker ("Sen"), Metric Radar Circle, and Smooth FlyTo on city/filter change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const cfg = getFilterMapConfig(activeFilter, cityCenter);

    // Update or create "Sen" pulsing emerald center pin
    const userIcon = L.divIcon({
      className: 'harmoniq-user-marker',
      iconSize: [44, 52],
      iconAnchor: [22, 22],
      html: `
        <div class="keep-dark" style="position:relative;width:44px;height:52px;display:flex;flex-direction:column;align-items:center;pointer-events:none;">
          <div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
            <span class="harmoniq-user-pulse-ring" style="position:absolute;top:50%;left:50%;width:24px;height:24px;border-radius:9999px;background:rgba(16,185,129,0.55);border:1.5px solid rgba(52,211,153,0.85);"></span>
            <div style="position:relative;width:16px;height:16px;border-radius:9999px;background:#10b981;border:2.5px solid #ffffff;box-shadow:0 0 14px rgba(16,185,129,0.9);display:flex;align-items:center;justify-content:center;">
              <div style="width:5px;height:5px;border-radius:9999px;background:#052e16;"></div>
            </div>
          </div>
          <span style="margin-top:-2px;padding:1px 7px;border-radius:9999px;background:rgba(10,9,15,0.88);color:#ffffff;font-size:10px;font-weight:700;border:1px solid rgba(16,185,129,0.55);box-shadow:0 2px 8px rgba(0,0,0,0.4);letter-spacing:0.01em;">
            Sen
          </span>
        </div>
      `,
    });

    // Update or hide metric radar circle
    if (circleRef.current) {
      map.removeLayer(circleRef.current);
      circleRef.current = null;
    }

    if (isValidLatLng(cityCenter)) {
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng(cityCenter).setIcon(userIcon);
      } else {
        userMarkerRef.current = L.marker(cityCenter, {
          icon: userIcon,
          interactive: false,
          zIndexOffset: 500,
        }).addTo(map);
      }

      if (cfg.radiusMeters !== null) {
        const strokeColor = activeFilter === '1km' ? '#22C55E' : '#E87A3E';
        const fillColor = activeFilter === '1km' ? '#22C55E' : '#E87A3E';
        circleRef.current = L.circle(cityCenter, {
          radius: cfg.radiusMeters,
          color: strokeColor,
          weight: 1.75,
          opacity: 0.72,
          dashArray: activeFilter === 'city' ? '6 6' : undefined,
          fillColor,
          fillOpacity: effectiveTheme === 'light' ? 0.1 : 0.14,
          interactive: false,
        }).addTo(map);
      }
    }

    safeFlyTo(map, cfg.center, cfg.zoom, 0.85);
  }, [activeFilter, cityCenter, effectiveTheme]);

  // 4. Render Listener Avatar Pins inside LayerGroup
  useEffect(() => {
    const map = mapRef.current;
    const layerGroup = listenerLayerRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    mappedListeners.forEach(({ user, coords, inActiveRange }) => {
      const isSelected = selectedUserId === user.id;
      const safeName = escapeHtml(user.name);
      const safeSeed = escapeHtml((user.avatarSeed || user.name.slice(0, 2)).slice(0, 2).toUpperCase());
      const safeAvatarUrl = sanitizeImageUrl(user.avatarUrl);
      const gradientCss = resolveAvatarGradientCss(user.avatarGradient);

      const ringColor = user.isRealUser
        ? '#22C55E'
        : isSelected
        ? effectiveTheme === 'light'
          ? '#141416'
          : '#F5F5F7'
        : effectiveTheme === 'light'
        ? '#ffffff'
        : 'rgba(255,255,255,0.85)';

      const size = isSelected ? 40 : 34;
      const opacity = inActiveRange ? 1 : 0.36;
      const glowShadow = isSelected
        ? '0 0 0 3px rgba(34,197,94,0.35), 0 6px 18px rgba(0,0,0,0.45)'
        : user.isRealUser
        ? '0 0 0 3px rgba(34,197,94,0.4), 0 4px 14px rgba(0,0,0,0.4)'
        : '0 4px 12px rgba(0,0,0,0.35)';

      const avatarInner = safeAvatarUrl
        ? `<img src="${escapeHtml(safeAvatarUrl)}" alt="${safeName}" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover;border-radius:9999px;display:block;" />`
        : `<div style="width:100%;height:100%;border-radius:9999px;background:${gradientCss};display:flex;align-items:center;justify-content:center;color:#ffffff;font-weight:800;font-size:${isSelected ? '12px' : '11px'};letter-spacing:-0.02em;">${safeSeed}</div>`;

      const icon = L.divIcon({
        className: 'harmoniq-leaflet-marker',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        html: `
          <div class="keep-dark" style="position:relative;width:${size}px;height:${size}px;border-radius:9999px;padding:2px;background:${ringColor};box-shadow:${glowShadow};opacity:${opacity};transition:transform 0.2s ease, opacity 0.2s ease;cursor:pointer;" title="${safeName} (${user.distanceKm} km)">
            ${avatarInner}
            <span style="position:absolute;bottom:-1px;right:-1px;width:9px;height:9px;border-radius:9999px;background:#22C55E;border:2px solid #0B0B0D;"></span>
          </div>
        `,
      });

      if (!isValidLatLng(coords)) return;

      const marker = L.marker(coords, {
        icon,
        zIndexOffset: isSelected ? 400 : user.isRealUser ? 300 : inActiveRange ? 150 : 50,
      });

      marker.on('click', () => {
        triggerHaptic(15);
        setSelectedUserId(user.id);
        const currentZoom = Number.isFinite(map.getZoom()) ? map.getZoom() : 12;
        const targetZoom = Math.max(currentZoom, activeFilter === 'all' ? 9.5 : 13.5);
        safeFlyTo(map, coords, targetZoom, 0.65);
      });

      marker.addTo(layerGroup);
    });
  }, [mappedListeners, selectedUserId, effectiveTheme, activeFilter]);

  const handleZoomIn = useCallback(() => {
    triggerHaptic(10);
    mapRef.current?.zoomIn(1);
  }, []);

  const handleZoomOut = useCallback(() => {
    triggerHaptic(10);
    mapRef.current?.zoomOut(1);
  }, []);

  const handleRecenterWithGps = useCallback(() => {
    void handleRequestMapGpsPermission();
  }, [handleRequestMapGpsPermission]);

  const handleClusterClick = (cluster: CityClusterInfo) => {
    triggerHaptic(15);
    const isRemote = cluster.id.endsWith('-remote') || cluster.name === 'Diğer Şehirler';
    setActiveClusterId((prev) => (prev === cluster.id ? null : cluster.id));

    const map = mapRef.current;
    const spec = CITY_COORDS[activeCityKey] || CITY_COORDS.istanbul;

    if (isRemote) {
      if (activeFilter !== 'all') {
        onChangeFilter('all');
      }
      safeFlyTo(map, TURKEY_OVERVIEW_CENTER, TURKEY_OVERVIEW_ZOOM, 0.85);
      if (cluster.users[0]) {
        setSelectedUserId(cluster.users[0].id);
      }
      return;
    }

    // Fly directly to the clicked neighborhood's real coordinates
    let targetCoords: LatLngTuple = spec.center;
    if (cluster.id.endsWith('-high')) {
      targetCoords = spec.districts.high;
    } else if (cluster.id.endsWith('-medium')) {
      targetCoords = spec.districts.medium;
    } else if (cluster.id.endsWith('-low')) {
      targetCoords = spec.districts.low;
    }

    if (activeFilter === '1km' && !cluster.id.endsWith('-high')) {
      onChangeFilter('city');
    }

    safeFlyTo(map, targetCoords, 13.5, 0.75);

    if (cluster.users[0]) {
      setSelectedUserId(cluster.users[0].id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Real Interactive GIS Proximity & Density Map Card */}
      <div
        className={`relative rounded-2xl border p-4 sm:p-5 overflow-hidden select-none space-y-3.5 transition-colors duration-150 ${
          isLight
            ? 'bg-white border-[#EAE4DC] shadow-[0_4px_20px_rgba(24,21,18,0.04)] text-[#181512]'
            : 'bg-[#171412] border-[#FFF0E1]/[0.08] shadow-none text-[#FAF7F2]'
        }`}
      >
        {/* Clean Header inside Map Card (No city chip clutter or duplicate GPS button) */}
        <div
          className={`relative z-10 flex flex-col gap-2 pb-3 border-b text-xs ${
            isLight ? 'border-[#EAE4DC]' : 'border-[#FFF0E1]/[0.06]'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isLight ? 'bg-[#16A34A]' : 'bg-[#22C55E]'
                }`}
              />
              <span
                className={`font-bold text-sm tracking-tight ${
                  isLight ? 'text-[#181512]' : 'text-[#FAF7F2]'
                }`}
              >
                Canlı Frekans & Yoğunluk Haritası
              </span>
            </div>

            <div
              className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-xl border ${
                isLight
                  ? 'text-[#6B635B] bg-[#F2EDE6] border-[#E2D9CE]'
                  : 'text-[#A39A91] bg-[#211D1A] border-[#FFF0E1]/[0.06]'
              }`}
            >
              <Compass className="w-3.5 h-3.5 shrink-0 text-[#E87A3E]" strokeWidth={1.75} />
              <span className="truncate max-w-[170px] font-medium">{myCity}</span>
            </div>
          </div>

          {gpsStatusNote && (
            <div
              className={`px-3 py-1.5 rounded-xl border text-[11px] flex items-center justify-between gap-2 ${
                isLight
                  ? 'bg-[#F2EDE6] border-[#E2D9CE] text-[#181512]'
                  : 'bg-[#211D1A] border-[#FFF0E1]/[0.08] text-[#FAF7F2]'
              }`}
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <MapPin className="w-3.5 h-3.5 text-[#E87A3E] shrink-0" strokeWidth={1.75} />
                <span className="truncate">{gpsStatusNote}</span>
              </span>
              <button
                type="button"
                onClick={() => setGpsStatusNote(null)}
                className={`cursor-pointer shrink-0 transition ${
                  isLight
                    ? 'text-[#6B635B] hover:text-[#181512]'
                    : 'text-[#A39A91] hover:text-[#FAF7F2]'
                }`}
                aria-label="Kapat"
              >
                <X className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
            </div>
          )}
        </div>

        {/* Real Interactive Leaflet Map Canvas */}
        <div
          className={`harmoniq-leaflet-map h-[340px] sm:h-[380px] rounded-xl overflow-hidden border relative z-10 ${
            isLight
              ? 'border-[#EAE4DC] bg-[#F2EDE6]'
              : 'border-[#FFF0E1]/[0.08] bg-[#0E0C0B]'
          }`}
        >
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Active Radius Overlay Label (Top-Left) */}
          <div
            className={`pointer-events-none absolute top-3 left-3 z-[420] px-2.5 py-1 rounded-xl border backdrop-blur-md text-[11px] font-mono tabular-nums font-medium shadow-sm flex items-center gap-1.5 ${
              isLight
                ? 'bg-white/92 border-[#EAE4DC] text-[#181512]'
                : 'bg-[#171412]/92 border-[#FFF0E1]/[0.08] text-[#FAF7F2]'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isLight ? 'bg-[#16A34A]' : 'bg-[#22C55E]'
              }`}
            />
            <span>
              {activeFilter === '1km'
                ? '1 km · Yürüme'
                : activeFilter === '5km'
                ? '5 km · İlçe'
                : activeFilter === 'city'
                ? '15 km · Şehir'
                : 'Türkiye Geneli'}
            </span>
          </div>

          {/* Compact Zoom & GPS Locate Controls (Bottom-Right) */}
          <div className="absolute bottom-3 right-3 z-[450] flex flex-col gap-1.5">
            <div
              className={`flex flex-col rounded-xl overflow-hidden border backdrop-blur-xl shadow-md ${
                isLight
                  ? 'bg-white/95 border-[#EAE4DC]'
                  : 'bg-[#171412]/95 border-[#FFF0E1]/[0.1]'
              }`}
            >
              <button
                type="button"
                onClick={handleZoomIn}
                className={`w-9 h-9 flex items-center justify-center transition active:scale-95 cursor-pointer border-b ${
                  isLight
                    ? 'text-[#181512] hover:bg-[#F2EDE6] border-[#EAE4DC]'
                    : 'text-[#FAF7F2] hover:bg-[#211D1A] border-[#FFF0E1]/[0.08]'
                }`}
                title="Yakınlaştır"
                aria-label="Haritayı yakınlaştır"
              >
                <Plus className="w-4 h-4" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                className={`w-9 h-9 flex items-center justify-center transition active:scale-95 cursor-pointer ${
                  isLight
                    ? 'text-[#181512] hover:bg-[#F2EDE6]'
                    : 'text-[#FAF7F2] hover:bg-[#211D1A]'
                }`}
                title="Uzaklaştır"
                aria-label="Haritayı uzaklaştır"
              >
                <Minus className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>

            <button
              type="button"
              disabled={isRequestingGps}
              onClick={handleRecenterWithGps}
              className={`w-9 h-9 rounded-xl border backdrop-blur-xl shadow-md flex items-center justify-center text-[#E87A3E] transition active:scale-95 cursor-pointer disabled:opacity-60 ${
                isLight
                  ? 'bg-white/95 border-[#EAE4DC] hover:bg-[#F2EDE6]'
                  : 'bg-[#171412]/95 border-[#FFF0E1]/[0.1] hover:bg-[#211D1A]'
              }`}
              title="GPS Konumumu Bul ve Odaklan"
              aria-label="GPS konumumu bul ve odaklan"
            >
              {isRequestingGps ? (
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.75} />
              ) : (
                <Crosshair className="w-4 h-4" strokeWidth={1.75} />
              )}
            </button>
          </div>
        </div>

        {/* Active Selected User Info Callout Card */}
        {selectedUser && (
          <div
            className={`relative z-30 p-4 rounded-2xl border space-y-3 transition-colors duration-150 ${
              isLight
                ? 'bg-[#FAF8F4] border-[#EAE4DC] text-[#181512]'
                : 'bg-[#211D1A] border-[#FFF0E1]/[0.08] text-[#FAF7F2]'
            }`}
          >
            {/* Top Row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {selectedUser.avatarUrl ? (
                  <img
                    src={selectedUser.avatarUrl}
                    alt={selectedUser.name}
                    referrerPolicy="no-referrer"
                    className={`w-11 h-11 rounded-full object-cover shrink-0 border ${
                      isLight ? 'border-[#EAE4DC]' : 'border-[#FFF0E1]/10'
                    }`}
                  />
                ) : (
                  <div
                    className={`avatar-circle w-11 h-11 rounded-full bg-gradient-to-tr ${selectedUser.avatarGradient} flex items-center justify-center text-white font-bold text-sm shrink-0`}
                  >
                    {selectedUser.avatarSeed}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <h4
                    className={`font-bold text-sm sm:text-base leading-tight truncate ${
                      isLight ? 'text-[#181512]' : 'text-[#FAF7F2]'
                    }`}
                  >
                    {selectedUser.name}, {selectedUser.age}
                  </h4>
                  <p
                    className={`text-xs font-medium mt-0.5 flex items-center gap-1 ${
                      isLight ? 'text-[#6B635B]' : 'text-[#A39A91]'
                    }`}
                  >
                    <MapPin className="w-3 h-3 shrink-0" strokeWidth={1.75} />
                    <span className="truncate">{selectedUser.city}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-semibold tabular-nums ${
                    isLight
                      ? 'bg-white text-[#181512] border-[#EAE4DC]'
                      : 'bg-[#171412] text-[#FAF7F2] border-[#FFF0E1]/[0.08]'
                  }`}
                >
                  {selectedUser.distanceKm} km
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedUserId(null)}
                  className={`w-8 h-8 rounded-full border flex items-center justify-center transition cursor-pointer ${
                    isLight
                      ? 'bg-white border-[#EAE4DC] text-[#6B635B] hover:text-[#181512]'
                      : 'bg-[#171412] border-[#FFF0E1]/[0.08] text-[#A39A91] hover:text-[#FAF7F2]'
                  }`}
                  title="Kapat"
                  aria-label="Kullanıcı kartını kapat"
                >
                  <X className="w-4 h-4" strokeWidth={1.75} />
                </button>
              </div>
            </div>

            {/* Metadata Row */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {selectedUser.isRealUser && (
                <span
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-semibold flex items-center gap-1.5 shrink-0 ${
                    isLight
                      ? 'bg-[#16A34A]/15 text-[#16A34A]'
                      : 'bg-[#22C55E]/15 text-[#22C55E]'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isLight ? 'bg-[#16A34A]' : 'bg-[#22C55E]'
                    }`}
                  />
                  <span>Canlı</span>
                </span>
              )}

              <span
                className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-semibold flex items-center gap-1 shrink-0 tabular-nums ${
                  isLight
                    ? 'bg-[#16A34A]/10 text-[#16A34A]'
                    : 'bg-[#22C55E]/15 text-[#22C55E]'
                }`}
              >
                <ShieldCheck className="w-3 h-3" strokeWidth={1.75} />
                <span>Güven · {selectedUser.trustScore || 99}</span>
              </span>

              <span
                className={`px-2 py-0.5 rounded-lg border text-[11px] font-mono font-semibold flex items-center gap-1 shrink-0 tabular-nums ${
                  isLight
                    ? 'bg-white border-[#EAE4DC] text-[#181512]'
                    : 'bg-[#171412] border-[#FFF0E1]/[0.08] text-[#FAF7F2]'
                }`}
              >
                <Zap className="w-3 h-3 text-[#E87A3E]" strokeWidth={1.75} />
                <span>%{selectedUser.compatibilityScore || 94} Uyum</span>
              </span>

              <span
                className={`px-2 py-0.5 rounded-lg border text-[11px] font-mono font-semibold flex items-center gap-1 shrink-0 tabular-nums ${
                  isLight
                    ? 'bg-white border-[#EAE4DC] text-[#181512]'
                    : 'bg-[#171412] border-[#FFF0E1]/[0.08] text-[#FAF7F2]'
                }`}
              >
                <Music className="w-3 h-3 text-[#E87A3E]" strokeWidth={1.75} />
                <span>{formatTime(selectedUser.currentSecond)}</span>
              </span>
            </div>

            {/* Status Quote */}
            <div
              className={`p-2.5 rounded-xl border ${
                isLight
                  ? 'bg-white border-[#EAE4DC]'
                  : 'bg-[#171412] border-[#FFF0E1]/[0.08]'
              }`}
            >
              <p
                className={`text-xs italic leading-relaxed ${
                  isLight ? 'text-[#181512]' : 'text-[#FAF7F2]'
                }`}
              >
                "{selectedUser.statusBubble || `${formatTime(selectedUser.currentSecond)} anında aynı frekansta dinliyor.`}"
              </p>
            </div>

            {/* Two Crisp Studio Actions */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(20);
                  if (onSeekSecond) {
                    onSeekSecond(selectedUser.currentSecond);
                  }
                }}
                className="min-h-[42px] py-2 px-3 rounded-xl studio-btn-primary bg-gradient-to-br from-[#E87A3E] to-[#D97706] hover:brightness-105 text-white shadow-lg shadow-amber-950/20 font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
              >
                <span className="font-mono tabular-nums">
                  {formatTime(selectedUser.currentSecond)} Anına Katıl
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic(20);
                  if (onDirectChat) {
                    onDirectChat(selectedUser);
                  } else {
                    onSelectUser(selectedUser);
                  }
                }}
                className={`min-h-[42px] py-2 px-3 rounded-xl border font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 ${
                  isLight
                    ? 'bg-white hover:bg-[#F2EDE6] text-[#181512] border-[#EAE4DC]'
                    : 'bg-[#171412] hover:bg-[#FFF0E1]/10 text-[#FAF7F2] border-[#FFF0E1]/[0.08]'
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span>Mesaj Gönder</span>
              </button>
            </div>
          </div>
        )}

        {/* District Density Clusters (Real Districts + Diğer Şehirler) */}
        <div
          className={`relative z-10 pt-3.5 border-t space-y-2.5 ${
            isLight ? 'border-[#EAE4DC]' : 'border-[#FFF0E1]/[0.06]'
          }`}
        >
          <div
            className={`flex items-center justify-between text-[11px] gap-2 ${
              isLight ? 'text-[#6B635B]' : 'text-[#A39A91]'
            }`}
          >
            <span
              className={`font-semibold ${
                isLight ? 'text-[#181512]' : 'text-[#FAF7F2]'
              }`}
            >
              Bölge Yoğunluğu ({myCity.split(',')[0].trim()})
            </span>
            <span className="truncate max-w-[160px]">{currentSong.title}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {clusters.map((cluster) => {
              const isActive = activeClusterId === cluster.id;
              const isRemoteCluster =
                cluster.id.endsWith('-remote') || cluster.name === 'Diğer Şehirler';
              const displayLabel = isRemoteCluster ? 'Diğer Şehirler' : cluster.name;

              return (
                <button
                  key={cluster.id}
                  type="button"
                  onClick={() => handleClusterClick(cluster)}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer active:scale-95 flex flex-col justify-between gap-2 ${
                    isActive
                      ? isLight
                        ? 'bg-[#E87A3E]/15 border-[#E87A3E]/35 text-[#181512]'
                        : 'bg-[#E87A3E]/15 border-[#E87A3E]/35 text-[#FAF7F2]'
                      : isLight
                      ? 'bg-[#FAF8F4] border-[#EAE4DC] text-[#181512] hover:bg-[#F2EDE6]'
                      : 'bg-[#211D1A] border-[#FFF0E1]/[0.06] text-[#FAF7F2] hover:bg-[#2A2420]'
                  }`}
                >
                  <div
                    className={`font-semibold text-xs leading-snug ${
                      isLight ? 'text-[#181512]' : 'text-[#FAF7F2]'
                    }`}
                  >
                    {displayLabel}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1 text-[10.5px] font-mono tabular-nums">
                      <span
                        className={`font-semibold ${
                          isLight ? 'text-[#16A34A]' : 'text-[#22C55E]'
                        }`}
                      >
                        {cluster.count} kişi
                      </span>
                      <span className={isLight ? 'text-[#6B635B]' : 'text-[#A39A91]'}>
                        {cluster.avgDistance} km
                      </span>
                    </div>
                    <div
                      className={`text-[10px] font-medium ${
                        isLight ? 'text-[#6B635B]' : 'text-[#A39A91]'
                      }`}
                    >
                      {isRemoteCluster
                        ? 'Türkiye Geneli'
                        : cluster.density === 'high'
                        ? 'Yüksek Yoğunluk'
                        : cluster.density === 'medium'
                        ? 'Orta Yoğunluk'
                        : 'Aktif Bölge'}
                    </div>
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
