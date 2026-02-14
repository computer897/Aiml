import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for handling PWA installation
 * Provides install prompt handling and installation state management
 */
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         window.navigator.standalone ||
                         document.referrer.includes('android-app://');
    
    setIsInstalled(isStandalone);
    
    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      // Prevent Chrome 76+ from showing the mini-infobar
      e.preventDefault();
      // Stash the event for later use
      setDeferredPrompt(e);
      setIsInstallable(true);
      console.log('[PWA] Install prompt available');
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('[PWA] App was installed');
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      
      // Track installation
      try {
        localStorage.setItem('pwa-installed', 'true');
        localStorage.setItem('pwa-installed-date', new Date().toISOString());
      } catch (e) {
        console.warn('[PWA] Could not save installation state');
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Trigger the install prompt
  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) {
      console.warn('[PWA] No install prompt available');
      return { outcome: 'unavailable' };
    }

    try {
      // Show the install prompt
      deferredPrompt.prompt();
      
      // Wait for user response
      const { outcome } = await deferredPrompt.userChoice;
      console.log('[PWA] User choice:', outcome);
      
      // Clear the deferred prompt
      setDeferredPrompt(null);
      setIsInstallable(false);
      
      return { outcome };
    } catch (error) {
      console.error('[PWA] Install prompt error:', error);
      return { outcome: 'error', error };
    }
  }, [deferredPrompt]);

  // Dismiss install prompt (user chose not to install)
  const dismissInstall = useCallback(() => {
    try {
      localStorage.setItem('pwa-install-dismissed', 'true');
      localStorage.setItem('pwa-install-dismissed-date', new Date().toISOString());
    } catch (e) {
      console.warn('[PWA] Could not save dismissal state');
    }
    setIsInstallable(false);
  }, []);

  // Check if user previously dismissed
  const wasDismissed = useCallback(() => {
    try {
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      const dismissedDate = localStorage.getItem('pwa-install-dismissed-date');
      
      if (dismissed && dismissedDate) {
        // Re-show after 7 days
        const daysSinceDismissal = (Date.now() - new Date(dismissedDate).getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceDismissal < 7;
      }
      return false;
    } catch (e) {
      return false;
    }
  }, []);

  return {
    isInstallable: isInstallable && !wasDismissed(),
    isInstalled,
    isIOS,
    promptInstall,
    dismissInstall,
    canInstall: isInstallable || (isIOS && !isInstalled)
  };
}

/**
 * Hook for detecting online/offline status
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

/**
 * Hook for service worker update detection
 */
export function useServiceWorkerUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState(null);

  useEffect(() => {
    const handleUpdateAvailable = (event) => {
      console.log('[PWA] Update available from hook');
      setUpdateAvailable(true);
      setRegistration(event.detail?.registration);
    };

    window.addEventListener('sw-update-available', handleUpdateAvailable);

    return () => {
      window.removeEventListener('sw-update-available', handleUpdateAvailable);
    };
  }, []);

  const applyUpdate = useCallback(() => {
    if (registration?.waiting) {
      // Tell SW to skip waiting
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      // Reload page
      window.location.reload();
    }
  }, [registration]);

  return { updateAvailable, applyUpdate };
}

export default usePWAInstall;
