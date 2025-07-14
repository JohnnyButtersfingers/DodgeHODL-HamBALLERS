const EventEmitter = require('events');
const os = require('os');

/**
 * 📊 Performance Monitor for HamBaller Leaderboard System
 * Comprehensive metrics collection and real-time performance tracking
 */
class PerformanceMonitor extends EventEmitter {
  constructor() {
    super();
    
    // Metrics storage
    this.metrics = {
      api: {
        requests: 0,
        totalResponseTime: 0,
        errors: 0,
        activeRequests: 0,
        requestsPerSecond: 0,
        avgResponseTime: 0,
        lastMinuteRequests: [],
        endpoints: {}
      },
      websocket: {
        connections: 0,
        totalConnections: 0,
        messages: 0,
        broadcasts: 0,
        errors: 0,
        avgConnectionTime: 0,
        channels: {
          leaderboard: 0,
          xp: 0,
          all: 0
        }
      },
      leaderboard: {
        queries: 0,
        totalQueryTime: 0,
        avgQueryTime: 0,
        cacheHits: 0,
        cacheMisses: 0,
        updates: 0,
        playersCount: 0,
        topPlayersQueries: 0,
        searchQueries: 0,
        paginationQueries: 0
      },
      database: {
        queries: 0,
        totalQueryTime: 0,
        avgQueryTime: 0,
        errors: 0,
        connectionPool: {
          active: 0,
          idle: 0,
          waiting: 0
        }
      },
      system: {
        cpuUsage: 0,
        memoryUsage: 0,
        uptime: 0,
        loadAverage: [0, 0, 0]
      }
    };

    // Start monitoring intervals
    this.startMonitoring();
  }

  /**
   * Start performance monitoring intervals
   */
  startMonitoring() {
    // Update system metrics every 30 seconds
    setInterval(() => {
      this.updateSystemMetrics();
    }, 30000);

    // Calculate rates every minute
    setInterval(() => {
      this.calculateRates();
    }, 60000);

    // Emit metrics every 10 seconds for real-time monitoring
    setInterval(() => {
      this.emit('metrics', this.getMetrics());
    }, 10000);

    console.log('📊 Performance monitoring started');
  }

  /**
   * Track API request metrics
   */
  trackApiRequest(req, res, responseTime) {
    const endpoint = `${req.method} ${req.route?.path || req.path}`;
    
    this.metrics.api.requests++;
    this.metrics.api.totalResponseTime += responseTime;
    this.metrics.api.avgResponseTime = this.metrics.api.totalResponseTime / this.metrics.api.requests;

    // Track per-endpoint metrics
    if (!this.metrics.api.endpoints[endpoint]) {
      this.metrics.api.endpoints[endpoint] = {
        requests: 0,
        totalResponseTime: 0,
        avgResponseTime: 0,
        errors: 0,
        lastResponse: 0
      };
    }

    const endpointMetrics = this.metrics.api.endpoints[endpoint];
    endpointMetrics.requests++;
    endpointMetrics.totalResponseTime += responseTime;
    endpointMetrics.avgResponseTime = endpointMetrics.totalResponseTime / endpointMetrics.requests;
    endpointMetrics.lastResponse = Date.now();

    // Track errors
    if (res.statusCode >= 400) {
      this.metrics.api.errors++;
      endpointMetrics.errors++;
    }

    // Track requests per minute
    this.metrics.api.lastMinuteRequests.push(Date.now());
    this.metrics.api.lastMinuteRequests = this.metrics.api.lastMinuteRequests.filter(
      timestamp => Date.now() - timestamp < 60000
    );

    // Emit high-level alerts
    if (responseTime > 5000) {
      this.emit('alert', {
        type: 'slow_request',
        endpoint,
        responseTime,
        timestamp: new Date()
      });
    }
  }

  /**
   * Track WebSocket connection metrics
   */
  trackWebSocketConnection(isNew = true) {
    if (isNew) {
      this.metrics.websocket.connections++;
      this.metrics.websocket.totalConnections++;
    } else {
      this.metrics.websocket.connections = Math.max(0, this.metrics.websocket.connections - 1);
    }
  }

