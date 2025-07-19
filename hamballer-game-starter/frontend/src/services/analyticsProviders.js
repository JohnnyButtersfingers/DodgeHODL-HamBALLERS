/**
 * Analytics Provider Integrations
 * Supports Helika and zkMe for comprehensive Web3 analytics
 */

// Helika Analytics Provider
class HelikaProvider {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.gameId = config.gameId;
    this.endpoint = config.endpoint || 'https://api.helika.io/v1';
    this.batchSize = 50;
    this.eventQueue = [];
    this.flushInterval = 5000; // 5 seconds
    this.sessionId = this.generateSessionId();
    
    // Start batch processing
    this.startBatchProcessing();
  }

  /**
   * Track event with Helika
   */
  async trackEvent(eventName, properties = {}) {
    const event = {
      event: eventName,
      properties: {
        ...properties,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        platform: 'web',
        gameId: this.gameId
      },
      userId: properties.userId || 'anonymous',
      deviceId: this.getDeviceId()
    };

    this.eventQueue.push(event);

    // Flush if queue is full
    if (this.eventQueue.length >= this.batchSize) {
      await this.flush();
    }

    return event;
  }

  /**
   * Track badge claim funnel
   */
  async trackBadgeClaimFunnel(step, data) {
    const funnelEvents = {
      'claim_started': 'badge_claim_funnel_start',
      'verifying': 'badge_claim_funnel_verify',
      'generating_proof': 'badge_claim_funnel_proof_gen',
      'submitting_proof': 'badge_claim_funnel_proof_submit',
      'claiming': 'badge_claim_funnel_claim',
      'success': 'badge_claim_funnel_complete',
      'error': 'badge_claim_funnel_error',
      'drop_off': 'badge_claim_funnel_abandon'
    };

    const eventName = funnelEvents[step] || `badge_claim_${step}`;
    
    return this.trackEvent(eventName, {
      step,
      stepIndex: Object.keys(funnelEvents).indexOf(step),
      ...data,
      funnelName: 'badge_claim',
      gameFeature: 'zkBadges'
    });
  }

  /**
   * Track retry behavior
   */
  async trackRetry(context) {
    return this.trackEvent('badge_claim_retry', {
      retryCount: context.attemptNumber,
      retryReason: context.reason,
      previousError: context.previousError,
      timeSinceLastAttempt: context.timeSinceLastAttempt,
      ...context
    });
  }

  /**
   * Track gas metrics
   */
  async trackGasMetrics(data) {
    return this.trackEvent('gas_metrics', {
      transactionType: data.txType,
      gasUsed: data.gasUsed,
      gasPrice: data.gasPrice,
      totalCostWei: data.gasCost,
      totalCostUSD: await this.estimateUSDCost(data.gasCost),
      network: data.network || 'abstract-testnet',
      ...data
    });
  }

  /**
   * Track user properties
   */
  async identifyUser(userId, properties) {
    const userEvent = {
      event: '$identify',
      userId,
      properties: {
        ...properties,
        lastSeen: new Date().toISOString(),
        platform: 'web'
      }
    };

    return this.sendEvent(userEvent);
  }

  /**
   * Batch processing
   */
  startBatchProcessing() {
    setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.flush();
      }
    }, this.flushInterval);
  }

  /**
   * Flush event queue
   */
  async flush() {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      const response = await fetch(`${this.endpoint}/events/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify({
          events,
          gameId: this.gameId
        })
      });

      if (!response.ok) {
        console.error('Helika batch event failed:', response.status);
        // Re-queue events on failure
        this.eventQueue.unshift(...events);
      }
    } catch (error) {
      console.error('Helika analytics error:', error);
      // Re-queue events on error
      this.eventQueue.unshift(...events);
    }
  }

  /**
   * Send single event immediately
   */
  async sendEvent(event) {
    try {
      const response = await fetch(`${this.endpoint}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify({
          ...event,
          gameId: this.gameId
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Helika event error:', error);
      return false;
    }
  }

  /**
   * Utility methods
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getDeviceId() {
    let deviceId = localStorage.getItem('helika_device_id');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('helika_device_id', deviceId);
    }
    return deviceId;
  }

  async estimateUSDCost(weiAmount) {
    // Implement ETH to USD conversion
    // For now, return a placeholder
    return parseFloat(weiAmount) / 1e18 * 2000; // Assuming $2000/ETH
  }
}

// zkMe Analytics Provider
class ZkMeProvider {
  constructor(config) {
    this.appId = config.appId;
    this.apiKey = config.apiKey;
    this.endpoint = config.endpoint || 'https://api.zk.me/v1';
    this.userId = null;
  }

  /**
   * Initialize zkMe session
   */
  async initialize(userId) {
    this.userId = userId;
    
    try {
      const response = await fetch(`${this.endpoint}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          appId: this.appId,
          userId,
          timestamp: Date.now()
        })
      });

      const data = await response.json();
      this.sessionToken = data.sessionToken;
      
      return data;
    } catch (error) {
      console.error('zkMe initialization error:', error);
      return null;
    }
  }

  /**
   * Track ZK proof events
   */
  async trackZKEvent(eventType, data) {
    if (!this.sessionToken) {
      console.warn('zkMe not initialized');
      return;
    }

    const zkEvent = {
      eventType,
      userId: this.userId,
      timestamp: Date.now(),
      data: {
        ...data,
        zkProofType: 'xp_verification',
        proofSystem: 'groth16'
      }
    };

    try {
      const response = await fetch(`${this.endpoint}/events/zk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.sessionToken}`
        },
        body: JSON.stringify(zkEvent)
      });

      return response.ok;
    } catch (error) {
      console.error('zkMe event error:', error);
      return false;
    }
  }

  /**
   * Track proof generation metrics
   */
  async trackProofGeneration(data) {
    return this.trackZKEvent('proof_generation', {
      generationTime: data.duration,
      proofSize: data.proofSize,
      success: data.success,
      cached: data.cached || false,
      xpAmount: data.xpAmount,
      ...data
    });
  }

  /**
   * Track proof verification
   */
  async trackProofVerification(data) {
    return this.trackZKEvent('proof_verification', {
      verificationTime: data.duration,
      gasUsed: data.gasUsed,
      success: data.success,
      contractAddress: data.contractAddress,
      nullifierHash: data.nullifierHash?.slice(0, 10), // Privacy: only send prefix
      ...data
    });
  }

  /**
   * Track user privacy metrics
   */
  async trackPrivacyMetrics(data) {
    return this.trackZKEvent('privacy_metrics', {
      proofsCached: data.proofsCached,
      proofsGenerated: data.proofsGenerated,
      nullifiersUsed: data.nullifiersUsed,
      privacyLevel: 'high', // ZK proofs ensure high privacy
      ...data
    });
  }

  /**
   * Get analytics dashboard URL
   */
  getDashboardUrl() {
    return `https://dashboard.zk.me/apps/${this.appId}`;
  }
}

// Unified Analytics Manager
class AnalyticsManager {
  constructor() {
    this.providers = new Map();
    this.enabled = true;
  }

  /**
   * Initialize analytics providers
   */
  initialize(config) {
    // Initialize Helika
    if (config.helika?.apiKey) {
      this.providers.set('helika', new HelikaProvider(config.helika));
      console.log('✅ Helika analytics initialized');
    }

    // Initialize zkMe
    if (config.zkMe?.apiKey) {
      this.providers.set('zkMe', new ZkMeProvider(config.zkMe));
      console.log('✅ zkMe analytics initialized');
    }

    // Initialize zkMe session if userId provided
    if (config.userId && this.providers.has('zkMe')) {
      this.providers.get('zkMe').initialize(config.userId);
    }
  }

  /**
   * Track event across all providers
   */
  async trackEvent(eventName, properties = {}) {
    if (!this.enabled) return;

    const promises = [];

    // Track with Helika
    if (this.providers.has('helika')) {
      promises.push(
        this.providers.get('helika').trackEvent(eventName, properties)
      );
    }

    // Track with zkMe if it's a ZK-related event
    if (this.providers.has('zkMe') && this.isZKEvent(eventName)) {
      promises.push(
        this.providers.get('zkMe').trackZKEvent(eventName, properties)
      );
    }

    await Promise.all(promises);
  }

  /**
   * Track badge claim funnel specifically
   */
  async trackBadgeClaimStep(step, data) {
    const promises = [];

    // Helika funnel tracking
    if (this.providers.has('helika')) {
      promises.push(
        this.providers.get('helika').trackBadgeClaimFunnel(step, data)
      );
    }

    // zkMe tracking for proof-related steps
    if (this.providers.has('zkMe')) {
      if (step === 'generating_proof') {
        promises.push(
          this.providers.get('zkMe').trackProofGeneration(data)
        );
      } else if (step === 'submitting_proof') {
        promises.push(
          this.providers.get('zkMe').trackProofVerification(data)
        );
      }
    }

    await Promise.all(promises);
  }

  /**
   * Track retry behavior
   */
  async trackRetry(context) {
    if (this.providers.has('helika')) {
      await this.providers.get('helika').trackRetry(context);
    }
  }

  /**
   * Track gas metrics
   */
  async trackGasUsed(gasUsed, gasPrice, txType) {
    if (this.providers.has('helika')) {
      await this.providers.get('helika').trackGasMetrics({
        gasUsed,
        gasPrice,
        txType,
        gasCost: gasUsed * gasPrice
      });
    }
  }

  /**
   * Identify user
   */
  async identifyUser(userId, properties) {
    const promises = [];

    if (this.providers.has('helika')) {
      promises.push(
        this.providers.get('helika').identifyUser(userId, properties)
      );
    }

    if (this.providers.has('zkMe')) {
      promises.push(
        this.providers.get('zkMe').initialize(userId)
      );
    }

    await Promise.all(promises);
  }

  /**
   * Check if event is ZK-related
   */
  isZKEvent(eventName) {
    const zkEvents = [
      'proof_generation',
      'proof_verification',
      'proof_cached',
      'nullifier_check',
      'zk_error'
    ];
    
    return zkEvents.some(zkEvent => eventName.includes(zkEvent));
  }

  /**
   * Enable/disable tracking
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Get provider instance
   */
  getProvider(name) {
    return this.providers.get(name);
  }
}

// Export singleton instance
export const analyticsManager = new AnalyticsManager();

// Export providers for direct use if needed
export { HelikaProvider, ZkMeProvider };

export default analyticsManager;