import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const ReplayViewer = () => {
  const { runId } = useParams();
  const navigate = useNavigate();
  const [replays, setReplays] = useState([]);
  const [selectedReplay, setSelectedReplay] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    fetchReplays();
    if (runId) {
      fetchReplayData(runId);
    }
  }, [runId]);

  useEffect(() => {
    if (isPlaying && selectedReplay?.frames) {
      intervalRef.current = setInterval(() => {
        setCurrentFrame(prev => {
          if (prev >= selectedReplay.frames.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000 / playbackSpeed);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, selectedReplay]);

  const fetchReplays = async () => {
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/run/replays`);
      
      if (response.ok) {
        const data = await response.json();
        setReplays(data.replays || []);
      } else {
        // Mock data for development
        setReplays([
          {
            runId: 'run_001',
            playerAddress: '0x1234...5678',
            finalScore: 8750,
            dbpEarned: 125.5,
            hodlDecision: true,
            success: true,
            createdAt: new Date().toISOString(),
            duration: 45
          },
          {
            runId: 'run_002',
            playerAddress: '0x2345...6789',
            finalScore: 6890,
            dbpEarned: 89.2,
            hodlDecision: false,
            success: true,
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            duration: 32
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching replays:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReplayData = async (replayRunId) => {
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/run/replay/${replayRunId}`);
      
      if (response.ok) {
        const data = await response.json();
        setSelectedReplay(data);
        setCurrentFrame(0);
      } else {
        // Mock replay data
        const mockReplay = {
          runId: replayRunId,
          playerAddress: '0x1234...5678',
          moves: ['UP', 'DOWN', 'UP', 'UP', 'DOWN', 'UP', 'DOWN', 'DOWN', 'UP', 'DOWN'],
          frames: Array.from({ length: 10 }, (_, i) => ({
            frameNumber: i,
            timestamp: Date.now() + (i * 1000),
            price: 0.1234 + (Math.random() - 0.5) * 0.01,
            position: i * 100,
            score: i * 250,
            move: ['UP', 'DOWN', 'UP', 'UP', 'DOWN', 'UP', 'DOWN', 'DOWN', 'UP', 'DOWN'][i],
            event: i === 5 ? 'checkpoint' : i === 9 ? 'end' : 'move'
          })),
          finalScore: 2250,
          dbpEarned: 89.2,
          hodlDecision: false,
          success: true
        };
        setSelectedReplay(mockReplay);
        setCurrentFrame(0);
      }
    } catch (error) {
      console.error('Error fetching replay data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    setCurrentFrame(0);
    setIsPlaying(false);
  };

  const handleFrameSeek = (frameIndex) => {
    setCurrentFrame(frameIndex);
    setIsPlaying(false);
  };

  const handleReplaySelect = (replay) => {
    navigate(`/replay/${replay.runId}`);
  };

  const currentFrameData = selectedReplay?.frames?.[currentFrame];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">📺 Replay Viewer</h1>
        <button
          onClick={fetchReplays}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white px-4 py-2 rounded text-sm transition-colors"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Replay List */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Replays</h3>
            
            {loading ? (
              <div className="text-center py-8 text-gray-400">
                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                Loading...
              </div>
            ) : replays.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <div className="text-2xl mb-2">📺</div>
                <div className="text-sm">No replays available</div>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {replays.map((replay) => (
                  <div
                    key={replay.runId}
                    onClick={() => handleReplaySelect(replay)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedReplay?.runId === replay.runId
                        ? 'bg-blue-500/20 border border-blue-500'
                        : 'bg-gray-700/50 hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm font-mono text-white">
                        #{replay.runId.slice(0, 8)}...
                      </div>
                      <div className={`text-xs px-2 py-1 rounded ${
                        replay.success 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {replay.success ? '✅' : '❌'}
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-300 space-y-1">
                      <div>Score: {replay.finalScore}</div>
                      <div className="text-green-400">+{replay.dbpEarned} DBP</div>
                      <div className="text-gray-400">
                        {new Date(replay.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Replay Viewer */}
        <div className="lg:col-span-3">
          {!selectedReplay ? (
            <div className="bg-gray-800/50 rounded-lg p-12 text-center">
              <div className="text-6xl mb-4">📺</div>
              <h2 className="text-2xl font-bold text-white mb-4">Select a Replay</h2>
              <p className="text-gray-400">
                Choose a replay from the list to watch how the run played out.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Replay Info */}
              <div className="bg-gray-800/50 rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-white">
                    Replay #{selectedReplay.runId.slice(0, 8)}...
                  </h2>
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-300">
                      Player: {selectedReplay.playerAddress.slice(0, 6)}...{selectedReplay.playerAddress.slice(-4)}
                    </div>
                    <div className={`px-3 py-1 rounded text-sm font-medium ${
                      selectedReplay.hodlDecision 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {selectedReplay.hodlDecision ? '💎 HODL' : '🧗 CLIMB'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400">Final Score</div>
                    <div className="text-white font-medium">{selectedReplay.finalScore}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">DBP Earned</div>
                    <div className="text-green-400 font-medium">{selectedReplay.dbpEarned}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Result</div>
                    <div className={selectedReplay.success ? 'text-green-400' : 'text-red-400'}>
                      {selectedReplay.success ? 'Success' : 'Failed'}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">Frame</div>
                    <div className="text-blue-400">{currentFrame + 1}/{selectedReplay.frames?.length || 0}</div>
                  </div>
                </div>
              </div>

              {/* Replay Controls */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={handleRestart}
                      className="bg-gray-600 hover:bg-gray-700 text-white p-2 rounded transition-colors"
                    >
                      ⏮️
                    </button>
                    <button
                      onClick={handlePlayPause}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
                    >
                      {isPlaying ? '⏸️ Pause' : '▶️ Play'}
                    </button>
                    <select
                      value={playbackSpeed}
                      onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                      className="bg-gray-700 text-white rounded px-2 py-1 text-sm"
                    >
                      <option value={0.5}>0.5x</option>
                      <option value={1}>1x</option>
                      <option value={2}>2x</option>
                      <option value={4}>4x</option>
                    </select>
                  </div>

                  {currentFrameData && (
                    <div className="text-sm text-gray-300">
                      Price: ${currentFrameData.price?.toFixed(4)} | 
                      Score: {currentFrameData.score} | 
                      Move: {currentFrameData.move}
                    </div>
                  )}
                </div>

                {/* Timeline */}
                <div className="space-y-2">
                  <input
                    type="range"
                    min={0}
                    max={(selectedReplay.frames?.length || 1) - 1}
                    value={currentFrame}
                    onChange={(e) => handleFrameSeek(Number(e.target.value))}
                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                  />
                  
                  {/* Frame markers */}
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Start</span>
                    <span>Checkpoint</span>
                    <span>End</span>
                  </div>
                </div>
              </div>

              {/* Current Frame Visualization */}
              <div className="bg-gray-800/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Frame {currentFrame + 1}: {currentFrameData?.event || 'Move'}
                </h3>
                
                {currentFrameData ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Game State */}
                    <div className="space-y-4">
                      <div className="bg-gray-700/50 rounded p-4">
                        <div className="text-sm text-gray-400 mb-2">Game State</div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-300">Current Move:</span>
                            <span className={`font-medium ${
                              currentFrameData.move === 'UP' ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {currentFrameData.move === 'UP' ? '⬆️ UP' : '⬇️ DOWN'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">Price:</span>
                            <span className="text-yellow-400 font-mono">
                              ${currentFrameData.price?.toFixed(4)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">Position:</span>
                            <span className="text-blue-400">{currentFrameData.position}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">Score:</span>
                            <span className="text-white font-medium">{currentFrameData.score}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Visual Representation */}
                    <div className="bg-gray-700/50 rounded p-4">
                      <div className="text-sm text-gray-400 mb-2">Move Sequence</div>
                      <div className="grid grid-cols-10 gap-1">
                        {selectedReplay.moves?.map((move, index) => (
                          <div
                            key={index}
                            className={`
                              h-8 rounded flex items-center justify-center text-xs font-medium transition-all
                              ${index <= currentFrame 
                                ? move === 'UP' 
                                  ? 'bg-green-500 text-white' 
                                  : 'bg-red-500 text-white'
                                : 'bg-gray-600 text-gray-400'
                              }
                              ${index === currentFrame ? 'ring-2 ring-yellow-400 scale-110' : ''}
                            `}
                          >
                            {move === 'UP' ? '⬆️' : '⬇️'}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    No frame data available
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReplayViewer;