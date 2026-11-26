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
 * Returns true if the string looks like a neighborhood, street, or boulevard rather than a district (İlçe).
 */
export function isNeighborhood(val?: string): boolean {
  if (!val) return false;
  return /mahalle|mah\.|sokak|cadde|bulvar/i.test(val);
}

/**
 * Strips administrative suffixes such as "İli", "Province", "İlçesi", "District"
 */
function cleanAdminName(val?: string): string {
  if (!val) return '';
  return val
    .replace(/\s+(İli|Ili|Province|İlçesi|Ilcesi|District|Merkez İlçesi|Büyükşehir Belediyesi|Belediyesi)$/i, '')
    .trim();
}

/**
 * Normalizes any raw location string (including legacy parentheses or cached neighborhood labels)
 * into clean "Şehir, İlçe" or "Şehir" format.
 */
export function sanitizeFormattedLocation(raw?: string): string {
  if (!raw || !raw.trim()) return 'İstanbul, Kadıköy';
  const trimmed = raw.trim();

  // Handle legacy "Şehir (İlçe ...)" format
  const parenMatch = trimmed.match(/^([^(,]+)\(([^)]+)\)/);
  if (parenMatch) {
    const cityPart = cleanAdminName(parenMatch[1]);
    const innerPart = cleanAdminName(parenMatch[2].split('/')[0]);
    if (innerPart && !isNeighborhood(innerPart)) {
      return formatCityName(innerPart, cityPart);
    }
    return formatCityName(undefined, cityPart);
  }

  const parts = trimmed.split(',').map((p) => cleanAdminName(p)).filter(Boolean);
  if (parts.length >= 2) {
    const cityPart = parts[0];
    const distPart = isNeighborhood(parts[1]) ? undefined : parts[1];
    return formatCityName(distPart, cityPart);
  }
  return formatCityName(undefined, parts[0] || 'İstanbul');
}

/**
 * Format city string strictly as "Şehir, İlçe" (or "Şehir" when district is missing, same as city, or a neighborhood).
 */
export function formatCityName(district?: string, city?: string, state?: string): string {
  const cleanCity = cleanAdminName(city || state || '');
  const rawDistrict = cleanAdminName(district || '');
  const cleanDistrict = rawDistrict && !isNeighborhood(rawDistrict) ? rawDistrict : '';

  if (
    cleanCity &&
    cleanDistrict &&
    cleanDistrict.toLocaleLowerCase('tr-TR') !== cleanCity.toLocaleLowerCase('tr-TR')
  ) {
    return `${cleanCity}, ${cleanDistrict}`;
  }
  return cleanCity || cleanDistrict || 'İstanbul, Kadıköy';
}

interface BigDataCloudAdminEntry {
  name?: string;
  adminLevel?: number;
}

/**
 * Reverse geocodes latitude & longitude strictly into "Şehir, İlçe" (never neighborhood/mahalle).
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
      const city = cleanAdminName(data.principalSubdivision || data.city);

      const adminList: BigDataCloudAdminEntry[] = Array.isArray(data.localityInfo?.administrative)
        ? data.localityInfo.administrative
        : [];
      const adminLevel6 = adminList.find((entry) => entry?.adminLevel === 6 && entry?.name)?.name;

      const districtCandidates = [adminLevel6, data.city, data.locality];
      let district: string | undefined;
      for (const candidate of districtCandidates) {
        const cleaned = cleanAdminName(candidate);
        if (
          cleaned &&
          !isNeighborhood(cleaned) &&
          (!city || cleaned.toLocaleLowerCase('tr-TR') !== city.toLocaleLowerCase('tr-TR'))
        ) {
          district = cleaned;
          break;
        }
      }

      if (city) {
        return { city, district };
      }
    }
  } catch {
    // Fallback to secondary provider
  }

  try {
    // 2. Secondary: OpenStreetMap Nominatim (never suburb / neighbourhood / quarter)
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14&addressdetails=1&accept-language=tr`,
      { signal: AbortSignal.timeout(3500) }
    );
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const city = cleanAdminName(addr.province || addr.state || addr.city);
      const districtCandidates = [addr.town, addr.county, addr.city_district, addr.municipality];
      let district: string | undefined;
      for (const candidate of districtCandidates) {
        const cleaned = cleanAdminName(candidate);
        if (
          cleaned &&
          !isNeighborhood(cleaned) &&
          (!city || cleaned.toLocaleLowerCase('tr-TR') !== city.toLocaleLowerCase('tr-TR'))
        ) {
          district = cleaned;
          break;
        }
      }

      if (city || district) {
        return { city: city || district || 'İstanbul', district: city ? district : undefined };
      }
    }
  } catch {
    // Fallback handled below
  }

  return { city: 'İstanbul', district: 'Kadıköy' };
}

export const KNOWN_DATACENTER_VPN_CITIES = new Set([
  'san jose',
  'santa clara',
  'ashburn',
  'frankfurt',
  'amsterdam',
  'london',
  'singapore',
  'tokyo',
  'sydney',
  'miami',
  'council bluffs',
  'boardman',
  'seattle',
  'dublin',
  'helsinki',
  'zurich',
  'paris',
  'dallas',
  'chicago',
  'los angeles',
  'atlanta',
  'new york',
  'newark',
  'reston',
  'sterling',
  'clifton',
]);

/**
 * Checks whether the location is a known foreign datacenter, VPN endpoint, or non-Turkish IP
 */
