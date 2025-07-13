const { db } = require('../config/database');

/**
 * WebSocket broadcasting utility
 */
function broadcastRunUpdate(eventType, data) {
  if (!global.wsClients) return;

  const message = JSON.stringify({
    type: 'run_update',
    event: eventType,
    data: {
      ...data,
      timestamp: new Date().toISOString()
    }
  });

  let sentCount = 0;
  global.wsClients.forEach(client => {
    try {
      if (client.readyState === 1) { // WebSocket.OPEN
        // Check if client is subscribed to run updates
        if (!client.subscriptions || client.subscriptions.includes('runs') || client.subscriptions.includes('all')) {
          client.send(message);
          sentCount++;
        }
      }
    } catch (error) {
      console.error('❌ WebSocket broadcast error:', error);
    }
  });

  console.log(`📡 Broadcast "${eventType}" to ${sentCount} clients`);
}

/**
 * Broadcast player XP and stats updates
 */
function broadcastXPUpdate(playerAddress, xpData) {
  if (!global.wsClients) return;

  const message = JSON.stringify({
    type: 'xp_update',
    data: {
      playerAddress,
      ...xpData,
      timestamp: new Date().toISOString()
    }
  });

  let sentCount = 0;
  global.wsClients.forEach(client => {
    try {
      if (client.readyState === 1) {
        if (!client.subscriptions || client.subscriptions.includes('xp') || client.subscriptions.includes('all')) {
          client.send(message);
          sentCount++;
        }
      }
    } catch (error) {
      console.error('❌ XP broadcast error:', error);
    }
  });

  console.log(`⭐ XP update broadcast to ${sentCount} clients`);
}

/**
 * Broadcast live replay data
 */
function broadcastReplayUpdate(replayData) {
  if (!global.wsClients) return;

  const message = JSON.stringify({
    type: 'replay_update',
    data: {
      ...replayData,
      timestamp: new Date().toISOString()
    }
  });

  let sentCount = 0;
  global.wsClients.forEach(client => {
    try {
      if (client.readyState === 1) {
        if (!client.subscriptions || client.subscriptions.includes('replay') || client.subscriptions.includes('all')) {
          client.send(message);
          sentCount++;
        }
      }
    } catch (error) {
      console.error('❌ Replay broadcast error:', error);
    }
  });

  console.log(`🎥 Replay update broadcast to ${sentCount} clients`);
}

/**
 * Broadcast global statistics updates
 */
function broadcastStatsUpdate(statsData) {
  if (!global.wsClients) return;

  const message = JSON.stringify({
    type: 'stats_update',
    data: {
      ...statsData,
      timestamp: new Date().toISOString()
    }
  });

  let sentCount = 0;
  global.wsClients.forEach(client => {
    try {
      if (client.readyState === 1) {
        if (!client.subscriptions || client.subscriptions.includes('stats') || client.subscriptions.includes('all')) {
          client.send(message);
          sentCount++;
        }
      }
    } catch (error) {
      console.error('❌ Stats broadcast error:', error);
    }
  });

  console.log(`📊 Stats update broadcast to ${sentCount} clients`);
}

/**
 * Log run events to console and optionally to database
 */
async function logRunEvent(eventType, data) {
  const timestamp = new Date().toISOString();
  
  console.log(`🎮 [${timestamp}] Run Event: ${eventType}`, {
    playerAddress: data.playerAddress,
    cpEarned: data.cpEarned,
    duration: data.duration,
    status: data.status
  });

  // Store event in database for analytics
  try {
    // You can extend this to save detailed event logs
    // await db.saveEventLog({ eventType, data, timestamp });
  } catch (error) {
    console.error('❌ Error saving event log:', error);
  }
}

/**
 * Generate live replay events for Slipnode gameplay
 */
function generateReplayEvent(gameState) {
  return {
    type: 'game_state',
    timestamp: Date.now(),
    playerPosition: gameState.playerPosition,
    ballPositions: gameState.ballPositions,
    score: gameState.score,
    bonuses: gameState.bonuses,
    boostsActive: gameState.boostsActive
  };
}

/**
 * Process and broadcast live game state for replay viewers
 */
function broadcastLiveGameState(playerAddress, gameState) {
  const replayEvent = generateReplayEvent(gameState);
  
  broadcastReplayUpdate({
    playerAddress,
    event: replayEvent,
    isLive: true
  });
}

/**
 * Calculate XP rewards based on run performance
 */
function calculateXPReward(runData) {
  const baseXP = 10;
  const cpMultiplier = Math.floor(runData.cpEarned / 100); // 1 XP per 100 CP
  const durationBonus = Math.floor(runData.duration / 30); // 1 XP per 30 seconds
  const bonusThrowXP = runData.bonusThrowUsed ? 25 : 0;
  const boostXP = runData.boostsUsed.length * 5; // 5 XP per boost used

  return baseXP + cpMultiplier + durationBonus + bonusThrowXP + boostXP;
}

/**
 * Handle run completion with XP and broadcasting
 */
async function handleRunCompletion(runData) {
  try {
    // Calculate XP reward
    const xpEarned = calculateXPReward(runData);
    
    // Broadcast XP update
    broadcastXPUpdate(runData.playerAddress, {
      xpEarned,
      cpEarned: runData.cpEarned,
      dbpMinted: runData.dbpMinted,
      bonusThrowUsed: runData.bonusThrowUsed,
      boostsUsed: runData.boostsUsed
    });

    // Update global stats
    const globalUpdate = {
      totalRuns: '+1',
      totalCP: `+${runData.cpEarned}`,
      totalDBP: `+${runData.dbpMinted}`,
      averageDuration: runData.duration
    };
    
    broadcastStatsUpdate(globalUpdate);

    console.log(`✅ Run completion processed for ${runData.playerAddress}: ${runData.cpEarned} CP, ${runData.dbpMinted} DBP, ${xpEarned} XP`);

  } catch (error) {
    console.error('❌ Error handling run completion:', error);
  }
}

/**
 * WebSocket connection handler utilities
 */
function handleWebSocketConnection(ws, req) {
  const clientInfo = {
    ip: req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
    connectedAt: new Date().toISOString()
  };

  console.log('🔌 New WebSocket connection:', clientInfo);

  // Send connection acknowledgment
  ws.send(JSON.stringify({
    type: 'connection_ack',
    message: 'Connected to HamBaller.xyz live updates',
    availableChannels: ['runs', 'xp', 'replay', 'stats', 'all'],
    clientInfo
  }));

  return clientInfo;
}

/**
 * Heartbeat system for WebSocket connections
 */
function startHeartbeat() {
  setInterval(() => {
    if (!global.wsClients) return;

    const heartbeat = JSON.stringify({
      type: 'heartbeat',
      timestamp: new Date().toISOString(),
      connectedClients: global.wsClients.size
    });

    global.wsClients.forEach(client => {
      try {
        if (client.readyState === 1) {
          client.ping(); // Send WebSocket ping
        }
      } catch (error) {
        console.error('❌ Heartbeat error:', error);
        global.wsClients.delete(client);
      }
    });

  }, 30000); // Every 30 seconds
}

// Start heartbeat system
startHeartbeat();

module.exports = {
  broadcastRunUpdate,
  broadcastXPUpdate,
  broadcastReplayUpdate,
  broadcastStatsUpdate,
  broadcastLiveGameState,
  logRunEvent,
  generateReplayEvent,
  calculateXPReward,
  handleRunCompletion,
  handleWebSocketConnection
};