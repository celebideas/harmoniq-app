import { LoungeUser } from '../types';

export interface UserLocation {
  city: string;
  district?: string;
  fullLocation: string;
  isAuto: boolean;
  source?: 'gps' | 'network_ip' | 'manual';
  latitude?: number;
  longitude?: number;
  updatedAt: number;
}

const STORAGE_KEY_CITY = 'harmoniq_user_city';
const STORAGE_KEY_MODE = 'harmoniq_location_mode'; // 'auto' | 'manual'
const STORAGE_KEY_SOURCE = 'harmoniq_location_source'; // 'gps' | 'network_ip' | 'manual'
const STORAGE_KEY_LAT = 'harmoniq_location_lat';
const STORAGE_KEY_LON = 'harmoniq_location_lon';

function saveLocationToStorage(loc: UserLocation) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_CITY, loc.fullLocation);
    localStorage.setItem(STORAGE_KEY_MODE, loc.isAuto ? 'auto' : 'manual');
    if (loc.source) localStorage.setItem(STORAGE_KEY_SOURCE, loc.source);
    if (loc.latitude) localStorage.setItem(STORAGE_KEY_LAT, String(loc.latitude));
    if (loc.longitude) localStorage.setItem(STORAGE_KEY_LON, String(loc.longitude));
  }
}

/**
 * Format city string from location parts
 */
export function formatCityName(district?: string, city?: string, state?: string): string {
  const primaryCity = city || state || '';
  if (district && primaryCity && district.toLowerCase() !== primaryCity.toLowerCase()) {
    return `${primaryCity}, ${district}`;
  }
  return primaryCity || district || 'İstanbul, Kadıköy';
}

/**
 * Reverse geocodes latitude & longitude into a human-readable city/district.
 * Uses BigDataCloud client API (fast, CORS-friendly, no API key needed)
 * with OpenStreetMap Nominatim fallback.
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<{ city: string; district?: string }> {
  try {
    // 1. Primary: BigDataCloud reverse geocode client (multilingual, fast)
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=tr`,
      { signal: AbortSignal.timeout(3500) }
    );
    if (res.ok) {
      const data = await res.json();
      const district = data.locality || data.localityInfo?.administrative?.[3]?.name || data.localityInfo?.administrative?.[2]?.name;
      const city = data.city || data.principalSubdivision || data.countryName;
      if (city) {
        return { city, district: district && district !== city ? district : undefined };
      }
    }
  } catch {
    // Fallback to secondary provider
  }

  try {
    // 2. Secondary: OpenStreetMap Nominatim
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14&addressdetails=1`,
      { signal: AbortSignal.timeout(3500) }
    );
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const district = addr.suburb || addr.district || addr.neighbourhood || addr.quarter;
      const city = addr.city || addr.town || addr.province || addr.state;
      if (city || district) {
        return { city: city || district || 'İstanbul', district };
      }
    }
  } catch {
    // Fallback handled below
  }

  return { city: 'İstanbul', district: 'Kadıköy' };
}

/**
 * Detect location via Network/IP address.
 * Requires ZERO browser permissions and works even when GPS is blocked or inside iframes!
 */
