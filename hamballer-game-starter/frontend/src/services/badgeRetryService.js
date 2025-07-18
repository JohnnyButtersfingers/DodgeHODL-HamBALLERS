/**
 * Badge Retry Service - Complex logic for managing badge claim retry operations
 * Integrates with backend retry queue and provides intelligent failure analysis
 */

class BadgeRetryService {
  constructor() {
    this.retryAttempts = new Map();
    this.failurePatterns = new Map();
    this.queueState = {
      position: 0,
      estimatedWait: 0,
      isProcessing: false
    };
    this.retryConfig = {
      maxRetries: 5,
      baseDelay: 30000, // 30 seconds
      maxDelay: 3600000, // 1 hour
      exponentialBase: 1.5,
      jitterFactor: 0.1
    };
  }

  /**
   * Analyze failure pattern to determine optimal retry strategy
   */
  analyzeFailure(error, badge, previousAttempts = []) {
    const errorMessage = error.message.toLowerCase();
    const errorType = this.classifyError(errorMessage);
    
    // Build failure pattern analysis
    const pattern = {
      errorType,
      confidence: this.getErrorConfidence(errorType),
      suggestedDelay: this.calculateRetryDelay(errorType, previousAttempts.length),
      retryRecommended: this.shouldRetry(errorType, previousAttempts.length),
      adaptiveStrategy: this.getAdaptiveStrategy(errorType, badge),
      analysisMetadata: {
        timestamp: new Date().toISOString(),
        errorHash: this.hashError(errorMessage),
        badgeContext: {
          tier: badge.tier,
          xpEarned: badge.xpEarned,
          requiresProof: badge.requiresProof
        }
      }
    };

    // Store pattern for learning
    this.failurePatterns.set(badge.id, pattern);
    
    return pattern;
  }

  /**
   * Classify error types for intelligent handling
   */
  classifyError(errorMessage) {
    const classifications = {
      'gas': {
        type: 'gas_error',
        priority: 'high',
        retryable: true,
        adaptable: true
      },
      'network': {
        type: 'network_error', 
        priority: 'medium',
        retryable: true,
        adaptable: false
      },
      'timeout': {
        type: 'timeout_error',
        priority: 'medium', 
        retryable: true,
        adaptable: false
      },
      'nullifier': {
        type: 'nullifier_reuse',
        priority: 'critical',
        retryable: false,
        adaptable: true
      },
      'nonce': {
        type: 'nonce_error',
        priority: 'high',
        retryable: true,
        adaptable: true
      },
      'insufficient': {
        type: 'balance_error',
        priority: 'high',
        retryable: true,
        adaptable: false
      },
      'reverted': {
        type: 'transaction_reverted',
        priority: 'high',
        retryable: true,
        adaptable: true
      }
    };

    for (const [keyword, classification] of Object.entries(classifications)) {
      if (errorMessage.includes(keyword)) {
        return classification;
      }
    }

    return {
      type: 'unknown_error',
      priority: 'low',
      retryable: true,
      adaptable: false
    };
  }

  /**
   * Get confidence level for error classification
   */
  getErrorConfidence(errorClassification) {
    const confidenceMap = {
      'gas_error': 0.95,
      'network_error': 0.85,
      'timeout_error': 0.80,
      'nullifier_reuse': 0.98,
      'nonce_error': 0.90,
      'balance_error': 0.85,
      'transaction_reverted': 0.75,
      'unknown_error': 0.30
    };
    
    return confidenceMap[errorClassification.type] || 0.30;
  }

  /**
   * Calculate intelligent retry delay with adaptive backoff
   */
  calculateRetryDelay(errorClassification, attemptCount) {
    const baseDelayMap = {
      'gas_error': 45000,      // 45 seconds - gas issues resolve quickly
      'network_error': 120000, // 2 minutes - network issues take time
      'timeout_error': 90000,  // 1.5 minutes - timeout issues moderate
      'nonce_error': 60000,    // 1 minute - nonce issues resolve quickly
      'balance_error': 300000, // 5 minutes - balance issues take time
      'transaction_reverted': 180000, // 3 minutes - contract issues
      'unknown_error': 300000  // 5 minutes - unknown issues conservative
    };

    const baseDelay = baseDelayMap[errorClassification.type] || this.retryConfig.baseDelay;
    
    // Exponential backoff with jitter
    const exponentialDelay = baseDelay * Math.pow(this.retryConfig.exponentialBase, attemptCount);
    const jitter = exponentialDelay * this.retryConfig.jitterFactor * Math.random();
    const delayWithJitter = exponentialDelay + jitter;
    
    // Cap at maximum delay
    const finalDelay = Math.min(delayWithJitter, this.retryConfig.maxDelay);
    
    return Math.floor(finalDelay);
  }

