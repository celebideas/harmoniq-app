import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { FirebaseErrorBoundary } from './components/FirebaseErrorBoundary.tsx';
import './index.css';

// Clean up any legacy Service Worker in dev mode so Vite optimized React chunks never split across hashes
if (import.meta.env.DEV && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker
    .getRegistrations()
    .then(async (regs) => {
      if (regs.length === 0) return;
      await Promise.all(regs.map((r) => r.unregister()));
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if (hadController && !sessionStorage.getItem('listenhub_dev_sw_purged')) {
        sessionStorage.setItem('listenhub_dev_sw_purged', '1');
        window.location.reload();
      }
    })
    .catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <FirebaseErrorBoundary>
    <App />
  </FirebaseErrorBoundary>
);
