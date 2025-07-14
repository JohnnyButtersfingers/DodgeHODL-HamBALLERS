const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { WebSocketServer } = require('ws');
const { createServer } = require('http');
require('dotenv').config();
const { listenRunCompleted } = require('./listeners/runCompletedListener');

// Route imports
const runRoutes = require('./routes/run');
const dashboardRoutes = require('./routes/dashboard');
const dbpPriceRoutes = require('./routes/dbp-price');
const leaderboardRoutes = require('./routes/leaderboard');

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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    websocket: {
      clients: wsClients.size,
      server: wss.readyState === 1 ? 'running' : 'stopped'
    }
  });
});

// API Routes
app.use('/api/run', runRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/dbp-price', dbpPriceRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

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
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log('🚀 HamBaller.xyz Backend Server Started');
  console.log(`📡 HTTP API: http://${HOST}:${PORT}`);
  console.log(`🔌 WebSocket: ws://${HOST}:${PORT}/socket`);
  console.log(`🎮 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⚡ WebSocket clients: ${wsClients.size}`);
  listenRunCompleted();
});

module.exports = { app, server, wss };