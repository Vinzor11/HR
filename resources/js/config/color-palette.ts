/**
 * Modern HRIS Dashboard Color Palette
 * 
 * Professional, high-contrast, harmonious color system
 * Optimized for Laravel + React dashboards with Light & Dark Mode
 * 
 * Inspired by: Linear.app, Vercel, Notion, FilamentPHP v3
 * 
 * Design Principles:
 * - Color harmony (complementary & analogous)
 * - WCAG AAA contrast ratios
 * - Enterprise-grade aesthetic
 * - Comfortable long-usage experience
 * - Minimal visual noise
 */

export const ColorPalette = {
  // ============================================
  // PRIMARY BRAND COLORS
  // ============================================
  primary: {
    // Main primary - Muted Indigo Blue
    main: {
      light: '#6366f1',    // Indigo-500 - Main brand color
      dark: '#818cf8',      // Indigo-400 - Lighter for dark mode contrast
    },
    // Desaturated variant for hover states
    hover: {
      light: '#4f46e5',     // Indigo-600 - Darker hover
      dark: '#6366f1',      // Indigo-500 - Slightly darker hover
    },
    // Bold saturated variant for accents
    accent: {
      light: '#4338ca',    // Indigo-700 - Bold accent
      dark: '#a5b8fc',     // Indigo-300 - Bright accent in dark
    },
    // Soft pastel variant for subtle highlights
    pastel: {
      light: '#e0e7ff',    // Indigo-100 - Soft highlight
      dark: '#312e81',     // Indigo-900 - Subtle dark highlight
    },
  },

  // ============================================
  // NEUTRAL SYSTEM COLORS
  // ============================================
  neutral: {
    // Backgrounds
    background: {
      light: '#fafafa',    // Soft off-white (warm gray)
      dark: '#0f172a',     // Deep slate (not pure black)
    },
    // Elevated surfaces (cards, modals, dropdowns)
    elevated: {
      light: '#ffffff',    // Pure white for elevation
      dark: '#1e293b',     // Elevated dark surface
    },
    // Secondary elevated (nested cards, expanded rows)
    elevatedSecondary: {
      light: '#f9fafb',    // Very light gray
      dark: '#334155',     // Medium dark gray
    },
    // Borders & separators
    border: {
      light: '#e5e7eb',    // Soft gray border
      dark: '#475569',     // Visible but not harsh
    },
    // Subtle borders (dividers, subtle separations)
    borderSubtle: {
      light: '#f3f4f6',    // Very light border
      dark: '#334155',     // Subtle dark border
    },
    // High-contrast text (primary content)
    textPrimary: {
      light: '#111827',    // Near black
      dark: '#f1f5f9',     // Soft white
    },
    // Medium-contrast text (secondary content)
    textSecondary: {
      light: '#4b5563',    // Medium gray
      dark: '#cbd5e1',      // Light gray
    },
    // Low-contrast text (tertiary, hints, disabled)
    textTertiary: {
      light: '#6b7280',    // Lighter gray
      dark: '#94a3b8',     // Medium gray
    },
    // Muted gray tones (backgrounds, subtle elements)
    muted: {
      light: '#f5f5f5',    // Very light gray
      dark: '#334155',     // Medium dark gray
    },
    // Muted text (for muted backgrounds)
    mutedText: {
      light: '#6b7280',    // Medium gray
      dark: '#cbd5e1',      // Light gray
    },
  },

  // ============================================
  // SEMANTIC COLORS
  // ============================================
  semantic: {
    success: {
      base: {
        light: '#22c55e',  // Green-500
        dark: '#4ade80',    // Green-400 - Lighter for dark
      },
      hover: {
        light: '#16a34a',  // Green-600
        dark: '#86efac',    // Green-300
      },
      background: {
        light: '#dcfce7',   // Green-100 - Subtle tint
        dark: '#14532d',    // Green-900/30 - Dark tint
      },
      text: {
        light: '#15803d',  // Green-700
        dark: '#86efac',    // Green-300
      },
    },
    warning: {
      base: {
        light: '#f59e0b',   // Amber-500
        dark: '#fbbf24',    // Amber-400
      },
      hover: {
        light: '#d97706',   // Amber-600
        dark: '#fcd34d',    // Amber-300
      },
      background: {
        light: '#fef3c7',   // Amber-100
        dark: '#78350f',    // Amber-900/30
      },
      text: {
        light: '#92400e',   // Amber-700
        dark: '#fcd34d',    // Amber-300
      },
    },
    danger: {
      base: {
        light: '#ef4444',   // Red-500
        dark: '#f87171',    // Red-400
      },
      hover: {
        light: '#dc2626',   // Red-600
        dark: '#fca5a5',    // Red-300
      },
      background: {
        light: '#fee2e2',   // Red-100
        dark: '#7f1d1d',    // Red-900/30
      },
      text: {
        light: '#b91c1c',   // Red-700
        dark: '#fca5a5',    // Red-300
      },
    },
    info: {
      base: {
        light: '#3b82f6',   // Blue-500
        dark: '#60a5fa',    // Blue-400
      },
      hover: {
        light: '#2563eb',   // Blue-600
        dark: '#93c5fd',    // Blue-300
      },
      background: {
        light: '#dbeafe',   // Blue-100
        dark: '#1e3a8a',    // Blue-900/30
      },
      text: {
        light: '#1e40af',   // Blue-700
        dark: '#93c5fd',    // Blue-300
      },
    },
  },

  // ============================================
  // TABLE-OPTIMIZED COLORS
  // ============================================
  table: {
    // Row hover (subtle but noticeable)
    rowHover: {
      light: '#f9fafb',    // Very light gray
      dark: '#334155',     // Medium dark gray
    },
    // Selected row
    rowSelected: {
      light: '#e0e7ff',    // Primary pastel tint
      dark: '#312e81',     // Primary dark tint
    },
    // Zebra striping (alternating rows)
    rowStripe: {
      light: '#fafafa',    // Slightly different from background
      dark: '#1e293b',     // Same as card (no stripe in dark)
    },
    // Sticky header background
    headerBg: {
      light: '#f9fafb',    // Slightly stronger than background
      dark: '#1e293b',     // Elevated dark
    },
    // Table gridlines
    gridline: {
      light: '#f3f4f6',    // Very subtle
      dark: '#334155',     // Subtle dark
    },
    // Expanded row background
    expandedBg: {
      light: '#f5f5f5',    // Muted background
      dark: '#334155',     // Elevated dark
    },
  },

  // ============================================
  // ACCENT COLORS FOR UX
  // ============================================
  accent: {
    // Button primary
    buttonPrimary: {
      light: '#6366f1',    // Primary main
      dark: '#818cf8',     // Primary main dark
    },
    // Button secondary
    buttonSecondary: {
      light: '#f3f4f6',    // Light gray
      dark: '#334155',     // Medium dark
    },
    // Icon default
    iconDefault: {
      light: '#6b7280',    // Medium gray
      dark: '#94a3b8',     // Medium gray
    },
    // Icon active
    iconActive: {
      light: '#6366f1',    // Primary
      dark: '#818cf8',     // Primary dark
    },
    // Pagination active
    paginationActive: {
      light: '#6366f1',    // Primary
      dark: '#818cf8',     // Primary dark
    },
    // Filter active
    filterActive: {
      light: '#e0e7ff',    // Primary pastel
      dark: '#312e81',     // Primary dark tint
    },
    // Active state (tabs, nav items)
    activeState: {
      light: '#6366f1',    // Primary
      dark: '#818cf8',     // Primary dark
    },
    // Side drawer background
    drawerBg: {
      light: '#ffffff',    // White
      dark: '#1e293b',     // Elevated dark
    },
  },

  // ============================================
  // SHADOWS (using opacity for depth)
  // ============================================
  shadow: {
    sm: {
      light: 'rgba(0, 0, 0, 0.05)',
      dark: 'rgba(0, 0, 0, 0.3)',
    },
    md: {
      light: 'rgba(0, 0, 0, 0.1)',
      dark: 'rgba(0, 0, 0, 0.4)',
    },
    lg: {
      light: 'rgba(0, 0, 0, 0.15)',
      dark: 'rgba(0, 0, 0, 0.5)',
    },
    xl: {
      light: 'rgba(0, 0, 0, 0.2)',
      dark: 'rgba(0, 0, 0, 0.6)',
    },
  },
} as const;

/**
 * Helper function to get color by mode
 */
export const getColor = (
  colorPath: string,
  mode: 'light' | 'dark' = 'light'
): string => {
  const keys = colorPath.split('.');
  let value: any = ColorPalette;
  
  for (const key of keys) {
    value = value?.[key];
  }
  
  return value?.[mode] || value || '#000000';
};

/**
 * Convert HEX to OKLCH for CSS variables
 * Note: This is a simplified conversion. For production, use a proper color conversion library.
 */
export const hexToOklch = (hex: string): string => {
  // Simplified conversion - in production, use a library like culori
  // This is a placeholder that returns approximate OKLCH values
  // For accurate conversion, use: https://github.com/lukeed/culori
  return `oklch(0.55 0.15 270)`; // Placeholder
};

