const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { WebSocketServer } = require('ws');
const { createServer } = require('http');
require('dotenv').config();

// Import environment configuration
const { config, validation, printConfigurationStatus } = require('./config/environment');

// Import XPBadge and related services
const { listenRunCompleted } = require('./listeners/runCompletedListener');
const { retryQueue } = require('./retryQueue');
const { eventRecovery } = require('./eventRecovery');
const { achievementsService } = require('./services/achievementsService');
const { xpVerifierService } = require('./services/xpVerifierService');

// Route imports
const runRoutes = require('./routes/run');
const dashboardRoutes = require('./routes/dashboard');
const dbpPriceRoutes = require('./routes/dbp-price');
const leaderboardRoutes = require('./routes/leaderboard');
const badgesRoutes = require('./routes/badges');
const achievementsRoutes = require('./routes/achievements');
const xpRoutes = require('./routes/xp');

// Controllers
const { broadcastUpdate } = require('./controllers/runLogger');

const app = express();
const server = createServer(app);

// WebSocket setup for live updates
const wss = new WebSocketServer({ 
  server,
  path: '/socket',
  clientTracking: true
});

// Store WebSocket clients for broadcasting
const wsClients = new Set();

wss.on('connection', (ws, req) => {
  console.log('🔌 New WebSocket connection from:', req.socket.remoteAddress);
  wsClients.add(ws);

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connection',
    message: 'Connected to HamBaller.xyz live updates',
    timestamp: new Date().toISOString()
  }));

  // Handle client messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('📨 WebSocket message:', message);
      
      // Handle different message types
      switch (message.type) {
        case 'subscribe':
          ws.subscriptions = message.channels || [];
          break;
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          break;
      }
    } catch (error) {
      console.error('❌ WebSocket message error:', error);
    }
  });

  // Clean up on disconnect
  ws.on('close', () => {
    console.log('🔌 WebSocket disconnected');
    wsClients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
    wsClients.delete(ws);
  });
});

// Make WebSocket clients available globally for broadcasting
global.wsClients = wsClients;

// Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "ws:", "https:"],
    },
  },
}));

app.use(cors(config.cors));

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Enhanced health check endpoint with Supabase write verification and badge retry stats
app.get('/health', async (req, res) => {
  try {
    const { db } = require('./config/database');
    
    // Test Supabase write functionality
    const supabaseWriteTest = await db.testSupabaseWrite();
    
    // Get retry queue stats
    const queueStats = retryQueue.getStats();
    
    // Get database stats for error counts
    let badgeRetryStats = {
      queueDepth: queueStats.queueSize || 0,
      processing: queueStats.processing || false,
      initialized: queueStats.initialized || false,
      errorCounts: {
        pending: 0,
        failed: 0,
        abandoned: 0
      }
    };

    if (db) {
      try {
        const { data: errorCounts, error } = await db
          .from('badge_claim_attempts')
          .select('status')
          .in('status', ['pending', 'minting', 'failed', 'abandoned']);

        if (!error && errorCounts) {
          badgeRetryStats.errorCounts = {
            pending: errorCounts.filter(a => a.status === 'pending' || a.status === 'minting').length,
            failed: errorCounts.filter(a => a.status === 'failed').length,
            abandoned: errorCounts.filter(a => a.status === 'abandoned').length
          };
        }
      } catch (dbError) {
        console.warn('⚠️ Could not fetch retry stats for health check:', dbError.message);
      }
    }
    
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: config.server.environment,
      uptime: process.uptime(),
      configuration: {
        supabase: validation.isSupabaseReady(),
        blockchain: validation.isBlockchainReady(),
        contracts: validation.isContractsReady()
      },
      supabase: {
        configured: validation.isSupabaseReady(),
        writeTest: supabaseWriteTest,
        connection: supabaseWriteTest.success ? 'working' : 'failed'
      },
      websocket: {
        clients: wsClients.size,
        server: wss.readyState === 1 ? 'running' : 'stopped'
      },
      badgeRetry: badgeRetryStats,
      system: {
        memory: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform
      }
    };

    // Set appropriate status code based on health
    const statusCode = healthStatus.supabase.writeTest.success ? 200 : 503;
    
    res.status(statusCode).json(healthStatus);
    
  } catch (error) {
    console.error('❌ Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      configuration: {
        supabase: validation.isSupabaseReady(),
        blockchain: validation.isBlockchainReady(),
        contracts: validation.isContractsReady()
      }
    });
  }
});