  /**
   * Determine if retry should be attempted
   */
  shouldRetry(errorClassification, attemptCount) {
    if (attemptCount >= this.retryConfig.maxRetries) {
      return false;
    }

    // Non-retryable errors
    const nonRetryableErrors = ['nullifier_reuse'];
    if (nonRetryableErrors.includes(errorClassification.type)) {
      return false;
    }

    // Error-specific retry limits
    const retryLimits = {
      'gas_error': 3,        // Gas errors usually resolve quickly
      'network_error': 5,    // Network errors may need more attempts
      'timeout_error': 4,    // Timeout errors moderate attempts
      'nonce_error': 3,      // Nonce errors resolve quickly
      'balance_error': 2,    // Balance errors need external action
      'transaction_reverted': 4, // Contract errors may need several attempts
      'unknown_error': 3     // Conservative for unknown errors
    };

    const limit = retryLimits[errorClassification.type] || 3;
    return attemptCount < limit;
  }

  /**
   * Get adaptive strategy based on error type and badge context
   */
  getAdaptiveStrategy(errorClassification, badge) {
    const strategies = {
      'gas_error': {
        action: 'increase_gas_limit',
        gasMultiplier: 1.2,
        priorityBoost: badge.tier === 'legendary' ? 1.5 : 1.0
      },
      'network_error': {
        action: 'retry_with_backoff',
        useAlternateRPC: true,
        timeout: 60000
      },
      'timeout_error': {
        action: 'retry_with_longer_timeout', 
        timeoutMultiplier: 1.5,
        maxTimeout: 180000
      },
      'nullifier_reuse': {
        action: 'regenerate_proof',
        requiresUserAction: true,
        blockRetry: true
      },
      'nonce_error': {
        action: 'refresh_nonce',
        delayBeforeRefresh: 5000
      },
      'balance_error': {
        action: 'check_balance_and_wait',
        requiresUserAction: true,
        suggestedAction: 'Add ETH to wallet'
      },
      'transaction_reverted': {
        action: 'analyze_revert_reason',
        investigateGasEstimation: true,
        checkContractState: true
      },
      'unknown_error': {
        action: 'conservative_retry',
        increaseAllLimits: true,
        collectDebugInfo: true
      }
    };

    return strategies[errorClassification.type] || strategies['unknown_error'];
  }

  /**
   * Track retry attempt with comprehensive metadata
   */
  trackRetryAttempt(badge, error, strategy) {
    const attemptData = {
      badgeId: badge.id,
      timestamp: new Date().toISOString(),
      error: error.message,
      errorClassification: this.classifyError(error.message.toLowerCase()),
      strategy,
      badgeContext: {
        tier: badge.tier,
        xpEarned: badge.xpEarned,
        tokenId: badge.tokenId,
        requiresProof: badge.requiresProof
      },
      environmentContext: {
        userAgent: navigator.userAgent,
        connectionType: navigator.connection?.effectiveType || 'unknown',
        walletType: this.detectWalletType()
      }
    };

    // Store attempt data
    if (!this.retryAttempts.has(badge.id)) {
      this.retryAttempts.set(badge.id, []);
    }
    this.retryAttempts.get(badge.id).push(attemptData);

    return attemptData;
  }

  /**
   * Get retry statistics for a badge
   */
  getRetryStats(badgeId) {
    const attempts = this.retryAttempts.get(badgeId) || [];
    
    if (attempts.length === 0) {
      return null;
    }

    const errorTypes = attempts.map(a => a.errorClassification.type);
    const errorCounts = errorTypes.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const lastAttempt = attempts[attempts.length - 1];
    const timeSpan = new Date() - new Date(attempts[0].timestamp);

    return {
      totalAttempts: attempts.length,
      errorDistribution: errorCounts,
      dominantErrorType: Object.keys(errorCounts).reduce((a, b) => 
        errorCounts[a] > errorCounts[b] ? a : b
      ),
      timeSpanMs: timeSpan,
      lastAttemptAt: lastAttempt.timestamp,
      recommendedNextAction: lastAttempt.strategy.action,
      improvementTrend: this.calculateImprovementTrend(attempts)
    };
  }

