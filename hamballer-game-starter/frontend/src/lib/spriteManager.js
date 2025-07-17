// Sprite Management System for HamBaller.xyz

// Sprite definitions and configurations
export const SPRITE_CONFIG = {
  // Player avatars
  player: {
    idle: {
      src: '/sprites/player/idle.png',
      frames: 4,
      frameTime: 200,
      width: 32,
      height: 32
    },
    up: {
      src: '/sprites/player/up.png',
      frames: 3,
      frameTime: 150,
      width: 32,
      height: 32
    },
    down: {
      src: '/sprites/player/down.png',
      frames: 3,
      frameTime: 150,
      width: 32,
      height: 32
    },
    jump: {
      src: '/sprites/player/jump.png',
      frames: 4,
      frameTime: 100,
      width: 32,
      height: 32
    },
    fall: {
      src: '/sprites/player/fall.png',
      frames: 2,
      frameTime: 200,
      width: 32,
      height: 32
    }
  },

  // Event icons
  events: {
    checkpoint: {
      src: '/sprites/events/checkpoint.png',
      frames: 6,
      frameTime: 100,
      width: 48,
      height: 48
    },
    xpGain: {
      src: '/sprites/events/xp-gain.png',
      frames: 4,
      frameTime: 150,
      width: 24,
      height: 24
    },
    coinCollect: {
      src: '/sprites/events/coin.png',
      frames: 8,
      frameTime: 80,
      width: 20,
      height: 20
    },
    levelUp: {
      src: '/sprites/events/level-up.png',
      frames: 6,
      frameTime: 120,
      width: 64,
      height: 64
    },
    hodl: {
      src: '/sprites/events/hodl.png',
      frames: 4,
      frameTime: 200,
      width: 32,
      height: 32
    },
    climb: {
      src: '/sprites/events/climb.png',
      frames: 4,
      frameTime: 200,
      width: 32,
      height: 32
    }
  },

  // UI elements
  ui: {
    button: {
      src: '/sprites/ui/button.png',
      frames: 3,
      frameTime: 100,
      width: 64,
      height: 32
    },
    progressBar: {
      src: '/sprites/ui/progress-bar.png',
      frames: 1,
      frameTime: 0,
      width: 200,
      height: 16
    },
    healthBar: {
      src: '/sprites/ui/health-bar.png',
      frames: 1,
      frameTime: 0,
      width: 100,
      height: 12
    }
  },

  // Background elements
  background: {
    platform: {
      src: '/sprites/background/platform.png',
      frames: 1,
      frameTime: 0,
      width: 64,
      height: 16
    },
    obstacle: {
      src: '/sprites/background/obstacle.png',
      frames: 1,
      frameTime: 0,
      width: 32,
      height: 32
    },
    background: {
      src: '/sprites/background/bg.png',
      frames: 1,
      frameTime: 0,
      width: 800,
      height: 600
    }
  }
};

// Sprite preloader
class SpritePreloader {
  constructor() {
    this.loadedSprites = new Map();
    this.loadingPromises = new Map();
  }

  async preloadSprite(spriteKey, config) {
    if (this.loadedSprites.has(spriteKey)) {
      return this.loadedSprites.get(spriteKey);
    }

    if (this.loadingPromises.has(spriteKey)) {
      return this.loadingPromises.get(spriteKey);
    }

    const loadPromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.loadedSprites.set(spriteKey, img);
        this.loadingPromises.delete(spriteKey);
        resolve(img);
      };
      img.onerror = () => {
        this.loadingPromises.delete(spriteKey);
        reject(new Error(`Failed to load sprite: ${spriteKey}`));
      };
      img.src = config.src;
    });

    this.loadingPromises.set(spriteKey, loadPromise);
    return loadPromise;
  }

  async preloadAllSprites() {
    const promises = [];
    
    // Preload all sprite categories
    Object.entries(SPRITE_CONFIG).forEach(([category, sprites]) => {
      Object.entries(sprites).forEach(([spriteName, config]) => {
        const spriteKey = `${category}.${spriteName}`;
        promises.push(this.preloadSprite(spriteKey, config));
      });
    });

    try {
      await Promise.all(promises);
      console.log('All sprites preloaded successfully');
    } catch (error) {
      console.warn('Some sprites failed to load:', error);
    }
  }

  getSprite(spriteKey) {
    return this.loadedSprites.get(spriteKey);
  }

  isLoaded(spriteKey) {
    return this.loadedSprites.has(spriteKey);
  }
}

