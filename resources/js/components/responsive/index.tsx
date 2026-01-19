import * as React from 'react';
import { useResponsive, useBreakpoint, useBreakpointDown, Breakpoint } from '@/hooks/use-responsive';
import { cn } from '@/lib/utils';

/**
 * Show children only on mobile devices (< 768px)
 */
export function MobileOnly({ children, className }: { children: React.ReactNode; className?: string }) {
  const { isMobile } = useResponsive();
  if (!isMobile) return null;
  return <div className={className}>{children}</div>;
}

/**
 * Show children only on tablet devices (>= 768px && < 1024px)
 */
export function TabletOnly({ children, className }: { children: React.ReactNode; className?: string }) {
  const { isTablet } = useResponsive();
  if (!isTablet) return null;
  return <div className={className}>{children}</div>;
}

/**
 * Show children only on desktop devices (>= 1024px)
 */
export function DesktopOnly({ children, className }: { children: React.ReactNode; className?: string }) {
  const { isDesktop } = useResponsive();
  if (!isDesktop) return null;
  return <div className={className}>{children}</div>;
}

/**
 * Show children on tablet and above (>= 768px)
 */
export function TabletAndUp({ children, className }: { children: React.ReactNode; className?: string }) {
  const isTabletUp = useBreakpoint('md');
  if (!isTabletUp) return null;
  return <div className={className}>{children}</div>;
}

/**
 * Show children on mobile and tablet (< 1024px)
 */
export function MobileAndTablet({ children, className }: { children: React.ReactNode; className?: string }) {
  const isMobileOrTablet = useBreakpointDown('lg');
  if (!isMobileOrTablet) return null;
  return <div className={className}>{children}</div>;
}

/**
 * Generic component to show/hide based on breakpoint
 */
interface ShowAtProps {
  children: React.ReactNode;
  breakpoint: Breakpoint;
  direction?: 'up' | 'down';
  className?: string;
}

export function ShowAt({ children, breakpoint, direction = 'up', className }: ShowAtProps) {
  const isUp = useBreakpoint(breakpoint);
  const isDown = useBreakpointDown(breakpoint);
  
  const shouldShow = direction === 'up' ? isUp : isDown;
  if (!shouldShow) return null;
  
  return <div className={className}>{children}</div>;
}

/**
 * Responsive container with max-width based on breakpoint
 */
interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: boolean;
}

export function ResponsiveContainer({ 
  children, 
  className,
  maxWidth = 'xl',
  padding = true 
}: ResponsiveContainerProps) {
  const maxWidthClasses = {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md',
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    '2xl': 'max-w-screen-2xl',
    full: 'max-w-full',
  };

  return (
    <div className={cn(
      'mx-auto w-full',
      maxWidthClasses[maxWidth],
      padding && 'px-4 sm:px-6 lg:px-8',
      className
    )}>
      {children}
    </div>
  );
}

/**
 * Responsive grid with automatic column adjustment
 */
interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  cols?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  };
  gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

export function ResponsiveGrid({ 
  children, 
  className,
  cols = { xs: 1, sm: 2, md: 2, lg: 3, xl: 4 },
  gap = 'md'
}: ResponsiveGridProps) {
  const gapClasses = {
    none: 'gap-0',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  };

  const colClasses = [
    cols.xs && `grid-cols-${cols.xs}`,
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
    cols['2xl'] && `2xl:grid-cols-${cols['2xl']}`,
  ].filter(Boolean).join(' ');

  return (
    <div className={cn(
      'grid',
      colClasses,
      gapClasses[gap],
      className
    )}>
      {children}
    </div>
  );
}

/**
 * Responsive stack - vertical on mobile, horizontal on larger screens
 */
interface ResponsiveStackProps {
  children: React.ReactNode;
  className?: string;
  breakpoint?: Breakpoint;
  gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  reverse?: boolean;
}

export function ResponsiveStack({ 
  children, 
  className,
  breakpoint = 'md',
  gap = 'md',
  align = 'start',
  justify = 'start',
  reverse = false
}: ResponsiveStackProps) {
  const gapClasses = {
    none: 'gap-0',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  };

  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
  };

  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
  };

  const directionClass = {
    sm: reverse ? 'flex-col-reverse sm:flex-row' : 'flex-col sm:flex-row',
    md: reverse ? 'flex-col-reverse md:flex-row' : 'flex-col md:flex-row',
    lg: reverse ? 'flex-col-reverse lg:flex-row' : 'flex-col lg:flex-row',
    xl: reverse ? 'flex-col-reverse xl:flex-row' : 'flex-col xl:flex-row',
    '2xl': reverse ? 'flex-col-reverse 2xl:flex-row' : 'flex-col 2xl:flex-row',
    xs: 'flex-row',
  };

  return (
    <div className={cn(
      'flex',
      directionClass[breakpoint],
      gapClasses[gap],
      alignClasses[align],
      justifyClasses[justify],
      className
    )}>
      {children}
    </div>
  );
}