export function isForeignOrVpnLocation(
  countryCode?: string,
  cityName?: string,
  isVpn?: boolean
): boolean {
  if (isVpn) return true;
  if (countryCode && !['TR', 'TURKEY', 'TÜRKİYE'].includes(countryCode.toUpperCase().trim())) {
    return true;
  }
  if (cityName) {
    const lower = cityName.toLowerCase().trim();
    for (const dc of KNOWN_DATACENTER_VPN_CITIES) {
      if (lower.includes(dc)) return true;
    }
  }
  return false;
}

function getSafeTurkishFallbackLocation(): UserLocation {
  let fallbackCity = 'İstanbul, Kadıköy';
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY_CITY);
    if (saved && !isForeignOrVpnLocation(undefined, saved, false)) {
      fallbackCity = sanitizeFormattedLocation(saved);
    }
  }
  const parts = fallbackCity.split(',');
  const city = parts[0]?.trim() || 'İstanbul';
  const district = parts[1]?.trim() || undefined;
  return {
    city,
    district,
    fullLocation: fallbackCity,
    isAuto: true,
    source: 'network_ip',
    updatedAt: Date.now(),
  };
}

/**
 * Detect location via Network/IP address.
 * Protected against Cloudflare WARP, DNS, and VPNs (prevents San Jose, Frankfurt, Ashburn foreign overrides).
 */
