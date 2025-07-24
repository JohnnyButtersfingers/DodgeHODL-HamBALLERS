# Frontend Assets Directory

## Background Assets

This directory contains static assets for the HamBaller.xyz game interface.

### Required Background Assets

The following background assets must be placed in `public/assets/backgrounds/`:

#### 1. Main Game Background
- **Filename**: `game-background.png` or `game-background.webp`
- **Resolution**: 1920x1080 (Full HD) minimum
- **Format**: PNG or WebP (preferred for better compression)
- **Usage**: Primary background for the game interface
- **Design**: Should match the retro-gaming aesthetic with neon accents

#### 2. Landing Page Background
- **Filename**: `landing-background.png` or `landing-background.webp`
- **Resolution**: 1920x1080 minimum, responsive friendly
- **Format**: PNG or WebP
- **Usage**: Hero section background for the landing page
- **Design**: Eye-catching, gaming-focused with brand colors

#### 3. Dashboard Background
- **Filename**: `dashboard-background.png` or `dashboard-background.webp`
- **Resolution**: 1920x1080 minimum
- **Format**: PNG or WebP
- **Usage**: Background for player dashboard and stats
- **Design**: Subtle, not overwhelming the UI elements

#### 4. Mobile Background (Optional)
- **Filename**: `mobile-background.png` or `mobile-background.webp`
- **Resolution**: 750x1334 (optimized for mobile)
- **Format**: PNG or WebP
- **Usage**: Mobile-optimized background variant
- **Design**: Simpler version suitable for smaller screens

### Color Palette Integration

All background assets should incorporate the HamBaller.xyz brand colors:
- **Retro Red**: #FF4B4B
- **Arcade Blue**: #3B82F6
- **Neon Yellow**: #FFD700
- **80s Purple**: #A855F7
- **Fresh Green**: #22C55E
- **Cheese Orange**: #FB923C
- **Cloud White**: #FFFFFF
- **Retro Black**: #18181B
- **Soft Grey**: #E4E4E7

### Asset Requirements

1. **File Size**: Keep individual assets under 500KB for optimal loading
2. **Responsiveness**: Assets should work well across different screen sizes
3. **Accessibility**: Ensure sufficient contrast for overlaid UI elements
4. **Performance**: WebP format preferred for better compression
5. **Fallbacks**: Provide PNG fallbacks for older browser support

### Usage in Code

Background assets will be referenced in CSS/JavaScript as:
```css
background-image: url('/assets/backgrounds/game-background.webp');
```

### Asset Status

- ❌ **game-background.webp**: Missing - Primary game interface background
- ❌ **landing-background.webp**: Missing - Landing page hero background  
- ❌ **dashboard-background.webp**: Missing - Dashboard background
- ❌ **mobile-background.webp**: Missing - Mobile-optimized background

### Integration Notes

Once assets are added:
1. Update CSS files to reference the new background images
2. Implement responsive loading for different screen sizes
3. Add fallback handling for missing assets
4. Test visual hierarchy with overlaid UI elements
5. Verify performance impact and optimize if needed

### Development Guidelines

- Test all backgrounds with the existing UI components
- Ensure text readability over background images
- Validate responsive behavior across devices
- Check loading performance and optimize file sizes
- Maintain visual consistency with the overall design system