/**
 * Responsive text that scales with viewport
 */
interface ResponsiveTextProps {
  children: React.ReactNode;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span';
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
}

export function ResponsiveText({ 
  children, 
  className,
  as: Component = 'p',
  size = 'base'
}: ResponsiveTextProps) {
  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-xs sm:text-sm',
    base: 'text-sm sm:text-base',
    lg: 'text-base sm:text-lg',
    xl: 'text-lg sm:text-xl md:text-2xl',
    '2xl': 'text-xl sm:text-2xl md:text-3xl',
    '3xl': 'text-2xl sm:text-3xl md:text-4xl',
    '4xl': 'text-3xl sm:text-4xl md:text-5xl',
    '5xl': 'text-4xl sm:text-5xl md:text-6xl',
  };

  return (
    <Component className={cn(sizeClasses[size], className)}>
      {children}
    </Component>
  );
}

/**
 * Responsive padding wrapper
 */
interface ResponsivePaddingProps {
  children: React.ReactNode;
  className?: string;
  size?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

export function ResponsivePadding({ 
  children, 
  className,
  size = 'md'
}: ResponsivePaddingProps) {
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-2 sm:p-3 md:p-4',
    md: 'p-3 sm:p-4 md:p-6',
    lg: 'p-4 sm:p-6 md:p-8',
    xl: 'p-6 sm:p-8 md:p-10 lg:p-12',
  };

  return (
    <div className={cn(paddingClasses[size], className)}>
      {children}
    </div>
  );
}

/**
 * Touch-friendly button wrapper - ensures minimum touch target size on mobile
 */
interface TouchTargetProps {
  children: React.ReactNode;
  className?: string;
  minSize?: 'sm' | 'md' | 'lg';
}

export function TouchTarget({ 
  children, 
  className,
  minSize = 'md'
}: TouchTargetProps) {
  const sizeClasses = {
    sm: 'min-h-[36px] min-w-[36px] md:min-h-0 md:min-w-0',
    md: 'min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0',
    lg: 'min-h-[48px] min-w-[48px] md:min-h-0 md:min-w-0',
  };

  return (
    <div className={cn(
      'inline-flex items-center justify-center',
      sizeClasses[minSize],
      className
    )}>
      {children}
    </div>
  );
}

/**
 * Responsive spacer - different spacing at different breakpoints
 */
interface ResponsiveSpacerProps {
  className?: string;
  size?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
}

export function ResponsiveSpacer({ 
  className,
  size = { xs: 4, md: 6, lg: 8 }
}: ResponsiveSpacerProps) {
  const { breakpoint } = useResponsive();
  
  // Get the appropriate size for current breakpoint
  const breakpointOrder: Breakpoint[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
  const currentIndex = breakpointOrder.indexOf(breakpoint);
  
  let currentSize = size.xs || 4;
  for (let i = currentIndex; i < breakpointOrder.length; i++) {
    const bp = breakpointOrder[i] as keyof typeof size;
    if (size[bp] !== undefined) {
      currentSize = size[bp]!;
      break;
    }
  }

  return (
    <div 
      className={className}
      style={{ height: `${currentSize * 4}px` }}
      aria-hidden="true"
    />
  );
}

/**
 * Truncate text with responsive line clamp
 */
interface ResponsiveTruncateProps {
  children: React.ReactNode;
  className?: string;
  lines?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
  };
}

export function ResponsiveTruncate({ 
  children, 
  className,
  lines = { xs: 2, md: 3 }
}: ResponsiveTruncateProps) {
  const lineClasses = [
    lines.xs && `line-clamp-${lines.xs}`,
    lines.sm && `sm:line-clamp-${lines.sm}`,
    lines.md && `md:line-clamp-${lines.md}`,
    lines.lg && `lg:line-clamp-${lines.lg}`,
  ].filter(Boolean).join(' ');

  return (
    <div className={cn('overflow-hidden', lineClasses, className)}>
      {children}
    </div>
  );
}

