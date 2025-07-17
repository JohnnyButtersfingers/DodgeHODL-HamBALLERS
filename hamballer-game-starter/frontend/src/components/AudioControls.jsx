import React, { memo, useState } from 'react';
import { useAudio } from '../contexts/AudioContext';
import { Volume2, VolumeX, Settings } from 'lucide-react';

const AudioControls = memo(() => {
  const { 
    isMuted, 
    volume, 
    isAudioEnabled, 
    toggleMute, 
    setAudioVolume, 
    toggleAudioEnabled 
  } = useAudio();
  
  const [showSettings, setShowSettings] = useState(false);

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setAudioVolume(newVolume);
  };

  const handleMuteToggle = () => {
    toggleMute();
  };

  const handleAudioToggle = () => {
    toggleAudioEnabled();
  };

  return (
    <div className="relative">
      {/* Audio Toggle Button */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="flex items-center justify-center w-10 h-10 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900"
        aria-label="Audio settings"
        aria-expanded={showSettings}
        aria-controls="audio-settings-panel"
      >
        <Settings className="w-5 h-5 text-gray-300" />
      </button>

      {/* Audio Settings Panel */}
      {showSettings && (
        <div 
          id="audio-settings-panel"
          className="absolute right-0 top-12 w-64 bg-gray-800/95 backdrop-blur-sm border border-gray-700 rounded-lg p-4 shadow-xl z-50"
          role="dialog"
          aria-label="Audio settings"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Audio Settings</h3>
            <button
              onClick={() => setShowSettings(false)}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Close audio settings"
            >
              ×
            </button>
          </div>

          {/* Audio Enable/Disable */}
          <div className="mb-4">
            <label className="flex items-center space-x-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={isAudioEnabled}
                onChange={handleAudioToggle}
                className="w-4 h-4 text-blue-500 bg-gray-700 border-gray-600 rounded focus:ring-blue-400 focus:ring-2"
              />
              <span>Enable Audio</span>
            </label>
          </div>

          {/* Volume Control */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-gray-300">Volume</label>
              <button
                onClick={handleMuteToggle}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
            </div>
            
            <div className="relative">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                disabled={!isAudioEnabled}
                aria-label="Volume control"
                aria-valuemin="0"
                aria-valuemax="1"
                aria-valuenow={isMuted ? 0 : volume}
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0%</span>
                <span>{Math.round((isMuted ? 0 : volume) * 100)}%</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          {/* Sound Categories */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Sound Categories
            </h4>
            <div className="space-y-1 text-xs text-gray-300">
              <div className="flex justify-between">
                <span>Game Events</span>
                <span className="text-green-400">Active</span>
              </div>
              <div className="flex justify-between">
                <span>UI Sounds</span>
                <span className="text-blue-400">30%</span>
              </div>
              <div className="flex justify-between">
                <span>Move Selection</span>
                <span className="text-yellow-400">50%</span>
              </div>
            </div>
          </div>

          {/* Accessibility Note */}
          <div className="mt-4 pt-3 border-t border-gray-700">
            <p className="text-xs text-gray-400">
              Audio settings are saved locally and respect your system's accessibility preferences.
            </p>
          </div>
        </div>
      )}

      {/* Backdrop for closing panel */}
      {showSettings && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setShowSettings(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
});

export default AudioControls; 