#!/usr/bin/env node

/**
 * Production Monitoring Script for HamBaller XP System
 * 
 * Real-time tracking of:
 * - Gas usage and optimization metrics
 * - Throughput (operations per second)
 * - Badge mint events via Thirdweb analytics
 * - Alert system for gas spikes >300k
 * - Performance dashboards and reporting
 * 
 * Usage: node scripts/monitor_prod.js [--network testnet|mainnet] [--interval 5000]
 */

const { ethers } = require('ethers');
const { ThirdwebSDK } = require('@thirdweb-dev/sdk');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

// Configuration
const MONITORING_CONFIG = {
  networks: {
    testnet: {
      chainId: 11124,
      rpcUrl: 'https://api.testnet.abs.xyz',
      explorerUrl: 'https://explorer.testnet.abs.xyz',
      contracts: {
        xpVerifier: '0x742d35Cc6634C0532925a3b844Bc9e7595f6E123',
        xpBadge: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199'
      }
    },
    mainnet: {
      chainId: 2741,
      rpcUrl: 'https://api.mainnet.abs.xyz',
      explorerUrl: 'https://explorer.abs.xyz',
      contracts: {
        xpVerifier: process.env.MAINNET_XPVERIFIER_ADDRESS,
        xpBadge: process.env.MAINNET_XPBADGE_ADDRESS
      }
    }
  },
  
  monitoring: {
    interval: parseInt(process.env.MONITOR_INTERVAL) || 5000, // 5 seconds
    gasThreshold: 300000, // Alert threshold for gas usage
    tpsThreshold: 100, // Alert threshold for low TPS
    errorRateThreshold: 0.05, // 5% error rate threshold
    retentionDays: 30,
    batchSize: 100
  },
  
  alerts: {
    enabled: true,
    webhookUrl: process.env.ALERT_WEBHOOK_URL,
    emailEnabled: false,
    slackEnabled: !!process.env.SLACK_WEBHOOK_URL,
    consoleEnabled: true
  },
  
  thirdweb: {
    clientId: process.env.THIRDWEB_CLIENT_ID,
    secretKey: process.env.THIRDWEB_SECRET_KEY,
    analyticsEnabled: !!process.env.THIRDWEB_CLIENT_ID
  }
};

class ProductionMonitor {
  constructor(network = 'testnet') {
    this.network = network;
    this.config = MONITORING_CONFIG.networks[network];
    this.provider = null;
    this.contracts = {};
    this.thirdwebSdk = null;
    
    this.metrics = {
      startTime: Date.now(),
      totalTransactions: 0,
      totalGasUsed: 0n,
      avgGasUsage: 0,
      currentTPS: 0,
      peakTPS: 0,
      errorCount: 0,
      successCount: 0,
      lastBlockNumber: 0,
      recentTransactions: [],
      gasUsageHistory: [],
      tpsHistory: [],
      alertHistory: []
    };
    
    this.isMonitoring = false;
    this.logDir = path.join(__dirname, '..', 'monitoring-logs');
  }

  async initialize() {
    console.log(`🚀 Initializing Production Monitor for ${this.network}...`);
    
    try {
      // Setup provider with fallback
      this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
      
      // Test connection
      const blockNumber = await this.provider.getBlockNumber();
      console.log(`📡 Connected to ${this.network} - Block: ${blockNumber}`);
      this.metrics.lastBlockNumber = blockNumber;
      
      // Initialize contracts
      await this.initializeContracts();
      
      // Initialize Thirdweb SDK if configured
      if (MONITORING_CONFIG.thirdweb.analyticsEnabled) {
        await this.initializeThirdweb();
      }
      
      // Setup logging directory
      await fs.mkdir(this.logDir, { recursive: true });
      
      console.log('✅ Production Monitor initialized successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Monitor initialization failed:', error.message);
      return false;
    }
  }

