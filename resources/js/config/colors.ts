/**
 * Modern HRIS Dashboard Color Palette
 * 
 * Inspired by: Linear.app, Notion, Vercel Dashboard, FilamentPHP v3, GitHub
 * 
 * Design Principles:
 * - Enterprise-grade aesthetic with muted, elegant tones
 * - Excellent readability and contrast
 * - Harmonious color relationships (complementary & analogous)
 * - Consistent saturation levels
 * - Professional HRIS-level appearance
 */

export const colorPalette = {
  light: {
    // Primary Colors - Muted Blue (Inspired by Linear/Vercel)
    primary: {
      50: '#f0f4ff',   // Lightest tint
      100: '#e0e9ff',
      200: '#c7d7fe',
      300: '#a5b8fc',
      400: '#818cf8',   // Main primary (muted indigo)
      500: '#6366f1',   // Primary
      600: '#4f46e5',   // Primary dark
      700: '#4338ca',
      800: '#3730a3',
      900: '#312e81',
      DEFAULT: '#6366f1',
    },

    // Secondary Colors - Muted Emerald (Complementary to blue)
    secondary: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',   // Secondary
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
      DEFAULT: '#22c55e',
    },

    // Semantic Colors
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      500: '#22c55e',
      600: '#16a34a',
      DEFAULT: '#22c55e',
    },

    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      500: '#f59e0b',
      600: '#d97706',
      DEFAULT: '#f59e0b',
    },

    danger: {
      50: '#fef2f2',
      100: '#fee2e2',
      500: '#ef4444',
      600: '#dc2626',
      DEFAULT: '#ef4444',
    },

    info: {
      50: '#eff6ff',
      100: '#dbeafe',
      500: '#3b82f6',
      600: '#2563eb',
      DEFAULT: '#3b82f6',
    },

    // Neutral Colors - Warm Grays (Notion-inspired)
    background: {
      DEFAULT: '#fafafa',  // Soft off-white
      secondary: '#f5f5f5',
      tertiary: '#f0f0f0',
    },

    card: {
      DEFAULT: '#ffffff',
      elevated: '#ffffff',
      border: '#e5e7eb',
    },

    border: {
      light: '#f3f4f6',
      DEFAULT: '#e5e7eb',
      medium: '#d1d5db',
      dark: '#9ca3af',
    },

    text: {
      primary: '#111827',      // Near black for excellent readability
      secondary: '#4b5563',    // Medium gray
      tertiary: '#6b7280',     // Lighter gray
      disabled: '#9ca3af',
      inverse: '#ffffff',
    },

    // Table Specific
    table: {
      header: {
        bg: '#f9fafb',         // Slightly stronger than background
        text: '#374151',
        border: '#e5e7eb',
      },
      row: {
        bg: '#ffffff',
        hover: '#f9fafb',     // Subtle but noticeable
        stripe: '#fafafa',     // Very subtle zebra stripe
        border: '#f3f4f6',
      },
      sticky: {
        bg: '#ffffff',
        shadow: 'rgba(0, 0, 0, 0.05)',
      },
    },

    // Interactive States
    hover: {
      light: '#f9fafb',
      medium: '#f3f4f6',
      dark: '#e5e7eb',
    },

    active: {
      light: '#e0e7ff',        // Primary tint
      medium: '#c7d2fe',
    },

    // Shadows (using opacity for depth)
    shadow: {
      sm: 'rgba(0, 0, 0, 0.05)',
      DEFAULT: 'rgba(0, 0, 0, 0.1)',
      md: 'rgba(0, 0, 0, 0.15)',
      lg: 'rgba(0, 0, 0, 0.2)',
    },
  },

  dark: {
    // Primary Colors - Vibrant but balanced
    primary: {
      50: '#1e1b4b',
      100: '#312e81',
      200: '#4338ca',
      300: '#4f46e5',
      400: '#6366f1',
      500: '#818cf8',   // Primary (lighter for dark mode)
      600: '#a5b8fc',
      700: '#c7d7fe',
      800: '#e0e9ff',
      900: '#f0f4ff',
      DEFAULT: '#818cf8',
    },

    // Secondary Colors
    secondary: {
      50: '#14532d',
      100: '#166534',
      200: '#15803d',
      300: '#16a34a',
      400: '#22c55e',
      500: '#4ade80',   // Secondary (lighter for dark mode)
      600: '#86efac',
      700: '#bbf7d0',
      800: '#dcfce7',
      900: '#f0fdf4',
      DEFAULT: '#4ade80',
    },

    // Semantic Colors
    success: {
      50: '#14532d',
      100: '#166534',
      500: '#4ade80',
      600: '#86efac',
      DEFAULT: '#4ade80',
    },

    warning: {
      50: '#78350f',
      100: '#92400e',
      500: '#fbbf24',
      600: '#fcd34d',
      DEFAULT: '#fbbf24',
    },

    danger: {
      50: '#7f1d1d',
      100: '#991b1b',
      500: '#f87171',
      600: '#fca5a5',
      DEFAULT: '#f87171',
    },

    info: {
      50: '#1e3a8a',
      100: '#1e40af',
      500: '#60a5fa',
      600: '#93c5fd',
      DEFAULT: '#60a5fa',
    },

    // Neutral Colors - Deep but not pure black
    background: {
      DEFAULT: '#0f172a',     // Deep slate (not pure black)
      secondary: '#1e293b',
      tertiary: '#334155',
    },

    card: {
      DEFAULT: '#1e293b',     // Elevated card
      elevated: '#334155',    // More elevated
      border: '#334155',
    },

    border: {
      light: '#334155',
      DEFAULT: '#475569',
      medium: '#64748b',
      dark: '#94a3b8',
    },

    text: {
      primary: '#f1f5f9',     // Soft white (not harsh)
      secondary: '#cbd5e1',  // Light gray
      tertiary: '#94a3b8',   // Medium gray
      disabled: '#64748b',
      inverse: '#0f172a',
    },

    // Table Specific
    table: {
      header: {
        bg: '#1e293b',        // Elevated from background
        text: '#f1f5f9',
        border: '#334155',
      },
      row: {
        bg: '#1e293b',
        hover: '#334155',      // Noticeable but not harsh
        stripe: '#1e293b',     // Very subtle difference
        border: '#334155',
      },
      sticky: {
        bg: '#1e293b',
        shadow: 'rgba(0, 0, 0, 0.3)',
      },
    },

    // Interactive States
    hover: {
      light: '#334155',
      medium: '#475569',
      dark: '#64748b',
    },

    active: {
      light: '#312e81',       // Primary dark
      medium: '#4338ca',
    },

    // Shadows (darker for depth simulation)
    shadow: {
      sm: 'rgba(0, 0, 0, 0.3)',
      DEFAULT: 'rgba(0, 0, 0, 0.4)',
      md: 'rgba(0, 0, 0, 0.5)',
      lg: 'rgba(0, 0, 0, 0.6)',
    },
  },
} as const;

