# Audio Assets for HamBaller.xyz

This directory contains all audio assets for the game. In production, replace these placeholder files with actual sound effects.

## Required Audio Files

### Game Events
- `xp-gain.mp3` - Sound played when player gains XP
- `run-complete.mp3` - Sound played when a run is completed
- `hodl-decision.mp3` - Sound played when making HODL/CLIMB decision
- `checkpoint.mp3` - Sound played when reaching checkpoint
- `level-up.mp3` - Sound played when player levels up
- `coin-collect.mp3` - Sound played when collecting DBP tokens

### UI Sounds
- `move-select.mp3` - Sound played when selecting moves
- `button-click.mp3` - Sound played for UI button clicks
- `success.mp3` - Sound played for successful actions
- `error.mp3` - Sound played for errors or failures

## Audio Specifications

### Format
- **Format**: MP3
- **Bitrate**: 128-192 kbps
- **Sample Rate**: 44.1 kHz
- **Channels**: Mono or Stereo

### Duration Guidelines
- **UI Sounds**: 0.1-0.3 seconds
- **Game Events**: 0.5-2.0 seconds
- **Background Music**: 30-60 seconds (looped)

### Volume Levels
- **UI Sounds**: -20dB to -15dB
- **Game Events**: -15dB to -10dB
- **Background Music**: -25dB to -20dB

## Accessibility Considerations

### Audio Description
- All sounds should be clearly distinguishable
- Avoid sounds that could trigger audio sensitivity
- Provide visual alternatives for all audio cues

### Volume Control
- Respect system volume settings
- Provide individual volume controls
- Support mute functionality

## Implementation Notes

### Preloading
Audio files are preloaded on app initialization for better performance.

### Fallbacks
If audio files fail to load, the game continues without sound effects.

### Mobile Considerations
- Audio may be muted on mobile devices until user interaction
- Consider vibration feedback as audio alternative
- Test on various mobile devices and browsers

## Development

### Adding New Sounds
1. Add the audio file to this directory
2. Update the `audioFiles` object in `AudioContext.jsx`
3. Add the sound type to the `playGameSound` function
4. Test the sound in different game scenarios

### Testing
- Test with different volume levels
- Test with audio disabled
- Test on mobile devices
- Test with screen readers

## License
Ensure all audio assets are properly licensed for commercial use. 