# Background Assets

This directory contains background images for the HamBaller game.

## Expected Files

The following background images should be placed in this directory:

- `retro_gym.png` - Main game background
- `menu_background.png` - Menu/landing page background
- `game_over.png` - Game over screen background
- `victory.png` - Victory screen background

## Usage

Background images are loaded in the game code using:

```javascript
import bg from '/assets/backgrounds/retro_gym.png';
```

## Image Requirements

- Format: PNG or JPG
- Resolution: 1920x1080 or higher
- Style: Retro/arcade aesthetic
- File size: Optimized for web (under 500KB each)

## Adding New Backgrounds

1. Place the image file in this directory
2. Update the game code to reference the new background
3. Commit and push to deploy with the app 