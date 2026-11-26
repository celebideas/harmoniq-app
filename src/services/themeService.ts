/**
 * Harmoniq Dual-Theme & Haptic Engine
 * Supports:
 * - 'dark': Velvet Pitch (#0A090F)
 * - 'light': Warm Vinyl Studio (#F5F4F8)
 * - 'system': Automatic OS preference sync with live change listener
 */

export type ThemeMode = 'dark' | 'light' | 'system';

const THEME_STORAGE_KEY = 'harmoniq_theme_mode';

export function getSavedTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
  if (saved === 'dark' || saved === 'light' || saved === 'system') {
    return saved;
  }
  return 'dark';
}

export function resolveEffectiveTheme(mode: ThemeMode): 'dark' | 'light' {
  if (mode === 'system' && typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  return mode === 'light' ? 'light' : 'dark';
}

export function applyTheme(mode: ThemeMode): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark';
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // ignore storage quota errors
  }
  const effective = resolveEffectiveTheme(mode);
  const root = document.documentElement;

  root.classList.remove('light', 'dark');
  root.classList.add(effective);
  root.setAttribute('data-theme', effective);
  root.style.colorScheme = effective;

  // Update mobile status bar theme-color meta tags
  const metaThemes = document.querySelectorAll('meta[name="theme-color"]');
  metaThemes.forEach((meta) => {
    meta.setAttribute('content', effective === 'light' ? '#FAF9F6' : '#0B0B0D');
  });

  return effective;
}

export function subscribeSystemThemeChange(callback: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const listener = () => callback();
  if (typeof mq.addEventListener === 'function') {
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }
  return () => {};
}

export function toggleThemeMode(current: ThemeMode): ThemeMode {
  const effective = resolveEffectiveTheme(current);
  const next: ThemeMode = effective === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  return next;
}

/**
 * Triggers subtle mobile haptic vibration on supported devices
 */
export function triggerHaptic(pattern: number | number[] = 15): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // ignore if blocked by browser policy
    }
  }
}