/**
 * Color Usage Examples
 * 
 * Table Header:
 *   Light: bg-[#f9fafb] text-[#374151] border-[#e5e7eb]
 *   Dark: bg-[#1e293b] text-[#f1f5f9] border-[#334155]
 * 
 * Table Rows:
 *   Light: bg-white hover:bg-[#f9fafb] even:bg-[#fafafa]
 *   Dark: bg-[#1e293b] hover:bg-[#334155]
 * 
 * Buttons:
 *   Primary: bg-[#6366f1] hover:bg-[#4f46e5] (light)
 *            bg-[#818cf8] hover:bg-[#6366f1] (dark)
 * 
 * Pagination:
 *   Active: bg-[#6366f1] text-white
 *   Inactive: bg-white border-[#e5e7eb] hover:bg-[#f9fafb]
 * 
 * Sidebar:
 *   Light: bg-white border-[#e5e7eb]
 *   Dark: bg-[#1e293b] border-[#334155]
 * 
 * Filters:
 *   Light: bg-white border-[#e5e7eb] hover:bg-[#f9fafb]
 *   Dark: bg-[#1e293b] border-[#334155] hover:bg-[#334155]
 * 
 * Modal:
 *   Light: bg-white border-[#e5e7eb] shadow-lg
 *   Dark: bg-[#1e293b] border-[#334155] shadow-lg
 */

export type ColorMode = 'light' | 'dark';

export const getColors = (mode: ColorMode = 'light') => {
  return colorPalette[mode];
};

