import React, { useRef, useEffect, useCallback, memo } from 'react';
import { 
  renderSprite, 
  animationManager, 
  getSpriteKey,
  getSpriteConfig 
} from '../lib/spriteManager';

const SpriteReplayViewer = memo(({ 
  replay, 
  currentFrame, 
  isPlaying, 
  width = 800, 
  height = 600 
}) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const lastTimeRef = useRef(0);

  // Canvas setup and rendering
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;

    // Set canvas style for crisp rendering
    ctx.imageSmoothingEnabled = false;
    ctx.textRenderingOptimization = 'optimizeSpeed';
  }, [width, height]);

  // Render the current frame
  const renderFrame = useCallback((ctx, frameData, frameIndex) => {
    if (!frameData) return;

    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    // Draw background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Draw background elements
    renderBackground(ctx, width, height);

    // Draw game elements
    renderGameElements(ctx, frameData, frameIndex);

    // Draw UI overlay
    renderUIOverlay(ctx, frameData, frameIndex);
  }, [width, height]);

  // Render background elements
  const renderBackground = useCallback((ctx, width, height) => {
    // Draw platforms
    for (let i = 0; i < 5; i++) {
      const x = (width / 6) * (i + 1);
      const y = height - 100 - (i * 50);
      
      renderSprite(ctx, 'background.platform', x, y, {
        scale: 1.5,
        alpha: 0.3
      });
    }

    // Draw obstacles
    const obstacles = [
      { x: width * 0.2, y: height - 150 },
      { x: width * 0.8, y: height - 200 },
      { x: width * 0.5, y: height - 250 }
    ];

    obstacles.forEach(obstacle => {
      renderSprite(ctx, 'background.obstacle', obstacle.x, obstacle.y, {
        scale: 1,
        alpha: 0.6
      });
    });
  }, []);

  // Render game elements
  const renderGameElements = useCallback((ctx, frameData, frameIndex) => {
    if (!frameData) return;

    const centerX = width / 2;
    const centerY = height / 2;

    // Draw player
    renderPlayer(ctx, frameData, centerX, centerY);

    // Draw move indicators
    renderMoveIndicators(ctx, frameData, centerX, centerY);

    // Draw event effects
    renderEventEffects(ctx, frameData, centerX, centerY);

    // Draw score and stats
    renderStats(ctx, frameData);
  }, [width, height]);

  // Render player sprite
  const renderPlayer = useCallback((ctx, frameData, centerX, centerY) => {
    const playerY = centerY - 50 + (frameData.position || 0);
    let playerSprite = 'player.idle';

    // Determine player animation based on move
    if (frameData.move === 'UP') {
      playerSprite = 'player.up';
      animationManager.playAnimation('player.up');
    } else if (frameData.move === 'DOWN') {
      playerSprite = 'player.down';
      animationManager.playAnimation('player.down');
    } else {
      animationManager.playAnimation('player.idle');
    }

    // Render player with glow effect
    ctx.save();
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    renderSprite(ctx, playerSprite, centerX, playerY, {
      scale: 2,
      alpha: 1
    });

    ctx.restore();

    // Draw player trail
    renderPlayerTrail(ctx, centerX, playerY);
  }, []);

  // Render player trail effect
  const renderPlayerTrail = useCallback((ctx, x, y) => {
    ctx.save();
    ctx.globalAlpha = 0.3;
    
    for (let i = 1; i <= 3; i++) {
      const trailY = y + (i * 10);
      const alpha = 0.3 - (i * 0.1);
      ctx.globalAlpha = alpha;
      
      renderSprite(ctx, 'player.idle', x, trailY, {
        scale: 2 - (i * 0.2),
        alpha: alpha
      });
    }
    
    ctx.restore();
  }, []);

  // Render move indicators
  const renderMoveIndicators = useCallback((ctx, frameData, centerX, centerY) => {
    const move = frameData.move;
    if (!move) return;

    const indicatorY = centerY - 150;
    const indicatorX = centerX + (move === 'UP' ? -100 : 100);

    // Draw move arrow
    ctx.save();
    ctx.fillStyle = move === 'UP' ? '#00ff88' : '#ff6b35';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.8;
    
    ctx.fillText(move === 'UP' ? '⬆️' : '⬇️', indicatorX, indicatorY);
    ctx.restore();

    // Draw move text
    ctx.save();
    ctx.fillStyle = move === 'UP' ? '#00ff88' : '#ff6b35';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(move, indicatorX, indicatorY + 40);
    ctx.restore();
  }, []);

  // Render event effects
  const renderEventEffects = useCallback((ctx, frameData, centerX, centerY) => {
    const event = frameData.event;
    if (!event) return;

    const eventY = centerY - 200;
    let eventSprite = null;

    switch (event) {
      case 'checkpoint':
        eventSprite = 'events.checkpoint';
        animationManager.playAnimation('events.checkpoint');
        break;
      case 'xpGain':
        eventSprite = 'events.xpGain';
        animationManager.playAnimation('events.xpGain');
        break;
      case 'coinCollect':
        eventSprite = 'events.coinCollect';
        animationManager.playAnimation('events.coinCollect');
        break;
      case 'levelUp':
        eventSprite = 'events.levelUp';
        animationManager.playAnimation('events.levelUp');
        break;
      default:
        return;
    }

    if (eventSprite) {
      renderSprite(ctx, eventSprite, centerX, eventY, {
        scale: 1.5,
        alpha: 0.9
      });
    }
  }, []);

  // Render stats overlay
  const renderStats = useCallback((ctx, frameData) => {
    // Draw score
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${frameData.score || 0}`, 20, 50);
    ctx.restore();

    // Draw price
    ctx.save();
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Price: $${(frameData.price || 0).toFixed(4)}`, 20, 90);
    ctx.restore();

    // Draw position
    ctx.save();
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Position: ${frameData.position || 0}`, 20, 120);
    ctx.restore();
  }, []);

  // Render UI overlay
  const renderUIOverlay = useCallback((ctx, frameData, frameIndex) => {
    // Draw frame counter
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`Frame: ${frameIndex + 1}`, width - 20, 30);
    ctx.restore();

    // Draw playback status
    if (isPlaying) {
      ctx.save();
      ctx.fillStyle = '#00ff88';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'right';
      ctx.fillText('▶️ Playing', width - 20, 60);
      ctx.restore();
    }
  }, [width, isPlaying]);

  // Animation loop
  const animate = useCallback((currentTime) => {
    if (!lastTimeRef.current) lastTimeRef.current = currentTime;
    const deltaTime = currentTime - lastTimeRef.current;
    lastTimeRef.current = currentTime;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const frameData = replay?.frames?.[currentFrame];

    // Update animations
    animationManager.updateAnimations(deltaTime);

    // Render frame
    renderFrame(ctx, frameData, currentFrame);

    // Continue animation loop
    animationRef.current = requestAnimationFrame(animate);
  }, [replay, currentFrame, renderFrame]);

  // Setup and cleanup
  useEffect(() => {
    setupCanvas();
  }, [setupCanvas]);

  useEffect(() => {
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      // Render static frame when not playing
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const frameData = replay?.frames?.[currentFrame];
        renderFrame(ctx, frameData, currentFrame);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, currentFrame, replay, animate, renderFrame]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="border border-gray-700 rounded-lg bg-gray-900"
        style={{ width, height }}
      />
      
      {/* Loading overlay */}
      {!replay && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 rounded-lg">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">Loading replay...</p>
          </div>
        </div>
      )}
    </div>
  );
});

export default SpriteReplayViewer; 