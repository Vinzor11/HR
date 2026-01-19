# Responsive UI/UX Design Guidelines

A comprehensive guide for designing responsive layouts across desktop, tablet, and mobile devices.

---

## Table of Contents

1. [Breakpoints](#breakpoints)
2. [Layout Principles](#layout-principles)
3. [UX Patterns by Device](#ux-patterns-by-device)
4. [Technical Implementation](#technical-implementation-tailwind-css)
5. [Accessibility Requirements](#accessibility-requirements)
6. [Performance Considerations](#performance-considerations)
7. [Testing Checklist](#testing-checklist)
8. [Design System Tokens](#design-system-tokens)

---

## Breakpoints

| Device | Screen Size | Tailwind Class |
|--------|-------------|----------------|
| **Desktop (Wide)** | ≥1280px | `xl` |
| **Desktop (Standard)** | ≥1024px | `lg` |
| **Tablet** | 768px - 1023px | `md` |
| **Mobile (Large)** | 640px - 767px | `sm` |
| **Mobile (Small)** | <640px | default |

---

## Layout Principles

### Desktop (Wide Screens) - ≥1024px

- ✅ Use multi-column layouts (2-4 columns) to utilize horizontal space
- ✅ Sidebar navigation is preferred (fixed or collapsible)
- ✅ Display data tables with all columns visible
- ✅ Use hover states for interactive elements
- ✅ Cards can be displayed in grid layouts (3-4 per row)
- ✅ Modals can be larger (max-width: 600-800px)
- ✅ Forms can be multi-column where logical
- ✅ Show expanded content without truncation
- ✅ Use whitespace generously for visual breathing room

```
┌─────────────────────────────────────────────────────────────┐
│  Logo    │    Search Bar              │  User Profile      │
├──────────┼──────────────────────────────────────────────────┤
│          │                                                  │
│  Sidebar │    Main Content Area                             │
│   Nav    │    ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│          │    │  Card   │ │  Card   │ │  Card   │          │
│  • Home  │    └─────────┘ └─────────┘ └─────────┘          │
│  • Users │                                                  │
│  • Reports│   ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  • Settings│  │  Card   │ │  Card   │ │  Card   │          │
│          │    └─────────┘ └─────────┘ └─────────┘          │
│          │                                                  │
└──────────┴──────────────────────────────────────────────────┘
```

### Tablet (Medium Screens) - 768px - 1023px

- ✅ Reduce to 2-column layouts maximum
- ✅ Navigation can be a collapsible hamburger OR top horizontal bar
- ✅ Data tables may need horizontal scroll or column prioritization
- ✅ Cards displayed 2 per row
- ✅ Touch targets should be minimum 44x44px
- ✅ Modals should be 80-90% viewport width
- ✅ Forms transition to single column
- ✅ Consider thumb-friendly placement of key actions

```
┌───────────────────────────────────┐
│  ☰  │  Logo  │      │  Profile   │
├─────┴────────┴──────┴────────────┤
│                                   │
│    Main Content Area              │
│    ┌──────────┐ ┌──────────┐     │
│    │   Card   │ │   Card   │     │
│    └──────────┘ └──────────┘     │
│                                   │
│    ┌──────────┐ ┌──────────┐     │
│    │   Card   │ │   Card   │     │
│    └──────────┘ └──────────┘     │
│                                   │
└───────────────────────────────────┘
```

### Mobile (Small Screens) - <768px

- ✅ Single column layouts exclusively
- ✅ Bottom navigation bar for primary actions (thumb zone)
- ✅ Hamburger menu for secondary navigation
- ✅ Full-width cards stacked vertically
- ✅ Data tables transform to card-based lists
- ✅ Modals become full-screen sheets (slide up from bottom)
- ✅ Large touch targets (minimum 48x48px)
- ✅ Sticky headers/footers for key actions
- ✅ Prioritize content hierarchy ruthlessly
- ✅ Use progressive disclosure (show less, reveal on demand)

```
┌─────────────────┐
│  ☰  │  Logo     │
├─────────────────┤
│                 │
│  ┌───────────┐  │
│  │   Card    │  │
│  └───────────┘  │
│                 │
│  ┌───────────┐  │
│  │   Card    │  │
│  └───────────┘  │
│                 │
│  ┌───────────┐  │
│  │   Card    │  │
│  └───────────┘  │
│                 │
├─────────────────┤
│ 🏠  📊  👤  ⚙️  │
└─────────────────┘
```

---

## UX Patterns by Device

### Navigation

| Element | Desktop | Tablet | Mobile |
|---------|---------|--------|--------|
| **Primary Nav** | Sidebar (fixed) | Collapsible sidebar OR top bar | Bottom tab bar + hamburger |
| **Breadcrumbs** | Fully visible | Condensed | Back button only |
| **Secondary Nav** | Mega menus on hover | Dropdown on tap | Full-screen menu overlay |
| **Search** | Always visible in header | Icon that expands | Icon → full-screen search |

### Data Display

| Element | Desktop | Tablet | Mobile |
|---------|---------|--------|--------|
| **Tables** | Full data tables | Scrollable tables | Card-based lists |
| **Editing** | Inline editing | Inline editing | Edit in modal/new screen |
| **Pagination** | Numbers with prev/next | Simplified pagination | Infinite scroll preferred |
| **Charts** | Full charts with legends | Charts with toggleable legends | Simplified or swipeable charts |
| **Lists** | Multi-column lists | 2-column lists | Single column, swipe actions |

### Forms

| Element | Desktop | Tablet | Mobile |
|---------|---------|--------|--------|
| **Layout** | Multi-column possible | Single/dual column | Single column only |
| **Validation** | Inline validation | Inline validation | Top-of-form error summary |
| **Dropdowns** | Custom dropdowns | Custom dropdowns | Native selects or bottom sheets |
| **Date Pickers** | Custom date pickers | Custom date pickers | Native date inputs |
| **File Upload** | Drag & drop zone | Drag & drop zone | Button with native picker |

### Actions & CTAs

| Element | Desktop | Tablet | Mobile |
|---------|---------|--------|--------|
| **Primary Actions** | Buttons in toolbars | Floating action buttons | Sticky bottom CTA bar |
| **Context Menus** | Right-click menus | Long-press menus | Swipe actions or action sheets |
| **Tooltips** | Hover tooltips | Tap-to-reveal tooltips | Info icons with modals |
| **Bulk Actions** | Toolbar above table | Floating toolbar | Bottom action sheet |

---

## Technical Implementation (Tailwind CSS)

### Mobile-First Approach

Always design mobile-first, then enhance for larger screens:

```jsx
// ❌ Wrong: Desktop-first
<div className="w-1/4 sm:w-1/2 xs:w-full">

// ✅ Correct: Mobile-first
<div className="w-full md:w-1/2 lg:w-1/4">
```

### Responsive Grid Layout

```jsx
{/* Responsive card grid */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
  <Card />
  <Card />
  <Card />
  <Card />
</div>
```

### Conditional Rendering by Screen Size

```jsx
{/* Desktop-only sidebar */}
<aside className="hidden lg:block w-64 fixed left-0 top-0 h-screen">
  <DesktopSidebar />
</aside>

{/* Mobile-only bottom navigation */}
<nav className="fixed bottom-0 left-0 right-0 lg:hidden bg-white border-t">
  <MobileBottomNav />
</nav>

{/* Tablet and up: show as table */}
<div className="hidden md:block">
  <DataTable data={data} />
</div>

{/* Mobile: show as cards */}
<div className="block md:hidden">
  <CardList data={data} />
</div>
```

### Responsive Spacing

```jsx
{/* Responsive padding */}
<div className="p-4 md:p-6 lg:p-8 xl:p-10">

{/* Responsive margins */}
<section className="my-8 md:my-12 lg:my-16">

{/* Responsive gaps */}
<div className="flex flex-col gap-4 md:flex-row md:gap-6 lg:gap-8">
```

### Responsive Typography

```jsx
{/* Responsive headings */}
<h1 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold">
  Page Title
</h1>

<h2 className="text-xl md:text-2xl lg:text-3xl font-semibold">
  Section Title
</h2>

<p className="text-sm md:text-base lg:text-lg">
  Body text that scales appropriately
</p>
```

### Responsive Flex Direction

```jsx
{/* Stack on mobile, row on larger screens */}
<div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
  <div>Content Left</div>
  <div>Content Right</div>
</div>
```

### Responsive Container

```jsx
{/* Centered container with responsive max-width */}
<div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
  {/* Content */}
</div>
```

### Common Component Patterns

#### Responsive Modal/Dialog

```jsx
{/* Modal that becomes full-screen on mobile */}
<Dialog>
  <DialogContent className="w-full h-full md:h-auto md:max-w-lg md:rounded-lg">
    {/* Content */}
  </DialogContent>
</Dialog>
```

#### Responsive Sidebar Layout

```jsx
<div className="flex min-h-screen">
  {/* Sidebar - hidden on mobile */}
  <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
    <Sidebar />
  </aside>
  
  {/* Main content - full width on mobile, offset on desktop */}
  <main className="flex-1 lg:pl-64">
    <div className="px-4 py-6 md:px-6 lg:px-8">
      {/* Page content */}
    </div>
  </main>
  
  {/* Mobile bottom nav */}
  <nav className="fixed bottom-0 inset-x-0 lg:hidden">
    <MobileNav />
  </nav>
</div>
```

---

## Accessibility Requirements

### All Devices

| Requirement | Specification |
|-------------|---------------|
| **Touch Targets** | Minimum 44x44px (48x48px preferred on mobile) |
| **Font Sizes** | Minimum 16px base (prevents iOS zoom on input focus) |
| **Contrast Ratios** | 4.5:1 for normal text, 3:1 for large text |
| **Focus States** | Visible on all interactive elements |
| **Reduced Motion** | Respect `prefers-reduced-motion` media query |
| **Orientation** | Support both portrait and landscape |
| **Keyboard Navigation** | Full keyboard accessibility on desktop |
| **Screen Readers** | Proper ARIA labels and semantic HTML |

### Implementation Examples

```jsx
{/* Accessible touch target */}
<button className="min-h-[44px] min-w-[44px] md:min-h-[36px] md:min-w-[36px] p-2">
  <Icon className="w-5 h-5" />
  <span className="sr-only">Button description</span>
</button>

{/* Respect reduced motion preference */}
<div className="transition-transform duration-300 motion-reduce:transition-none motion-reduce:transform-none">
  Animated content
</div>

{/* Focus visible styles */}
<button className="focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
  Focusable button
</button>
```

---

## Performance Considerations

### Mobile-Specific Optimizations

| Optimization | Implementation |
|--------------|----------------|
| **Lazy Loading** | Load images below the fold on demand |
| **Skeleton Loaders** | Show loading states for perceived performance |
| **Bundle Size** | Minimize JavaScript, use code splitting |
| **Network** | Optimize for slow 3G connections |
| **Animations** | Reduce complexity, prefer CSS transforms |
| **Images** | Use responsive images with `srcset` |

```jsx
{/* Lazy loaded image with responsive sizes */}
<img
  src="/image-small.jpg"
  srcSet="/image-small.jpg 640w, /image-medium.jpg 1024w, /image-large.jpg 1920w"
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
  loading="lazy"
  alt="Description"
  className="w-full h-auto"
/>

{/* Skeleton loader */}
<div className="animate-pulse">
  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
</div>
```

### Tablet/Desktop Optimizations

| Optimization | Implementation |
|--------------|----------------|
| **Prefetching** | Prefetch likely next pages |
| **High-res Images** | Use 2x images for retina displays |
| **Complex Animations** | More elaborate animations acceptable |
| **Hover States** | Rich hover interactions |

---

## Testing Checklist

### Breakpoint Testing

- [ ] Test at exact breakpoints: 639px, 640px, 767px, 768px, 1023px, 1024px, 1279px, 1280px
- [ ] Test with actual devices, not just browser resize
- [ ] Test in Chrome DevTools device emulation
- [ ] Test on real iOS devices (Safari)
- [ ] Test on real Android devices (Chrome)

### Interaction Testing

- [ ] Test touch interactions on tablet/mobile
- [ ] Test hover interactions on desktop
- [ ] Test keyboard navigation on desktop
- [ ] Test with mouse and trackpad

### Orientation Testing

- [ ] Test portrait orientation (mobile/tablet)
- [ ] Test landscape orientation (mobile/tablet)
- [ ] Test window resize behavior

### Performance Testing

- [ ] Test with slow network throttling (3G)
- [ ] Test with CPU throttling
- [ ] Measure Largest Contentful Paint (LCP)
- [ ] Measure First Input Delay (FID)
- [ ] Measure Cumulative Layout Shift (CLS)

### Accessibility Testing

- [ ] Test with screen readers (VoiceOver, NVDA)
- [ ] Test zoom levels (up to 200%)
- [ ] Test with keyboard only
- [ ] Test color contrast
- [ ] Test with reduced motion enabled

---

## Design System Tokens

### CSS Custom Properties

```css
:root {
  /* Breakpoints (for reference - use Tailwind classes in practice) */
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
  --breakpoint-2xl: 1536px;
  
  /* Responsive spacing */
  --space-mobile: 16px;
  --space-tablet: 24px;
  --space-desktop: 32px;
  
  /* Container max-widths */
  --container-sm: 640px;
  --container-md: 768px;
  --container-lg: 1024px;
  --container-xl: 1280px;
  --container-2xl: 1536px;
  
  /* Touch targets */
  --touch-target-min: 44px;
  --touch-target-comfortable: 48px;
  
  /* Typography scale */
  --font-size-xs: 0.75rem;    /* 12px */
  --font-size-sm: 0.875rem;   /* 14px */
  --font-size-base: 1rem;     /* 16px */
  --font-size-lg: 1.125rem;   /* 18px */
  --font-size-xl: 1.25rem;    /* 20px */
  --font-size-2xl: 1.5rem;    /* 24px */
  --font-size-3xl: 1.875rem;  /* 30px */
  --font-size-4xl: 2.25rem;   /* 36px */
}
```

### Tailwind Config Extension

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      screens: {
        'xs': '475px',
        // Default Tailwind breakpoints:
        // 'sm': '640px',
        // 'md': '768px',
        // 'lg': '1024px',
        // 'xl': '1280px',
        // '2xl': '1536px',
      },
      spacing: {
        'touch': '44px',
        'touch-comfortable': '48px',
      },
      minHeight: {
        'touch': '44px',
        'touch-comfortable': '48px',
      },
      minWidth: {
        'touch': '44px',
        'touch-comfortable': '48px',
      },
    },
  },
}
```

---

## Quick Reference Card

### Layout Rules

| Screen | Columns | Navigation | Cards/Row | Touch Target |
|--------|---------|------------|-----------|--------------|
| Mobile | 1 | Bottom bar | 1 | 48px |
| Tablet | 2 | Collapsible | 2 | 44px |
| Desktop | 3-4 | Sidebar | 3-4 | 36px |

### Tailwind Responsive Prefixes

```
(none) → Mobile first (< 640px)
sm:    → ≥ 640px
md:    → ≥ 768px
lg:    → ≥ 1024px
xl:    → ≥ 1280px
2xl:   → ≥ 1536px
```

### Golden Rules

1. **Mobile-first**: Always start with mobile styles, then enhance
2. **Content priority**: Most important content first on mobile
3. **Touch-friendly**: Generous touch targets on mobile/tablet
4. **Progressive enhancement**: Add complexity for larger screens
5. **Test real devices**: Emulators don't catch everything
6. **Performance matters**: Mobile users often have slower connections
7. **Accessibility always**: Works for everyone on every device

---

## Resources

- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [MDN Responsive Design](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design)
- [Web.dev Responsive Design](https://web.dev/responsive-web-design-basics/)
- [Material Design Responsive Layout](https://material.io/design/layout/responsive-layout-grid.html)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)