// Configuration status endpoint
app.get('/api/config/status', (req, res) => {
  res.json({
    server: {
      port: config.server.port,
      host: config.server.host,
      environment: config.server.environment
    },
    supabase: {
      configured: validation.isSupabaseReady(),
      url: config.supabase.url ? 'Set' : 'Not set',
      hasKey: !!config.supabase.anonKey,
      hasServiceKey: !!config.supabase.serviceKey
    },
    blockchain: {
      configured: validation.isBlockchainReady(),
      rpcUrl: config.blockchain.rpcUrl
    },
    contracts: {
      configured: validation.isContractsReady(),
      dbpToken: config.contracts.dbpToken ? 'Set' : 'Not set',
      boostNft: config.contracts.boostNft ? 'Set' : 'Not set',
      hodlManager: config.contracts.hodlManager ? 'Set' : 'Not set'
    }
  });
});

// Test XP update endpoint (for manual testing)
app.post('/api/test/xp-update', async (req, res) => {
  try {
    const { playerAddress, xpEarned, dbpEarned, runId } = req.body;
    
    if (!playerAddress || !xpEarned || !dbpEarned || !runId) {
      return res.status(400).json({
        error: 'Missing required fields: playerAddress, xpEarned, dbpEarned, runId'
      });
    }

    const { db } = require('./config/database');
    const result = await db.updateXP(playerAddress, xpEarned.toString(), dbpEarned.toString(), runId.toString());
    
    res.json({
      success: true,
      message: 'XP update test completed',
      result
    });
    
  } catch (error) {
    console.error('❌ XP update test error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API Routes
app.use('/api/run', runRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/dbp-price', dbpPriceRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/badges', badgesRoutes);
app.use('/api/achievements', achievementsRoutes);
app.use('/api/xp', xpRoutes);

// WebSocket broadcast utility endpoint (for testing)
app.post('/api/broadcast', (req, res) => {
  const { type, data } = req.body;
  
  const message = JSON.stringify({
    type: type || 'update',
    data,
    timestamp: new Date().toISOString()
  });

  let sentCount = 0;
  wsClients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
      sentCount++;
    }
  });

  res.json({
    success: true,
    message: `Broadcast sent to ${sentCount} clients`,
    type,
    data
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  
  res.status(err.status || 500).json({
    error: {
      message: config.server.environment === 'production' 
        ? 'Internal server error' 
        : err.message,
      status: err.status || 500,
      timestamp: new Date().toISOString()
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      message: `Route ${req.originalUrl} not found`,
      status: 404,
      timestamp: new Date().toISOString()
    }
  });
});

// Graceful shutdown
async function gracefulShutdown(signal) {
  console.log(`🛑 ${signal} received, shutting down gracefully`);
  
  try {
    // Shutdown achievements service
    if (achievementsService) {
      console.log('🛑 Shutting down achievements service...');
      // No explicit shutdown needed for achievements service
    }
    
    // Shutdown XPVerifier service
    if (xpVerifierService) {
      console.log('🛑 Shutting down XPVerifier service...');
      xpVerifierService.shutdown();
    }
    
    // Shutdown retry queue
    if (retryQueue) {
      console.log('🛑 Shutting down retry queue...');
      retryQueue.shutdown();
    }
    
    // Stop run completed listener
    const { shutdown: shutdownListener } = require('./listeners/runCompletedListener');
    if (shutdownListener) {
      console.log('🛑 Shutting down run completed listener...');
      shutdownListener();
    }
    
    // Close server
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
    
    // Force exit after 10 seconds
    setTimeout(() => {
      console.log('❌ Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
    
  } catch (error) {
    console.error('❌ Error during shutdown:', error.message);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const PORT = config.server.port;
const HOST = config.server.host;

server.listen(PORT, HOST, async () => {
  console.log('🚀 HamBaller.xyz Backend Server Started');
  console.log(`📡 HTTP API: http://${HOST}:${PORT}`);
  console.log(`🔌 WebSocket: ws://${HOST}:${PORT}/socket`);
  console.log(`🎮 Environment: ${config.server.environment}`);
  console.log(`⚡ WebSocket clients: ${wsClients.size}`);
  
  // Print configuration status
  printConfigurationStatus();
  
  // Initialize RunCompleted listener if blockchain is configured
  if (validation.isBlockchainReady() && validation.isContractsReady()) {
    const { listenRunCompleted } = require('./listeners/runCompletedListener');
    listenRunCompleted();
  } else {
    console.log('🎧 RunCompleted listener not configured - missing blockchain or contract configuration');
  }
});

module.exports = { app, server, wss };