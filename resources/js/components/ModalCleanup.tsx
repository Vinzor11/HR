import { useEffect } from 'react';
import { router } from '@inertiajs/react';
import { cleanupModalOverlays, forceCleanupModals } from '@/utils/modal-utils';

/**
 * Global component to clean up modal overlays after navigation and form submissions
 */
export function ModalCleanup() {
  useEffect(() => {
    // Cleanup after page load/navigation
    const cleanup = () => {
      setTimeout(() => {
        cleanupModalOverlays();
      }, 100);
    };

    // Cleanup on initial load
    cleanup();

    // Cleanup after Inertia navigation
    const handleFinish = () => {
      cleanup();
    };

    router.on('finish', handleFinish);

    // Cleanup on page visibility change (user switches tabs and comes back)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        cleanup();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup on window focus (in case user clicks away and comes back)
    const handleFocus = () => {
      cleanup();
    };

    window.addEventListener('focus', handleFocus);

    // Cleanup periodically (fallback)
    const interval = setInterval(() => {
      // Check if there are closed dialogs with lingering overlays
      const closedDialogs = Array.from(
        document.querySelectorAll('[data-slot="dialog"][data-state="closed"]')
      );
      
      if (closedDialogs.length > 0) {
        cleanup();
      }
    }, 2000); // Check every 2 seconds

    return () => {
      router.off('finish', handleFinish);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, []);

  return null;
}

/**
 * Emergency cleanup function - can be called from browser console
 * Usage: window.cleanupModals()
 */
if (typeof window !== 'undefined') {
  (window as any).cleanupModals = forceCleanupModals;
  (window as any).forceCleanupModals = forceCleanupModals;
}