export async function detectLocationByIP(): Promise<UserLocation> {
  // 1. Primary: ipwho.is (Free, CORS enabled, HTTPS, Turkish language support)
  try {
    const res = await fetch('https://ipwho.is/?lang=tr', { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success !== false && (data.city || data.region)) {
        const city = data.city || data.region || 'İstanbul';
        const district = data.region && data.region !== city ? data.region : undefined;
        const formatted = formatCityName(district, city);
        const loc: UserLocation = {
          city,
          district,
          fullLocation: formatted,
          isAuto: true,
          source: 'network_ip',
          latitude: data.latitude,
          longitude: data.longitude,
          updatedAt: Date.now(),
        };
        saveLocationToStorage(loc);
        return loc;
      }
    }
  } catch {
    // try next
  }

  // 2. Secondary: freeipapi.com
  try {
    const res = await fetch('https://freeipapi.com/api/json', { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      if (data && (data.cityName || data.regionName)) {
        const city = data.cityName || data.regionName || 'İstanbul';
        const district = data.regionName && data.regionName !== city ? data.regionName : undefined;
        const formatted = formatCityName(district, city);
        const loc: UserLocation = {
          city,
          district,
          fullLocation: formatted,
          isAuto: true,
          source: 'network_ip',
          latitude: data.latitude,
          longitude: data.longitude,
          updatedAt: Date.now(),
        };
        saveLocationToStorage(loc);
        return loc;
      }
    }
  } catch {
    // try fallback
  }

  // 3. Fallback default
  const loc: UserLocation = {
    city: 'İstanbul',
    district: 'Kadıköy',
    fullLocation: 'İstanbul, Kadıköy',
    isAuto: true,
    source: 'network_ip',
    updatedAt: Date.now(),
  };
  saveLocationToStorage(loc);
  return loc;
}

export type GeolocationPermissionStatus = 'granted' | 'prompt' | 'denied' | 'unsupported';

/**
 * Checks the browser/device native site permission state for Geolocation.
 */
export async function checkGeolocationPermissionState(): Promise<GeolocationPermissionStatus> {
  if (typeof window === 'undefined' || !('geolocation' in navigator)) {
    return 'unsupported';
  }
  try {
    if ('permissions' in navigator && typeof navigator.permissions.query === 'function') {
      const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      if (status.state === 'granted' || status.state === 'prompt' || status.state === 'denied') {
        return status.state;
      }
    }
  } catch {
    // Safari iOS older versions may not support permissions.query('geolocation')
  }
  const savedSource = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_SOURCE) : null;
  if (savedSource === 'gps') return 'granted';
  return 'prompt';
}

/**
 * Explicitly requests native Browser/Phone GPS permission inside a direct user click gesture.
 * Calling navigator.geolocation.getCurrentPosition synchronously in the click handler ensures
 * Chrome, Safari (iOS/macOS), Firefox, and Edge display the native "Allow Location" prompt
 * and add "Location / Konum" to the browser's Site Settings (🔒).
 */
export function requestNativeGpsLocation(): Promise<{
  location: UserLocation;
  gpsGranted: boolean;
  permissionState: GeolocationPermissionStatus;
  errorReason?: string;
}> {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return detectLocationByIP().then((ipLoc) => ({
      location: ipLoc,
      gpsGranted: false,
      permissionState: 'unsupported',
      errorReason: 'Tarayıcınız GPS konum servisini desteklemiyor; şebeke konumu kullanıldı.',
    }));
  }

  return new Promise((resolve) => {
    let resolved = false;

    const safetyTimeout = setTimeout(async () => {
      if (!resolved) {
        resolved = true;
        const ipLoc = await detectLocationByIP();
        resolve({
          location: ipLoc,
          gpsGranted: false,
          permissionState: 'prompt',
          errorReason: 'GPS yanıt süresi aşıldı, şebeke/IP konumu kullanıldı.',
        });
      }
    }, 8000);

    // Must be called synchronously on user click to trigger mobile & desktop permission popup
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(safetyTimeout);
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const { city, district } = await reverseGeocode(lat, lon);
          const formatted = formatCityName(district, city);

          const loc: UserLocation = {
            city: city || 'İstanbul',
            district,
            fullLocation: formatted,
            isAuto: true,
            source: 'gps',
            latitude: lat,
            longitude: lon,
            updatedAt: Date.now(),
          };

          saveLocationToStorage(loc);
          resolve({
            location: loc,
            gpsGranted: true,
            permissionState: 'granted',
          });
        } catch {
          const ipLoc = await detectLocationByIP();
          resolve({
            location: ipLoc,
            gpsGranted: true,
            permissionState: 'granted',
          });
        }
      },
      async (err) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(safetyTimeout);

        const rawMsg = (err?.message || '').toLowerCase();
        const isPolicyBlocked =
          rawMsg.includes('permissions policy') ||
          rawMsg.includes('feature policy') ||
          rawMsg.includes('disabled in this document');

        let reason = 'Tarayıcı konum izni kapalı olduğu için şebeke/IP konumu devreye alındı.';
        if (isPolicyBlocked) {
          reason =
            'Önizleme çerçevesi (iframe) kısıtlaması algılandı; şebeke/IP konumu otomatik etkinleştirildi. Tam GPS izni için sayfayı yenileyebilir veya doğrudan sekmede açabilirsiniz.';
        } else if (err?.code === 1) {
          reason =
            'Tarayıcı/Telefon konum izni reddedildi. Adres çubuğundaki kilit (🔒) veya Site Ayarları menüsünden Konum iznini "İzin Ver" yapabilirsiniz.';
        } else if (err?.code === 2) {
          reason = 'Cihaz GPS sinyali alınamadı; şebeke/IP konumu kullanıldı.';
        }

        const ipLoc = await detectLocationByIP();
        resolve({
          location: ipLoc,
          gpsGranted: false,
          permissionState: err?.code === 1 ? 'denied' : 'prompt',
          errorReason: reason,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 7500,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Detect current real-time GPS location via HTML5 Geolocation.
 * If permission is denied or blocked, automatically and seamlessly falls back to IP geolocation!
 */
export async function detectLiveLocation(): Promise<UserLocation> {
  const res = await requestNativeGpsLocation();
  return res.location;
}

/**
 * Save manual location override
 */
export function setManualLocation(customCity: string): UserLocation {
  const trimmed = customCity.trim() || 'İstanbul, Kadıköy';
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_CITY, trimmed);
    localStorage.setItem(STORAGE_KEY_MODE, 'manual');
  }
  return {
    city: trimmed,
    fullLocation: trimmed,
    isAuto: false,
    updatedAt: Date.now(),
  };
}

