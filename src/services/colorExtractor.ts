export interface ExtractedPalette {
  hex: string;
  rgb: [number, number, number];
  rgbString: string;
  onAccent: '#09090b' | '#ffffff';
  muted: string;
  glow: string;
  border: string;
  subtleBg: string;
}

// Fallback palette defaults to warm harmonic gold/amber rather than generic neon
export const DEFAULT_PALETTE: ExtractedPalette = {
  hex: '#f59e0b',
  rgb: [245, 158, 11],
  rgbString: '245, 158, 11',
  onAccent: '#09090b',
  muted: 'rgba(245, 158, 11, 0.15)',
  glow: 'rgba(245, 158, 11, 0.25)',
  border: 'rgba(245, 158, 11, 0.3)',
  subtleBg: 'rgba(245, 158, 11, 0.05)',
};

// In-Memory LRU Cache for dynamic canvas color extraction (capped at 60 items)
const MAX_CACHE_SIZE = 60;
const paletteCache = new Map<string, ExtractedPalette>();

function setCachedPalette(key: string, palette: ExtractedPalette) {
  if (paletteCache.has(key)) {
    paletteCache.delete(key);
  } else if (paletteCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = paletteCache.keys().next().value;
    if (oldestKey) paletteCache.delete(oldestKey);
  }
  paletteCache.set(key, palette);
}

function getCachedPalette(key: string): ExtractedPalette | undefined {
  if (!paletteCache.has(key)) return undefined;
  const val = paletteCache.get(key)!;
  // Refresh recency
  paletteCache.delete(key);
  paletteCache.set(key, val);
  return val;
}

// Color harmonic hashing from string (seed)
export function getHarmonicPaletteFromSeed(seed: string): ExtractedPalette {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Pre-curated harmonic audio spectrum hues (avoid muddy grays or blinding neon yellows)
  const curatedHues = [
    { r: 244, g: 63, b: 94 },   // Rose
    { r: 236, g: 72, b: 153 },  // Pink
    { r: 168, g: 85, b: 247 },  // Purple
    { r: 99, g: 102, b: 241 },  // Indigo
    { r: 59, g: 130, b: 246 },  // Blue
    { r: 14, g: 165, b: 233 },  // Sky
    { r: 20, g: 184, b: 166 },  // Teal
    { r: 16, g: 185, b: 129 },  // Emerald
    { r: 234, g: 179, b: 8 },   // Amber
    { r: 249, g: 115, b: 22 },  // Orange
    { r: 239, g: 68, b: 68 },   // Red
    { r: 139, g: 92, b: 246 },  // Violet
  ];

  const index = Math.abs(hash) % curatedHues.length;
  const { r, g, b } = curatedHues[index];
  return buildPalette(r, g, b);
}

function buildPalette(r: number, g: number, b: number): ExtractedPalette {
  const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  const rgbString = `${r}, ${g}, ${b}`;
  // Standard ITU-R BT.709 perceived luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
  const onAccent = luminance > 155 ? '#09090b' : '#ffffff';

  return {
    hex,
    rgb: [r, g, b],
    rgbString,
    onAccent,
    muted: `rgba(${rgbString}, 0.16)`,
    glow: `rgba(${rgbString}, 0.28)`,
    border: `rgba(${rgbString}, 0.35)`,
    subtleBg: `rgba(${rgbString}, 0.06)`,
  };
}

/**
 * Extracts the dominant vibrant musical color from an image URL using in-memory Canvas.
 * Handles CORS issues gracefully with timeout and fallback seeds.
 */
export async function extractPaletteFromImage(
  imageUrl?: string | null,
  fallbackSeed: string = 'Harmoniq'
): Promise<ExtractedPalette> {
  if (!imageUrl) {
    return getHarmonicPaletteFromSeed(fallbackSeed);
  }

  const cached = getCachedPalette(imageUrl);
  if (cached) {
    return cached;
  }

  return new Promise<ExtractedPalette>((resolve) => {
    // Timeout to guarantee UI never blocks or hangs on broken image networks
    const timer = setTimeout(() => {
      const fallback = getHarmonicPaletteFromSeed(fallbackSeed);
      setCachedPalette(imageUrl, fallback);
      resolve(fallback);
    }, 1200);

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const fallback = getHarmonicPaletteFromSeed(fallbackSeed);
          setCachedPalette(imageUrl, fallback);
          resolve(fallback);
          return;
        }

        // Downsample to 48x48 for near-instant 60fps extraction
        const width = 48;
        const height = 48;
        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height).data;

        let bestScore = -1;
        let bestR = 245;
        let bestG = 158;
        let bestB = 11;

        // Sample pixels with a step of 4
        for (let i = 0; i < imageData.length; i += 16) {
          const r = imageData[i];
          const g = imageData[i + 1];
          const b = imageData[i + 2];
          const a = imageData[i + 3];

          if (a < 128) continue;

          // Skip near-black and near-white
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const delta = max - min;
          const lightness = (max + min) / 2;

          if (lightness < 30 || lightness > 235) continue;

          // Saturation measurement
          const saturation = delta === 0 ? 0 : delta / (255 - Math.abs(2 * lightness - 255));
          if (saturation < 0.25) continue;

          // Score colors by vibrance and saturation (prefer colorful album artwork hues)
          const score = saturation * 1.5 + (lightness > 60 && lightness < 190 ? 1 : 0.4);

          if (score > bestScore) {
            bestScore = score;
            bestR = r;
            bestG = g;
            bestB = b;
          }
        }

        const palette = buildPalette(bestR, bestG, bestB);
        setCachedPalette(imageUrl, palette);
        resolve(palette);
      } catch {
        // In case of canvas security taint or CORS errors
        const fallback = getHarmonicPaletteFromSeed(fallbackSeed);
        setCachedPalette(imageUrl, fallback);
        resolve(fallback);
      }
    };

    img.onerror = () => {
      clearTimeout(timer);
      const fallback = getHarmonicPaletteFromSeed(fallbackSeed);
      setCachedPalette(imageUrl, fallback);
      resolve(fallback);
    };

    img.src = imageUrl;
  });
}

/**
 * Injects dynamic color theme CSS variables directly into document root
 * for instantaneous app-wide reactive theming.
 */
export function applyThemeToDocument(palette: ExtractedPalette) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--theme-accent', palette.hex);
  root.style.setProperty('--theme-accent-rgb', palette.rgbString);
  root.style.setProperty('--theme-accent-on', palette.onAccent);
  root.style.setProperty('--theme-accent-muted', palette.muted);
  root.style.setProperty('--theme-accent-glow', palette.glow);
  root.style.setProperty('--theme-accent-border', palette.border);
  root.style.setProperty('--theme-accent-subtle', palette.subtleBg);
}