  async initializeContracts() {
    try {
      // XPVerifier contract
      if (this.config.contracts.xpVerifier) {
        const xpVerifierABI = [
          'event ProofVerified(address indexed player, bytes32 indexed nullifier, uint256 xpAmount)',
          'function verifyXPProof((uint256[2] a, uint256[2][2] b, uint256[2] c), uint256[]) external returns (bool)',
          'function isNullifierUsed(bytes32) external view returns (bool)'
        ];
        
        this.contracts.xpVerifier = new ethers.Contract(
          this.config.contracts.xpVerifier,
          xpVerifierABI,
          this.provider
        );
        
        console.log('✅ XPVerifier contract initialized');
      }
      
      // XPBadge contract
      if (this.config.contracts.xpBadge) {
        const xpBadgeABI = [
          'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
          'event BadgeMinted(address indexed player, uint256 indexed tokenId, uint256 xpAmount)',
          'function totalSupply() external view returns (uint256)',
          'function ownerOf(uint256 tokenId) external view returns (address)'
        ];
        
        this.contracts.xpBadge = new ethers.Contract(
          this.config.contracts.xpBadge,
          xpBadgeABI,
          this.provider
        );
        
        console.log('✅ XPBadge contract initialized');
      }
      
    } catch (error) {
      console.warn('⚠️ Contract initialization partial failure:', error.message);
    }
  }

  async initializeThirdweb() {
    try {
      this.thirdwebSdk = ThirdwebSDK.fromPrivateKey(
        process.env.PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000001',
        this.config.chainId,
        {
          clientId: MONITORING_CONFIG.thirdweb.clientId,
          secretKey: MONITORING_CONFIG.thirdweb.secretKey
        }
      );
      
      console.log('✅ Thirdweb SDK initialized');
    } catch (error) {
      console.warn('⚠️ Thirdweb initialization failed:', error.message);
      MONITORING_CONFIG.thirdweb.analyticsEnabled = false;
    }
  }

  async startMonitoring() {
    if (this.isMonitoring) {
      console.log('⚠️ Monitoring already active');
      return;
    }
    
    this.isMonitoring = true;
    console.log(`🔍 Starting production monitoring on ${this.network}...`);
    console.log(`📊 Monitoring interval: ${MONITORING_CONFIG.monitoring.interval}ms`);
    console.log(`🚨 Gas threshold: ${MONITORING_CONFIG.monitoring.gasThreshold.toLocaleString()} gas`);
    
    // Start monitoring loops
    this.monitorTransactions();
    this.monitorPerformance();
    this.monitorThirdwebAnalytics();
    
    // Setup periodic tasks
    this.setupPeriodicTasks();
    
    // Setup graceful shutdown
    process.on('SIGINT', () => this.stopMonitoring());
    process.on('SIGTERM', () => this.stopMonitoring());
    
    console.log('✅ Production monitoring started');
  }

  async monitorTransactions() {
    if (!this.isMonitoring) return;
    
    try {
      const currentBlock = await this.provider.getBlockNumber();
      
      if (currentBlock > this.metrics.lastBlockNumber) {
        // Process new blocks
        for (let blockNum = this.metrics.lastBlockNumber + 1; blockNum <= currentBlock; blockNum++) {
          await this.processBlock(blockNum);
        }
        this.metrics.lastBlockNumber = currentBlock;
      }
      
    } catch (error) {
      console.error('📡 Transaction monitoring error:', error.message);
      this.metrics.errorCount++;
    }
    
    // Schedule next check
    setTimeout(() => this.monitorTransactions(), MONITORING_CONFIG.monitoring.interval);
  }

  async processBlock(blockNumber) {
    try {
      const block = await this.provider.getBlock(blockNumber, true);
      if (!block || !block.transactions) return;
      
      const relevantTxs = block.transactions.filter(tx => 
        tx.to === this.config.contracts.xpVerifier || 
        tx.to === this.config.contracts.xpBadge
      );
      
      for (const tx of relevantTxs) {
        await this.analyzeTransaction(tx);
      }
      
      // Update TPS calculation
      this.updateTPS(relevantTxs.length);
      
    } catch (error) {
      console.error(`❌ Block ${blockNumber} processing error:`, error.message);
    }
  }

  async analyzeTransaction(tx) {
    try {
      const receipt = await this.provider.getTransactionReceipt(tx.hash);
      if (!receipt) return;
      
      const gasUsed = receipt.gasUsed;
      const success = receipt.status === 1;
      
      // Update metrics
      this.metrics.totalTransactions++;
      this.metrics.totalGasUsed += gasUsed;
      this.metrics.avgGasUsage = Number(this.metrics.totalGasUsed) / this.metrics.totalTransactions;
      
      if (success) {
        this.metrics.successCount++;
      } else {
        this.metrics.errorCount++;
      }
      
      // Store recent transaction data
      const txData = {
        hash: tx.hash,
        gasUsed: Number(gasUsed),
        success,
        timestamp: Date.now(),
        blockNumber: receipt.blockNumber,
        to: tx.to,
        value: tx.value?.toString() || '0'
      };
      
      this.metrics.recentTransactions.push(txData);
      
      // Keep only recent transactions (last 1000)
      if (this.metrics.recentTransactions.length > 1000) {
        this.metrics.recentTransactions = this.metrics.recentTransactions.slice(-1000);
      }
      
      // Check for gas alerts
      if (Number(gasUsed) > MONITORING_CONFIG.monitoring.gasThreshold) {
        await this.sendGasAlert(txData);
      }
      
      // Log transaction
      await this.logTransaction(txData);
      
    } catch (error) {
      console.error(`❌ Transaction analysis error for ${tx.hash}:`, error.message);
    }
  }

  updateTPS(transactionCount) {
    const now = Date.now();
    const windowMs = 60000; // 1 minute window
    
    // Add current measurement
    this.metrics.tpsHistory.push({
      timestamp: now,
      count: transactionCount
    });
    
    // Remove old measurements
    this.metrics.tpsHistory = this.metrics.tpsHistory.filter(
      entry => now - entry.timestamp < windowMs
    );
    
    // Calculate current TPS
    const totalTxs = this.metrics.tpsHistory.reduce((sum, entry) => sum + entry.count, 0);
    const timeSpan = Math.max(windowMs / 1000, 1); // Convert to seconds
    this.metrics.currentTPS = totalTxs / timeSpan;
    
    // Update peak TPS
    if (this.metrics.currentTPS > this.metrics.peakTPS) {
      this.metrics.peakTPS = this.metrics.currentTPS;
    }
  }

  async monitorPerformance() {
    if (!this.isMonitoring) return;
    
    try {
      // Calculate error rate
      const totalOps = this.metrics.successCount + this.metrics.errorCount;
      const errorRate = totalOps > 0 ? this.metrics.errorCount / totalOps : 0;
      
      // Check thresholds
      if (errorRate > MONITORING_CONFIG.monitoring.errorRateThreshold) {
        await this.sendErrorRateAlert(errorRate);
      }
      
      if (this.metrics.currentTPS > 0 && this.metrics.currentTPS < MONITORING_CONFIG.monitoring.tpsThreshold) {
        await this.sendLowTPSAlert(this.metrics.currentTPS);
      }
      
      // Log current performance
      this.logPerformanceMetrics();
      
    } catch (error) {
      console.error('📊 Performance monitoring error:', error.message);
    }
    
    // Schedule next check
    setTimeout(() => this.monitorPerformance(), MONITORING_CONFIG.monitoring.interval * 2);
  }

  async monitorThirdwebAnalytics() {
    if (!MONITORING_CONFIG.thirdweb.analyticsEnabled || !this.thirdwebSdk) {
      setTimeout(() => this.monitorThirdwebAnalytics(), 30000); // Check every 30s
      return;
    }
    
    try {
      // Get contract analytics from Thirdweb
      if (this.config.contracts.xpBadge) {
        const contract = await this.thirdwebSdk.getContract(this.config.contracts.xpBadge);
        
        // Get recent mint events
        const mintEvents = await contract.events.getEvents('Transfer', {
          fromBlock: this.metrics.lastBlockNumber - 100, // Last 100 blocks
          toBlock: 'latest'
        });
        
        // Process mint events
        for (const event of mintEvents) {
          if (event.args.from === '0x0000000000000000000000000000000000000000') {
            await this.processMintEvent(event);
          }
        }
      }
      
    } catch (error) {
      console.error('📈 Thirdweb analytics error:', error.message);
    }
    
    setTimeout(() => this.monitorThirdwebAnalytics(), 30000);
  }

  async processMintEvent(event) {
    const mintData = {
      player: event.args.to,
      tokenId: event.args.tokenId?.toString(),
      timestamp: Date.now(),
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash
    };
    
    console.log(`🎖️ Badge minted: Player ${mintData.player} received token ${mintData.tokenId}`);
    await this.logMintEvent(mintData);
  }

  async sendGasAlert(txData) {
    const alert = {
      type: 'GAS_SPIKE',
      severity: 'HIGH',
      message: `Gas usage exceeded threshold: ${txData.gasUsed.toLocaleString()} gas`,
      threshold: MONITORING_CONFIG.monitoring.gasThreshold,
      actual: txData.gasUsed,
      transaction: txData.hash,
      timestamp: new Date().toISOString(),
      network: this.network
    };
    
    await this.sendAlert(alert);
  }