/**
 * Retrieve saved location preferences
 */
export function getSavedLocation(): { fullLocation: string; city: string; isAuto: boolean } {
  if (typeof localStorage === 'undefined') {
    return { fullLocation: 'İstanbul, Kadıköy', city: 'İstanbul, Kadıköy', isAuto: false };
  }
  const fullLocation = localStorage.getItem(STORAGE_KEY_CITY) || 'İstanbul, Kadıköy';
  const mode = localStorage.getItem(STORAGE_KEY_MODE) || 'auto';
  return {
    fullLocation,
    city: fullLocation,
    isAuto: mode === 'auto',
  };
}

export type SupportedCityKey = 'selcuk' | 'izmir' | 'antalya' | 'ankara' | 'istanbul' | 'custom';

export interface CityClusterInfo {
  id: string;
  name: string;
  count: number;
  avgDistance: number;
  density: 'high' | 'medium' | 'low';
  users: LoungeUser[];
  color: string;
}

export function detectCityKey(rawCity?: string): SupportedCityKey {
  if (!rawCity) return 'istanbul';
  const lower = rawCity.toLocaleLowerCase('tr-TR');
  // Check Selçuk first since it can be formatted as "İzmir, Selçuk" or "Selçuk, İzmir"
  if (
    lower.includes('selçuk') ||
    lower.includes('selcuk') ||
    lower.includes('efes') ||
    lower.includes('şirince') ||
    lower.includes('sirince') ||
    lower.includes('pamucak')
  ) {
    return 'selcuk';
  }
  if (
    lower.includes('izmir') ||
    lower.includes('i̇zmir') ||
    lower.includes('alsancak') ||
    lower.includes('karşıyaka') ||
    lower.includes('bostanlı') ||
    lower.includes('bornova') ||
    lower.includes('konak')
  ) {
    return 'izmir';
  }
  if (
    lower.includes('antalya') ||
    lower.includes('muratpaşa') ||
    lower.includes('konyaaltı') ||
    lower.includes('kaleiçi') ||
    lower.includes('lara')
  ) {
    return 'antalya';
  }
  if (
    lower.includes('ankara') ||
    lower.includes('çankaya') ||
    lower.includes('tunalı') ||
    lower.includes('kızılay') ||
    lower.includes('bahçelievler') ||
    lower.includes('bilkent')
  ) {
    return 'ankara';
  }
  if (
    lower.includes('istanbul') ||
    lower.includes('i̇stanbul') ||
    lower.includes('kadıköy') ||
    lower.includes('moda') ||
    lower.includes('beşiktaş') ||
    lower.includes('şişli') ||
    lower.includes('üsküdar') ||
    lower.includes('cihangir') ||
    lower.includes('karaköy')
  ) {
    return 'istanbul';
  }
  return 'custom';
}

