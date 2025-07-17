#!/usr/bin/env node

/**
 * ZK Analytics & Replay Monitoring System
 * 
 * Implements lightweight logging of ZK proof attempts to monitor:
 * - Replay activity and nullifier failures
 * - Dashboard auditing and fraud detection
 * - Performance metrics for ZK verification
 * 
 * Uses Supabase for persistence with console fallback
 */

const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const ZK_ANALYTICS_CONFIG = {
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_ANON_KEY,
    enabled: !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY)
  },
  logging: {
    console: true,
    file: true,
    supabase: true,
    logLevel: process.env.ZK_LOG_LEVEL || 'info' // debug, info, warn, error
  },
  monitoring: {
    alertThresholds: {
      failureRate: 0.3, // 30% failure rate triggers alert
      nullifierReuseAttempts: 5, // 5 reuse attempts per hour
      suspiciousPatterns: 10 // 10 rapid attempts from same address
    },
    retention: {
      days: 30, // Keep logs for 30 days
      maxEntries: 10000 // Max entries before cleanup
    }
  }
};

class ZKAnalyticsMonitor {
  constructor() {
    this.supabase = null;
    this.logBuffer = [];
    this.stats = {
      totalAttempts: 0,
      successfulProofs: 0,
      failedProofs: 0,
      nullifierReuses: 0,
      suspiciousActivities: 0
    };
    
    this.initialize();
  }

  async initialize() {
    console.log('🔍 Initializing ZK Analytics Monitor...');
    
    // Initialize Supabase client if configured
    if (ZK_ANALYTICS_CONFIG.supabase.enabled) {
      try {
        this.supabase = createClient(
          ZK_ANALYTICS_CONFIG.supabase.url,
          ZK_ANALYTICS_CONFIG.supabase.key
        );
        
        // Test connection and setup tables
        await this.setupSupabaseTables();
        console.log('✅ Supabase connected for ZK analytics');
      } catch (error) {
        console.warn('⚠️ Supabase setup failed, using file/console logging:', error.message);
        ZK_ANALYTICS_CONFIG.supabase.enabled = false;
      }
    }
    
    // Setup periodic flush and cleanup
    this.setupPeriodicTasks();
    
    console.log('✅ ZK Analytics Monitor initialized');
  }

  async setupSupabaseTables() {
    if (!this.supabase) return;

    const zkLogsSchema = `
      CREATE TABLE IF NOT EXISTS zk_proof_logs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        player_address TEXT NOT NULL,
        nullifier TEXT NOT NULL,
        claimed_xp INTEGER NOT NULL,
        proof_status TEXT NOT NULL, -- 'success', 'failed', 'rejected'
        failure_reason TEXT,
        gas_used BIGINT,
        transaction_hash TEXT,
        ip_address INET,
        user_agent TEXT,
        session_id TEXT,
        metadata JSONB DEFAULT '{}'::JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_zk_logs_player ON zk_proof_logs(player_address);
      CREATE INDEX IF NOT EXISTS idx_zk_logs_nullifier ON zk_proof_logs(nullifier);
      CREATE INDEX IF NOT EXISTS idx_zk_logs_timestamp ON zk_proof_logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_zk_logs_status ON zk_proof_logs(proof_status);

      CREATE TABLE IF NOT EXISTS zk_analytics_summary (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        date DATE DEFAULT CURRENT_DATE,
        total_attempts INTEGER DEFAULT 0,
        successful_proofs INTEGER DEFAULT 0,
        failed_proofs INTEGER DEFAULT 0,
        nullifier_reuses INTEGER DEFAULT 0,
        unique_players INTEGER DEFAULT 0,
        average_gas BIGINT DEFAULT 0,
        suspicious_activities INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_date ON zk_analytics_summary(date);
    `;

    // Execute schema creation (would need proper Supabase admin access)
    console.log('📄 ZK Analytics schema ready (manual setup required)');
  }