// Animation manager
class AnimationManager {
  constructor() {
    this.animations = new Map();
    this.frameCounters = new Map();
  }

  createAnimation(spriteKey, config) {
    const animation = {
      spriteKey,
      config,
      currentFrame: 0,
      frameTimer: 0,
      isPlaying: false,
      loop: true
    };

    this.animations.set(spriteKey, animation);
    return animation;
  }

  playAnimation(spriteKey, loop = true) {
    const animation = this.animations.get(spriteKey);
    if (animation) {
      animation.isPlaying = true;
      animation.loop = loop;
      animation.currentFrame = 0;
      animation.frameTimer = 0;
    }
  }

  stopAnimation(spriteKey) {
    const animation = this.animations.get(spriteKey);
    if (animation) {
      animation.isPlaying = false;
    }
  }

  updateAnimations(deltaTime) {
    this.animations.forEach((animation, spriteKey) => {
      if (!animation.isPlaying) return;

      animation.frameTimer += deltaTime;
      if (animation.frameTimer >= animation.config.frameTime) {
        animation.frameTimer = 0;
        animation.currentFrame++;

        if (animation.currentFrame >= animation.config.frames) {
          if (animation.loop) {
            animation.currentFrame = 0;
          } else {
            animation.isPlaying = false;
          }
        }
      }
    });
  }

  getCurrentFrame(spriteKey) {
    const animation = this.animations.get(spriteKey);
    return animation ? animation.currentFrame : 0;
  }

  isPlaying(spriteKey) {
    const animation = this.animations.get(spriteKey);
    return animation ? animation.isPlaying : false;
  }
}

// Create global instances
export const spritePreloader = new SpritePreloader();
export const animationManager = new AnimationManager();

// Utility functions
export const getSpriteConfig = (category, spriteName) => {
  return SPRITE_CONFIG[category]?.[spriteName];
};

export const getSpriteKey = (category, spriteName) => {
  return `${category}.${spriteName}`;
};

// Sprite rendering utilities
export const renderSprite = (ctx, spriteKey, x, y, options = {}) => {
  const sprite = spritePreloader.getSprite(spriteKey);
  if (!sprite) return false;

  const config = getSpriteConfig(...spriteKey.split('.'));
  if (!config) return false;

  const {
    scale = 1,
    rotation = 0,
    alpha = 1,
    frame = animationManager.getCurrentFrame(spriteKey)
  } = options;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(scale, scale);

  const frameWidth = config.width;
  const frameHeight = config.height;
  const sourceX = frame * frameWidth;
  const sourceY = 0;

  ctx.drawImage(
    sprite,
    sourceX, sourceY, frameWidth, frameHeight,
    -frameWidth / 2, -frameHeight / 2, frameWidth, frameHeight
  );

  ctx.restore();
  return true;
};

// Initialize sprite system
export const initializeSpriteSystem = async () => {
  try {
    await spritePreloader.preloadAllSprites();
    
    // Create animations for all sprites
    Object.entries(SPRITE_CONFIG).forEach(([category, sprites]) => {
      Object.entries(sprites).forEach(([spriteName, config]) => {
        const spriteKey = getSpriteKey(category, spriteName);
        animationManager.createAnimation(spriteKey, config);
      });
    });

    return true;
  } catch (error) {
    console.error('Failed to initialize sprite system:', error);
    return false;
  }
}; 