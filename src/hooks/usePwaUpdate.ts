import { useState, useEffect, useCallback } from 'react';

export interface PwaUpdateState {
  isUpdateAvailable: boolean;
  isChecking: boolean;
  isOnline: boolean;
  lastCheckedTime: Date | null;
  appVersion: string;
  applyUpdate: () => void;
  checkForUpdates: () => Promise<boolean>;
}

export const APP_CURRENT_VERSION = 'v1.2.0 (Canlı Senkronize)';

export function usePwaUpdate(): PwaUpdateState {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [lastCheckedTime, setLastCheckedTime] = useState<Date | null>(new Date());
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Monitor online/offline state
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (!('serviceWorker' in navigator)) {
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    // In Vite dev mode, never keep an active Service Worker so pre-bundled React chunks stay in sync
    if (import.meta.env.DEV) {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .catch(() => {});
      if ('caches' in window) {
        caches
          .keys()
          .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
          .catch(() => {});
      }
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    // Register service worker in production with updateViaCache: 'none'
    let activeReg: ServiceWorkerRegistration | null = null;
    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((reg) => {
        activeReg = reg;
        setRegistration(reg);

        // Check if there is already a waiting worker
        if (reg.waiting) {
          setIsUpdateAvailable(true);
        }

        // Listen for new updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (
                newWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                setIsUpdateAvailable(true);
              }
            });
          }
        });
      })
      .catch((err) => {
        console.warn('[PWA] Service worker registration error:', err);
      });

    // When the controlling service worker changes, reload if an update was requested
    let refreshing = false;
    const handleControllerChange = () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    };
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    // Periodic update check every 45 seconds while app is open
    const interval = setInterval(() => {
      if (activeReg) {
        activeReg.update().catch(() => {});
        setLastCheckedTime(new Date());
      }
    }, 45000);

    // Check updates when app window becomes active/focused
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && activeReg) {
        activeReg.update().catch(() => {});
        setLastCheckedTime(new Date());
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      clearInterval(interval);
    };
  }, []);

  const applyUpdate = useCallback(() => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  }, [registration]);

  const checkForUpdates = useCallback(async (): Promise<boolean> => {
    setIsChecking(true);
    setLastCheckedTime(new Date());

    try {
      if ('serviceWorker' in navigator) {
        const reg = registration || (await navigator.serviceWorker.getRegistration());
        if (reg) {
          await reg.update();
          if (reg.waiting || reg.installing) {
            setIsUpdateAvailable(true);
            setIsChecking(false);
            return true;
          }
        }
      }

      // Also try fetching the root index.html headers with cache-bust to verify server reachability
      const res = await fetch(`/?_t=${Date.now()}`, { cache: 'no-cache', method: 'HEAD' });
      setIsChecking(false);
      return res.ok;
    } catch {
      setIsChecking(false);
      return false;
    }
  }, [registration]);

  return {
    isUpdateAvailable,
    isChecking,
    isOnline,
    lastCheckedTime,
    appVersion: APP_CURRENT_VERSION,
    applyUpdate,
    checkForUpdates,
  };
}