  /**
   * Calculate improvement trend based on retry history
   */
  calculateImprovementTrend(attempts) {
    if (attempts.length < 2) {
      return 'insufficient_data';
    }

    // Analyze if errors are becoming less severe or more frequent
    const recentAttempts = attempts.slice(-3);
    const earlierAttempts = attempts.slice(0, -3);

    const recentErrorSeverity = recentAttempts.reduce((sum, attempt) => {
      const severity = this.getErrorSeverity(attempt.errorClassification.type);
      return sum + severity;
    }, 0) / recentAttempts.length;

    const earlierErrorSeverity = earlierAttempts.length > 0 ? 
      earlierAttempts.reduce((sum, attempt) => {
        const severity = this.getErrorSeverity(attempt.errorClassification.type);
        return sum + severity;
      }, 0) / earlierAttempts.length : recentErrorSeverity;

    if (recentErrorSeverity < earlierErrorSeverity * 0.8) {
      return 'improving';
    } else if (recentErrorSeverity > earlierErrorSeverity * 1.2) {
      return 'degrading';
    } else {
      return 'stable';
    }
  }

  /**
   * Get error severity score for trend analysis
   */
  getErrorSeverity(errorType) {
    const severityMap = {
      'nullifier_reuse': 10,    // Critical - non-retryable
      'balance_error': 8,       // High - requires user action
      'gas_error': 6,           // Medium-high - usually fixable
      'transaction_reverted': 6, // Medium-high - contract issue
      'nonce_error': 4,         // Medium - usually temporary
      'network_error': 3,       // Low-medium - infrastructure
      'timeout_error': 3,       // Low-medium - infrastructure
      'unknown_error': 5        // Medium - unpredictable
    };

    return severityMap[errorType] || 5;
  }

  /**
   * Predict success probability for next retry
   */
  predictRetrySuccess(badge, errorHistory) {
    const baseSuccessRates = {
      'gas_error': 0.85,
      'network_error': 0.70,
      'timeout_error': 0.75,
      'nonce_error': 0.90,
      'balance_error': 0.60,
      'transaction_reverted': 0.65,
      'unknown_error': 0.50
    };

    if (!errorHistory || errorHistory.length === 0) {
      return 0.75; // Default optimistic rate
    }

    const lastError = errorHistory[errorHistory.length - 1];
    const errorType = lastError.errorClassification.type;
    let baseRate = baseSuccessRates[errorType] || 0.50;

    // Adjust based on attempt count (diminishing returns)
    const attemptPenalty = Math.min(errorHistory.length * 0.10, 0.40);
    baseRate -= attemptPenalty;

    // Adjust based on improvement trend
    const stats = this.getRetryStats(badge.id);
    if (stats) {
      if (stats.improvementTrend === 'improving') {
        baseRate += 0.15;
      } else if (stats.improvementTrend === 'degrading') {
        baseRate -= 0.20;
      }
    }

    // Adjust based on badge tier (higher tiers get more resources)
    const tierMultipliers = {
      'legendary': 1.1,
      'epic': 1.05,
      'rare': 1.0,
      'common': 0.95
    };
    
    const tierMultiplier = tierMultipliers[badge.tier] || 1.0;
    baseRate *= tierMultiplier;

    return Math.max(0.05, Math.min(0.95, baseRate));
  }

  /**
   * Generate queue position estimate
   */
  estimateQueuePosition(badge, queueMetadata) {
    if (!queueMetadata) {
      return 'unknown';
    }

    // Base position on retry count and badge tier
    const retryPenalty = (badge.retryCount || 0) * 2;
    const tierPriority = {
      'legendary': 1,
      'epic': 2, 
      'rare': 3,
      'common': 4
    };
    
    const basePriority = tierPriority[badge.tier] || 4;
    const estimatedPosition = basePriority + retryPenalty;
    
    return Math.min(estimatedPosition, queueMetadata.totalInQueue || 10);
  }

  /**
   * Generate comprehensive retry recommendation
   */
  generateRetryRecommendation(badge, errorHistory, queueState) {
    const successProbability = this.predictRetrySuccess(badge, errorHistory);
    const queuePosition = this.estimateQueuePosition(badge, queueState);
    const stats = this.getRetryStats(badge.id);
    
    let recommendation = {
      shouldRetry: successProbability > 0.30 && (badge.retryCount || 0) < this.retryConfig.maxRetries,
      confidence: successProbability,
      estimatedWaitTime: this.calculateEstimatedWaitTime(queuePosition, queueState),
      queuePosition,
      alternativeActions: [],
      riskAssessment: this.assessRetryRisk(badge, errorHistory)
    };

    // Add alternative actions based on dominant error type
    if (stats && stats.dominantErrorType) {
      const strategy = this.getAdaptiveStrategy({ type: stats.dominantErrorType }, badge);
      
      if (strategy.requiresUserAction) {
        recommendation.alternativeActions.push({
          action: strategy.suggestedAction || 'Check wallet and try again',
          priority: 'high',
          automated: false
        });
      }
      
      if (stats.dominantErrorType === 'gas_error') {
        recommendation.alternativeActions.push({
          action: 'Increase gas limit by 20%',
          priority: 'medium',
          automated: true
        });
      }
    }

    return recommendation;
  }

