import { useEffect, useRef } from 'react';

/**
 * Hook to ensure modal overlays are properly cleaned up after modal closes
 * This prevents the page from becoming unclickable due to lingering overlays
 */
export function useModalCleanup(isOpen: boolean) {
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOpen) {
      // After modal closes, restore page interactivity
      // Let Radix UI handle DOM cleanup to avoid conflicts
      cleanupTimeoutRef.current = setTimeout(() => {
        // Check if there are any open dialogs
        const hasOpenDialog = Array.from(
          document.querySelectorAll('[data-slot="dialog"]')
        ).some((dialog) => dialog.getAttribute('data-state') === 'open');

        if (!hasOpenDialog) {
          // Only restore styles if no dialogs are open
          // Don't try to remove DOM nodes - let React/Radix UI handle that
          document.body.style.pointerEvents = '';
          document.documentElement.style.pointerEvents = '';
          document.body.style.overflow = '';
          document.documentElement.style.overflow = '';
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

