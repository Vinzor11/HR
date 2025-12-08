import { useRef, useCallback } from 'react';

/**
 * Hook to prevent double form submission
 * Returns a function that checks if submission is in progress and can set it
 */
export function usePreventDoubleSubmit() {
  const isSubmittingRef = useRef(false);

  const preventDoubleSubmit = useCallback((callback: () => void | Promise<void>) => {
    return async (...args: any[]) => {
      // If already submitting, prevent double submission
      if (isSubmittingRef.current) {
        return;
      }

      // Set submitting state
      isSubmittingRef.current = true;

      try {
        // Execute the callback
        await callback(...args);
      } finally {
        // Reset submitting state after a small delay to prevent rapid re-submissions
        // This ensures even if the form resets quickly, there's a brief cooldown
        setTimeout(() => {
          isSubmittingRef.current = false;
        }, 500);
      }
    };
  }, []);

  const resetSubmitState = useCallback(() => {
    isSubmittingRef.current = false;
  }, []);

  return { preventDoubleSubmit, isSubmitting: isSubmittingRef.current, resetSubmitState };
}

