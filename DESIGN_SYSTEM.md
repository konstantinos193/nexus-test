# Design System Documentation
## NFT Launchpad - Homepage Style Guide

This document captures the design approach, style patterns, and visual language used on the homepage (http://localhost:3000/) to guide the creation of wireframes for the `/collections` page.

---

## Design Philosophy

**Dark Mode First**: The entire platform uses a dark theme as the default. This creates a modern, premium feel that's easy on the eyes and aligns with Web3 aesthetics.

**Minimalist with Purpose**: Clean layouts with intentional spacing. Every element serves a purpose - no decorative clutter.

**Web3 Aesthetic**: Uses signature Web3 colors (cyan blue, purple) with subtle glows and gradients to create a futuristic, tech-forward appearance.

**Mobile-First Responsive**: All components are designed mobile-first, then enhanced for larger screens. Touch-friendly interactions and thumb-reach optimization.

---

## Color Palette

### Background Colors
- **Primary Background**: `#0a0a0f` - Deep black, main page background
- **Secondary Background**: `#111118` - Slightly lighter, used for cards and elevated surfaces
- **Tertiary Background**: `#1a1a24` - Even lighter, for nested elements
- **Hover Background**: `#1f1f2e` - Interactive element hover states

### Border Colors
- **Primary Border**: `#252535` - Subtle dark gray for card borders
- **Secondary Border**: `#2a2a3a` - Slightly lighter borders
- **Accent Border**: `#3a3a4a` - For highlighted elements
- **White Border (Overlay)**: `rgba(255, 255, 255, 0.1)` - Subtle white borders on overlays

### Text Colors
- **Primary Text**: `#ffffff` - Pure white for main content
- **Secondary Text**: `rgba(255, 255, 255, 0.7)` - 70% opacity white for less important text
- **Tertiary Text**: `#b8b8c8` - Light gray for metadata
- **Muted Text**: `#8a8a9a` - Even lighter for labels

### Accent Colors
- **Primary Accent (Cyan)**: `#00d4ff` - Web3 signature blue, used for primary actions and highlights
- **Secondary Accent (Purple)**: `#7c3aed` - Purple for secondary actions
- **Success (Green)**: `#10b981` - For "Live" badges and positive states
- **Warning**: `#f59e0b` - Amber for warnings
- **Error**: `#ef4444` - Red for errors

### Gradients
- **Background Gradient**: `linear-gradient(135deg, #0a0a0f 0%, #1a1a24 50%, #111118 100%)` - Subtle diagonal gradient for page backgrounds
- **Accent Gradient**: `linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%)` - Cyan to purple for special elements

---

## Typography

### Font Family
- **Primary**: System sans-serif stack (`ui-sans-serif, system-ui, sans-serif`)
- **Font Smoothing**: Antialiased for crisp rendering on all devices

### Font Sizes (Responsive)
- **Hero Collection Name**: 
  - Mobile: `1.125rem` (18px)
  - Tablet: `1.5rem` (24px)
  - Desktop: `2rem` (32px)
  - Large Desktop: `2.5rem` (40px)

- **Body Text**: `0.875rem` (14px) to `1rem` (16px)
- **Small Text**: `0.75rem` (12px) to `0.8125rem` (13px)
- **Labels**: `0.625rem` (10px) to `0.75rem` (12px) with uppercase and letter-spacing

### Font Weights
- **Bold**: `700` - For headings and important text
- **Semi-Bold**: `600` - For labels and secondary headings
- **Regular**: `400` - Default for body text

### Text Styling Patterns
- **Uppercase Labels**: Used for badges and status indicators with `text-transform: uppercase` and `letter-spacing: 0.05em - 0.1em`
- **Line Heights**: Tight for headings (`1.2`), comfortable for body (`1.5`)

---

## Layout & Spacing

### Container Patterns
- **Max Width**: `1280px` - Content containers have a maximum width for readability
- **Centered**: `margin-left: auto; margin-right: auto` - All containers are centered
- **Padding**: Responsive padding that increases with screen size:
  - Mobile: `0.5rem 1rem` (8px 16px)
  - Tablet: `1rem 1.5rem` (16px 24px)
  - Desktop: `1.25rem 2rem` (20px 32px)

### Grid & Gap Spacing
- **Section Gaps**: `0.5rem` (8px) on mobile, `0.75rem` (12px) on larger screens
- **Component Gaps**: `1rem` (16px) to `1.5rem` (24px) between related elements
- **Internal Padding**: `1rem` to `2rem` depending on component size and screen size

### Border Radius
- **Cards**: `0.5rem` (8px) - Standard rounded corners
- **Buttons**: `0.75rem` (12px) - Slightly more rounded for buttons
- **Badges**: `0.5rem` (8px) - Compact rounded corners
- **Avatars**: `50%` - Perfect circles

---

## Component Patterns

### Hero Carousel (Featured Drops)
**Location**: Top of homepage, full-width banner

**Visual Structure**:
- **Aspect Ratio**: Responsive
  - Mobile: `5:2`
  - Tablet: `21:7`
  - Desktop: `16:5.5`
- **Border**: `1px solid rgba(255, 255, 255, 0.1)` overlay on top
- **Image**: Banner image with `object-fit: cover` on desktop, `contain` on mobile
- **Overlay**: Dark gradient from transparent to `rgba(0, 0, 0, 0.9)` at bottom
- **Content Position**: Bottom-left alignment with padding

**Content Elements**:
- **Collection Name**: Large, bold white text (responsive sizing)
- **Creator Info**: Small text with avatar (16px), "by" label, creator name
- **Live Badge**: Green badge with pulsing dot animation (only for minting collections)
  - Background: `rgba(16, 185, 129, 0.15)`
  - Border: `rgba(16, 185, 129, 0.3)`
  - Text: `#10b981`
  - Glow: `0 0 12px rgba(16, 185, 129, 0.2)`

**Interactions**:
- Auto-play carousel (5 second intervals)
- Pause on hover
- Navigation arrows appear on hover (slide in from sides)
- Touch/swipe support for mobile
- Smooth transitions: `0.5s cubic-bezier(0.4, 0, 0.2, 1)`

**Navigation Buttons**:
- Position: Absolute, centered vertically on left/right
- Size: `3rem × 3rem` (48px)
- Background: `rgba(0, 0, 0, 0.5)` with `backdrop-filter: blur(16px)`
- Border: `1px solid rgba(255, 255, 255, 0.15)`
- Hidden by default, visible on carousel hover
- Slide animation: Transform from `-2rem` to `0` on hover

### Cards
**General Card Pattern**:
- Background: `#111118` (secondary background)
- Border: `1px solid #252535` (primary border)
- Border Radius: `0.5rem` (8px)
- Padding: `1rem` to `1.5rem` depending on content
- Hover Effects: Subtle scale or background color change

### Buttons
**Primary Button**:
- Background: Accent color (cyan or purple)
- Text: White, bold
- Border Radius: `0.75rem` (12px)
- Padding: `0.5rem 1rem` to `0.75rem 1.5rem`
- Hover: Darker shade or slight scale

**Secondary/Outline Button**:
- Background: Transparent or dark
- Border: `1px solid rgba(255, 255, 255, 0.15)`
- Text: White or accent color
- Hover: Background becomes slightly opaque

### Badges & Status Indicators
**Live Badge**:
- Small, compact design
- Green color scheme (`#10b981`)
- Pulsing dot animation
- Uppercase text with letter spacing
- Backdrop blur effect

**Status Badges**:
- Small, rounded corners
- Color-coded by status
- Uppercase text
- Subtle glow/shadow for emphasis

---

## Visual Effects

### Shadows
- **Card Shadow**: `0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)`
- **Large Shadow**: `0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)`
- **Glow Effect**: `0 0 20px rgba(0, 212, 255, 0.3)` - For accent elements
- **Large Glow**: `0 0 40px rgba(0, 212, 255, 0.4)` - For prominent elements

### Backdrop Filters
- **Blur**: `blur(16px)` - Used on overlays and navigation buttons
- **Background**: Semi-transparent dark (`rgba(0, 0, 0, 0.4)` to `rgba(0, 0, 0, 0.7)`)
- Creates frosted glass effect

### Transitions & Animations
- **Standard Transition**: `0.3s ease` - For hover states and interactions
- **Smooth Transition**: `0.5s cubic-bezier(0.4, 0, 0.2, 1)` - For carousel and major movements
- **Pulse Animation**: Used for "Live" indicator dots
- **Scale on Hover**: `transform: scale(1.05)` - Subtle growth on interactive elements

### Image Effects
- **Hover Zoom**: Banner images scale to `1.05` on hover (desktop only)
- **Opacity Change**: Images fade to `0.5` opacity on hover for text readability
- **Object Fit**: `cover` for banners, `contain` for avatars

---

## Responsive Design Breakpoints

### Mobile First Approach
All styles start mobile, then enhance for larger screens.

**Breakpoints**:
- **Mobile**: Default (0px+)
- **Tablet**: `640px` (sm)
- **Desktop**: `768px` (md)
- **Large Desktop**: `1024px` (lg)
- **XL Desktop**: `1280px` (xl)

### Responsive Patterns
- **Typography**: Scales up at each breakpoint
- **Spacing**: Increases with screen size
- **Layout**: Switches from single column to multi-column grids
- **Navigation**: Desktop horizontal nav, mobile bottom nav
- **Images**: Aspect ratios adjust per breakpoint

---

## Header & Navigation

### Desktop Header
- **Height**: Auto, based on content
- **Background**: Transparent or dark with backdrop blur on scroll
- **Layout**: Logo left, nav links center, search + wallet right
- **Active State**: Highlighted link with accent color or underline
- **Scroll Behavior**: Changes appearance when scrolled (adds background/blur)

### Mobile Header
- **Top Bar**: Minimal - logo + search + wallet
- **Collapsible**: Hides when scrolling down, shows when scrolling up
- **Bottom Nav**: Always visible, thumb-friendly
  - 4 main items: Collections, Create, Dashboard, Tools
  - Icons with labels
  - Active state: Top border indicator + scaled icon

### Search
- **Desktop**: Pill-shaped search bar with live dropdown results
- **Mobile**: Icon button that opens overlay with full search interface
- **Style**: Dark background with border, rounded corners

---

## Content Sections

### Section Spacing
- **Between Sections**: `2rem` to `3rem` vertical spacing
- **Section Padding**: Responsive padding matching container pattern
- **Section Background**: Can use gradient background or solid dark

### Grid Layouts
- **Featured Grid**: Responsive grid (1 col mobile, 2-3 cols desktop)
- **Horizontal Scroll**: Used for "Hot Collections" - single row, scrollable
- **Card Grid**: Flexible grid that adapts to screen size

---

## Interactive Elements

### Hover States
- **Cards**: Subtle scale or background change
- **Buttons**: Darker background or border highlight
- **Links**: Color change to accent color
- **Images**: Zoom effect with opacity change

### Focus States
- **Accessibility**: `outline: 2px solid rgba(255, 255, 255, 0.5)` for keyboard navigation
- **Visible**: All interactive elements have clear focus indicators

### Loading States
- **Skeleton**: Dark background with pulse animation
- **Spinner**: Accent-colored loading indicator
- **Placeholder**: Gradient or pattern while content loads

---

## Accessibility

### Motion
- **Reduced Motion**: Respects `prefers-reduced-motion` - disables animations
- **Transitions**: Can be disabled for users who prefer less motion

### Color Contrast
- **Text on Dark**: High contrast (white on dark backgrounds)
- **WCAG AA Compliant**: All text meets minimum contrast ratios

### Keyboard Navigation
- **Focus Indicators**: Clear outlines on all interactive elements
- **Tab Order**: Logical flow through page elements
- **Skip Links**: Available for main content

---

## Design Tokens Summary

### Spacing Scale
- `0.25rem` (4px) - Tight spacing
- `0.5rem` (8px) - Small gaps
- `1rem` (16px) - Standard spacing
- `1.5rem` (24px) - Medium spacing
- `2rem` (32px) - Large spacing
- `3rem` (48px) - Extra large spacing

### Border Radius Scale
- `0.5rem` (8px) - Cards, badges
- `0.75rem` (12px) - Buttons
- `50%` - Circles (avatars)

### Opacity Levels
- `1.0` - Fully opaque (primary text)
- `0.7` - Secondary text
- `0.5` - Tertiary text, hover overlays
- `0.3` - Borders, subtle elements
- `0.15` - Very subtle backgrounds

---

## Banner Image System

### Placeholder Banners
Collections use generated placeholder banners with color palettes:
- Warm sunset/coral: `#2d1b2e` / `#e07a5f`
- Ocean/sky: `#0d3b45` / `#7dd3fc`
- Purple dream: `#3d2463` / `#c77dff`
- Amber/gold: `#3d2c1e` / `#fbbf24`
- Forest/mint: `#1b4332` / `#95d5b2`
- Plum/fuchsia: `#4a1942` / `#f0abfc`

Each collection gets a unique palette based on ID to create visual variety.

---

## Key Design Principles for Collections Page

When creating the `/collections` page wireframe, follow these principles:

1. **Consistent Color Palette**: Use the same dark theme colors throughout
2. **Card-Based Layout**: Collections should be displayed in cards matching the hero card style
3. **Responsive Grid**: Start mobile (1 column), expand to 2-3 columns on desktop
4. **Filtering UI**: Dark background with subtle borders, matching the search bar style
5. **Status Badges**: Use the same "Live" badge style for minting collections
6. **Hover Effects**: Cards should have subtle hover effects (scale, background change)
7. **Spacing**: Follow the spacing scale - generous padding and gaps
8. **Typography**: Use the same font sizes and weights for consistency
9. **Borders**: Subtle borders (`rgba(255, 255, 255, 0.1)`) on cards and containers
10. **Gradients**: Can use subtle background gradients for visual interest

---

## Example Component Structure

### Collection Card (Inferred from Hero)
```
┌─────────────────────────────┐
│  [Banner Image]             │
│  ┌─────────────────────┐   │
│  │ Collection Name     │   │
│  │ by Creator          │   │
│  │ [Live Badge]        │   │
│  └─────────────────────┘   │
└─────────────────────────────┘
```

**Styling**:
- Border radius: `0.5rem`
- Border: `1px solid rgba(255, 255, 255, 0.1)`
- Background: Dark with gradient overlay on image
- Hover: Scale `1.02` and slight background brightening

---

## Notes for Wireframe Creation

1. **Maintain Visual Hierarchy**: Use size, color, and spacing to guide the eye
2. **Consistent Spacing**: Follow the spacing scale religiously
3. **Dark Theme**: Everything should work on dark backgrounds
4. **Mobile First**: Design for mobile, then enhance for desktop
5. **Touch Targets**: Minimum 44px × 44px for interactive elements
6. **Loading States**: Consider skeleton screens for async content
7. **Empty States**: Design for when no collections match filters
8. **Filter UI**: Should match the search bar aesthetic (dark, rounded, subtle borders)

---

*This design system is based on the current homepage implementation at http://localhost:3000/. All patterns, colors, and components documented here are actively used in the production codebase.*
