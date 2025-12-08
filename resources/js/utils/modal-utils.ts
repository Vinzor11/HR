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
      // Only restore pointer events - let Radix UI handle DOM removal
      // Check if any dialogs are actually open
      const hasOpenDialog = Array.from(
        document.querySelectorAll('[data-slot="dialog"]')
      ).some((dialog) => {
        const state = dialog.getAttribute('data-state');
        return state === 'open';
      });

      if (!hasOpenDialog) {
        // Restore interactivity - don't try to remove elements, just restore styles
        document.body.style.pointerEvents = '';
        document.documentElement.style.pointerEvents = '';
        
        // Remove body scroll lock if no dialogs are open
        // Check if overflow was set by our code before clearing
        const htmlStyle = window.getComputedStyle(document.documentElement);
        const bodyStyle = window.getComputedStyle(document.body);
        
        // Only restore if it's actually hidden (might be hidden for other reasons)
        // We'll just restore it since we're ensuring no dialogs are open
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
      }
    }, 300); // Wait for animation to complete
  });
}

/**
 * Force cleanup - restores page interactivity without trying to remove DOM nodes
 * (Let Radix UI handle DOM cleanup to avoid conflicts)
 */
export function forceCleanupModals() {
  // Just restore styles - don't try to remove DOM nodes that React/Radix UI manages
  document.body.style.pointerEvents = '';
  document.documentElement.style.pointerEvents = '';
  document.body.style.overflow = '';
  document.documentElement.style.overflow = '';
  
  // Force close any open dialogs by setting their state
  // This is safer than trying to remove DOM nodes
  const dialogs = document.querySelectorAll('[data-slot="dialog"]');
  dialogs.forEach((dialog) => {
    // Radix UI will handle the actual cleanup
    const root = dialog as HTMLElement;
    if (root.getAttribute('data-state') === 'open') {
      // Try to find and click the close button if it exists
      const closeButton = root.querySelector('[data-slot="dialog-close"]') as HTMLElement;
      if (closeButton) {
        closeButton.click();
      }
    }
  });
}