  async sendErrorRateAlert(errorRate) {
    const alert = {
      type: 'HIGH_ERROR_RATE',
      severity: 'MEDIUM',
      message: `Error rate exceeded threshold: ${(errorRate * 100).toFixed(2)}%`,
      threshold: MONITORING_CONFIG.monitoring.errorRateThreshold * 100,
      actual: errorRate * 100,
      timestamp: new Date().toISOString(),
      network: this.network
    };
    
    await this.sendAlert(alert);
  }

  async sendLowTPSAlert(currentTPS) {
    const alert = {
      type: 'LOW_THROUGHPUT',
      severity: 'MEDIUM',
      message: `TPS below threshold: ${currentTPS.toFixed(2)} TPS`,
      threshold: MONITORING_CONFIG.monitoring.tpsThreshold,
      actual: currentTPS,
      timestamp: new Date().toISOString(),
      network: this.network
    };
    
    await this.sendAlert(alert);
  }

  async sendAlert(alert) {
    // Prevent duplicate alerts
    const recentAlerts = this.metrics.alertHistory.filter(
      a => Date.now() - new Date(a.timestamp).getTime() < 300000 // 5 minutes
    );
    
    const isDuplicate = recentAlerts.some(a => 
      a.type === alert.type && a.severity === alert.severity
    );
    
    if (isDuplicate) return;
    
    this.metrics.alertHistory.push(alert);
    
    // Console alert
    if (MONITORING_CONFIG.alerts.consoleEnabled) {
      console.log(`\n🚨 ${alert.severity} ALERT: ${alert.type}`);
      console.log(`   ${alert.message}`);
      console.log(`   Network: ${alert.network}`);
      console.log(`   Time: ${alert.timestamp}\n`);
    }
    
    // Webhook alert
    if (MONITORING_CONFIG.alerts.webhookUrl) {
      try {
        await axios.post(MONITORING_CONFIG.alerts.webhookUrl, alert);
      } catch (error) {
        console.error('Webhook alert failed:', error.message);
      }
    }
    
    // Slack alert
    if (MONITORING_CONFIG.alerts.slackEnabled && process.env.SLACK_WEBHOOK_URL) {
      try {
        await axios.post(process.env.SLACK_WEBHOOK_URL, {
          text: `🚨 ${alert.severity}: ${alert.message}`,
          attachments: [{
            color: alert.severity === 'HIGH' ? 'danger' : 'warning',
            fields: [
              { title: 'Network', value: alert.network, short: true },
              { title: 'Type', value: alert.type, short: true },
              { title: 'Time', value: alert.timestamp, short: false }
            ]
          }]
        });
      } catch (error) {
        console.error('Slack alert failed:', error.message);
      }
    }
    
    // Save alert to file
    await this.saveAlert(alert);
  }

  logPerformanceMetrics() {
    const uptime = (Date.now() - this.metrics.startTime) / 1000;
    const errorRate = this.metrics.errorCount + this.metrics.successCount > 0 ? 
      (this.metrics.errorCount / (this.metrics.errorCount + this.metrics.successCount) * 100) : 0;
    
    console.log(`\n📊 Performance Dashboard (${this.network.toUpperCase()})`);
    console.log('=' .repeat(50));
    console.log(`🕐 Uptime: ${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`);
    console.log(`📈 Current TPS: ${this.metrics.currentTPS.toFixed(2)}`);
    console.log(`🏆 Peak TPS: ${this.metrics.peakTPS.toFixed(2)}`);
    console.log(`⛽ Avg Gas: ${Math.round(this.metrics.avgGasUsage).toLocaleString()}`);
    console.log(`✅ Success Rate: ${(100 - errorRate).toFixed(2)}%`);
    console.log(`📦 Total Transactions: ${this.metrics.totalTransactions.toLocaleString()}`);
    console.log(`🔥 Gas Total: ${(Number(this.metrics.totalGasUsed) / 1e9).toFixed(3)}B gas`);
    console.log('=' .repeat(50));
  }

