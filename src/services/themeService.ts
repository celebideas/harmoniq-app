/**
 * Harmoniq Dual-Theme & Haptic Engine
 * Supports:
 * - 'dark': Velvet Pitch (#0A090F)
 * - 'light': Warm Vinyl Studio (#F5F4F8)
 * - 'system': Automatic OS preference sync
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
  localStorage.setItem(THEME_STORAGE_KEY, mode);
  const effective = resolveEffectiveTheme(mode);
  const root = document.documentElement;

  if (effective === 'light') {
    root.classList.add('light');
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  } else {
    root.classList.add('dark');
    root.classList.remove('light');
    root.style.colorScheme = 'dark';
  }

  // Update mobile status bar theme-color meta tag
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', effective === 'light' ? '#F5F4F8' : '#0A090F');
  }

  return effective;
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
