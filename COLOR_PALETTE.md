# Modern HRIS Dashboard Color Palette

## Overview

This color palette is designed for a professional HR Management System with both Light and Dark modes. It's inspired by Linear.app, Notion, Vercel Dashboard, FilamentPHP v3, and GitHub themes.

## Design Principles

1. **Enterprise-grade aesthetic** - Professional, clean, and modern
2. **Muted, elegant tones** - Not overly saturated, sophisticated
3. **Excellent readability** - High contrast ratios for text
4. **Visual hierarchy** - Clear distinction between elements
5. **Color harmony** - Complementary and analogous relationships
6. **Consistent saturation** - Unified feel across all colors

## Color Palette

### Light Mode

#### Primary Colors (Muted Indigo Blue)
- **Primary 50-900**: Gradient from `#f0f4ff` to `#312e81`
- **Main Primary**: `#6366f1` (Indigo-500)
- **Usage**: Buttons, links, active states, primary actions
- **Rationale**: Blue conveys trust and professionalism, muted tone prevents eye strain

#### Secondary Colors (Muted Emerald Green)
- **Secondary 50-900**: Gradient from `#f0fdf4` to `#14532d`
- **Main Secondary**: `#22c55e` (Green-500)
- **Usage**: Success states, positive actions, complementary accents
- **Rationale**: Green complements blue (complementary), represents success

#### Semantic Colors
- **Success**: `#22c55e` - Positive actions, confirmations
- **Warning**: `#f59e0b` - Cautions, important notices
- **Danger**: `#ef4444` - Errors, destructive actions
- **Info**: `#3b82f6` - Informational messages

#### Neutral Colors
- **Background**: `#fafafa` - Soft off-white (warm gray)
- **Card**: `#ffffff` - Pure white for elevation
- **Border**: `#e5e7eb` - Subtle gray for separation
- **Text Primary**: `#111827` - Near black for maximum readability
- **Text Secondary**: `#4b5563` - Medium gray for hierarchy
- **Text Tertiary**: `#6b7280` - Lighter gray for less important text

#### Table-Specific Colors
- **Header Background**: `#f9fafb` - Slightly stronger than background
- **Row Background**: `#ffffff` - White for clarity
- **Row Hover**: `#f9fafb` - Subtle but noticeable
- **Row Stripe**: `#fafafa` - Very subtle zebra striping
- **Sticky Shadow**: `rgba(0, 0, 0, 0.05)` - Soft shadow for depth

### Dark Mode

#### Primary Colors (Lighter for Dark Mode)
- **Main Primary**: `#818cf8` (Lighter indigo for better contrast)
- **Usage**: Same as light mode but adjusted for dark backgrounds

#### Secondary Colors
- **Main Secondary**: `#4ade80` (Lighter green for dark mode)

#### Semantic Colors
- **Success**: `#4ade80`
- **Warning**: `#fbbf24`
- **Danger**: `#f87171`
- **Info**: `#60a5fa`

#### Neutral Colors
- **Background**: `#0f172a` - Deep slate (not pure black)
- **Card**: `#1e293b` - Elevated card layer
- **Border**: `#475569` - Visible but not harsh
- **Text Primary**: `#f1f5f9` - Soft white (not harsh)
- **Text Secondary**: `#cbd5e1` - Light gray
- **Text Tertiary**: `#94a3b8` - Medium gray

#### Table-Specific Colors
- **Header Background**: `#1e293b` - Elevated from background
- **Row Background**: `#1e293b`
- **Row Hover**: `#334155` - Noticeable but not harsh
- **Sticky Shadow**: `rgba(0, 0, 0, 0.3)` - Stronger shadow for depth

## Usage Examples

### Table Header
```tsx
// Light Mode
className="bg-[#f9fafb] text-[#374151] border-[#e5e7eb]"

// Dark Mode
className="dark:bg-[#1e293b] dark:text-[#f1f5f9] dark:border-[#334155]"
```

### Table Rows
```tsx
// Light Mode
className="bg-white hover:bg-[#f9fafb] even:bg-[#fafafa] border-[#f3f4f6]"

// Dark Mode
className="dark:bg-[#1e293b] dark:hover:bg-[#334155] dark:border-[#334155]"
```

### Primary Button
```tsx
// Light Mode
className="bg-[#6366f1] hover:bg-[#4f46e5] text-white"

// Dark Mode
className="dark:bg-[#818cf8] dark:hover:bg-[#6366f1]"
```

### Card/Modal
```tsx
// Light Mode
className="bg-white border-[#e5e7eb] shadow-lg"

// Dark Mode
className="dark:bg-[#1e293b] dark:border-[#334155]"
```

### Status Badge
```tsx
// Success
className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"

// Warning
className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"

// Danger
className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
```

## Color Harmony Explanation

### Complementary Colors
- **Primary (Blue)** ↔ **Secondary (Green)**: These are complementary colors that create visual interest while maintaining harmony.

### Analogous Colors
- **Blue family**: Primary colors use analogous shades (indigo-400 to indigo-900)
- **Gray family**: Neutrals use analogous warm grays for cohesion

### Saturation Consistency
- All colors maintain similar saturation levels (muted, not vibrant)
- This creates a unified, professional appearance
- Prevents visual fatigue during long data viewing sessions

## Readability & Contrast

### Light Mode
- **Text on Background**: `#111827` on `#fafafa` = 15.8:1 (WCAG AAA)
- **Text on Card**: `#111827` on `#ffffff` = 16.6:1 (WCAG AAA)
- **Primary on White**: `#6366f1` on `#ffffff` = 4.5:1 (WCAG AA)

### Dark Mode
- **Text on Background**: `#f1f5f9` on `#0f172a` = 15.2:1 (WCAG AAA)
- **Text on Card**: `#f1f5f9` on `#1e293b` = 12.1:1 (WCAG AAA)
- **Primary on Dark**: `#818cf8` on `#1e293b` = 4.8:1 (WCAG AA)

## Visual Comfort Features

1. **Soft backgrounds** - Not pure white/black to reduce eye strain
2. **Subtle hover states** - Noticeable but not jarring
3. **Gentle shadows** - Depth without harshness
4. **Muted primaries** - Professional without being overwhelming
5. **Clear hierarchy** - Text sizes and colors guide the eye naturally

