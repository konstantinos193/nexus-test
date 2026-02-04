# Favicon Setup

## Required
You need to add a square image for the favicon (tab icon) for Martech.

## Steps
1. Create or obtain a square image (recommended sizes: 32x32, 64x64, or 128x128 pixels)
2. Save it as `favicon.ico` in the `public/` directory
3. Or save it as `favicon.png` and update the link in `app/layout.tsx`

## Current Status
- Placeholder file created at `public/favicon.ico`
- Metadata configured in `app/layout.tsx` to use `/favicon.ico`

## Alternative Formats
You can also use:
- `favicon.png` (PNG format)
- `favicon.svg` (SVG format - scalable)

Just update the `icons.icon` path in `app/layout.tsx` accordingly.
