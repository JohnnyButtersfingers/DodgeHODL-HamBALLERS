/**
 * Badge Analytics Service
 * Tracks user behavior, success rates, and drop-off points in badge claim flow
 */

class BadgeAnalyticsService {
  constructor() {
    this.events = [];
    this.sessions = new Map();
    this.metrics = {
      totalAttempts: 0,
      successfulClaims: 0,
      failedClaims: 0,
      dropOffPoints: {},
      averageTimeToComplete: 0,
      errorTypes: {},
      retryAttempts: 0,
      gasSpent: 0
    };
    
    // Initialize from localStorage
    this.loadMetrics();
  }

  /**
   * Track a badge claim event
   */
  trackEvent(eventType, data = {}) {
    const event = {
      type: eventType,
      timestamp: Date.now(),
      sessionId: this.getCurrentSessionId(),
      ...data
    };
    
    this.events.push(event);
    this.processEvent(event);
    
    // Send to analytics backend (if configured)
    this.sendToAnalytics(event);
    
    // Store locally
    this.saveMetrics();
  }

  /**
   * Start a new badge claim session
   */
  startClaimSession(runId, badgeType) {
    const sessionId = `${runId}_${Date.now()}`;
    const session = {
      id: sessionId,
      runId,
      badgeType,
      startTime: Date.now(),
      steps: [],
      completed: false
    };
    
    this.sessions.set(sessionId, session);
    this.setCurrentSessionId(sessionId);
    
    this.trackEvent('claim_started', {
      runId,
      badgeType,
      tokenId: badgeType.id
    });
    
    return sessionId;
  }

  /**
   * Track step progression
   */
  trackStep(step, data = {}) {
    const sessionId = this.getCurrentSessionId();
    if (!sessionId) return;
    
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    session.steps.push({
      step,
      timestamp: Date.now(),
      duration: session.steps.length > 0 
        ? Date.now() - session.steps[session.steps.length - 1].timestamp 
        : Date.now() - session.startTime,
      ...data
    });
    
    this.trackEvent(`step_${step}`, {
      sessionId,
      stepIndex: session.steps.length,
      duration: session.steps[session.steps.length - 1].duration,
      ...data
    });
  }

  /**
   * Track claim completion
   */
  trackClaimComplete(success, data = {}) {
    const sessionId = this.getCurrentSessionId();
    if (!sessionId) return;
    
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    session.completed = true;
    session.success = success;
    session.endTime = Date.now();
    session.totalDuration = session.endTime - session.startTime;
    
    if (success) {
      this.metrics.successfulClaims++;
      this.trackEvent('claim_success', {
        sessionId,
        duration: session.totalDuration,
        steps: session.steps.length,
        ...data
      });
    } else {
      this.metrics.failedClaims++;
      this.trackEvent('claim_failed', {
        sessionId,
        duration: session.totalDuration,
        lastStep: session.steps[session.steps.length - 1]?.step,
        ...data
      });
    }
    
    this.metrics.totalAttempts++;
    this.updateAverageTime();
  }

  /**
   * Track drop-off
   */
  trackDropOff(step, reason) {
    const sessionId = this.getCurrentSessionId();
    
    this.metrics.dropOffPoints[step] = (this.metrics.dropOffPoints[step] || 0) + 1;
    
    this.trackEvent('drop_off', {
      sessionId,
      step,
      reason
    });
  }

  /**
   * Track errors
   */
  trackError(error, context = {}) {
    const errorType = error.code || error.message || 'unknown';
    this.metrics.errorTypes[errorType] = (this.metrics.errorTypes[errorType] || 0) + 1;
    
    this.trackEvent('error', {
      errorType,
      errorMessage: error.message,
      ...context
    });
  }

  /**
   * Track retry attempts
   */
  trackRetry(attemptNumber, reason) {
    this.metrics.retryAttempts++;
    
    this.trackEvent('retry_attempt', {
      attemptNumber,
      reason
    });
  }

  /**
   * Track gas usage
   */
  trackGasUsed(gasUsed, gasPrice, txType) {
    const gasCost = parseFloat(gasUsed) * parseFloat(gasPrice);
    this.metrics.gasSpent += gasCost;
    
    this.trackEvent('gas_used', {
      gasUsed,
      gasPrice,
      gasCost,
      txType
    });
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    const successRate = this.metrics.totalAttempts > 0 
      ? (this.metrics.successfulClaims / this.metrics.totalAttempts * 100).toFixed(2)
      : 0;
    
    return {
      ...this.metrics,
      successRate: `${successRate}%`,
      avgGasPerClaim: this.metrics.successfulClaims > 0 
        ? (this.metrics.gasSpent / this.metrics.successfulClaims).toFixed(4)
        : 0
    };
  }