  /**
   * Track WebSocket message metrics
   */
  trackWebSocketMessage(type, channel = 'general') {
    this.metrics.websocket.messages++;
    
    if (type === 'broadcast') {
      this.metrics.websocket.broadcasts++;
    }

    if (this.metrics.websocket.channels[channel] !== undefined) {
      this.metrics.websocket.channels[channel]++;
    }
  }

  /**
   * Track WebSocket errors
   */
  trackWebSocketError(error) {
    this.metrics.websocket.errors++;
    
    this.emit('alert', {
      type: 'websocket_error',
      error: error.message,
      timestamp: new Date()
    });
  }

  /**
   * Track leaderboard query metrics
   */
  trackLeaderboardQuery(queryType, queryTime, cached = false) {
    this.metrics.leaderboard.queries++;
    this.metrics.leaderboard.totalQueryTime += queryTime;
    this.metrics.leaderboard.avgQueryTime = this.metrics.leaderboard.totalQueryTime / this.metrics.leaderboard.queries;

    if (cached) {
      this.metrics.leaderboard.cacheHits++;
    } else {
      this.metrics.leaderboard.cacheMisses++;
    }

    // Track specific query types
    switch (queryType) {
      case 'top_players':
        this.metrics.leaderboard.topPlayersQueries++;
        break;
      case 'search':
        this.metrics.leaderboard.searchQueries++;
        break;
      case 'pagination':
        this.metrics.leaderboard.paginationQueries++;
        break;
    }

    // Alert on slow queries
    if (queryTime > 1000) {
      this.emit('alert', {
        type: 'slow_query',
        queryType,
        queryTime,
        timestamp: new Date()
      });
    }
  }

  /**
   * Track leaderboard updates
   */
  trackLeaderboardUpdate() {
    this.metrics.leaderboard.updates++;
  }

  /**
   * Track database metrics
   */
  trackDatabaseQuery(queryTime, isError = false) {
    this.metrics.database.queries++;
    
    if (isError) {
      this.metrics.database.errors++;
    } else {
      this.metrics.database.totalQueryTime += queryTime;
      this.metrics.database.avgQueryTime = this.metrics.database.totalQueryTime / 
        (this.metrics.database.queries - this.metrics.database.errors);
    }
  }