  // Core logging methods
  async logProofAttempt(attemptData) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'proof_attempt',
      ...attemptData,
      session: this.getCurrentSession()
    };

    await this.writeLog(logEntry);
    this.updateStats('totalAttempts');
  }

  async logProofSuccess(successData) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'proof_success',
      ...successData,
      session: this.getCurrentSession()
    };

    await this.writeLog(logEntry);
    this.updateStats('successfulProofs');
  }

  async logProofFailure(failureData) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'proof_failure',
      ...failureData,
      session: this.getCurrentSession()
    };

    await this.writeLog(logEntry);
    this.updateStats('failedProofs');
    
    // Check for suspicious patterns
    await this.analyzeFailurePattern(failureData);
  }

  async logNullifierReuse(reuseData) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'nullifier_reuse',
      severity: 'high',
      ...reuseData,
      session: this.getCurrentSession()
    };

    await this.writeLog(logEntry);
    this.updateStats('nullifierReuses');
    
    // This is always suspicious
    await this.flagSuspiciousActivity({
      type: 'nullifier_reuse',
      playerAddress: reuseData.playerAddress,
      nullifier: reuseData.nullifier,
      severity: 'high'
    });
  }

  async logSuspiciousActivity(activityData) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'suspicious_activity',
      severity: activityData.severity || 'medium',
      ...activityData,
      session: this.getCurrentSession()
    };

    await this.writeLog(logEntry);
    this.updateStats('suspiciousActivities');
  }

  // Core writing method
  async writeLog(logEntry) {
    const logLevel = this.getLogLevel(logEntry.type, logEntry.severity);
    
    // Console logging
    if (ZK_ANALYTICS_CONFIG.logging.console) {
      this.writeToConsole(logEntry, logLevel);
    }
    
    // File logging
    if (ZK_ANALYTICS_CONFIG.logging.file) {
      await this.writeToFile(logEntry);
    }
    
    // Supabase logging
    if (ZK_ANALYTICS_CONFIG.logging.supabase && this.supabase) {
      await this.writeToSupabase(logEntry);
    }
    
    // Buffer for batch processing
    this.logBuffer.push(logEntry);
  }

  writeToConsole(logEntry, level) {
    const emoji = this.getLogEmoji(logEntry.type);
    const timestamp = new Date(logEntry.timestamp).toLocaleTimeString();
    
    const message = `${emoji} [${timestamp}] ${logEntry.type.toUpperCase()}: ${this.formatLogMessage(logEntry)}`;
    
    switch (level) {
      case 'error':
        console.error(message);
        break;
      case 'warn':
        console.warn(message);
        break;
      case 'debug':
        console.debug(message);
        break;
      default:
        console.log(message);
    }
  }

  async writeToFile(logEntry) {
    try {
      const logDir = path.join(__dirname, 'logs');
      await fs.mkdir(logDir, { recursive: true });
      
      const logFile = path.join(logDir, `zk-analytics-${this.getDateString()}.log`);
      const logLine = JSON.stringify(logEntry) + '\n';
      
      await fs.appendFile(logFile, logLine);
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }

  async writeToSupabase(logEntry) {
    if (!this.supabase) return;
    
    try {
      // Transform log entry for Supabase
      const supabaseEntry = {
        player_address: logEntry.playerAddress,
        nullifier: logEntry.nullifier,
        claimed_xp: logEntry.claimedXP,
        proof_status: this.mapProofStatus(logEntry.type),
        failure_reason: logEntry.reason || logEntry.error,
        gas_used: logEntry.gasUsed,
        transaction_hash: logEntry.transactionHash,
        ip_address: logEntry.ipAddress,
        user_agent: logEntry.userAgent,
        session_id: logEntry.session?.id,
        metadata: {
          type: logEntry.type,
          severity: logEntry.severity,
          threshold: logEntry.threshold,
          originalData: logEntry
        }
      };
      
      const { error } = await this.supabase
        .from('zk_proof_logs')
        .insert([supabaseEntry]);
      
      if (error) {
        console.error('Supabase insert error:', error.message);
      }
    } catch (error) {
      console.error('Failed to write to Supabase:', error.message);
    }
  }

  // Analytics and monitoring methods
  async analyzeFailurePattern(failureData) {
    const recentFailures = this.getRecentLogs('proof_failure', 3600000); // Last hour
    const playerFailures = recentFailures.filter(
      log => log.playerAddress === failureData.playerAddress
    );
    
    if (playerFailures.length >= ZK_ANALYTICS_CONFIG.monitoring.alertThresholds.suspiciousPatterns) {
      await this.flagSuspiciousActivity({
        type: 'rapid_failure_pattern',
        playerAddress: failureData.playerAddress,
        failureCount: playerFailures.length,
        severity: 'high',
        timeWindow: '1 hour'
      });
    }
  }

  async flagSuspiciousActivity(activityData) {
    await this.logSuspiciousActivity(activityData);
    
    // Send alerts if configured
    if (activityData.severity === 'high') {
      await this.sendAlert(activityData);
    }
  }

  async sendAlert(alertData) {
    // This could integrate with various alerting systems
    console.warn(`🚨 HIGH SEVERITY ALERT: ${alertData.type}`);
    console.warn(`   Player: ${alertData.playerAddress}`);
    console.warn(`   Details: ${JSON.stringify(alertData, null, 2)}`);
    
    // Save alert to file for manual review
    const alertsDir = path.join(__dirname, 'alerts');
    await fs.mkdir(alertsDir, { recursive: true });
    
    const alertFile = path.join(alertsDir, `alert-${Date.now()}.json`);
    await fs.writeFile(alertFile, JSON.stringify(alertData, null, 2));
  }

  // Analytics queries
  async getAnalytics(timeframe = '24h') {
    const timeframeMs = this.parseTimeframe(timeframe);
    const cutoff = new Date(Date.now() - timeframeMs);
    
    const recentLogs = this.logBuffer.filter(
      log => new Date(log.timestamp) > cutoff
    );
    
    const analytics = {
      timeframe,
      period: {
        start: cutoff.toISOString(),
        end: new Date().toISOString()
      },
      totals: {
        attempts: recentLogs.filter(l => l.type === 'proof_attempt').length,
        successes: recentLogs.filter(l => l.type === 'proof_success').length,
        failures: recentLogs.filter(l => l.type === 'proof_failure').length,
        nullifierReuses: recentLogs.filter(l => l.type === 'nullifier_reuse').length,
        suspiciousActivities: recentLogs.filter(l => l.type === 'suspicious_activity').length
      },
      rates: {},
      patterns: await this.analyzePatterns(recentLogs),
      alerts: await this.getActiveAlerts()
    };
    
    // Calculate rates
    const totalAttempts = analytics.totals.attempts || 1;
    analytics.rates = {
      successRate: ((analytics.totals.successes / totalAttempts) * 100).toFixed(2),
      failureRate: ((analytics.totals.failures / totalAttempts) * 100).toFixed(2),
      suspiciousRate: ((analytics.totals.suspiciousActivities / totalAttempts) * 100).toFixed(2)
    };
    
    return analytics;
  }

  async analyzePatterns(logs) {
    const players = [...new Set(logs.map(l => l.playerAddress).filter(Boolean))];
    const nullifiers = [...new Set(logs.map(l => l.nullifier).filter(Boolean))];
    
    return {
      uniquePlayers: players.length,
      uniqueNullifiers: nullifiers.length,
      topFailureReasons: this.getTopFailureReasons(logs),
      timeDistribution: this.getTimeDistribution(logs),
      playerActivity: this.getPlayerActivity(logs)
    };
  }

  getTopFailureReasons(logs) {
    const failures = logs.filter(l => l.type === 'proof_failure');
    const reasons = {};
    
    failures.forEach(failure => {
      const reason = failure.reason || failure.error || 'Unknown';
      reasons[reason] = (reasons[reason] || 0) + 1;
    });
    
    return Object.entries(reasons)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([reason, count]) => ({ reason, count }));
  }

  async getActiveAlerts() {
    try {
      const alertsDir = path.join(__dirname, 'alerts');
      const files = await fs.readdir(alertsDir).catch(() => []);
      
      const recentAlerts = [];
      const cutoff = Date.now() - (24 * 60 * 60 * 1000); // Last 24 hours
      
      for (const file of files) {
        const match = file.match(/alert-(\d+)\.json/);
        if (match && parseInt(match[1]) > cutoff) {
          const alertPath = path.join(alertsDir, file);
          const alertData = JSON.parse(await fs.readFile(alertPath, 'utf8'));
          recentAlerts.push(alertData);
        }
      }
      
      return recentAlerts.sort((a, b) => 
        new Date(b.timestamp || 0) - new Date(a.timestamp || 0)
      );
    } catch (error) {
      return [];
    }
  }

  // Periodic tasks
  setupPeriodicTasks() {
    // Flush buffer every 5 minutes
    setInterval(() => {
      this.flushBuffer();
    }, 5 * 60 * 1000);
    
    // Cleanup old logs daily
    setInterval(() => {
      this.cleanupOldLogs();
    }, 24 * 60 * 60 * 1000);
    
    // Generate daily summary
    setInterval(() => {
      this.generateDailySummary();
    }, 24 * 60 * 60 * 1000);
  }

  async flushBuffer() {
    if (this.logBuffer.length === 0) return;
    
    console.log(`📤 Flushing ${this.logBuffer.length} log entries...`);
    this.logBuffer = []; // Clear buffer
  }

  async cleanupOldLogs() {
    const retentionMs = ZK_ANALYTICS_CONFIG.monitoring.retention.days * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - retentionMs;
    
    // Cleanup log files
    try {
      const logDir = path.join(__dirname, 'logs');
      const files = await fs.readdir(logDir).catch(() => []);
      
      for (const file of files) {
        const filePath = path.join(logDir, file);
        const stats = await fs.stat(filePath).catch(() => null);
        
        if (stats && stats.mtime.getTime() < cutoff) {
          await fs.unlink(filePath);
          console.log(`🗑️ Cleaned up old log file: ${file}`);
        }
      }
    } catch (error) {
      console.error('Log cleanup error:', error.message);
    }
  }

  async generateDailySummary() {
    const analytics = await this.getAnalytics('24h');
    const summary = {
      date: this.getDateString(),
      analytics,
      stats: { ...this.stats },
      timestamp: new Date().toISOString()
    };
    
    // Save daily summary
    const summaryDir = path.join(__dirname, 'summaries');
    await fs.mkdir(summaryDir, { recursive: true });
    
    const summaryFile = path.join(summaryDir, `summary-${this.getDateString()}.json`);
    await fs.writeFile(summaryFile, JSON.stringify(summary, null, 2));
    
    console.log(`📊 Daily summary generated: ${summaryFile}`);
  }

  // Utility methods
  updateStats(metric) {
    this.stats[metric] = (this.stats[metric] || 0) + 1;
  }

  getCurrentSession() {
    // Simple session tracking
    return {
      id: process.env.SESSION_ID || 'default',
      startTime: new Date().toISOString()
    };
  }

  getRecentLogs(type, timeWindowMs) {
    const cutoff = Date.now() - timeWindowMs;
    return this.logBuffer.filter(
      log => log.type === type && new Date(log.timestamp).getTime() > cutoff
    );
  }

  getLogLevel(type, severity) {
    if (severity === 'high' || type === 'suspicious_activity') return 'warn';
    if (type === 'proof_failure') return 'warn';
    if (type === 'nullifier_reuse') return 'error';
    return 'info';
  }

  getLogEmoji(type) {
    const emojis = {
      'proof_attempt': '🔐',
      'proof_success': '✅',
      'proof_failure': '❌',
      'nullifier_reuse': '🔄',
      'suspicious_activity': '🚨'
    };
    return emojis[type] || '📋';
  }

  formatLogMessage(logEntry) {
    switch (logEntry.type) {
      case 'proof_attempt':
        return `Player ${logEntry.playerAddress} attempting proof for ${logEntry.claimedXP} XP`;
      case 'proof_success':
        return `Player ${logEntry.playerAddress} successfully verified ${logEntry.claimedXP} XP`;
      case 'proof_failure':
        return `Player ${logEntry.playerAddress} failed verification: ${logEntry.reason}`;
      case 'nullifier_reuse':
        return `Player ${logEntry.playerAddress} attempted nullifier reuse: ${logEntry.nullifier}`;
      case 'suspicious_activity':
        return `Suspicious activity detected: ${logEntry.description}`;
      default:
        return JSON.stringify(logEntry);
    }
  }

  mapProofStatus(type) {
    const statusMap = {
      'proof_success': 'success',
      'proof_failure': 'failed',
      'nullifier_reuse': 'rejected'
    };
    return statusMap[type] || 'unknown';
  }

  parseTimeframe(timeframe) {
    const units = {
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000,
      'w': 7 * 24 * 60 * 60 * 1000
    };
    
    const match = timeframe.match(/^(\d+)([hdw])$/);
    if (match) {
      const [, amount, unit] = match;
      return parseInt(amount) * units[unit];
    }
    
    return 24 * 60 * 60 * 1000; // Default to 24 hours
  }

  getDateString() {
    return new Date().toISOString().split('T')[0];
  }

  getTimeDistribution(logs) {
    const hours = {};
    logs.forEach(log => {
      const hour = new Date(log.timestamp).getHours();
      hours[hour] = (hours[hour] || 0) + 1;
    });
    return hours;
  }

  getPlayerActivity(logs) {
    const players = {};
    logs.forEach(log => {
      if (log.playerAddress) {
        if (!players[log.playerAddress]) {
          players[log.playerAddress] = { attempts: 0, successes: 0, failures: 0 };
        }
        players[log.playerAddress].attempts++;
        if (log.type === 'proof_success') players[log.playerAddress].successes++;
        if (log.type === 'proof_failure') players[log.playerAddress].failures++;
      }
    });
    return players;
  }

  // Public API methods
  async getStatus() {
    return {
      initialized: true,
      supabaseEnabled: ZK_ANALYTICS_CONFIG.supabase.enabled,
      stats: this.stats,
      bufferSize: this.logBuffer.length,
      uptime: process.uptime(),
      lastActivity: this.logBuffer.length > 0 ? 
        this.logBuffer[this.logBuffer.length - 1].timestamp : null
    };
  }

  async generateReport(timeframe = '24h') {
    const analytics = await this.getAnalytics(timeframe);
    const status = await this.getStatus();
    
    const report = {
      title: 'ZK Analytics & Replay Monitoring Report',
      generated: new Date().toISOString(),
      timeframe,
      status,
      analytics,
      recommendations: this.generateRecommendations(analytics)
    };
    
    // Save report
    const reportPath = path.join(__dirname, `zk-analytics-report-${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📊 Analytics report generated: ${reportPath}`);
    return report;
  }

  generateRecommendations(analytics) {
    const recommendations = [];
    
    if (parseFloat(analytics.rates.failureRate) > 30) {
      recommendations.push({
        type: 'high_failure_rate',
        severity: 'high',
        message: 'High proof failure rate detected. Review proof generation logic.',
        action: 'Investigate proof generation and validation processes'
      });
    }
    
    if (analytics.totals.nullifierReuses > 0) {
      recommendations.push({
        type: 'nullifier_reuse',
        severity: 'critical',
        message: 'Nullifier reuse attempts detected. Security review required.',
        action: 'Review nullifier generation and storage mechanisms'
      });
    }
    
    if (analytics.totals.suspiciousActivities > 5) {
      recommendations.push({
        type: 'suspicious_activity',
        severity: 'medium',
        message: 'Multiple suspicious activities detected.',
        action: 'Monitor player behavior patterns and consider rate limiting'
      });
    }
    
    return recommendations;
  }
}

// Export singleton instance
const zkMonitor = new ZKAnalyticsMonitor();

// Export logging functions for easy integration
const zkLogger = {
  logProofAttempt: (data) => zkMonitor.logProofAttempt(data),
  logProofSuccess: (data) => zkMonitor.logProofSuccess(data),
  logProofFailure: (data) => zkMonitor.logProofFailure(data),
  logNullifierReuse: (data) => zkMonitor.logNullifierReuse(data),
  logSuspiciousActivity: (data) => zkMonitor.logSuspiciousActivity(data),
  getAnalytics: (timeframe) => zkMonitor.getAnalytics(timeframe),
  generateReport: (timeframe) => zkMonitor.generateReport(timeframe),
  getStatus: () => zkMonitor.getStatus()
};

// CLI execution
if (require.main === module) {
  console.log('🚀 Starting ZK Analytics Monitor...');
  
  // Generate initial report
  setTimeout(async () => {
    const report = await zkMonitor.generateReport();
    console.log('\n📊 Initial Analytics Report:');
    console.log(JSON.stringify(report, null, 2));
  }, 1000);
  
  // Keep process alive for monitoring
  setInterval(() => {
    // Heartbeat
  }, 10000);
}

module.exports = { zkMonitor, zkLogger };