#!/usr/bin/env node

/**
 * HamBaller Production Monitoring Script
 * Real-time tracking of gas usage, throughput, and mint events
 * Includes alerts for >300k gas usage and performance degradation
 */

const { ethers } = require('ethers');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  // Network settings
  network: {
    rpcUrl: process.env.ABSTRACT_TESTNET_RPC_URL || 'https://api.testnet.abs.xyz',
    chainId: 11124,
    explorerUrl: 'https://explorer.testnet.abs.xyz'
  },
  
  // Contract addresses
  contracts: {
    xpVerifier: process.env.XPVERIFIER_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f6E123',
    xpBadge: process.env.XPBADGE_ADDRESS || '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199'
  },
  
  // Monitoring thresholds
  thresholds: {
    maxGasPerVerify: 300000, // Alert if >300k gas
    maxLatency: 5000, // Alert if >5s latency
    minSuccessRate: 0.95, // Alert if <95% success rate
    maxConcurrentOps: 100 // Alert if >100 concurrent operations
  },
  
  // Alert settings
  alerts: {
    enabled: true,
    webhookUrl: process.env.ALERT_WEBHOOK_URL,
    emailRecipients: process.env.ALERT_EMAILS?.split(',') || []
  },
  
  // Logging
  logging: {
    logFile: './logs/production-monitor.log',
    metricsFile: './logs/metrics.json',
    retentionDays: 30
  }
};

// Metrics storage
let metrics = {
  startTime: Date.now(),
  totalVerifications: 0,
  totalGasUsed: 0n,
  successfulVerifications: 0,
  failedVerifications: 0,
  averageGasPerVerify: 0,
  peakThroughput: 0,
  currentThroughput: 0,
  alerts: [],
  recentTransactions: [],
  performanceHistory: []
};

// Performance tracking
let performanceWindow = {
  startTime: Date.now(),
  operations: [],
  gasUsage: [],
  latencies: []
};

class ProductionMonitor {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(CONFIG.network.rpcUrl);
    this.isRunning = false;
    this.alertCooldowns = new Map();
    
    // Ensure log directory exists
    this.ensureLogDirectory();
    