  async logTransaction(txData) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      network: this.network,
      type: 'transaction',
      ...txData
    };
    
    const logFile = path.join(this.logDir, `transactions-${this.getDateString()}.log`);
    await fs.appendFile(logFile, JSON.stringify(logEntry) + '\n');
  }

  async logMintEvent(mintData) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      network: this.network,
      type: 'mint_event',
      ...mintData
    };
    
    const logFile = path.join(this.logDir, `mints-${this.getDateString()}.log`);
    await fs.appendFile(logFile, JSON.stringify(logEntry) + '\n');
  }

  async saveAlert(alert) {
    const alertFile = path.join(this.logDir, `alerts-${this.getDateString()}.log`);
    await fs.appendFile(alertFile, JSON.stringify(alert) + '\n');
  }

  setupPeriodicTasks() {
    // Generate hourly reports
    setInterval(() => {
      this.generateHourlyReport();
    }, 3600000); // 1 hour
    
    // Clean up old logs
    setInterval(() => {
      this.cleanupOldLogs();
    }, 86400000); // 24 hours
    
    // Save metrics snapshot
    setInterval(() => {
      this.saveMetricsSnapshot();
    }, 300000); // 5 minutes
  }

  async generateHourlyReport() {
    const report = {
      timestamp: new Date().toISOString(),
      network: this.network,
      period: 'hourly',
      metrics: { ...this.metrics },
      performance: {
        avgGasUsage: this.metrics.avgGasUsage,
        currentTPS: this.metrics.currentTPS,
        peakTPS: this.metrics.peakTPS,
        errorRate: this.calculateErrorRate(),
        uptime: Date.now() - this.metrics.startTime
      }
    };
    
    const reportFile = path.join(this.logDir, `hourly-report-${Date.now()}.json`);
    await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
    
    console.log(`📊 Hourly report generated: ${reportFile}`);
  }

  async cleanupOldLogs() {
    try {
      const files = await fs.readdir(this.logDir);
      const cutoff = Date.now() - (MONITORING_CONFIG.monitoring.retentionDays * 24 * 60 * 60 * 1000);
      
      for (const file of files) {
        const filePath = path.join(this.logDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime.getTime() < cutoff) {
          await fs.unlink(filePath);
          console.log(`🗑️ Cleaned up old log: ${file}`);
        }
      }
    } catch (error) {
      console.error('Log cleanup error:', error.message);
    }
  }

  async saveMetricsSnapshot() {
    const snapshot = {
      timestamp: new Date().toISOString(),
      network: this.network,
      metrics: { ...this.metrics }
    };
    
    const snapshotFile = path.join(this.logDir, `metrics-snapshot-${Date.now()}.json`);
    await fs.writeFile(snapshotFile, JSON.stringify(snapshot, null, 2));
  }

  calculateErrorRate() {
    const total = this.metrics.errorCount + this.metrics.successCount;
    return total > 0 ? (this.metrics.errorCount / total) * 100 : 0;
  }

  getDateString() {
    return new Date().toISOString().split('T')[0];
  }

  async stopMonitoring() {
    console.log('\n🛑 Stopping production monitoring...');
    this.isMonitoring = false;
    
    // Generate final report
    await this.generateHourlyReport();
    
    console.log('✅ Production monitoring stopped');
    process.exit(0);
  }

  // Public API methods
  getMetrics() {
    return {
      ...this.metrics,
      errorRate: this.calculateErrorRate(),
      uptime: Date.now() - this.metrics.startTime
    };
  }

  async getDetailedReport() {
    const metrics = this.getMetrics();
    const recent24h = this.metrics.recentTransactions.filter(
      tx => Date.now() - tx.timestamp < 86400000
    );
    
    return {
      network: this.network,
      status: this.isMonitoring ? 'active' : 'stopped',
      metrics,
      recent24h: {
        transactionCount: recent24h.length,
        avgGasUsage: recent24h.length > 0 ? 
          recent24h.reduce((sum, tx) => sum + tx.gasUsed, 0) / recent24h.length : 0,
        successRate: recent24h.length > 0 ? 
          (recent24h.filter(tx => tx.success).length / recent24h.length) * 100 : 0
      },
      alerts: this.metrics.alertHistory.slice(-10) // Last 10 alerts
    };
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const network = args.find(arg => arg.includes('--network'))?.split('=')[1] || 'testnet';
  const interval = parseInt(args.find(arg => arg.includes('--interval'))?.split('=')[1]) || 5000;
  
  // Update interval if provided
  MONITORING_CONFIG.monitoring.interval = interval;
  
  console.log('🚀 HamBaller Production Monitor Starting...');
  console.log(`📡 Network: ${network}`);
  console.log(`⏱️ Interval: ${interval}ms`);
  
  const monitor = new ProductionMonitor(network);
  
  const initialized = await monitor.initialize();
  if (!initialized) {
    console.error('❌ Failed to initialize monitor');
    process.exit(1);
  }
  
  await monitor.startMonitoring();
}

// Export for use as module
module.exports = { ProductionMonitor, MONITORING_CONFIG };

// Run as CLI if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Monitor crashed:', error);
    process.exit(1);
  });
}