import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import useSound from 'use-sound';

const AudioContext = createContext();

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};

export const AudioProvider = ({ children }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  // Audio file paths (these would be actual sound files in production)
  const audioFiles = {
    xpGain: '/sounds/xp-gain.mp3',
    runComplete: '/sounds/run-complete.mp3',
    hodlDecision: '/sounds/hodl-decision.mp3',
    moveSelect: '/sounds/move-select.mp3',
    buttonClick: '/sounds/button-click.mp3',
    error: '/sounds/error.mp3',
    success: '/sounds/success.mp3',
    checkpoint: '/sounds/checkpoint.mp3',
    levelUp: '/sounds/level-up.mp3',
    coinCollect: '/sounds/coin-collect.mp3'
  };

  // Create sound hooks with proper volume control
  const [playXpGain] = useSound(audioFiles.xpGain, { 
    volume: isMuted ? 0 : volume,
    interrupt: true 
  });
  
  const [playRunComplete] = useSound(audioFiles.runComplete, { 
    volume: isMuted ? 0 : volume,
    interrupt: true 
  });
  
  const [playHodlDecision] = useSound(audioFiles.hodlDecision, { 
    volume: isMuted ? 0 : volume,
    interrupt: true 
  });
  
  const [playMoveSelect] = useSound(audioFiles.moveSelect, { 
    volume: isMuted ? 0 : volume * 0.5, // Quieter for frequent sounds
    interrupt: true 
  });
  
  const [playButtonClick] = useSound(audioFiles.buttonClick, { 
    volume: isMuted ? 0 : volume * 0.3, // Very quiet for UI sounds
    interrupt: true 
  });
  
  const [playError] = useSound(audioFiles.error, { 
    volume: isMuted ? 0 : volume,
    interrupt: true 
  });
  
  const [playSuccess] = useSound(audioFiles.success, { 
    volume: isMuted ? 0 : volume,
    interrupt: true 
  });
  
  const [playCheckpoint] = useSound(audioFiles.checkpoint, { 
    volume: isMuted ? 0 : volume,
    interrupt: true 
  });
  
  const [playLevelUp] = useSound(audioFiles.levelUp, { 
    volume: isMuted ? 0 : volume,
    interrupt: true 
  });
  
  const [playCoinCollect] = useSound(audioFiles.coinCollect, { 
    volume: isMuted ? 0 : volume,
    interrupt: true 
  });

  // Update volume for all sounds when volume or mute state changes
  useEffect(() => {
    const sounds = [
      playXpGain, playRunComplete, playHodlDecision, playMoveSelect,
      playButtonClick, playError, playSuccess, playCheckpoint,
      playLevelUp, playCoinCollect
    ];
    
    // Note: use-sound doesn't provide direct volume control after initialization
    // In a real implementation, you'd need to reinitialize sounds or use a different library
  }, [volume, isMuted]);

  // Audio control functions
  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const setAudioVolume = useCallback((newVolume) => {
    setVolume(Math.max(0, Math.min(1, newVolume)));
  }, []);

  const toggleAudioEnabled = useCallback(() => {
    setIsAudioEnabled(prev => !prev);
  }, []);

  // Game-specific audio functions
  const playGameSound = useCallback((soundType) => {
    if (!isAudioEnabled || isMuted) return;

    switch (soundType) {
      case 'xpGain':
        playXpGain();
        break;
      case 'runComplete':
        playRunComplete();
        break;
      case 'hodlDecision':
        playHodlDecision();
        break;
      case 'moveSelect':
        playMoveSelect();
        break;
      case 'buttonClick':
        playButtonClick();
        break;
      case 'error':
        playError();
        break;
      case 'success':
        playSuccess();
        break;
      case 'checkpoint':
        playCheckpoint();
        break;
      case 'levelUp':
        playLevelUp();
        break;
      case 'coinCollect':
        playCoinCollect();
        break;
      default:
        console.warn(`Unknown sound type: ${soundType}`);
    }
  }, [
    isAudioEnabled, isMuted, playXpGain, playRunComplete, playHodlDecision,
    playMoveSelect, playButtonClick, playError, playSuccess, playCheckpoint,
    playLevelUp, playCoinCollect
  ]);

  // Preload audio files for better performance
  useEffect(() => {
    if (isAudioEnabled) {
      // Preload audio files
      Object.values(audioFiles).forEach(audioFile => {
        const audio = new Audio(audioFile);
        audio.load();
      });
    }
  }, [isAudioEnabled]);

  const value = {
    isMuted,
    volume,
    isAudioEnabled,
    toggleMute,
    setAudioVolume,
    toggleAudioEnabled,
    playGameSound,
    audioFiles
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
}; 