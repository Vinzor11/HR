import { useEffect, useRef } from 'react';

/**
 * Hook to ensure modal overlays are properly cleaned up after modal closes
 * This prevents the page from becoming unclickable due to lingering overlays
 */
export function useModalCleanup(isOpen: boolean) {
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOpen) {
      // After modal closes, clean up any lingering overlays
      cleanupTimeoutRef.current = setTimeout(() => {
        // Remove any dialog overlays that might still be in the DOM
        const overlays = document.querySelectorAll('[data-slot="dialog-overlay"]');
        overlays.forEach((overlay) => {
          const element = overlay as HTMLElement;
          // Check if element is still in the DOM
          if (!element.isConnected) return;
          
          // Check if overlay should be removed (not part of an open dialog)
          const dialog = element.closest('[data-slot="dialog"]');
          if ((!dialog || dialog.getAttribute('data-state') === 'closed') && element.parentNode) {
            try {
              element.remove();
            } catch (e) {
              console.debug('Overlay already removed:', e);
            }
          }
        });

        // Remove any orphaned portals
        const portals = document.querySelectorAll('[data-slot="dialog-portal"]');
        portals.forEach((portal) => {
          // Check if portal is still in the DOM
          if (!portal.isConnected) return;
          
          const content = portal.querySelector('[data-slot="dialog-content"]');
          if (!content || content.getAttribute('data-state') === 'closed') {
            // Check if any dialog is actually open
            const hasOpenDialog = Array.from(
              document.querySelectorAll('[data-slot="dialog"]')
            ).some((dialog) => dialog.getAttribute('data-state') === 'open');
            
            if (!hasOpenDialog && portal.parentNode) {
              try {
                portal.remove();
              } catch (e) {
                console.debug('Portal already removed:', e);
              }
            }
          }
        });

        // Ensure body pointer-events are restored
        document.body.style.pointerEvents = '';
        document.documentElement.style.pointerEvents = '';

        // Remove any fixed positioning or overflow issues
        const html = document.documentElement;
        const body = document.body;
        
        // Check if there are any open dialogs
        const hasOpenDialog = Array.from(
          document.querySelectorAll('[data-slot="dialog"]')
        ).some((dialog) => dialog.getAttribute('data-state') === 'open');

        if (!hasOpenDialog) {
          // Only restore if no dialogs are open
          html.style.overflow = html.style.overflow || '';
          body.style.overflow = body.style.overflow || '';
        }
      }, 300); // Wait for animation to complete (200ms + buffer)
    }

    return () => {
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }
    };
  }, [isOpen]);
}

