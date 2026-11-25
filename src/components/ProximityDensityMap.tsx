import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Compass,
  MapPin,
  Flame,
  Zap,
  Navigation,
  MessageCircle,
  ShieldCheck,
  Music,
  X,
  Plus,
  Minus,
  Crosshair,
} from 'lucide-react';
import { LoungeUser, Song } from '../types';
import {
  buildCityClusters,
  CityClusterInfo,
  detectCityKey,
  SupportedCityKey,
  checkGeolocationPermissionState,
  requestNativeGpsLocation,
  GeolocationPermissionStatus,
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
    center: [38.4361, 27.1419], // Alsancak
    districts: {
      high: [38.4361, 27.1419], // Alsancak
      medium: [38.4596, 27.1195], // Karşıyaka
      low: [38.4622, 27.2165], // Bornova
      extra: [38.4189, 27.1287], // Konak
    },
    namedDistricts: {
      alsancak: [38.4361, 27.1419],
      kordon: [38.4385, 27.1398],
      karsiyaka: [38.4596, 27.1195],
      bostanli: [38.4552, 27.0972],
      bornova: [38.4622, 27.2165],
      konak: [38.4189, 27.1287],
      goztepe: [38.3964, 27.0882],
      guzelyali: [38.3979, 27.0785],
    },
  },
  selcuk: {
    center: [37.9508, 27.3688], // Selçuk Merkez
    districts: {
      high: [37.9508, 27.3688], // Selçuk Merkez
      medium: [37.9439, 27.4342], // Şirince
      low: [37.9394, 27.3414], // Efes
      extra: [37.9469, 27.2747], // Pamucak
    },
    namedDistricts: {
      selcuk: [37.9508, 27.3688],
      merkez: [37.9508, 27.3688],
      sirince: [37.9439, 27.4342],
      efes: [37.9394, 27.3414],
      pamucak: [37.9469, 27.2747],
      kusadasi: [37.8579, 27.2610],
    },
  },
  ankara: {
    center: [39.9035, 32.8597], // Çankaya / Tunalı
    districts: {
      high: [39.9035, 32.8597], // Çankaya & Tunalı
      medium: [39.9218, 32.8211], // Bahçelievler
      low: [39.9208, 32.8541], // Kızılay
      extra: [39.8917, 32.7848], // ODTÜ / Bilkent
    },
    namedDistricts: {
      cankaya: [39.9035, 32.8597],
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
    center: [36.8841, 30.7056], // Kaleiçi
    districts: {
      high: [36.8841, 30.7056], // Kaleiçi
      medium: [36.8685, 30.6378], // Konyaaltı
      low: [36.8547, 30.7852], // Lara
      extra: [36.9061, 30.6548], // Kültür / Kepez
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

const getFilterMapConfig = (filter: DistanceFilter, center: LatLngTuple): {
  center: LatLngTuple;
  zoom: number;
  radiusMeters: number | null;
} => {
  if (filter === '1km') return { center, zoom: 14, radiusMeters: 1000 };
  if (filter === '5km') return { center, zoom: 12, radiusMeters: 5000 };
  if (filter === 'city') return { center, zoom: 11, radiusMeters: 15000 };
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
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [activeClusterId, setActiveClusterId] = useState<string | null>(null);
  const [gpsPermState, setGpsPermState] = useState<GeolocationPermissionStatus>('prompt');
  const [isRequestingGps, setIsRequestingGps] = useState(false);
  const [gpsStatusNote, setGpsStatusNote] = useState<string | null>(null);
  const [gpsCoords, setGpsCoords] = useState<LatLngTuple | null>(null);
  const [effectiveTheme, setEffectiveTheme] = useState<'dark' | 'light'>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('light') ? 'light' : 'dark';
    }
    return 'dark';
  });

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

  // Clear custom GPS center when user manually switches to another quick city
  const handleSelectQuickCity = (fullCity: string) => {
    triggerHaptic(12);
    setGpsCoords(null);
    setActiveClusterId(null);
    if (onChangeCity) {
      onChangeCity(fullCity);
    }
  };

  // Sync theme reactively with <html class="dark" | "light">
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const syncTheme = () => {
      const next: 'dark' | 'light' = document.documentElement.classList.contains('light')
        ? 'light'
        : 'dark';
      setEffectiveTheme(next);
    };
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });
    return () => observer.disconnect();
  }, []);

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
      if (
        res.gpsGranted &&
        typeof res.location?.latitude === 'number' &&
        typeof res.location?.longitude === 'number'
      ) {
        setGpsCoords([res.location.latitude, res.location.longitude]);
      } else {
        setGpsCoords(null);
      }
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

  const quickCities = [
    { key: 'selcuk', label: 'Selçuk', full: 'Selçuk, İzmir' },
    { key: 'izmir', label: 'İzmir', full: 'İzmir, Alsancak' },
    { key: 'antalya', label: 'Antalya', full: 'Antalya, Muratpaşa' },
    { key: 'ankara', label: 'Ankara', full: 'Ankara, Çankaya' },
    { key: 'istanbul', label: 'İstanbul', full: 'İstanbul, Kadıköy' },
  ];

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
      map.invalidateSize();
    }, 180);

    return () => {
      clearTimeout(resizeTimer);
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

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(cityCenter).setIcon(userIcon);
    } else {
      userMarkerRef.current = L.marker(cityCenter, {
        icon: userIcon,
        interactive: false,
        zIndexOffset: 500,
      }).addTo(map);
    }

    // Update or hide metric radar circle
    if (circleRef.current) {
      map.removeLayer(circleRef.current);
      circleRef.current = null;
    }

    if (cfg.radiusMeters !== null) {
      const strokeColor = activeFilter === '1km' ? '#10b981' : '#a855f7';
      const fillColor = activeFilter === '1km' ? '#10b981' : '#9333ea';
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

    map.flyTo(cfg.center, cfg.zoom, {
      animate: true,
      duration: 0.85,
    });
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
        ? '#10b981'
        : isSelected
        ? '#a855f7'
        : effectiveTheme === 'light'
        ? '#ffffff'
        : 'rgba(255,255,255,0.85)';

      const size = isSelected ? 40 : 34;
      const opacity = inActiveRange ? 1 : 0.36;
      const glowShadow = isSelected
        ? '0 0 0 3px rgba(168,85,247,0.45), 0 6px 18px rgba(0,0,0,0.55)'
        : user.isRealUser
        ? '0 0 0 3px rgba(16,185,129,0.45), 0 4px 14px rgba(0,0,0,0.45)'
        : '0 4px 12px rgba(0,0,0,0.45)';

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
            <span style="position:absolute;bottom:-1px;right:-1px;width:10px;height:10px;border-radius:9999px;background:#10b981;border:2px solid #0a090f;box-shadow:0 0 6px rgba(16,185,129,0.8);"></span>
          </div>
        `,
      });

      const marker = L.marker(coords, {
        icon,
        zIndexOffset: isSelected ? 400 : user.isRealUser ? 300 : inActiveRange ? 150 : 50,
      });

      marker.on('click', () => {
        triggerHaptic(15);
        setSelectedUserId(user.id);
        const targetZoom = Math.max(map.getZoom(), activeFilter === 'all' ? 9.5 : 13.5);
        map.flyTo(coords, targetZoom, {
          animate: true,
          duration: 0.65,
        });
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

  const handleRecenter = useCallback(() => {
    triggerHaptic(15);
    const map = mapRef.current;
    if (!map) return;
    const cfg = getFilterMapConfig(activeFilter, cityCenter);
    map.flyTo(cfg.center, cfg.zoom, { animate: true, duration: 0.75 });
  }, [activeFilter, cityCenter]);

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
      map?.flyTo(TURKEY_OVERVIEW_CENTER, TURKEY_OVERVIEW_ZOOM, {
        animate: true,
        duration: 0.85,
      });
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

    map?.flyTo(targetCoords, 13.5, {
      animate: true,
      duration: 0.75,
    });

    if (cluster.users[0]) {
      setSelectedUserId(cluster.users[0].id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Real Interactive GIS Proximity & Density Map Card */}
      <div className="relative rounded-3xl bg-white/95 dark:bg-[#14121E]/95 border border-[#E4E2EC] dark:border-white/[0.08] p-4 sm:p-5 overflow-hidden shadow-2xl select-none space-y-3.5">
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
                className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-full font-semibold transition cursor-pointer active:scale-95 ${
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

              <div className="flex items-center gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-white/[0.04] px-2.5 py-1.5 rounded-full border border-zinc-200 dark:border-white/[0.08]">
                <Compass className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                <span className="truncate max-w-[155px] font-medium">Merkez: {myCity}</span>
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
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium shrink-0">
                Şehir Odağı:
              </span>
              <div className="flex items-center gap-1.5">
                {quickCities.map((c) => {
                  const isCurrent = activeCityKey === c.key;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => handleSelectQuickCity(c.full)}
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

        {/* Real Interactive Leaflet Map Canvas */}
        <div
          className={`harmoniq-leaflet-map h-[340px] sm:h-[380px] rounded-2xl overflow-hidden border border-zinc-200 dark:border-white/10 relative z-10 ${
            effectiveTheme === 'light' ? 'bg-[#EFEFF4]' : 'bg-[#0B0A11]'
          }`}
        >
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Active Radius Overlay Label (Top-Left) */}
          <div className="pointer-events-none absolute top-3 left-3 z-[420] px-2.5 py-1 rounded-xl bg-white/85 dark:bg-[#0F0D18]/85 border border-zinc-200/80 dark:border-white/10 backdrop-blur-md text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 shadow-sm flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                activeFilter === '1km'
                  ? 'bg-emerald-500'
                  : activeFilter === 'all'
                  ? 'bg-amber-400'
                  : 'bg-purple-500'
              }`}
            />
            <span>
              {activeFilter === '1km'
                ? '1 km • Yürüme Çemberi'
                : activeFilter === '5km'
                ? '5 km • İlçe Çemberi'
                : activeFilter === 'city'
                ? '15 km • Şehir Çemberi'
                : 'Türkiye Geneli'}
            </span>
          </div>

          {/* Compact Glass Zoom & Recenter Controls (Bottom-Right) */}
          <div className="absolute bottom-3 right-3 z-[450] flex flex-col gap-1.5">
            <div className="flex flex-col rounded-xl overflow-hidden bg-white/90 dark:bg-[#12101B]/90 border border-zinc-200 dark:border-white/15 backdrop-blur-xl shadow-lg">
              <button
                type="button"
                onClick={handleZoomIn}
                className="w-9 h-9 flex items-center justify-center text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-white/10 transition active:scale-95 cursor-pointer border-b border-zinc-200/80 dark:border-white/10"
                title="Yakınlaştır"
                aria-label="Haritayı yakınlaştır"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                className="w-9 h-9 flex items-center justify-center text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-white/10 transition active:scale-95 cursor-pointer"
                title="Uzaklaştır"
                aria-label="Haritayı uzaklaştır"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleRecenter}
              className="w-9 h-9 rounded-xl bg-white/90 dark:bg-[#12101B]/90 border border-zinc-200 dark:border-white/15 backdrop-blur-xl shadow-lg flex items-center justify-center text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/20 transition active:scale-95 cursor-pointer"
              title="Konuma Odaklan"
              aria-label="Konuma odaklan"
            >
              <Crosshair className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Active Selected User Info Callout Banner (Spacious, Multi-Row Clean Card) */}
        {selectedUser && (
          <div className="relative z-30 p-4 rounded-2xl bg-white/95 dark:bg-[#1E1B2E]/95 border border-zinc-200 dark:border-white/15 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-200 space-y-3 shadow-xl">
            {/* 1. Üst Satır: Avatar, İsim & Yaş, Konum ve Sağda Mesafe & Kapat Butonu */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {selectedUser.avatarUrl ? (
                  <img
                    src={selectedUser.avatarUrl}
                    alt={selectedUser.name}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-full object-cover shrink-0 ring-2 ring-purple-500/50 shadow-md"
                  />
                ) : (
                  <div
                    className={`w-12 h-12 rounded-full bg-gradient-to-tr ${selectedUser.avatarGradient} flex items-center justify-center text-white font-bold text-sm shrink-0 ring-2 ring-purple-500/50 shadow-md`}
                  >
                    {selectedUser.avatarSeed}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-heading font-bold text-zinc-900 dark:text-white text-base leading-tight truncate">
                      {selectedUser.name}, {selectedUser.age}
                    </h4>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                    <span className="truncate">{selectedUser.city}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold tabular-nums">
                  {selectedUser.distanceKm} km
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedUserId(null)}
                  className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-white/10 hover:bg-zinc-200 dark:hover:bg-white/20 text-zinc-500 dark:text-zinc-300 flex items-center justify-center transition cursor-pointer"
                  title="Kapat"
                  aria-label="Kullanıcı kartını kapat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 2. Rozetler Satırı */}
            <div className="flex items-center gap-2 flex-wrap">
              {selectedUser.isRealUser && (
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 text-xs font-black flex items-center gap-1.5 shrink-0 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>🟢 GERÇEK CANLI</span>
                </span>
              )}

              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 text-xs font-semibold flex items-center gap-1 shrink-0 tabular-nums">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Güven: %{selectedUser.trustScore || 99}</span>
              </span>

              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 text-xs font-semibold flex items-center gap-1 shrink-0 tabular-nums">
                <Zap className="w-3.5 h-3.5 text-emerald-500 fill-current" />
                <span>%{selectedUser.compatibilityScore || 94} Uyum</span>
              </span>

              <span className="px-2.5 py-1 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/25 text-xs font-semibold flex items-center gap-1 shrink-0 tabular-nums">
                <Music className="w-3.5 h-3.5 text-purple-500" />
                <span>{formatTime(selectedUser.currentSecond)} Anında</span>
              </span>
            </div>

            {/* 3. Durum Notu */}
            <div className="p-3 rounded-xl bg-zinc-100/80 dark:bg-black/40 border border-zinc-200 dark:border-white/10 flex items-start gap-2.5 shadow-sm">
              <MessageCircle className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
              <p className="text-xs text-zinc-700 dark:text-zinc-200 italic font-medium leading-relaxed">
                "{selectedUser.statusBubble || `${formatTime(selectedUser.currentSecond)} anında aynı frekansta dinliyor 🎸`}"
              </p>
            </div>

            {/* 4. Alt Satır (2 Net ve Konforlu Aksiyon Butonu) */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(20);
                  if (onSeekSecond) {
                    onSeekSecond(selectedUser.currentSecond);
                  }
                }}
                className="min-h-[42px] py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 hover:brightness-110 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md active:scale-95"
              >
                <span>🔗 {formatTime(selectedUser.currentSecond)} Saniyesine Katıl</span>
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
                className="min-h-[42px] py-2.5 px-3 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 hover:opacity-90 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Frekans Gönder</span>
              </button>
            </div>
          </div>
        )}

        {/* Density Hotspot Zones & Cluster Indicators (3 Real Districts + Diğer Şehirler) */}
        <div className="relative z-10 pt-3.5 border-t border-zinc-200/80 dark:border-white/[0.06] space-y-2.5">
          <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 gap-2">
            <span className="font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Yoğunluk Kümeleri ({myCity.split(',')[0].trim()}):</span>
            </span>
            <span className="truncate max-w-[160px]">Şarkı: {currentSong.title}</span>
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
                      ? 'bg-purple-500/12 border-purple-500/60 text-zinc-900 dark:text-white shadow-sm ring-1 ring-purple-500/25'
                      : 'bg-zinc-50 dark:bg-white/[0.025] border-zinc-200/90 dark:border-white/[0.07] text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.05]'
                  }`}
                >
                  {/* Full Unclipped District / Cluster Title */}
                  <div className="font-semibold text-xs leading-snug text-zinc-900 dark:text-white">
                    {displayLabel}
                  </div>

                  {/* Metrics Row: Count + Avg Distance + Density */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1 text-[10.5px] tabular-nums">
                      <span className="font-bold text-purple-600 dark:text-purple-300">
                        {cluster.count} kişi
                      </span>
                      <span className="text-zinc-500 dark:text-zinc-400">
                        Ort. {cluster.avgDistance} km
                      </span>
                    </div>
                    <div
                      className={`text-[10px] font-medium ${
                        isRemoteCluster
                          ? 'text-sky-600 dark:text-sky-400'
                          : cluster.density === 'high'
                          ? 'text-amber-600 dark:text-amber-400'
                          : cluster.density === 'medium'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      {isRemoteCluster
                        ? '🗺️ Türkiye Geneli'
                        : cluster.density === 'high'
                        ? '🔥 Yüksek Yoğunluk'
                        : cluster.density === 'medium'
                        ? '⚡ Orta Yoğunluk'
                        : '📍 Aktif Bölge'}
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
