# Sprite Assets for HamBaller.xyz

This directory contains all visual assets for the game, organized by category for easy management and scalability.

## Directory Structure

```
sprites/
├── player/          # Player character sprites
├── events/          # Event and effect sprites
├── ui/              # User interface sprites
└── background/      # Background and environment sprites
```

## Sprite Categories

### Player Sprites (`player/`)
Character animations and states for the main player.

**Required Files:**
- `idle.png` - Idle animation (4 frames)
- `up.png` - Upward movement (3 frames)
- `down.png` - Downward movement (3 frames)
- `jump.png` - Jumping animation (4 frames)
- `fall.png` - Falling animation (2 frames)

**Specifications:**
- **Size**: 32x32 pixels per frame
- **Format**: PNG with transparency
- **Animation**: Horizontal sprite sheet
- **Color Palette**: Game theme colors (#00ff88, #ff6b35, etc.)

### Event Sprites (`events/`)
Visual effects for game events and milestones.

**Required Files:**
- `checkpoint.png` - Checkpoint reached (6 frames)
- `xp-gain.png` - XP gained (4 frames)
- `coin.png` - Coin collection (8 frames)
- `level-up.png` - Level up celebration (6 frames)
- `hodl.png` - HODL decision (4 frames)
- `climb.png` - CLIMB decision (4 frames)

**Specifications:**
- **Sizes**: 20x20 to 64x64 pixels
- **Format**: PNG with transparency
- **Animation**: Horizontal sprite sheet
- **Effects**: Glow, particle effects

### UI Sprites (`ui/`)
Interface elements and controls.

**Required Files:**
- `button.png` - Button states (3 frames: normal, hover, pressed)
- `progress-bar.png` - Progress bar background
- `health-bar.png` - Health bar background

**Specifications:**
- **Sizes**: 32x32 to 200x16 pixels
- **Format**: PNG with transparency
- **States**: Multiple frames for interactions

### Background Sprites (`background/`)
Environment and decorative elements.

**Required Files:**
- `platform.png` - Platform tiles
- `obstacle.png` - Obstacle elements
- `bg.png` - Background image

**Specifications:**
- **Sizes**: 16x16 to 800x600 pixels
- **Format**: PNG with transparency
- **Tiling**: Seamless for repeated elements

## Technical Specifications

### Image Format
- **Format**: PNG with alpha channel
- **Color Depth**: 32-bit (RGBA)
- **Compression**: Optimized for web

### Sprite Sheets
- **Layout**: Horizontal frame sequence
- **Spacing**: 1-2 pixel gap between frames
- **Alignment**: Top-left origin

### Performance Optimization
- **File Size**: < 100KB per sprite sheet
- **Loading**: Preloaded on app initialization
- **Caching**: Browser cache enabled

## Development Guidelines

### Creating New Sprites
1. Follow the established naming convention
2. Use consistent color palette
3. Maintain proper frame dimensions
4. Test with different backgrounds
5. Optimize file size

### Animation Guidelines
- **Frame Rate**: 60 FPS target
- **Duration**: 0.1-2.0 seconds per animation
- **Looping**: Most animations should loop
- **Transitions**: Smooth between states

### Accessibility
- **Contrast**: High contrast for visibility
- **Size**: Minimum 16x16 pixels for touch targets
- **Color**: Not relying solely on color for information

## Asset Management

### Version Control
- Keep sprite files in version control
- Use descriptive commit messages
- Tag releases with sprite updates

### Backup Strategy
- Maintain source files (PSD, AI, etc.)
- Regular backups of sprite directory
- Cloud storage for source assets

## Integration

### Loading System
Sprites are automatically loaded by the `spriteManager.js` system:

```javascript
import { initializeSpriteSystem } from '../lib/spriteManager';

// Initialize on app startup
await initializeSpriteSystem();
```

### Usage in Components
```javascript
import { renderSprite } from '../lib/spriteManager';

// Render a sprite
renderSprite(ctx, 'player.idle', x, y, {
  scale: 2,
  alpha: 1
});
```

## Future Enhancements

### Planned Features
- **Dynamic Loading**: Load sprites on demand
- **LOD System**: Different quality levels
- **Animation Editor**: Visual animation tool
- **Theme Support**: Multiple visual themes

### Performance Improvements
- **WebP Format**: Smaller file sizes
- **Compression**: Advanced image compression
- **CDN**: Content delivery network
- **Preloading**: Intelligent preloading

## License
Ensure all sprite assets are properly licensed for commercial use. 