export async function detectLocationByIP(): Promise<UserLocation> {
  // 1. Primary: ipwho.is (Free, CORS enabled, HTTPS, Turkish language support)
  try {
    const res = await fetch('https://ipwho.is/?lang=tr', { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success !== false && (data.city || data.region)) {
        const countryCode = data.country_code || data.countryCode;
        const rawCity = data.city || data.region || 'İstanbul';
        const isVpn = Boolean(data.security?.vpn || data.security?.proxy || data.security?.hosting);

        // VPN / Cloudflare / Foreign IP guard: Never display San Jose or foreign datacenters
        if (isForeignOrVpnLocation(countryCode, rawCity, isVpn)) {
          console.info(
            `[Harmoniq Location] VPN / Cloudflare WARP detected (${rawCity}, ${countryCode}). Guarding Turkish frequency anchor.`
          );
          return getSafeTurkishFallbackLocation();
        }

        const province = cleanAdminName(data.region || data.city || 'İstanbul');
        const distCandidate = cleanAdminName(data.city);
        const district =
          distCandidate &&
          !isNeighborhood(distCandidate) &&
          distCandidate.toLocaleLowerCase('tr-TR') !== province.toLocaleLowerCase('tr-TR')
            ? distCandidate
            : undefined;
        const formatted = formatCityName(district, province);
        const loc: UserLocation = {
          city: province,
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
        const countryCode = data.countryCode;
        const rawCity = data.cityName || data.regionName || 'İstanbul';

        if (isForeignOrVpnLocation(countryCode, rawCity, false)) {
          console.info(
            `[Harmoniq Location] VPN / Datacenter IP detected (${rawCity}, ${countryCode}). Guarding Turkish frequency anchor.`
          );
          return getSafeTurkishFallbackLocation();
        }

        const province = cleanAdminName(data.regionName || data.cityName || 'İstanbul');
        const distCandidate = cleanAdminName(data.cityName);
        const district =
          distCandidate &&
          !isNeighborhood(distCandidate) &&
          distCandidate.toLocaleLowerCase('tr-TR') !== province.toLocaleLowerCase('tr-TR')
            ? distCandidate
            : undefined;
        const formatted = formatCityName(district, province);
        const loc: UserLocation = {
          city: province,
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
  const loc = getSafeTurkishFallbackLocation();
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
  const cleaned = sanitizeFormattedLocation(customCity);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_CITY, cleaned);
    localStorage.setItem(STORAGE_KEY_MODE, 'manual');
  }
  const parts = cleaned.split(',');
  return {
    city: parts[0]?.trim() || cleaned,
    district: parts[1]?.trim() || undefined,
    fullLocation: cleaned,
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
  const rawSaved = localStorage.getItem(STORAGE_KEY_CITY) || 'İstanbul, Kadıköy';
  const fullLocation = sanitizeFormattedLocation(rawSaved);
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
    // 1 km - 2.5 km (Selçuk)
    'user-arda': {
      city: 'İzmir, Selçuk',
      bio: 'Selçuk sokak müzisyeni ve indie gitaristi.',
      statusBubble: 'Selçuk sokaklarında kulaklıkta Duman yankılanıyor.',
    },
    'user-ece': {
      city: 'İzmir, Selçuk',
      statusBubble: 'Kahve ve Kaan Tangöze eşliğinde akustik mola.',
    },
    'user-kaan': {
      city: 'İzmir, Selçuk',
      statusBubble: 'Akşam yürüyüşünde kulaklıkta bu parça dönüyor...',
    },
    'user-mert': {
      city: 'İzmir, Selçuk',
    },
    'user-defne': {
      city: 'İzmir, Selçuk',
      bio: 'Ege akşamları, plak dükkanları ve canlı performanslar.',
    },
    'user-sinan': {
      city: 'İzmir, Selçuk',
    },
    // 3.5 km - 15 km (Çevre ilçeler)
    'user-deniz': {
      city: 'İzmir, Selçuk',
    },
    'user-beren': {
      city: 'İzmir, Selçuk',
      bio: 'Ege doğası, şiir ve alternatif rock.',
      statusBubble: 'Ege rüzgarında kulaklıkta çalan tek şarkı.',
    },
    'user-can': {
      city: 'Aydın, Kuşadası',
    },
    'user-burak': {
      city: 'İzmir, Selçuk',
    },
    'user-zeynep': {
      city: 'İzmir, Torbalı',
    },
    // Remote / Regional (> 15 km)
    'user-cem': { city: 'İzmir, Konak' },
    'user-melis': { city: 'İzmir, Karşıyaka' },
    'user-eren': { city: 'İzmir, Bornova' },
    'user-selin': { city: 'Aydın, Kuşadası' },
    'user-tolga': { city: 'İzmir, Selçuk' },
  },
  izmir: {
    // 1 km - 2.5 km (Konak)
    'user-arda': {
      city: 'İzmir, Konak',
      bio: 'İzmir sokak müzisyeni ve indie gitaristi.',
      statusBubble: 'Konak sahilinde kulaklıkta Duman yankılanıyor.',
    },
    'user-ece': {
      city: 'İzmir, Konak',
      statusBubble: 'Kahve ve Kaan Tangöze eşliğinde akşam üstü.',
    },
    'user-kaan': {
      city: 'İzmir, Konak',
      statusBubble: 'Körfez kıyısında gece yürüyüşü...',
    },
    'user-mert': {
      city: 'İzmir, Konak',
    },
    'user-defne': {
      city: 'İzmir, Balçova',
      bio: 'Plak dükkanları, gece sürüşü ve canlı performanslar.',
    },
    'user-sinan': {
      city: 'İzmir, Konak',
    },
    // 3.5 km - 5.5 km (Karşıyaka)
    'user-deniz': {
      city: 'İzmir, Karşıyaka',
    },
    'user-beren': {
      city: 'İzmir, Karşıyaka',
      bio: 'Körfez manzarası, şiir ve alternatif rock.',
      statusBubble: 'Karşıyaka vapurunda kulaklıkta çalan tek şarkı.',
    },
    'user-can': {
      city: 'İzmir, Karşıyaka',
    },
    'user-burak': {
      city: 'İzmir, Konak',
    },
    // 5.5 km - 15 km (Bornova)
    'user-zeynep': {
      city: 'İzmir, Bornova',
    },
    // Remote (> 15 km)
    'user-cem': { city: 'Bursa, Nilüfer' },
    'user-melis': { city: 'Eskişehir, Tepebaşı' },
    'user-eren': { city: 'İstanbul, Kadıköy' },
    'user-selin': { city: 'Ankara, Çankaya' },
    'user-tolga': { city: 'Antalya, Muratpaşa' },
  },
  antalya: {
    // 1 km - 2.5 km (Muratpaşa)
    'user-arda': {
      city: 'Antalya, Muratpaşa',
      bio: 'Antalya sokak müzisyeni ve indie gitaristi.',
      statusBubble: 'Sahil boyunca kulaklıkta Duman yankılanıyor.',
    },
    'user-ece': {
      city: 'Antalya, Muratpaşa',
      statusBubble: 'Kafede kahve ve Kaan Tangöze.',
    },
    'user-kaan': {
      city: 'Antalya, Konyaaltı',
      statusBubble: 'Konyaaltı sahilinde gece yürüyüşü...',
    },
    'user-mert': {
      city: 'Antalya, Muratpaşa',
    },
    'user-defne': {
      city: 'Antalya, Muratpaşa',
      bio: 'Plak dükkanları, sahil sürüşü ve canlı performanslar.',
    },
    'user-sinan': {
      city: 'Antalya, Muratpaşa',
    },
    // 3.5 km - 5.5 km (Konyaaltı & Muratpaşa)
    'user-deniz': {
      city: 'Antalya, Muratpaşa',
    },
    'user-beren': {
      city: 'Antalya, Muratpaşa',
      bio: 'Falez manzarası, şiir ve alternatif rock.',
      statusBubble: 'Falezlerde gün batımında kulaklıkta çalan tek şarkı.',
    },
    'user-can': {
      city: 'Antalya, Konyaaltı',
    },
    'user-burak': {
      city: 'Antalya, Konyaaltı',
    },
    // 5.5 km - 15 km (Kepez)
    'user-zeynep': {
      city: 'Antalya, Kepez',
    },
    // Remote (> 15 km)
    'user-cem': { city: 'Bursa, Nilüfer' },
    'user-melis': { city: 'Eskişehir, Tepebaşı' },
    'user-eren': { city: 'İzmir, Konak' },
    'user-selin': { city: 'Ankara, Çankaya' },
    'user-tolga': { city: 'İstanbul, Kadıköy' },
  },
  ankara: {
    // 1 km - 2.5 km (Çankaya)
    'user-arda': {
      city: 'Ankara, Çankaya',
      bio: 'Çankaya sokak müzisyeni ve indie gitaristi.',
      statusBubble: 'Çankaya akşamında kulaklıkta Duman yankılanıyor.',
    },
    'user-ece': {
      city: 'Ankara, Çankaya',
      statusBubble: 'Kafede kahve ve Kaan Tangöze.',
    },
    'user-kaan': {
      city: 'Ankara, Çankaya',
      statusBubble: 'Akşam yürüyüşünde kulaklıkta bu parça dönüyor...',
    },
    'user-mert': {
      city: 'Ankara, Çankaya',
    },
    'user-defne': {
      city: 'Ankara, Çankaya',
      bio: 'Plak dükkanları, gece sürüşü ve canlı performanslar.',
    },
    'user-sinan': {
      city: 'Ankara, Çankaya',
    },
    // 3.5 km - 5.5 km (Çankaya & Yenimahalle)
    'user-deniz': {
      city: 'Ankara, Çankaya',
    },
    'user-beren': {
      city: 'Ankara, Çankaya',
      bio: 'Park yürüyüşleri, şiir ve alternatif rock.',
      statusBubble: 'Akşam rüzgarında kulaklıkta çalan tek şarkı.',
    },
    'user-can': {
      city: 'Ankara, Yenimahalle',
    },
    'user-burak': {
      city: 'Ankara, Altındağ',
    },
    // 5.5 km - 15 km (Yenimahalle)
    'user-zeynep': {
      city: 'Ankara, Yenimahalle',
    },
    // Remote (> 15 km)
    'user-cem': { city: 'Bursa, Nilüfer' },
    'user-melis': { city: 'Eskişehir, Tepebaşı' },
    'user-eren': { city: 'İzmir, Konak' },
    'user-selin': { city: 'İstanbul, Kadıköy' },
    'user-tolga': { city: 'Antalya, Muratpaşa' },
  },
  istanbul: {
    'user-arda': {
      city: 'İstanbul, Kadıköy',
      bio: 'Kadıköy sokak müzisyeni ve indie gitaristi.',
      statusBubble: 'Kadıköy akşamında kulaklıkta Duman yankılanıyor.',
    },
    'user-ece': {
      city: 'İstanbul, Kadıköy',
      statusBubble: 'Kafede kahve ve Kaan Tangöze.',
    },
    'user-kaan': {
      city: 'İstanbul, Kadıköy',
      statusBubble: 'Kadıköy sokaklarında gece yürüyüşü...',
    },
    'user-mert': {
      city: 'İstanbul, Kadıköy',
    },
    'user-defne': {
      city: 'İstanbul, Kadıköy',
      bio: 'Kadıköy plak dükkanları, gece sürüşü ve canlı performanslar.',
    },
    'user-sinan': {
      city: 'İstanbul, Kadıköy',
    },
    'user-deniz': {
      city: 'İstanbul, Beyoğlu',
    },
    'user-beren': {
      city: 'İstanbul, Üsküdar',
      bio: 'Boğaz manzarası, şiir ve alternatif rock.',
      statusBubble: 'Vapurda kulaklıkta çalan tek şarkı.',
    },
    'user-can': {
      city: 'İstanbul, Beşiktaş',
    },
    'user-burak': {
      city: 'İstanbul, Beyoğlu',
    },
    'user-zeynep': {
      city: 'İstanbul, Şişli',
    },
    'user-cem': { city: 'Bursa, Nilüfer' },
    'user-melis': { city: 'Eskişehir, Tepebaşı' },
    'user-eren': { city: 'İzmir, Konak' },
    'user-selin': { city: 'Ankara, Çankaya' },
    'user-tolga': { city: 'Antalya, Muratpaşa' },
  },
};

export const CITY_CLUSTER_NAMES: Record<
  SupportedCityKey,
  { high: string; medium: string; low: string; remote: string }
> = {
  selcuk: {
    high: 'İzmir, Selçuk',
    medium: 'Aydın, Kuşadası',
    low: 'İzmir, Torbalı',
    remote: 'Diğer Şehirler',
  },
  izmir: {
    high: 'İzmir, Konak',
    medium: 'İzmir, Karşıyaka',
    low: 'İzmir, Bornova',
    remote: 'Diğer Şehirler',
  },
  antalya: {
    high: 'Antalya, Muratpaşa',
    medium: 'Antalya, Konyaaltı',
    low: 'Antalya, Kepez',
    remote: 'Diğer Şehirler',
  },
  ankara: {
    high: 'Ankara, Çankaya',
    medium: 'Ankara, Yenimahalle',
    low: 'Ankara, Altındağ',
    remote: 'Diğer Şehirler',
  },
  istanbul: {
    high: 'İstanbul, Kadıköy',
    medium: 'İstanbul, Beşiktaş',
    low: 'İstanbul, Beyoğlu',
    remote: 'Diğer Şehirler',
  },
  custom: {
    high: 'Merkez',
    medium: 'Yakın Çevre',
    low: 'İlçe Geneli',
    remote: 'Diğer Şehirler',
  },
};

/**
 * Dynamically localizes 1 km - 15 km (and remote) listener locations
 * strictly in "Şehir, İlçe" format matching the user's selected city.
 */
export function localizeUsersForCity(users: LoungeUser[], rawCity?: string): LoungeUser[] {
  if (!Array.isArray(users)) return [];
  const key = detectCityKey(rawCity);
  if (key !== 'custom') {
    const map = CITY_USER_LOCALIZATIONS[key];
    return users.map((u) => {
      if (!u) return u;
      const override = map[u.id];
      if (!override) return { ...u, city: sanitizeFormattedLocation(u.city) };
      return {
        ...u,
        city: override.city,
        bio: override.bio || u.bio,
        statusBubble: override.statusBubble || u.statusBubble,
      };
    });
  }

  // Fallback for any other custom city (e.g., Bursa, Eskişehir)
  const cleanCustom = sanitizeFormattedLocation(rawCity);
  return users.map((u) => {
    if (!u || typeof u.distanceKm !== 'number') return u;
    if (u.distanceKm <= 15.0) {
      return { ...u, city: cleanCustom };
    }
    return { ...u, city: sanitizeFormattedLocation(u.city) };
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
          remote: 'Diğer Şehirler',
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


