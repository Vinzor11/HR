/**
 * Utility functions to clean up modal overlays and restore page interactivity
 */

/**
 * Remove all lingering dialog overlays from the DOM
 */
export function cleanupDialogOverlays() {
  // Find all dialog overlays
  const overlays = document.querySelectorAll('[data-slot="dialog-overlay"]');
  
  overlays.forEach((overlay) => {
    const element = overlay as HTMLElement;
    const dialog = element.closest('[data-slot="dialog"]');
    
    // Remove overlay if dialog is closed or doesn't exist
    if (!dialog || dialog.getAttribute('data-state') === 'closed') {
      element.remove();
    }
  });

  // Remove orphaned portals
  const portals = document.querySelectorAll('[data-slot="dialog-portal"]');
  portals.forEach((portal) => {
    const content = portal.querySelector('[data-slot="dialog-content"]');
    const dialog = portal.closest('[data-slot="dialog"]');
    
    if ((!content || content.getAttribute('data-state') === 'closed') &&
        (!dialog || dialog.getAttribute('data-state') === 'closed')) {
      // Check if any dialog is actually open
      const hasOpenDialog = Array.from(
        document.querySelectorAll('[data-slot="dialog"]')
      ).some((d) => d.getAttribute('data-state') === 'open');
      
      if (!hasOpenDialog) {
        portal.remove();
      }
    }
  });
}

/**
 * Restore page interactivity by removing blocking styles
 */
export function restorePageInteractivity() {
  // Check if any dialogs are open
  const hasOpenDialog = Array.from(
    document.querySelectorAll('[data-slot="dialog"]')
  ).some((dialog) => dialog.getAttribute('data-state') === 'open');

  if (!hasOpenDialog) {
    // Restore pointer events
    document.body.style.pointerEvents = '';
    document.documentElement.style.pointerEvents = '';

    // Remove any blocking overlays
    cleanupDialogOverlays();

    // Remove any fixed positioning issues
    const blockingElements = document.querySelectorAll(
      '[style*="pointer-events: none"]'
    );
    blockingElements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      if (htmlEl.style.pointerEvents === 'none') {
        htmlEl.style.pointerEvents = '';
      }
    });
  }
}

/**
 * Force cleanup of all modal-related elements
 * Use this as a last resort if page becomes unclickable
 */
export function forceCleanupModals() {
  // Remove all overlays
  const allOverlays = document.querySelectorAll('[data-slot="dialog-overlay"]');
  allOverlays.forEach((overlay) => overlay.remove());

  // Remove all portals
  const allPortals = document.querySelectorAll('[data-slot="dialog-portal"]');
  allPortals.forEach((portal) => portal.remove());

  // Restore interactivity
  document.body.style.pointerEvents = '';
  document.documentElement.style.pointerEvents = '';
  
  // Remove body scroll lock
  document.body.style.overflow = '';
  document.documentElement.style.overflow = '';

  console.log('[Modal Cleanup] Force cleaned up all modal elements');
}

