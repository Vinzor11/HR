# Audit Logs - Layout & Style Guide

## Overview
The Audit Logs page features a clean, timeline-based design that displays system activity in a chronological, easy-to-read format. The layout emphasizes visual hierarchy and clear information presentation.

## Page Structure

### 1. Header Section
- **Title**: "Audit Logs" (text-xl md:text-2xl, font-semibold)
- **Subtitle**: Shows filtered count vs total entries (text-xs md:text-sm, text-muted-foreground)
- **Layout**: Flex column on mobile, row on desktop with space-between alignment

### 2. Filters Section
- **Container**: 
  - Background: `bg-card`
  - Border: `border border-border`
  - Rounded: `rounded-lg`
  - Padding: `p-4`
  - Layout: Flex column on mobile, row on desktop with gap-4

- **Search Input**:
  - Max width: `max-w-md`
  - Search icon positioned absolutely on left (left-3)
  - Input padding-left: `pl-10` to accommodate icon
  - Placeholder: "Search by description, entity ID, module, or user..."

- **Action Filter**:
  - Select dropdown
  - Width: `w-full sm:w-[180px]`
  - Options: All Actions + unique action types

- **Date Range Filter**:
  - Container: Flex wrap with border and muted background
  - Calendar icon on left
  - Two date inputs (From/To) with labels
  - Labels: Uppercase, tracking-wide, text-xs
  - Divider: Vertical line between From and To (hidden on mobile)

- **Export Button**:
  - Variant: outline
  - Size: sm
  - Icon: Download (h-4 w-4)
  - Disabled when no filtered results

### 3. Logs List Container
- **Outer Container**:
  - Background: `bg-card`
  - Border: `border border-border`
  - Rounded: `rounded-lg`
  - Overflow: `overflow-hidden`

- **Inner Container**:
  - Max width: `max-w-4xl`
  - Centered: `mx-auto`
  - Padding: `p-6`
  - Vertical spacing: `space-y-6`

## Timeline Components

### Date Header
- **Style**:
  - Text size: `text-sm`
  - Font weight: `font-semibold`
  - Color: `text-gray-500`
  
- **Elements**:
  - Green bullet point: `w-2 h-2 rounded-full bg-green-500 mr-2`
  - Date text: Full weekday, month, day, year format
  - Event count: Floated right, shows "X events" or "X event"

### Timeline Group Container
- **Position**: `relative`
- **Spacing**: `space-y-6` between cards
- **Vertical Line**:
  - Position: `absolute left-4`
  - Starts: `top-4`
  - Ends: `bottom-6`
  - Width: `w-0.5` (2px)
  - Color: `bg-gray-200`
  - Only visible when multiple events on same day

### Timeline Card
- **Layout**: Flex row with gap-4
- **Icon Circle**:
  - Size: `w-8 h-8` (32px)
  - Shape: `rounded-full`
  - Display: Flex center
  - Background colors vary by action type:
    - Created: `bg-green-100 text-green-600`
    - Updated: `bg-blue-100 text-blue-600`
    - Deleted: `bg-red-100 text-red-600`
    - Viewed: `bg-gray-100 text-gray-600`
    - Approved: `bg-green-100 text-green-600`
    - Rejected: `bg-red-100 text-red-600`
    - Restored: `bg-purple-100 text-purple-600`
    - Exported: `bg-indigo-100 text-indigo-600`
  - Icon size: 16px

- **Content Card**:
  - Flex: `flex-1`
  - Background: `bg-white`
  - Border: `border border-gray-200`
  - Rounded: `rounded-xl`
  - Shadow: `shadow-sm`
  - Padding: `p-4`
  - Vertical spacing: `space-y-3`

### Header Component (Inside Card)
- **Layout**: Flex row, items-center, justify-between
- **Left Side**:
  - Avatar circle: `w-8 h-8 rounded-full bg-gray-200`
  - User info container with gap-3
  
- **User Name & Action Line**:
  - Font: `text-sm font-semibold text-gray-900`
  - Structure: `{name} {action} {module} {code}`
  - Action text: `text-gray-400 mx-1` (lighter, with horizontal margin)
  - Module text: `text-gray-600 mx-1`
  - Code text: `text-gray-400 mx-1` (if present)

- **Role & Time Line**:
  - Font: `text-xs text-gray-500`
  - Format: `{role} • {time}`
  - Bullet separator: `•`

- **Right Side** (Removed in current design):
  - Previously showed tag badge and code
  - Now integrated into main line

### Change Row Component
- **Layout**: CSS Grid
  - Columns: `grid-cols-[120px_1fr_24px_1fr]`
  - Alignment: `items-center`
  - Gap: `gap-2`
  - Text size: `text-sm`

- **Field Label**:
  - Width: 120px fixed
  - Color: `text-gray-500`
  - Text: Uppercase field name

