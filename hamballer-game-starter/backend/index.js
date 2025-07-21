// Undici polyfill for fetch (fixes TLS/network issues)
const { fetch: undiciFetch } = require('undici');
global.fetch = undiciFetch;
console.log('✅ Undici fetch overridden globally');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { WebSocketServer } = require('ws');
const { createServer } = require('http');
require('dotenv').config();

// Database and blockchain imports
const { db, contracts } = require('./config/database');

const { listenRunCompleted } = require('./listeners/runCompletedListener');
const { retryQueue } = require('./retryQueue');
const { eventRecovery } = require('./eventRecovery');
const { achievementsService } = require('./services/achievementsService');
const { xpVerifierService } = require('./services/xpVerifierService');

// Thirdweb service for contract interactions
let thirdwebService;
try {
  thirdwebService = require('./services/thirdwebService');
} catch (error) {
  console.warn('⚠️ Thirdweb service not available:', error.message);
  thirdwebService = null;
}

// Route imports
const runRoutes = require('./routes/run');
const dashboardRoutes = require('./routes/dashboard');
const dbpPriceRoutes = require('./routes/dbp-price');
const leaderboardRoutes = require('./routes/leaderboard');
const badgesRoutes = require('./routes/badges');
const achievementsRoutes = require('./routes/achievements');

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

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://hamballer.xyz', 'https://app.hamballer.xyz']
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configure axios defaults for timeout handling
const axios = require('axios');
axios.defaults.timeout = 60000; // 60 seconds timeout for all HTTP requests
axios.defaults.headers.common['User-Agent'] = 'HamBaller-Backend/1.0.0';

console.log('⏱️ Axios timeout configured: 60s');
console.log('🌐 User-Agent configured for external requests');

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
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

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      websocket: {
        clients: wsClients.size,
        server: wss.readyState === 1 ? 'running' : 'stopped'
      },
      badgeRetrySystem: badgeRetryStats
    });
  } catch (error) {
    console.error('❌ Health check error:', error.message);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
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
      message: process.env.NODE_ENV === 'production' 
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

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, async () => {
  console.log('🚀 HamBaller.xyz Backend Server Started');
  console.log(`📡 HTTP API: http://${HOST}:${PORT}`);
  console.log(`🔌 WebSocket: ws://${HOST}:${PORT}/socket`);
  console.log(`🎮 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⚡ WebSocket clients: ${wsClients.size}`);
  
  console.log('\n🔧 Initializing Phase 8 Systems...');
  
  // Initialize Thirdweb service
  if (thirdwebService) {
    try {
      await thirdwebService.initialize();
      console.log('✅ Thirdweb service initialized');
      
      // Test Thirdweb contract connection
      if (thirdwebService.isInitialized()) {
        console.log('🔍 Testing Thirdweb contract connection...');
        try {
          const minterAddress = process.env.XPBADGE_MINTER_ADDRESS;
          const hasRole = await thirdwebService.checkMinterRole(minterAddress);
          console.log('✅ Thirdweb contract connection successful');
          console.log(`🎫 MINTER_ROLE status: ${hasRole ? 'Active' : 'Inactive'} for ${minterAddress}`);
        } catch (error) {
          console.warn('⚠️ Thirdweb contract test failed:', error.message);
          if (error.cause) {
            console.warn('   Cause:', error.cause.message);
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to initialize Thirdweb service:', error.message);
      console.error('   Error details:', error.cause || 'No additional details');
      console.error('   Stack:', error.stack?.split('\n').slice(0, 3).join('\n'));
    }
  } else {
    console.log('⚠️ Thirdweb service not available - using fallback contract interactions');
  }

  // Initialize achievements service
  try {
    const achievementsInitialized = await achievementsService.initialize();
    if (achievementsInitialized) {
      console.log('✅ Achievements service initialized');
    } else {
      console.log('⚠️ Achievements service not initialized - limited functionality');
    }
  } catch (error) {
    console.error('❌ Failed to initialize achievements service:', error.message);
  }
  
  // Initialize XPVerifier service
  try {
    const xpVerifierInitialized = await xpVerifierService.initialize();
    if (xpVerifierInitialized) {
      console.log('✅ XPVerifier service initialized');
    } else {
      console.log('⚠️ XPVerifier service not initialized - ZK-proof verification disabled');
    }
  } catch (error) {
    console.error('❌ Failed to initialize XPVerifier service:', error.message);
  }
  
  // Initialize retry queue system
  try {
    const retryQueueInitialized = await retryQueue.initialize();
    if (retryQueueInitialized) {
      console.log('✅ Badge retry queue system initialized');
    } else {
      console.log('⚠️ Badge retry queue system not initialized - limited functionality');
    }
  } catch (error) {
    console.error('❌ Failed to initialize retry queue:', error.message);
  }
  
  // Initialize event recovery system
  try {
    const eventRecoveryInitialized = await eventRecovery.initialize();
    if (eventRecoveryInitialized) {
      console.log('✅ Event recovery system initialized');
      
      // Perform missed event recovery on startup
      console.log('🔍 Starting missed event recovery...');
      await eventRecovery.recoverMissedEvents();
    } else {
      console.log('⚠️ Event recovery system not initialized');
    }
  } catch (error) {
    console.error('❌ Failed to initialize event recovery:', error.message);
  }
  
  // Periodic cleanup of expired ZK-proof claims
  if (xpVerifierService.initialized) {
    setInterval(async () => {
      try {
        await xpVerifierService.cleanupExpiredClaims();
      } catch (error) {
        console.error('❌ Error cleaning up expired claims:', error.message);
      }
    }, 60 * 60 * 1000); // Every hour
  }
  
  // Initialize run completed listener
  console.log('🎧 Starting RunCompleted listener...');
  listenRunCompleted();
  
  console.log('\n✅ All systems initialized');
});

module.exports = { app, server, wss };