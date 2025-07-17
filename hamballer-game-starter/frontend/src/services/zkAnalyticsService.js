/**
 * ZK Analytics Service
 * 
 * Frontend interface for ZK proof analytics and monitoring
 * Connects to backend ZK analytics endpoints and provides
 * real-time monitoring data for the launch dashboard
 */

import { apiFetch } from './useApiService';

class ZKAnalyticsService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 30000; // 30 seconds cache
  }

  /**
   * Get analytics data for a specific timeframe
   * @param {string} timeframe - '1h', '24h', '7d', etc.
   * @returns {Promise<Object>} Analytics data
   */
  async getAnalytics(timeframe = '24h') {
    const cacheKey = `analytics-${timeframe}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    try {
      // Try to get from backend API first
      const response = await apiFetch(`/api/zk-analytics?timeframe=${timeframe}`);
      
      if (response.ok) {
        const data = await response.json();
        this.cache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
      }
      
      // Fallback to mock data for development
      return this.getMockAnalytics(timeframe);
      
    } catch (error) {
      console.warn('ZK Analytics API unavailable, using mock data:', error.message);
      return this.getMockAnalytics(timeframe);
    }
  }

  /**
   * Log a proof attempt
   * @param {Object} attemptData - Proof attempt data
   */
  async logProofAttempt(attemptData) {
    try {
      await apiFetch('/api/zk-analytics/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'proof_attempt',
          ...attemptData,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Failed to log proof attempt:', error);
    }
  }

  /**
   * Log a successful proof
   * @param {Object} successData - Success data
   */
  async logProofSuccess(successData) {
    try {
      await apiFetch('/api/zk-analytics/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'proof_success',
          ...successData,
          timestamp: new Date().toISOString()
        })
      });
      
      // Clear cache to get fresh data
      this.clearCache();
    } catch (error) {
      console.error('Failed to log proof success:', error);
    }
  }

  /**
   * Log a proof failure
   * @param {Object} failureData - Failure data
   */
  async logProofFailure(failureData) {
    try {
      await apiFetch('/api/zk-analytics/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'proof_failure',
          ...failureData,
          timestamp: new Date().toISOString()
        })
      });
      
      // Clear cache to get fresh data
      this.clearCache();
    } catch (error) {
      console.error('Failed to log proof failure:', error);
    }
  }

  /**
   * Log a nullifier reuse attempt
   * @param {Object} reuseData - Reuse attempt data
   */
  async logNullifierReuse(reuseData) {
    try {
      await apiFetch('/api/zk-analytics/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'nullifier_reuse',
          ...reuseData,
          severity: 'high',
          timestamp: new Date().toISOString()
        })
      });
      
      // Clear cache to get fresh data
      this.clearCache();
    } catch (error) {
      console.error('Failed to log nullifier reuse:', error);
    }
  }

  /**
   * Get recent proof attempts for admin review
   * @param {number} limit - Number of recent attempts to get
   * @returns {Promise<Array>} Recent proof attempts
   */
  async getRecentAttempts(limit = 50) {
    try {
      const response = await apiFetch(`/api/zk-analytics/recent?limit=${limit}`);
      
      if (response.ok) {
        return await response.json();
      }
      
      return this.getMockRecentAttempts(limit);
    } catch (error) {
      console.warn('Failed to get recent attempts:', error);
      return this.getMockRecentAttempts(limit);
    }
  }

  /**
   * Get active alerts
   * @returns {Promise<Array>} Active security alerts
   */
  async getActiveAlerts() {
    try {
      const response = await apiFetch('/api/zk-analytics/alerts');
      
      if (response.ok) {
        return await response.json();
      }
      
      return [];
    } catch (error) {
      console.warn('Failed to get active alerts:', error);
      return [];
    }
  }

  /**
   * Generate a comprehensive analytics report
   * @param {string} timeframe - Timeframe for the report
   * @returns {Promise<Object>} Analytics report
   */
  async generateReport(timeframe = '24h') {
    try {
      const [analytics, recentAttempts, alerts] = await Promise.all([
        this.getAnalytics(timeframe),
        this.getRecentAttempts(20),
        this.getActiveAlerts()
      ]);

      return {
        title: 'ZK Analytics Report',
        generated: new Date().toISOString(),
        timeframe,
        analytics,
        recentAttempts,
        alerts,
        summary: {
          totalAttempts: analytics.totals?.attempts || 0,
          successRate: analytics.rates?.successRate || 0,
          failureRate: analytics.rates?.failureRate || 0,
          securityIssues: alerts.length,
          status: this.getOverallStatus(analytics, alerts)
        }
      };
    } catch (error) {
      console.error('Failed to generate analytics report:', error);
      return this.getMockReport(timeframe);
    }
  }

  /**
   * Get overall system status based on analytics
   * @param {Object} analytics - Analytics data
   * @param {Array} alerts - Active alerts
   * @returns {string} Status: 'healthy', 'warning', 'critical'
   */
  getOverallStatus(analytics, alerts) {
    const failureRate = parseFloat(analytics.rates?.failureRate) || 0;
    const nullifierReuses = analytics.totals?.nullifierReuses || 0;
    const highSeverityAlerts = alerts.filter(a => a.severity === 'high').length;

    if (highSeverityAlerts > 0 || nullifierReuses > 5) {
      return 'critical';
    }
    
    if (failureRate > 30 || nullifierReuses > 0) {
      return 'warning';
    }
    
    return 'healthy';
  }

  /**
   * Clear analytics cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Mock analytics data for development/fallback
   * @param {string} timeframe - Timeframe
   * @returns {Object} Mock analytics data
   */
  getMockAnalytics(timeframe) {
    const now = new Date();
    const startTime = new Date(now.getTime() - this.parseTimeframe(timeframe));

    return {
      timeframe,
      period: {
        start: startTime.toISOString(),
        end: now.toISOString()
      },
      totals: {
        attempts: Math.floor(Math.random() * 100) + 10,
        successes: Math.floor(Math.random() * 80) + 8,
        failures: Math.floor(Math.random() * 20) + 2,
        nullifierReuses: Math.floor(Math.random() * 3),
        suspiciousActivities: Math.floor(Math.random() * 5)
      },
      rates: {
        successRate: (85 + Math.random() * 10).toFixed(2),
        failureRate: (5 + Math.random() * 10).toFixed(2),
        suspiciousRate: (1 + Math.random() * 3).toFixed(2)
      },
      patterns: {
        uniquePlayers: Math.floor(Math.random() * 20) + 5,
        uniqueNullifiers: Math.floor(Math.random() * 50) + 10,
        topFailureReasons: [
          { reason: 'Invalid proof format', count: 3 },
          { reason: 'Network timeout', count: 2 },
          { reason: 'Insufficient gas', count: 1 }
        ],
        playerActivity: {
          '0x1234...5678': { attempts: 5, successes: 4, failures: 1 },
          '0x2345...6789': { attempts: 3, successes: 3, failures: 0 },
          '0x3456...7890': { attempts: 2, successes: 1, failures: 1 }
        }
      },
      alerts: []
    };
  }

  /**
   * Mock recent attempts for development
   * @param {number} limit - Number of attempts
   * @returns {Array} Mock recent attempts
   */
  getMockRecentAttempts(limit) {
    const attempts = [];
    const now = Date.now();

    for (let i = 0; i < Math.min(limit, 10); i++) {
      attempts.push({
        id: `attempt-${i}`,
        type: Math.random() > 0.8 ? 'proof_failure' : 'proof_success',
        playerAddress: `0x${Math.random().toString(16).substr(2, 8)}...${Math.random().toString(16).substr(2, 8)}`,
        claimedXP: Math.floor(Math.random() * 200) + 50,
        nullifier: `nullifier-${i}`,
        timestamp: new Date(now - i * 60000 * Math.random() * 60).toISOString(),
        reason: Math.random() > 0.8 ? 'Invalid proof format' : null
      });
    }

    return attempts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * Mock analytics report for development
   * @param {string} timeframe - Timeframe
   * @returns {Object} Mock report
   */
  getMockReport(timeframe) {
    const analytics = this.getMockAnalytics(timeframe);
    
    return {
      title: 'ZK Analytics Report (Mock)',
      generated: new Date().toISOString(),
      timeframe,
      analytics,
      recentAttempts: this.getMockRecentAttempts(20),
      alerts: [],
      summary: {
        totalAttempts: analytics.totals.attempts,
        successRate: analytics.rates.successRate,
        failureRate: analytics.rates.failureRate,
        securityIssues: 0,
        status: 'healthy'
      }
    };
  }

  /**
   * Parse timeframe string to milliseconds
   * @param {string} timeframe - Timeframe string
   * @returns {number} Milliseconds
   */
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
}

// Export singleton instance and logging functions
export const zkAnalyticsService = new ZKAnalyticsService();

export const zkLogger = {
  logProofAttempt: (data) => zkAnalyticsService.logProofAttempt(data),
  logProofSuccess: (data) => zkAnalyticsService.logProofSuccess(data),
  logProofFailure: (data) => zkAnalyticsService.logProofFailure(data),
  logNullifierReuse: (data) => zkAnalyticsService.logNullifierReuse(data),
  getAnalytics: (timeframe) => zkAnalyticsService.getAnalytics(timeframe),
  getRecentAttempts: (limit) => zkAnalyticsService.getRecentAttempts(limit),
  getActiveAlerts: () => zkAnalyticsService.getActiveAlerts(),
  generateReport: (timeframe) => zkAnalyticsService.generateReport(timeframe)
};

export default zkAnalyticsService;