- **Old Value Box**:
  - Background: `bg-red-50`
  - Text: `text-red-600`
  - Rounded: `rounded`
  - Padding: `px-3 py-1`

- **Arrow Icon**:
  - Size: 14px
  - Color: `text-gray-400`
  - Positioned between old and new values

- **New Value Box**:
  - Background: `bg-green-50`
  - Text: `text-green-600`
  - Rounded: `rounded`
  - Padding: `px-3 py-1`

### Description Card Component
- **Container**:
  - Margin top: `mt-3`
  - Background: `bg-gray-50`
  - Border: `border border-gray-200`
  - Rounded: `rounded-lg`
  - Padding: `p-3`

- **Text**:
  - Size: `text-sm`
  - Color: `text-gray-700`
  - Line height: `leading-relaxed`

## Typography

### Font Sizes
- Page title: `text-xl md:text-2xl`
- Subtitle: `text-xs md:text-sm`
- Date header: `text-sm`
- Card header: `text-sm`
- Role/time: `text-xs`
- Field labels: `text-sm`
- Description: `text-sm`

### Font Weights
- Page title: `font-semibold`
- Date header: `font-semibold`
- User name: `font-semibold`
- Field labels: Normal (uppercase provides emphasis)

### Colors
- Primary text: `text-gray-900`
- Secondary text: `text-gray-500`
- Muted text: `text-gray-400`
- Action text: `text-gray-400`
- Module text: `text-gray-600`
- Old values: `text-red-600`
- New values: `text-green-600`

## Spacing

### Vertical Spacing
- Between date groups: `space-y-6` (24px)
- Between timeline cards: `space-y-6` (24px)
- Inside cards: `space-y-3` (12px)
- Between change rows: `space-y-2` (8px)
- Page sections: `space-y-4 md:space-y-6`

### Horizontal Spacing
- Between icon and card: `gap-4` (16px)
- Between header elements: `gap-3` (12px)
- Between filter elements: `gap-4` (16px)
- In change rows: `gap-2` (8px)
- Text spacing: `mx-1` (4px) between name, action, module, code

### Padding
- Page container: `p-3 md:p-4`
- Filters section: `p-4`
- Logs container: `p-6`
- Cards: `p-4`
- Description cards: `p-3`
- Value boxes: `px-3 py-1`

## Icons

### Icon Sizes
- Timeline icons: 16px (inside 32px circle)
- Filter icons: `h-4 w-4` (16px)
- Arrow in change rows: 14px

### Icon Colors
- Determined by action type background
- Icons inherit text color from their container

## Responsive Design

### Mobile (< 640px)
- Filters stack vertically
- Date inputs stack
- Vertical divider hidden
- Reduced padding: `p-3`
- Smaller text sizes

### Desktop (≥ 640px)
- Filters in horizontal row
- Date inputs side-by-side
- Full padding: `p-4` or `p-6`
- Larger text sizes: `md:text-2xl`

## Visual Hierarchy

1. **Primary**: Date headers with green bullet and event count
2. **Secondary**: Timeline cards with colored icon circles
3. **Tertiary**: User information and action details
4. **Quaternary**: Field change details (old → new values)

## Color Coding

### Action Types
- **Green** (Created, Approved): Positive actions
- **Blue** (Updated): Modification actions
- **Red** (Deleted, Rejected): Destructive actions
- **Purple** (Restored): Recovery actions
- **Gray** (Viewed): Read-only actions
- **Indigo** (Exported): Data export actions

### Value Changes
- **Red background** (`bg-red-50`): Old values (removed/changed from)
- **Green background** (`bg-green-50`): New values (changed to)
- **Red text** (`text-red-600`): Old value text
- **Green text** (`text-green-600`): New value text

## Empty States

### No Logs Found
- Centered layout
- Large icon: `h-12 w-12` with opacity-50
- Message: "No logs found"
- Helper text: "Try adjusting your filters" (when filters active)

## Pagination

### Container
- Border top: `border-t border-border`
- Padding: `px-3 sm:px-6 py-2 sm:py-3`
- Layout: Flex column on mobile, row on desktop

### Elements
- Text: `text-xs sm:text-sm text-muted-foreground`
- Buttons: `h-8 sm:h-9`
- Page numbers: `min-w-[40px]`
- Active page: `bg-primary text-primary-foreground border-primary`

## Accessibility Considerations

- Semantic HTML structure
- Sufficient color contrast
- Clear visual hierarchy
- Readable font sizes
- Touch-friendly button sizes (min 44px)
- Icon + text labels for actions

## Design Principles

1. **Clarity**: Clear visual separation between date groups and events
2. **Consistency**: Uniform card styling and spacing throughout
3. **Scanability**: Easy to scan with date headers and visual markers
4. **Information Density**: Balanced - not too sparse, not too crowded
5. **Visual Feedback**: Color coding provides immediate context
6. **Progressive Disclosure**: Details shown on demand (field changes)
