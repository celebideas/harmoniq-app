export interface ExtractedPalette {
  hex: string;
  rgb: [number, number, number];
  rgbString: string;
  onAccent: '#09090b' | '#ffffff';
  muted: string;
  glow: string;
  border: string;
  subtleBg: string;
  isExtracted?: boolean;
}

// Pure Studio Monochrome fallback (#F5F5F7) — NEVER falls back to orange/amber on CORS or loading
export const DEFAULT_PALETTE: ExtractedPalette = {
  hex: '#F5F5F7',
  rgb: [245, 245, 247],
  rgbString: '245, 245, 247',
  onAccent: '#09090b',
  muted: 'rgba(245, 245, 247, 0.14)',
  glow: 'rgba(245, 245, 247, 0.22)',
  border: 'rgba(245, 245, 247, 0.28)',
  subtleBg: 'rgba(245, 245, 247, 0.06)',
  isExtracted: false,
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
  paletteCache.delete(key);
  paletteCache.set(key, val);
  return val;
}

/**
 * Legacy helper kept exported for compatibility — returns clean studio monochrome (#F5F5F7)
 * instead of inventing random orange/amber fallback hues.
 */
export function getHarmonicPaletteFromSeed(_seed: string): ExtractedPalette {
  return DEFAULT_PALETTE;
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${((1 << 24) + (clamp(r) << 16) + (clamp(g) << 8) + clamp(b))
    .toString(16)
    .slice(1)}`;
}

/**
 * Softens raw extracted RGB into a refined, low-glare studio tone (never harsh neon).
 */
function softenToStudioTone(r: number, g: number, b: number): [number, number, number] {
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  // Blend 24% toward neutral gray of matching luminance to tame excessive saturation
  const blend = 0.24;
  const sr = Math.round(r * (1 - blend) + lum * blend);
  const sg = Math.round(g * (1 - blend) + lum * blend);
  const sb = Math.round(b * (1 - blend) + lum * blend);
  return [
    Math.max(0, Math.min(255, sr)),
    Math.max(0, Math.min(255, sg)),
    Math.max(0, Math.min(255, sb)),
  ];
}

function buildPalette(r: number, g: number, b: number, isExtracted = true): ExtractedPalette {
  const [sr, sg, sb] = isExtracted ? softenToStudioTone(r, g, b) : [r, g, b];
  const hex = rgbToHex(sr, sg, sb);
  const rgbString = `${sr}, ${sg}, ${sb}`;
  const luminance = 0.299 * sr + 0.587 * sg + 0.114 * sb;
  const onAccent = luminance > 155 ? '#09090b' : '#ffffff';

  return {
    hex,
    rgb: [sr, sg, sb],
    rgbString,
    onAccent,
    muted: `rgba(${rgbString}, 0.15)`,
    glow: `rgba(${rgbString}, 0.24)`,
    border: `rgba(${rgbString}, 0.32)`,
    subtleBg: `rgba(${rgbString}, 0.06)`,
    isExtracted,
  };
}

/**
 * Extracts a calm, studio-toned dominant color from an album cover image URL.
 * If extraction fails (missing cover, timeout, CORS taint, monochrome cover),
 * cleanly falls back to pure studio monochrome #F5F5F7 — never orange/amber.
 */
export async function extractPaletteFromImage(
  imageUrl?: string | null,
  _fallbackSeed: string = 'ListenHub'
): Promise<ExtractedPalette> {
  if (!imageUrl) {
    return DEFAULT_PALETTE;
  }

  const cached = getCachedPalette(imageUrl);
  if (cached) {
    return cached;
  }

  return new Promise<ExtractedPalette>((resolve) => {
    const timer = setTimeout(() => {
      setCachedPalette(imageUrl, DEFAULT_PALETTE);
      resolve(DEFAULT_PALETTE);
    }, 1200);

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setCachedPalette(imageUrl, DEFAULT_PALETTE);
          resolve(DEFAULT_PALETTE);
          return;
        }

        const width = 48;
        const height = 48;
        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height).data;

        let bestScore = -1;
        let bestR = 245;
        let bestG = 245;
        let bestB = 247;

        for (let i = 0; i < imageData.length; i += 16) {
          const r = imageData[i];
          const g = imageData[i + 1];
          const b = imageData[i + 2];
          const a = imageData[i + 3];

          if (a < 128) continue;

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const delta = max - min;
          const lightness = (max + min) / 2;

          if (lightness < 32 || lightness > 232) continue;

          const saturation = delta === 0 ? 0 : delta / (255 - Math.abs(2 * lightness - 255));
          if (saturation < 0.22) continue;

          // Prefer balanced, natural mid-tone album hues over harsh neons
          const score =
            Math.min(saturation, 0.78) * 1.4 + (lightness > 64 && lightness < 192 ? 1 : 0.45);

          if (score > bestScore) {
            bestScore = score;
            bestR = r;
            bestG = g;
            bestB = b;
          }
        }

        if (bestScore < 0) {
          setCachedPalette(imageUrl, DEFAULT_PALETTE);
          resolve(DEFAULT_PALETTE);
          return;
        }

        const palette = buildPalette(bestR, bestG, bestB, true);
        setCachedPalette(imageUrl, palette);
        resolve(palette);
      } catch {
        // CORS taint or canvas read failure -> clean monochrome #F5F5F7
        setCachedPalette(imageUrl, DEFAULT_PALETTE);
        resolve(DEFAULT_PALETTE);
      }
    };

    img.onerror = () => {
      clearTimeout(timer);
      setCachedPalette(imageUrl, DEFAULT_PALETTE);
      resolve(DEFAULT_PALETTE);
    };

    img.src = imageUrl;
  });
}

/**
 * Ensures the album-art progress color always meets legibility contrast on Obsidian Ink (#0B0B0D):
 * If relative luminance < 0.42, gently lift brightness until >= 0.52.
 */
export function getContrastSafeTrackColor(
  rgb: [number, number, number],
  _themeMode?: 'dark' | 'light'
): string {
  let [r, g, b] = rgb.map((v) => Math.max(0, Math.min(255, Math.round(v)))) as [
    number,
    number,
    number,
  ];
  const calcLuminance = (rr: number, gg: number, bb: number) =>
    (0.299 * rr + 0.587 * gg + 0.114 * bb) / 255;

  let lum = calcLuminance(r, g, b);

  if (lum < 0.42) {
    let guard = 0;
    while (lum < 0.52 && guard < 24) {
      r = Math.round(r + (245 - r) * 0.2);
      g = Math.round(g + (245 - g) * 0.2);
      b = Math.round(b + (247 - b) * 0.2);
      lum = calcLuminance(r, g, b);
      guard += 1;
    }
  }

  return rgbToHex(r, g, b);
}

/**
 * Injects dynamic color theme CSS variables directly into document root.
 */
export function applyThemeToDocument(
  palette: ExtractedPalette,
  _themeMode?: 'dark' | 'light'
) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const dynamicTrackColor = palette.isExtracted === false
    ? '#F5F5F7'
    : getContrastSafeTrackColor(palette.rgb, 'dark');

  root.style.setProperty('--theme-accent', palette.hex);
  root.style.setProperty('--theme-accent-rgb', palette.rgbString);
  root.style.setProperty('--theme-accent-on', palette.onAccent);
  root.style.setProperty('--theme-accent-muted', palette.muted);
  root.style.setProperty('--theme-accent-glow', palette.glow);
  root.style.setProperty('--theme-accent-border', palette.border);
  root.style.setProperty('--theme-accent-subtle', palette.subtleBg);
  root.style.setProperty('--dynamic-track-color', dynamicTrackColor);
}