interface UserCityOverride {
  city: string;
  bio?: string;
  statusBubble?: string;
}

const CITY_USER_LOCALIZATIONS: Record<Exclude<SupportedCityKey, 'custom'>, Record<string, UserCityOverride>> = {
  selcuk: {
    // 1 km - 2.5 km (High Density: Selçuk Merkez & İstasyon)
    'user-arda': {
      city: 'Selçuk (İstasyon)',
      bio: 'Selçuk sokak müzisyeni ve indie gitaristi.',
      statusBubble: 'İstasyon caddesinde kulaklıkta Duman yankılanıyor ⚡',
    },
    'user-ece': {
      city: 'Selçuk (Atatürk Mah.)',
      statusBubble: 'Çarşıda kafede kahve ve Kaan Tangöze.',
    },
    'user-kaan': {
      city: 'Selçuk (İsabey)',
      statusBubble: 'St. Jean yokuşunda gece yürüyüşü...',
    },
    'user-mert': {
      city: 'Selçuk (Merkez)',
    },
    'user-defne': {
      city: 'Selçuk (St. Jean & Kale)',
      bio: 'Ege akşamları, plak dükkanları ve canlı performanslar.',
    },
    'user-sinan': {
      city: 'Selçuk Merkez',
    },
    // 3.5 km - 5.5 km (Medium Density: Şirince & Efes/Pamucak)
    'user-deniz': {
      city: 'Selçuk (Şirince)',
    },
    'user-beren': {
      city: 'Selçuk (Efes / Pamucak)',
      bio: 'Ege doğası, şiir ve alternatif rock.',
      statusBubble: 'Ege rüzgarında kulaklıkta çalan tek şarkı.',
    },
    'user-can': {
      city: 'Selçuk (Efes / Pamucak)',
    },
    'user-burak': {
      city: 'Selçuk (Şirince)',
    },
    // 5.5 km - 15 km (Low Density: Efes / Pamucak & Şirince)
    'user-zeynep': {
      city: 'Selçuk (Şirince)',
    },
    // Remote / Regional (> 15 km: Alsancak & İzmir)
    'user-cem': { city: 'İzmir (Alsancak)' },
    'user-melis': { city: 'İzmir (Alsancak / Kordon)' },
    'user-eren': { city: 'İzmir (Alsancak)' },
    'user-selin': { city: 'Selçuk (Efes / Pamucak)' },
    'user-tolga': { city: 'Selçuk Merkez' },
  },
  izmir: {
    // 1 km - 2.5 km (High Density: Alsancak & Kordon)
    'user-arda': {
      city: 'İzmir (Kıbrıs Şehitleri)',
      bio: 'Alsancak sokak müzisyeni ve indie gitaristi.',
      statusBubble: 'Kıbrıs Şehitleri caddesinde kulaklıkta Duman yankılanıyor ⚡',
    },
    'user-ece': {
      city: 'İzmir (Alsancak Çarşı)',
      statusBubble: 'Alsancak\'ta kafede kahve ve Kaan Tangöze.',
    },
    'user-kaan': {
      city: 'İzmir (Kordon)',
      statusBubble: 'Kordon boyunda gece yürüyüşü...',
    },
    'user-mert': {
      city: 'İzmir (Alsancak)',
    },
    'user-defne': {
      city: 'İzmir (Güzelyalı)',
      bio: 'Alsancak plak dükkanları, gece sürüşü ve canlı performanslar.',
    },
    'user-sinan': {
      city: 'İzmir (Konak)',
    },
    // 3.5 km - 5.5 km (Medium Density: Karşıyaka & Bostanlı)
    'user-deniz': {
      city: 'İzmir (Karşıyaka Çarşı)',
    },
    'user-beren': {
      city: 'İzmir (Bostanlı Sahil)',
      bio: 'Körfez manzarası, şiir ve alternatif rock.',
      statusBubble: 'Karşıyaka vapurunda kulaklıkta çalan tek şarkı.',
    },
    'user-can': {
      city: 'İzmir (Bostanlı)',
    },
    'user-burak': {
      city: 'İzmir (Göztepe)',
    },
    // 5.5 km - 15 km (Low Density: Bornova & Çevre)
    'user-zeynep': {
      city: 'İzmir (Bornova)',
    },
    // Remote (> 15 km)
    'user-cem': { city: 'Bursa (Nilüfer)' },
    'user-melis': { city: 'Eskişehir (Tepebaşı)' },
    'user-eren': { city: 'İstanbul (Kadıköy)' },
    'user-selin': { city: 'Ankara (Çankaya)' },
    'user-tolga': { city: 'Antalya (Muratpaşa)' },
  },
  antalya: {
    // 1 km - 2.5 km (High Density: Kaleiçi & Konyaaltı)
    'user-arda': {
      city: 'Antalya (Kaleiçi)',
      bio: 'Kaleiçi sokak müzisyeni ve indie gitaristi.',
      statusBubble: 'Kaleiçi sokaklarında kulaklıkta Duman yankılanıyor ⚡',
    },
    'user-ece': {
      city: 'Antalya (Işıklar Cad.)',
      statusBubble: 'Işıklar\'da kafede kahve ve Kaan Tangöze.',
    },
    'user-kaan': {
      city: 'Antalya (Konyaaltı Sahil)',
      statusBubble: 'Konyaaltı sahilinde gece yürüyüşü...',
    },
    'user-mert': {
      city: 'Antalya (Muratpaşa)',
    },
    'user-defne': {
      city: 'Antalya (Bahçelievler)',
      bio: 'Kaleiçi plak dükkanları, sahil sürüşü ve canlı performanslar.',
    },
    'user-sinan': {
      city: 'Antalya (Meltem)',
    },
    // 3.5 km - 5.5 km (Medium Density: Lara & Şirinyalı)
    'user-deniz': {
      city: 'Antalya (Şirinyalı)',
    },
    'user-beren': {
      city: 'Antalya (Fener)',
      bio: 'Falez manzarası, şiir ve alternatif rock.',
      statusBubble: 'Falezlerde gün batımında kulaklıkta çalan tek şarkı.',
    },
    'user-can': {
      city: 'Antalya (Lara)',
    },
    'user-burak': {
      city: 'Antalya (Gürsu)',
    },
    // 5.5 km - 15 km (Low Density: Kültür & Kepez)
    'user-zeynep': {
      city: 'Antalya (Kültür / Kepez)',
    },
    // Remote (> 15 km)
    'user-cem': { city: 'Bursa (Nilüfer)' },
    'user-melis': { city: 'Eskişehir (Tepebaşı)' },
    'user-eren': { city: 'İzmir (Alsancak)' },
    'user-selin': { city: 'Ankara (Çankaya)' },
    'user-tolga': { city: 'İstanbul (Kadıköy)' },
  },
  ankara: {
    // 1 km - 2.5 km (High Density: Tunalı & Çankaya)
    'user-arda': {
      city: 'Ankara (Tunalı Hilmi)',
      bio: 'Tunalı sokak müzisyeni ve indie gitaristi.',
      statusBubble: 'Tunalı Hilmi caddesinde kulaklıkta Duman yankılanıyor ⚡',
    },
    'user-ece': {
      city: 'Ankara (Kuğulu Park)',
      statusBubble: 'Tunalı\'da kafede kahve ve Kaan Tangöze.',
    },
    'user-kaan': {
      city: 'Ankara (Kızılay Karanfil)',
      statusBubble: 'Bahçelievler 7. Cadde\'de gece yürüyüşü...',
    },
    'user-mert': {
      city: 'Ankara (Çankaya)',
    },
    'user-defne': {
      city: 'Ankara (Bahçelievler 7. Cad)',
      bio: 'Tunalı plak dükkanları, gece sürüşü ve canlı performanslar.',
    },
    'user-sinan': {
      city: 'Ankara (Ayrancı)',
    },
    // 3.5 km - 5.5 km (Medium Density: Kavaklıdere & Emek)
    'user-deniz': {
      city: 'Ankara (Kavaklıdere)',
    },
    'user-beren': {
      city: 'Ankara (Gaziosmanpaşa)',
      bio: 'Seğmenler Parkı, şiir ve alternatif rock.',
      statusBubble: 'Seğmenler\'de kulaklıkta çalan tek şarkı.',
    },
    'user-can': {
      city: 'Ankara (Emek)',
    },
    'user-burak': {
      city: 'Ankara (Anıttepe)',
    },
    // 5.5 km - 15 km (Low Density: Bilkent & ODTÜ)
    'user-zeynep': {
      city: 'Ankara (Bilkent / ODTÜ)',
    },
    // Remote (> 15 km)
    'user-cem': { city: 'Bursa (Nilüfer)' },
    'user-melis': { city: 'Eskişehir (Tepebaşı)' },
    'user-eren': { city: 'İzmir (Alsancak)' },
    'user-selin': { city: 'İstanbul (Kadıköy)' },
    'user-tolga': { city: 'Antalya (Muratpaşa)' },
  },
  istanbul: {
    'user-arda': {
      city: 'İstanbul (Kadıköy Bahariye)',
      bio: 'Kadıköy sokak müzisyeni ve indie gitaristi.',
      statusBubble: 'Bahariye caddesinde kulaklıkta Duman yankılanıyor ⚡',
    },
    'user-ece': {
      city: 'İstanbul (Kadıköy Çarşı)',
      statusBubble: 'Çarşıda kafede kahve ve Kaan Tangöze.',
    },
    'user-kaan': {
      city: 'İstanbul (Kadıköy Rıhtım)',
      statusBubble: 'Kadıköy sokaklarında gece yürüyüşü...',
    },
    'user-mert': {
      city: 'İstanbul (Kadıköy)',
    },
    'user-defne': {
      city: 'İstanbul (Moda)',
      bio: 'Kadıköy plak dükkanları, gece sürüşü ve canlı performanslar.',
    },
    'user-sinan': {
      city: 'İstanbul (Fenerbahçe)',
    },
    'user-deniz': {
      city: 'İstanbul (Karaköy)',
    },
    'user-beren': {
      city: 'İstanbul (Üsküdar)',
      bio: 'Boğaz manzarası, şiir ve alternatif rock.',
      statusBubble: 'Vapurda kulaklıkta çalan tek şarkı.',
    },
    'user-can': {
      city: 'İstanbul (Beşiktaş)',
    },
    'user-burak': {
      city: 'İstanbul (Cihangir)',
    },
    'user-zeynep': {
      city: 'İstanbul (Şişli)',
    },
    'user-cem': { city: 'Bursa (Nilüfer)' },
    'user-melis': { city: 'Eskişehir (Tepebaşı)' },
    'user-eren': { city: 'İzmir (Alsancak)' },
    'user-selin': { city: 'Ankara (Çankaya)' },
    'user-tolga': { city: 'Antalya (Muratpaşa)' },
  },
};

