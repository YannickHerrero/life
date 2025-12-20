'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';

export function useServiceWorker() {
  const { updateAvailable, setUpdateAvailable } = useAppStore();

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const checkForUpdates = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;

        // Check if there's already a waiting worker
        if (registration.waiting) {
          setUpdateAvailable(true);
          return;
        }

        // Listen for new service worker installations
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            // New service worker is installed and waiting
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
          });
        });

        // Periodically check for updates (every 60 minutes)
        const intervalId = setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);

        return () => clearInterval(intervalId);
      } catch (error) {
        console.error('Service worker registration error:', error);
      }
    };

    checkForUpdates();
  }, [setUpdateAvailable]);

  const refreshApp = async () => {
    try {
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      // Update service worker
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.update();
      }
      
      // Reload the page to get fresh content
      window.location.reload();
    } catch (error) {
      console.error('Failed to refresh app:', error);
    }
  };

  return { updateAvailable, refreshApp };
}
