/**
 * ListenHub Theme & Haptic Engine
 * Permanently locked to Obsidian Ink (#0B0B0D) Dark Mode.
 */

export type ThemeMode = 'dark';

const THEME_STORAGE_KEY = 'harmoniq_theme_mode';

export function getSavedTheme(): ThemeMode {
  return 'dark';
}

export function resolveEffectiveTheme(_mode?: ThemeMode | string): 'dark' {
  return 'dark';
}

export function applyTheme(_mode?: ThemeMode | string): 'dark' {
  if (typeof window === 'undefined') return 'dark';
  try {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
  } catch {
    // ignore storage quota errors
  }

  const root = document.documentElement;
  root.classList.remove('light');
  root.classList.add('dark');
  root.setAttribute('data-theme', 'dark');
  root.style.colorScheme = 'dark';
  root.style.backgroundColor = '#0B0B0D';

  const metaThemes = document.querySelectorAll('meta[name="theme-color"]');
  metaThemes.forEach((meta) => {
    meta.setAttribute('content', '#0B0B0D');
  });

  return 'dark';
}

export function subscribeSystemThemeChange(_callback: () => void): () => void {
  return () => {};
}

export function toggleThemeMode(_current?: ThemeMode | string): ThemeMode {
  applyTheme('dark');
  return 'dark';
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