export const CITY_CLUSTER_NAMES: Record<
  SupportedCityKey,
  { high: string; medium: string; low: string; remote: string }
> = {
  selcuk: {
    high: 'Selçuk Merkez',
    medium: 'Şirince',
    low: 'Efes / Pamucak',
    remote: 'Alsancak',
  },
  izmir: {
    high: 'Alsancak / Kordon',
    medium: 'Karşıyaka / Bostanlı',
    low: 'Bornova',
    remote: 'Selçuk / Efes',
  },
  antalya: {
    high: 'Kaleiçi / Konyaaltı',
    medium: 'Lara / Şirinyalı',
    low: 'Kültür / Kepez',
    remote: 'Kaş / Kemer',
  },
  ankara: {
    high: 'Tunalı / Çankaya',
    medium: 'Kavaklıdere / Emek',
    low: 'Bahçelievler 7. Cad',
    remote: 'Bilkent / ODTÜ',
  },
  istanbul: {
    high: 'Kadıköy / Moda',
    medium: 'Beşiktaş',
    low: 'Cihangir',
    remote: 'Şişli',
  },
  custom: {
    high: 'Merkez & Çarşı',
    medium: 'Bulvar & Sahil',
    low: 'Kampüs & Çevre',
    remote: 'Diğer Semtler',
  },
};