  /**
   * Update system metrics
   */
  updateSystemMetrics() {
    const memUsage = process.memoryUsage();
    
    this.metrics.system = {
      cpuUsage: process.cpuUsage(),
      memoryUsage: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers
      },
      uptime: process.uptime(),
      loadAverage: os.loadavg(),
      freeMemory: os.freemem(),
      totalMemory: os.totalmem(),
      platform: os.platform(),
      architecture: os.arch(),
      nodeVersion: process.version
    };
  }

  /**
   * Calculate performance rates
   */
  calculateRates() {
    // Calculate requests per second
    this.metrics.api.requestsPerSecond = this.metrics.api.lastMinuteRequests.length / 60;

    // Calculate cache hit rate
    const totalCacheRequests = this.metrics.leaderboard.cacheHits + this.metrics.leaderboard.cacheMisses;
    this.metrics.leaderboard.cacheHitRate = totalCacheRequests > 0 ? 
      (this.metrics.leaderboard.cacheHits / totalCacheRequests) * 100 : 0;

    // Calculate error rates
    this.metrics.api.errorRate = this.metrics.api.requests > 0 ? 
      (this.metrics.api.errors / this.metrics.api.requests) * 100 : 0;

    this.metrics.database.errorRate = this.metrics.database.queries > 0 ? 
      (this.metrics.database.errors / this.metrics.database.queries) * 100 : 0;
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      timestamp: new Date(),
      uptime: process.uptime()
    };
  }

  /**
   * Get metrics in Prometheus format
   */
  getPrometheusMetrics() {
    const metrics = this.getMetrics();
    
    return `
# HELP hamballer_api_requests_total Total number of API requests
# TYPE hamballer_api_requests_total counter
hamballer_api_requests_total ${metrics.api.requests}

# HELP hamballer_api_request_duration_ms Average API request duration in milliseconds
# TYPE hamballer_api_request_duration_ms gauge
hamballer_api_request_duration_ms ${metrics.api.avgResponseTime}

# HELP hamballer_api_errors_total Total number of API errors
# TYPE hamballer_api_errors_total counter
hamballer_api_errors_total ${metrics.api.errors}

# HELP hamballer_websocket_connections Current WebSocket connections
# TYPE hamballer_websocket_connections gauge
hamballer_websocket_connections ${metrics.websocket.connections}

# HELP hamballer_websocket_messages_total Total WebSocket messages
# TYPE hamballer_websocket_messages_total counter
hamballer_websocket_messages_total ${metrics.websocket.messages}

# HELP hamballer_leaderboard_queries_total Total leaderboard queries
# TYPE hamballer_leaderboard_queries_total counter
hamballer_leaderboard_queries_total ${metrics.leaderboard.queries}

# HELP hamballer_leaderboard_query_duration_ms Average leaderboard query duration
# TYPE hamballer_leaderboard_query_duration_ms gauge
hamballer_leaderboard_query_duration_ms ${metrics.leaderboard.avgQueryTime}

# HELP hamballer_leaderboard_cache_hit_rate Cache hit rate percentage
# TYPE hamballer_leaderboard_cache_hit_rate gauge
hamballer_leaderboard_cache_hit_rate ${metrics.leaderboard.cacheHitRate || 0}

# HELP hamballer_memory_usage_bytes Memory usage in bytes
# TYPE hamballer_memory_usage_bytes gauge
hamballer_memory_usage_bytes{type="rss"} ${metrics.system.memoryUsage.rss}
hamballer_memory_usage_bytes{type="heap_total"} ${metrics.system.memoryUsage.heapTotal}
hamballer_memory_usage_bytes{type="heap_used"} ${metrics.system.memoryUsage.heapUsed}

# HELP hamballer_uptime_seconds Process uptime in seconds
# TYPE hamballer_uptime_seconds gauge
hamballer_uptime_seconds ${metrics.system.uptime}
    `.trim();
  }

  /**
   * Get health status
   */
  getHealthStatus() {
    const metrics = this.getMetrics();
    const now = Date.now();
    
    const health = {
      status: 'healthy',
      timestamp: new Date(),
      services: {}
    };

    // Check API health
    health.services.api = {
      status: metrics.api.avgResponseTime < 1000 ? 'healthy' : 'degraded',
      avgResponseTime: metrics.api.avgResponseTime,
      errorRate: metrics.api.errorRate,
      requestsPerSecond: metrics.api.requestsPerSecond
    };

    // Check WebSocket health
    health.services.websocket = {
      status: metrics.websocket.errors < 10 ? 'healthy' : 'degraded',
      connections: metrics.websocket.connections,
      errors: metrics.websocket.errors
    };

    // Check leaderboard health
    health.services.leaderboard = {
      status: metrics.leaderboard.avgQueryTime < 500 ? 'healthy' : 'degraded',
      avgQueryTime: metrics.leaderboard.avgQueryTime,
      cacheHitRate: metrics.leaderboard.cacheHitRate
    };

    // Check system health
    const memoryUsagePercent = (metrics.system.memoryUsage.heapUsed / metrics.system.memoryUsage.heapTotal) * 100;
    health.services.system = {
      status: memoryUsagePercent < 80 ? 'healthy' : 'degraded',
      memoryUsagePercent,
      uptime: metrics.system.uptime
    };

    // Overall health status
    const unhealthyServices = Object.values(health.services).filter(s => s.status !== 'healthy');
    if (unhealthyServices.length > 0) {
      health.status = 'degraded';
    }

    return health;
  }

  /**
   * Reset metrics (for testing or periodic resets)
   */
  resetMetrics() {
    const resetTime = new Date();
    
    // Keep cumulative counters but reset averages and rates
    this.metrics.api.avgResponseTime = 0;
    this.metrics.api.requestsPerSecond = 0;
    this.metrics.api.lastMinuteRequests = [];
    
    this.metrics.leaderboard.avgQueryTime = 0;
    this.metrics.database.avgQueryTime = 0;
    
    console.log(`📊 Metrics reset at ${resetTime}`);
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// Middleware for Express to track API requests
function apiTrackingMiddleware(req, res, next) {
  const startTime = Date.now();
  
  // Increment active requests
  performanceMonitor.metrics.api.activeRequests++;
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    performanceMonitor.metrics.api.activeRequests--;
    performanceMonitor.trackApiRequest(req, res, responseTime);
  });
  
  next();
}

module.exports = {
  PerformanceMonitor,
  performanceMonitor,
  apiTrackingMiddleware
};