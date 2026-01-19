import { useEffect, useState, useCallback } from 'react';

// Breakpoint definitions matching Tailwind defaults
export const BREAKPOINTS = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

interface ResponsiveState {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  isMobile: boolean;      // < 768px (md)
  isTablet: boolean;      // >= 768px && < 1024px
  isDesktop: boolean;     // >= 1024px
  isLargeDesktop: boolean; // >= 1280px
  orientation: 'portrait' | 'landscape';
}

/**
 * Hook to get current responsive state
 * Returns current breakpoint, device type, and dimensions
 */
export function useResponsive(): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>(() => {
    if (typeof window === 'undefined') {
      return {
        width: 1024,
        height: 768,
        breakpoint: 'lg',
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isLargeDesktop: false,
        orientation: 'landscape',
      };
    }
    return getResponsiveState();
  });

  useEffect(() => {
    const handleResize = () => {
      setState(getResponsiveState());
    };

    window.addEventListener('resize', handleResize);
    // Also listen to orientation change for mobile devices
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return state;
}

function getResponsiveState(): ResponsiveState {
  const width = window.innerWidth;
  const height = window.innerHeight;

  let breakpoint: Breakpoint = 'xs';
  if (width >= BREAKPOINTS['2xl']) breakpoint = '2xl';
  else if (width >= BREAKPOINTS.xl) breakpoint = 'xl';
  else if (width >= BREAKPOINTS.lg) breakpoint = 'lg';
  else if (width >= BREAKPOINTS.md) breakpoint = 'md';
  else if (width >= BREAKPOINTS.sm) breakpoint = 'sm';

  return {
    width,
    height,
    breakpoint,
    isMobile: width < BREAKPOINTS.md,
    isTablet: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
    isDesktop: width >= BREAKPOINTS.lg,
    isLargeDesktop: width >= BREAKPOINTS.xl,
    orientation: height > width ? 'portrait' : 'landscape',
  };
}

/**
 * Hook to check if current viewport matches a media query
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);

    mql.addEventListener('change', handler);
    setMatches(mql.matches);

    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/**
 * Hook to check if viewport is at or above a specific breakpoint
 */
export function useBreakpoint(breakpoint: Breakpoint): boolean {
  return useMediaQuery(`(min-width: ${BREAKPOINTS[breakpoint]}px)`);
}

/**
 * Hook to check if viewport is below a specific breakpoint
 */
export function useBreakpointDown(breakpoint: Breakpoint): boolean {
  return useMediaQuery(`(max-width: ${BREAKPOINTS[breakpoint] - 1}px)`);
}

/**
 * Hook to check if viewport is between two breakpoints
 */
export function useBreakpointBetween(min: Breakpoint, max: Breakpoint): boolean {
  return useMediaQuery(
    `(min-width: ${BREAKPOINTS[min]}px) and (max-width: ${BREAKPOINTS[max] - 1}px)`
  );
}

/**
 * Hook for touch device detection
 */
export function useTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const checkTouch = () => {
      setIsTouch(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore
        navigator.msMaxTouchPoints > 0
      );
    };

    checkTouch();
  }, []);

  return isTouch;
}

/**
 * Hook for reduced motion preference
 */
export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

/**
 * Hook for dark mode preference
 */
export function usePrefersDarkMode(): boolean {
  return useMediaQuery('(prefers-color-scheme: dark)');
}

/**
 * Hook to get responsive value based on breakpoint
 * Similar to Tailwind's responsive utilities but in JS
 */
export function useResponsiveValue<T>(values: Partial<Record<Breakpoint, T>>, defaultValue: T): T {
  const { breakpoint } = useResponsive();
  
  // Find the closest matching breakpoint value
  const breakpointOrder: Breakpoint[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
  const currentIndex = breakpointOrder.indexOf(breakpoint);
  
  for (let i = currentIndex; i < breakpointOrder.length; i++) {
    const bp = breakpointOrder[i];
    if (values[bp] !== undefined) {
      return values[bp] as T;
    }
  }
  
  return defaultValue;
}

/**
 * Hook to track scroll position for sticky headers, etc.
 */
export function useScrollPosition() {
  const [scrollPosition, setScrollPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition({
        x: window.scrollX,
        y: window.scrollY,
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return scrollPosition;
}

/**
 * Hook to lock body scroll (useful for modals on mobile)
 */
export function useScrollLock(lock: boolean) {
  useEffect(() => {
    if (!lock) return;

    const originalStyle = window.getComputedStyle(document.body).overflow;
    const originalPaddingRight = window.getComputedStyle(document.body).paddingRight;
    
    // Calculate scrollbar width to prevent layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      document.body.style.overflow = originalStyle;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [lock]);
}

/**
 * Hook to detect if user prefers reduced data usage
 */
export function useSaveData(): boolean {
  const [saveData, setSaveData] = useState(false);

  useEffect(() => {
    // @ts-ignore - Navigator.connection is not in all browsers
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      setSaveData(connection.saveData === true);
    }
  }, []);

  return saveData;
}