/**
 * Dynamically localizes 1 km - 15 km (and remote) listener neighborhoods
 * so they always match the user's selected city (Selçuk, İzmir, Antalya, Ankara, İstanbul, etc.).
 */
export function localizeUsersForCity(users: LoungeUser[], rawCity?: string): LoungeUser[] {
  if (!Array.isArray(users)) return [];
  const key = detectCityKey(rawCity);
  if (key !== 'custom') {
    const map = CITY_USER_LOCALIZATIONS[key];
    return users.map((u) => {
      if (!u) return u;
      const override = map[u.id];
      if (!override) return u;
      return {
        ...u,
        city: override.city,
        bio: override.bio || u.bio,
        statusBubble: override.statusBubble || u.statusBubble,
      };
    });
  }

  // Fallback for any other custom city (e.g., Bursa, Eskişehir, Londra)
  const baseCity = (rawCity || 'İstanbul').split(',')[0].split('(')[0].trim() || 'Merkez';
  return users.map((u) => {
    if (!u || typeof u.distanceKm !== 'number') return u;
    if (u.distanceKm <= 1.0) {
      return { ...u, city: `${baseCity} (Çarşı)` };
    }
    if (u.distanceKm <= 2.5) {
      return { ...u, city: `${baseCity} (Merkez)` };
    }
    if (u.distanceKm <= 5.5) {
      return { ...u, city: `${baseCity} (Meydan)` };
    }
    if (u.distanceKm <= 15.0) {
      return { ...u, city: `${baseCity} (Kampüs)` };
    }
    return u;
  });
}