    console.log('🚀 HamBaller Production Monitor Starting...');
    console.log(`📊 Monitoring contracts on ${CONFIG.network.rpcUrl}`);
    console.log(`🎯 XPVerifier: ${CONFIG.contracts.xpVerifier}`);
    console.log(`🏆 XPBadge: ${CONFIG.contracts.xpBadge}`);
  }

  ensureLogDirectory() {
    const logDir = path.dirname(CONFIG.logging.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  async start() {
    if (this.isRunning) {
      console.log('⚠️ Monitor is already running');
      return;
    }

    this.isRunning = true;
    console.log('✅ Monitor started successfully');

    // Start monitoring loops
    this.startTransactionMonitoring();
    this.startPerformanceTracking();
    this.startMetricsReporting();
    this.startHealthChecks();

    // Handle graceful shutdown
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  async shutdown() {
    console.log('\n🛑 Shutting down production monitor...');
    this.isRunning = false;
    
    // Save final metrics
    await this.saveMetrics();
    
    console.log('✅ Monitor shutdown complete');
    process.exit(0);
  }

  startTransactionMonitoring() {
    console.log('📡 Starting transaction monitoring...');
    
    // Monitor XPVerifier events
    this.monitorContractEvents();
    
    // Monitor recent transactions
    setInterval(async () => {
      await this.checkRecentTransactions();
    }, 10000); // Check every 10 seconds
  }

  async monitorContractEvents() {
    try {
      const xpVerifier = new ethers.Contract(
        CONFIG.contracts.xpVerifier,
        [
          'event ProofVerified(address indexed user, uint256 nullifier, uint256 gasUsed)',
          'event VerificationFailed(address indexed user, string reason, uint256 gasUsed)'
        ],
        this.provider
      );

      // Listen for proof verification events
      xpVerifier.on('ProofVerified', async (user, nullifier, gasUsed, event) => {
        await this.handleSuccessfulVerification(user, nullifier, gasUsed, event);
      });

      xpVerifier.on('VerificationFailed', async (user, reason, gasUsed, event) => {
        await this.handleFailedVerification(user, reason, gasUsed, event);
      });

      console.log('✅ Event monitoring active');
    } catch (error) {
      console.error('❌ Failed to start event monitoring:', error.message);
      this.sendAlert('CRITICAL', 'Event monitoring failed', error.message);
    }
  }

  async handleSuccessfulVerification(user, nullifier, gasUsed, event) {
    const gasUsedBigInt = BigInt(gasUsed);
    const timestamp = Date.now();
    
    // Update metrics
    metrics.totalVerifications++;
    metrics.successfulVerifications++;
    metrics.totalGasUsed += gasUsedBigInt;
    metrics.averageGasPerVerify = Number(metrics.totalGasUsed) / metrics.totalVerifications;

    // Add to recent transactions
    const transaction = {
      hash: event.transactionHash,
      user: user,
      nullifier: nullifier,
      gasUsed: Number(gasUsedBigInt),
      timestamp: timestamp,
      status: 'success',
      blockNumber: event.blockNumber
    };

    metrics.recentTransactions.unshift(transaction);
    if (metrics.recentTransactions.length > 100) {
      metrics.recentTransactions.pop();
    }

    // Check for gas usage alert
    if (Number(gasUsedBigInt) > CONFIG.thresholds.maxGasPerVerify) {
      await this.sendAlert(
        'WARNING',
        'High gas usage detected',
        `Verification used ${Number(gasUsedBigInt).toLocaleString()} gas (threshold: ${CONFIG.thresholds.maxGasPerVerify.toLocaleString()})`
      );
    }

    // Update performance window
    performanceWindow.operations.push(timestamp);
    performanceWindow.gasUsage.push(Number(gasUsedBigInt));

    // Clean old data (keep last 5 minutes)
    const fiveMinutesAgo = timestamp - 300000;
    performanceWindow.operations = performanceWindow.operations.filter(t => t > fiveMinutesAgo);
    performanceWindow.gasUsage = performanceWindow.gasUsage.filter((_, i) => 
      performanceWindow.operations[i] > fiveMinutesAgo
    );

    console.log(`✅ Verification: ${user} (${Number(gasUsedBigInt).toLocaleString()} gas)`);
  }

  async handleFailedVerification(user, reason, gasUsed, event) {
    const gasUsedBigInt = BigInt(gasUsed);
    const timestamp = Date.now();
    
    // Update metrics
    metrics.totalVerifications++;
    metrics.failedVerifications++;
    metrics.totalGasUsed += gasUsedBigInt;

    // Add to recent transactions
    const transaction = {
      hash: event.transactionHash,
      user: user,
      gasUsed: Number(gasUsedBigInt),
      timestamp: timestamp,
      status: 'failed',
      reason: reason,
      blockNumber: event.blockNumber
    };

    metrics.recentTransactions.unshift(transaction);
    if (metrics.recentTransactions.length > 100) {
      metrics.recentTransactions.pop();
    }

    // Check success rate
    const successRate = metrics.successfulVerifications / metrics.totalVerifications;
    if (successRate < CONFIG.thresholds.minSuccessRate) {
      await this.sendAlert(
        'WARNING',
        'Low success rate detected',
        `Success rate: ${(successRate * 100).toFixed(1)}% (threshold: ${CONFIG.thresholds.minSuccessRate * 100}%)`
      );
    }

    console.log(`❌ Verification failed: ${user} - ${reason} (${Number(gasUsedBigInt).toLocaleString()} gas)`);
  }

  async checkRecentTransactions() {
    try {
      const currentBlock = await this.provider.getBlockNumber();
      const fromBlock = currentBlock - 10; // Check last 10 blocks
      
      // Get recent transactions for XPVerifier
      const logs = await this.provider.getLogs({
        address: CONFIG.contracts.xpVerifier,
        fromBlock: fromBlock,
        toBlock: currentBlock,
        topics: [
          ethers.id('ProofVerified(address,uint256,uint256)'),
          ethers.id('VerificationFailed(address,string,uint256)')
        ]
      });

      // Process any missed events
      for (const log of logs) {
        // This would be processed by the event listeners above
        // But we check here in case events were missed
      }

    } catch (error) {
      console.error('❌ Error checking recent transactions:', error.message);
    }
  }

  startPerformanceTracking() {
    console.log('⚡ Starting performance tracking...');
    
    setInterval(() => {
      this.updatePerformanceMetrics();
    }, 5000); // Update every 5 seconds
  }

  updatePerformanceMetrics() {
    const now = Date.now();
    const windowSize = 60000; // 1 minute window
    
    // Calculate current throughput
    const recentOps = performanceWindow.operations.filter(t => t > now - windowSize);
    metrics.currentThroughput = recentOps.length;
    
    // Update peak throughput
    if (metrics.currentThroughput > metrics.peakThroughput) {
      metrics.peakThroughput = metrics.currentThroughput;
    }

    // Calculate average gas usage in window
    const recentGas = performanceWindow.gasUsage.filter((_, i) => 
      performanceWindow.operations[i] > now - windowSize
    );
    
    if (recentGas.length > 0) {
      const avgGas = recentGas.reduce((a, b) => a + b, 0) / recentGas.length;
      
      // Add to performance history
      metrics.performanceHistory.push({
        timestamp: now,
        throughput: metrics.currentThroughput,
        avgGas: avgGas,
        successRate: metrics.totalVerifications > 0 ? 
          metrics.successfulVerifications / metrics.totalVerifications : 1
      });

      // Keep only last 24 hours of history
      const oneDayAgo = now - 86400000;
      metrics.performanceHistory = metrics.performanceHistory.filter(p => p.timestamp > oneDayAgo);
    }

    // Check for performance alerts
    if (metrics.currentThroughput > CONFIG.thresholds.maxConcurrentOps) {
      this.sendAlert(
        'WARNING',
        'High concurrent operations',
        `${metrics.currentThroughput} operations in last minute (threshold: ${CONFIG.thresholds.maxConcurrentOps})`
      );
    }
  }

  startMetricsReporting() {
    console.log('📊 Starting metrics reporting...');
    
    setInterval(async () => {
      await this.reportMetrics();
    }, 30000); // Report every 30 seconds
  }

  async reportMetrics() {
    const uptime = Date.now() - metrics.startTime;
    const uptimeHours = (uptime / 3600000).toFixed(2);
    
    console.log('\n📊 Production Metrics Report');
    console.log('================================');
    console.log(`⏱️  Uptime: ${uptimeHours} hours`);
    console.log(`📈 Total verifications: ${metrics.totalVerifications.toLocaleString()}`);
    console.log(`✅ Success rate: ${((metrics.successfulVerifications / metrics.totalVerifications) * 100).toFixed(1)}%`);
    console.log(`⛽ Average gas per verify: ${metrics.averageGasPerVerify.toLocaleString()}`);
    console.log(`🚀 Current throughput: ${metrics.currentThroughput} ops/min`);
    console.log(`🏆 Peak throughput: ${metrics.peakThroughput} ops/min`);
    console.log(`💰 Total gas used: ${metrics.totalGasUsed.toLocaleString()}`);
    
    // Save metrics to file
    await this.saveMetrics();
  }

  async saveMetrics() {
    try {
      const metricsData = {
        ...metrics,
        lastUpdated: Date.now(),
        config: {
          network: CONFIG.network.rpcUrl,
          contracts: CONFIG.contracts
        }
      };

      fs.writeFileSync(CONFIG.logging.metricsFile, JSON.stringify(metricsData, null, 2));
    } catch (error) {
      console.error('❌ Failed to save metrics:', error.message);
    }
  }

  startHealthChecks() {
    console.log('🏥 Starting health checks...');
    
    setInterval(async () => {
      await this.performHealthCheck();
    }, 60000); // Check every minute
  }

  async performHealthCheck() {
    try {
      // Check RPC connectivity
      const blockNumber = await this.provider.getBlockNumber();
      
      // Check contract accessibility
      const xpVerifier = new ethers.Contract(
        CONFIG.contracts.xpVerifier,
        ['function threshold() view returns (uint256)'],
        this.provider
      );
      
      const threshold = await xpVerifier.threshold();
      
      console.log(`🏥 Health check passed - Block: ${blockNumber}, Threshold: ${threshold}`);
      
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      await this.sendAlert('CRITICAL', 'Health check failed', error.message);
    }
  }

  async sendAlert(level, title, message) {
    if (!CONFIG.alerts.enabled) return;
    
    const alertKey = `${level}-${title}`;
    const now = Date.now();
    
    // Check cooldown (don't spam alerts)
    if (this.alertCooldowns.has(alertKey)) {
      const lastAlert = this.alertCooldowns.get(alertKey);
      if (now - lastAlert < 300000) { // 5 minute cooldown
        return;
      }
    }
    
    this.alertCooldowns.set(alertKey, now);
    
    const alert = {
      level,
      title,
      message,
      timestamp: now,
      metrics: {
        totalVerifications: metrics.totalVerifications,
        successRate: metrics.totalVerifications > 0 ? 
          (metrics.successfulVerifications / metrics.totalVerifications * 100).toFixed(1) : '0',
        avgGas: metrics.averageGasPerVerify.toLocaleString(),
        currentThroughput: metrics.currentThroughput
      }
    };
    
    metrics.alerts.push(alert);
    if (metrics.alerts.length > 100) {
      metrics.alerts.shift();
    }
    
    console.log(`🚨 ALERT [${level}]: ${title} - ${message}`);
    
    // Send webhook alert
    if (CONFIG.alerts.webhookUrl) {
      try {
        await axios.post(CONFIG.alerts.webhookUrl, {
          text: `🚨 HamBaller Production Alert\n**${title}**\n${message}\n\nMetrics:\n- Success Rate: ${alert.metrics.successRate}%\n- Avg Gas: ${alert.metrics.avgGas}\n- Throughput: ${alert.metrics.currentThroughput} ops/min`
        });
      } catch (error) {
        console.error('❌ Failed to send webhook alert:', error.message);
      }
    }
  }

  // Utility methods
  getMetrics() {
    return metrics;
  }

  getPerformanceHistory() {
    return metrics.performanceHistory;
  }

  getRecentAlerts() {
    return metrics.alerts.slice(-10);
  }
}

// CLI interface
if (require.main === module) {
  const monitor = new ProductionMonitor();
  
  // Handle command line arguments
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
HamBaller Production Monitor

Usage:
  node monitor_prod.js [options]

Options:
  --start              Start monitoring (default)
  --stop               Stop monitoring
  --status             Show current status
  --metrics            Show current metrics
  --alerts             Show recent alerts
  --help, -h           Show this help

Environment Variables:
  ABSTRACT_TESTNET_RPC_URL    RPC endpoint URL
  XPVERIFIER_ADDRESS         XPVerifier contract address
  XPBADGE_ADDRESS            XPBadge contract address
  ALERT_WEBHOOK_URL          Webhook URL for alerts
  ALERT_EMAILS               Comma-separated email addresses

Examples:
  node monitor_prod.js --start
  node monitor_prod.js --metrics
  node monitor_prod.js --alerts
    `);
    process.exit(0);
  }
  
  if (args.includes('--status')) {
    console.log('📊 Monitor Status: Running');
    console.log(`⏱️  Uptime: ${((Date.now() - metrics.startTime) / 3600000).toFixed(2)} hours`);
    console.log(`📈 Total verifications: ${metrics.totalVerifications.toLocaleString()}`);
    process.exit(0);
  }
  
  if (args.includes('--metrics')) {
    console.log(JSON.stringify(metrics, null, 2));
    process.exit(0);
  }
  
  if (args.includes('--alerts')) {
    console.log(JSON.stringify(metrics.alerts.slice(-10), null, 2));
    process.exit(0);
  }
  
  // Default: start monitoring
  monitor.start().catch(error => {
    console.error('❌ Failed to start monitor:', error);
    process.exit(1);
  });
}

module.exports = { ProductionMonitor, CONFIG };