  /**
   * Assess risk of continuing retry attempts
   */
  assessRetryRisk(badge, errorHistory) {
    if (!errorHistory || errorHistory.length === 0) {
      return 'low';
    }

    const attemptCount = errorHistory.length;
    const stats = this.getRetryStats(badge.id);
    
    let riskFactors = 0;
    
    // High attempt count increases risk
    if (attemptCount >= 3) riskFactors += 2;
    if (attemptCount >= 4) riskFactors += 2;
    
    // Degrading trend increases risk
    if (stats && stats.improvementTrend === 'degrading') riskFactors += 3;
    
    // Certain error types increase risk
    if (stats && ['balance_error', 'nullifier_reuse'].includes(stats.dominantErrorType)) {
      riskFactors += 2;
    }
    
    // Time span increases risk
    if (stats && stats.timeSpanMs > 3600000) { // > 1 hour
      riskFactors += 1;
    }

    if (riskFactors >= 6) return 'high';
    if (riskFactors >= 3) return 'medium';
    return 'low';
  }

  /**
   * Calculate estimated wait time based on queue position
   */
  calculateEstimatedWaitTime(queuePosition, queueState) {
    if (!queueState || queuePosition === 'unknown') {
      return 'unknown';
    }

    const avgProcessingTime = queueState.avgProcessingTime || 30; // seconds
    const estimatedSeconds = queuePosition * avgProcessingTime;
    
    if (estimatedSeconds < 60) {
      return `${estimatedSeconds}s`;
    } else if (estimatedSeconds < 3600) {
      const minutes = Math.floor(estimatedSeconds / 60);
      return `${minutes}m`;
    } else {
      const hours = Math.floor(estimatedSeconds / 3600);
      const minutes = Math.floor((estimatedSeconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }

  /**
   * Helper function to hash error messages for pattern detection
   */
  hashError(errorMessage) {
    let hash = 0;
    for (let i = 0; i < errorMessage.length; i++) {
      const char = errorMessage.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Detect wallet type for context
   */
  detectWalletType() {
    if (typeof window !== 'undefined') {
      if (window.ethereum?.isMetaMask) return 'metamask';
      if (window.ethereum?.isCoinbaseWallet) return 'coinbase';
      if (window.ethereum?.isFrame) return 'frame';
      if (window.ethereum?.isTrust) return 'trust';
      if (window.ethereum) return 'unknown_injected';
    }
    return 'unknown';
  }

  /**
   * Clear retry data for a badge (on success)
   */
  clearRetryData(badgeId) {
    this.retryAttempts.delete(badgeId);
    this.failurePatterns.delete(badgeId);
  }

  /**
   * Get comprehensive service statistics
   */
  getServiceStats() {
    const allAttempts = Array.from(this.retryAttempts.values()).flat();
    
    return {
      totalBadgesTracked: this.retryAttempts.size,
      totalRetryAttempts: allAttempts.length,
      errorTypeDistribution: this.calculateErrorDistribution(allAttempts),
      averageAttemptsPerBadge: allAttempts.length / Math.max(this.retryAttempts.size, 1),
      successPredictionAccuracy: this.calculatePredictionAccuracy(),
      mostCommonErrorType: this.getMostCommonErrorType(allAttempts),
      retryEffectiveness: this.calculateRetryEffectiveness()
    };
  }

  /**
   * Calculate error type distribution across all attempts
   */
  calculateErrorDistribution(attempts) {
    const distribution = {};
    attempts.forEach(attempt => {
      const errorType = attempt.errorClassification.type;
      distribution[errorType] = (distribution[errorType] || 0) + 1;
    });
    return distribution;
  }

  /**
   * Calculate prediction accuracy (placeholder for machine learning integration)
   */
  calculatePredictionAccuracy() {
    // TODO: Implement actual accuracy tracking based on predictions vs outcomes
    return 0.75; // Placeholder
  }

  /**
   * Get most common error type
   */
  getMostCommonErrorType(attempts) {
    const distribution = this.calculateErrorDistribution(attempts);
    return Object.keys(distribution).reduce((a, b) => 
      distribution[a] > distribution[b] ? a : b
    ) || 'none';
  }

  /**
   * Calculate overall retry effectiveness
   */
  calculateRetryEffectiveness() {
    // TODO: Implement actual effectiveness calculation based on success rates
    return 0.68; // Placeholder
  }
}

// Create singleton instance
const badgeRetryService = new BadgeRetryService();

export default badgeRetryService;