  /**
   * Get funnel analysis
   */
  getFunnelAnalysis() {
    const steps = [
      'claim_started',
      'step_verifying',
      'step_generating_proof',
      'step_submitting_proof',
      'step_claiming',
      'claim_success'
    ];
    
    const funnel = steps.map(step => {
      const count = this.events.filter(e => e.type === step).length;
      return { step, count };
    });
    
    // Calculate conversion rates
    return funnel.map((item, index) => {
      const conversionRate = index > 0 && funnel[0].count > 0
        ? (item.count / funnel[0].count * 100).toFixed(2)
        : 100;
      
      const dropOffRate = index > 0 && funnel[index - 1].count > 0
        ? ((funnel[index - 1].count - item.count) / funnel[index - 1].count * 100).toFixed(2)
        : 0;
      
      return {
        ...item,
        conversionRate: `${conversionRate}%`,
        dropOffRate: `${dropOffRate}%`
      };
    });
  }

  /**
   * Get error analysis
   */
  getErrorAnalysis() {
    const totalErrors = Object.values(this.metrics.errorTypes).reduce((sum, count) => sum + count, 0);
    
    return Object.entries(this.metrics.errorTypes).map(([type, count]) => ({
      type,
      count,
      percentage: totalErrors > 0 ? ((count / totalErrors) * 100).toFixed(2) : 0
    })).sort((a, b) => b.count - a.count);
  }

  /**
   * Get time analysis
   */
  getTimeAnalysis() {
    const completedSessions = Array.from(this.sessions.values())
      .filter(s => s.completed && s.success);
    
    if (completedSessions.length === 0) return null;
    
    const stepDurations = {};
    completedSessions.forEach(session => {
      session.steps.forEach(step => {
        if (!stepDurations[step.step]) {
          stepDurations[step.step] = [];
        }
        stepDurations[step.step].push(step.duration);
      });
    });
    
    const analysis = Object.entries(stepDurations).map(([step, durations]) => {
      const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const sorted = [...durations].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      
      return {
        step,
        avgDuration: Math.round(avg),
        medianDuration: median,
        minDuration: Math.min(...durations),
        maxDuration: Math.max(...durations)
      };
    });
    
    return analysis;
  }

  /**
   * Process event for metrics
   */
  processEvent(event) {
    // Update metrics based on event type
    switch (event.type) {
      case 'claim_started':
        // Track start of funnel
        break;
      
      case 'claim_success':
        // Update success metrics
        break;
      
      case 'claim_failed':
        // Update failure metrics
        break;
      
      case 'error':
        // Track error patterns
        break;
    }
  }

  /**
   * Update average completion time
   */
  updateAverageTime() {
    const completedSessions = Array.from(this.sessions.values())
      .filter(s => s.completed && s.success);
    
    if (completedSessions.length > 0) {
      const totalTime = completedSessions.reduce((sum, s) => sum + s.totalDuration, 0);
      this.metrics.averageTimeToComplete = Math.round(totalTime / completedSessions.length);
    }
  }

  /**
   * Send event to analytics backend
   */
  async sendToAnalytics(event) {
    // Implement based on your analytics provider
    // Example: Google Analytics, Mixpanel, custom backend
    if (window.gtag) {
      window.gtag('event', event.type, {
        event_category: 'badge_claim',
        event_label: event.sessionId,
        value: event.duration || 0
      });
    }
  }

  /**
   * Session management
   */
  getCurrentSessionId() {
    return window.sessionStorage.getItem('badge_claim_session_id');
  }

  setCurrentSessionId(sessionId) {
    window.sessionStorage.setItem('badge_claim_session_id', sessionId);
  }

  /**
   * Persistence
   */
  saveMetrics() {
    try {
      localStorage.setItem('badge_analytics_metrics', JSON.stringify(this.metrics));
      localStorage.setItem('badge_analytics_events', JSON.stringify(this.events.slice(-1000))); // Keep last 1000 events
    } catch (error) {
      console.error('Failed to save analytics:', error);
    }
  }

  loadMetrics() {
    try {
      const savedMetrics = localStorage.getItem('badge_analytics_metrics');
      if (savedMetrics) {
        this.metrics = { ...this.metrics, ...JSON.parse(savedMetrics) };
      }
      
      const savedEvents = localStorage.getItem('badge_analytics_events');
      if (savedEvents) {
        this.events = JSON.parse(savedEvents);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  }

  /**
   * Export analytics data
   */
  exportData() {
    return {
      metrics: this.getMetrics(),
      funnel: this.getFunnelAnalysis(),
      errors: this.getErrorAnalysis(),
      timing: this.getTimeAnalysis(),
      events: this.events.slice(-100), // Last 100 events
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Reset analytics
   */
  reset() {
    this.events = [];
    this.sessions.clear();
    this.metrics = {
      totalAttempts: 0,
      successfulClaims: 0,
      failedClaims: 0,
      dropOffPoints: {},
      averageTimeToComplete: 0,
      errorTypes: {},
      retryAttempts: 0,
      gasSpent: 0
    };
    this.saveMetrics();
  }
}

// Export singleton instance
export const badgeAnalyticsService = new BadgeAnalyticsService();
export default badgeAnalyticsService;