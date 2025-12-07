/**
 * Utility functions for modal cleanup and management
 */

/**
 * Clean up modal overlays and restore page interactivity
 * Call this after modal closes or form submission
 */
export function cleanupModalOverlays() {
  // Use requestAnimationFrame to ensure DOM updates are complete
  requestAnimationFrame(() => {
    setTimeout(() => {
      // Remove all dialog overlays
      const overlays = document.querySelectorAll('[data-slot="dialog-overlay"]');
      overlays.forEach((overlay) => {
        const element = overlay as HTMLElement;
        // Check if element is still in the DOM before trying to access parent
        if (!element.isConnected) return;
        
        const dialog = element.closest('[data-slot="dialog"]');
        
        // Remove if dialog is closed or doesn't exist
        if (!dialog || dialog.getAttribute('data-state') === 'closed') {
          // Check if element has a parent before removing
          if (element.parentNode) {
            try {
              element.remove();
            } catch (e) {
              // Element might have already been removed, ignore error
              console.debug('Overlay already removed:', e);
            }
          }
        }
      });

      // Remove orphaned portals
      const portals = document.querySelectorAll('[data-slot="dialog-portal"]');
      portals.forEach((portal) => {
        // Check if portal is still in the DOM
        if (!portal.isConnected) return;
        
        const content = portal.querySelector('[data-slot="dialog-content"]');
        const dialog = portal.closest('[data-slot="dialog"]');
        
        if ((!content || content.getAttribute('data-state') === 'closed') &&
            (!dialog || dialog.getAttribute('data-state') === 'closed')) {
          const hasOpenDialog = Array.from(
            document.querySelectorAll('[data-slot="dialog"]')
          ).some((d) => d.getAttribute('data-state') === 'open');
          
          if (!hasOpenDialog && portal.parentNode) {
            try {
              portal.remove();
            } catch (e) {
              // Portal might have already been removed, ignore error
              console.debug('Portal already removed:', e);
            }
          }
        }
      });

      // Restore pointer events - check if any dialogs are actually open
      const hasOpenDialog = Array.from(
        document.querySelectorAll('[data-slot="dialog"]')
      ).some((dialog) => dialog.getAttribute('data-state') === 'open');

      if (!hasOpenDialog) {
        // Restore interactivity
        document.body.style.pointerEvents = '';
        document.documentElement.style.pointerEvents = '';
        
        // Remove body scroll lock if no dialogs are open
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
      }
    }, 300); // Wait for animation to complete
  });
}

/**
 * Force cleanup - removes all overlays immediately
 */
export function forceCleanupModals() {
  document.querySelectorAll('[data-slot="dialog-overlay"]').forEach((el) => {
    if (el.isConnected && el.parentNode) {
      try {
        el.remove();
      } catch (e) {
        console.debug('Overlay already removed:', e);
      }
    }
  });
  
  document.querySelectorAll('[data-slot="dialog-portal"]').forEach((el) => {
    if (el.isConnected && el.parentNode) {
      try {
        el.remove();
      } catch (e) {
        console.debug('Portal already removed:', e);
      }
    }
  });
  
  document.body.style.pointerEvents = '';
  document.documentElement.style.pointerEvents = '';
  document.body.style.overflow = '';
  document.documentElement.style.overflow = '';
}