export const getLocalizedListeners = localizeUsersForCity;

/**
 * Builds geographic density clusters synchronized with the selected city and listener distances.
 */
export function buildCityClusters(users: LoungeUser[], rawCity?: string): CityClusterInfo[] {
  const validUsers = Array.isArray(users) ? users.filter((u) => u && typeof u.distanceKm === 'number') : [];
  const key = detectCityKey(rawCity);
  const baseCity = (rawCity || 'İstanbul').split(',')[0].split('(')[0].trim() || 'Şehir';
  const labels =
    key === 'custom'
      ? {
          high: `${baseCity} Merkez`,
          medium: `${baseCity} Meydan`,
          low: `${baseCity} Çevre`,
          remote: `${baseCity} Kampüs`,
        }
      : CITY_CLUSTER_NAMES[key];

  const highUsers = validUsers.filter((u) => u.distanceKm <= 2.5);
  const mediumUsers = validUsers.filter((u) => u.distanceKm > 2.5 && u.distanceKm <= 5.5);
  const lowUsers = validUsers.filter((u) => u.distanceKm > 5.5 && u.distanceKm <= 15.0);
  const remoteUsers = validUsers.filter((u) => u.distanceKm > 15.0);

  const list: CityClusterInfo[] = [];

  if (highUsers.length > 0) {
    const avg = highUsers.reduce((acc, u) => acc + u.distanceKm, 0) / highUsers.length;
    list.push({
      id: `cluster-${key}-high`,
      name: labels.high,
      count: highUsers.length,
      avgDistance: Number(avg.toFixed(1)),
      density: 'high',
      users: highUsers,
      color: 'from-emerald-400 to-teal-500',
    });
  }

  if (mediumUsers.length > 0) {
    const avg = mediumUsers.reduce((acc, u) => acc + u.distanceKm, 0) / mediumUsers.length;
    list.push({
      id: `cluster-${key}-medium`,
      name: labels.medium,
      count: mediumUsers.length,
      avgDistance: Number(avg.toFixed(1)),
      density: 'medium',
      users: mediumUsers,
      color: 'from-purple-500 to-pink-500',
    });
  }

  if (lowUsers.length > 0) {
    const avg = lowUsers.reduce((acc, u) => acc + u.distanceKm, 0) / lowUsers.length;
    list.push({
      id: `cluster-${key}-low`,
      name: labels.low,
      count: lowUsers.length,
      avgDistance: Number(avg.toFixed(1)),
      density: 'low',
      users: lowUsers,
      color: 'from-indigo-400 to-purple-500',
    });
  }

  if (remoteUsers.length > 0) {
    const avg = remoteUsers.reduce((acc, u) => acc + u.distanceKm, 0) / remoteUsers.length;
    list.push({
      id: `cluster-${key}-remote`,
      name: labels.remote,
      count: remoteUsers.length,
      avgDistance: Number(avg.toFixed(0)),
      density: 'low',
      users: remoteUsers,
      color: 'from-amber-400 to-orange-500',
    });
  }

  return list;
}


