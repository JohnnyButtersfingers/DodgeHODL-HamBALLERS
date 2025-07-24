#!/usr/bin/env node

/**
 * Production Monitoring Script - Phase 9 Final Polish
 * 
 * Monitors gas usage, throughput, and system health for HamBaller.xyz
 * Integrates with Thirdweb for real-time contract monitoring
 * Provides alerts for gas spikes and throughput degradation
 */

const { ThirdwebSDK } = require("@thirdweb-dev/sdk");
const { ethers } = require("ethers");
const { createClient } = require('@supabase/supabase-js');

// Configuration
const MONITORING_CONFIG = {
  network: {
    testnet: {
      name: "Abstract Testnet",
      chainId: 11124,
      rpcUrl: process.env.ABSTRACT_TESTNET_RPC || "https://api.testnet.abs.xyz",
    },
    mainnet: {
      name: "Abstract Mainnet", 
      chainId: 2741,
      rpcUrl: process.env.ABSTRACT_MAINNET_RPC || "https://api.abs.xyz",
    }
  },
  contracts: {
    xpBadge: process.env.XPBADGE_CONTRACT,
    xpVerifier: process.env.XPVERIFIER_CONTRACT
  },
  thresholds: {
    maxGasUsage: 300000, // Alert if gas > 300k
    minThroughput: 200,  // Alert if throughput < 200 ops/sec
    maxResponseTime: 5000, // Alert if response > 5s
    errorRateThreshold: 0.05 // Alert if error rate > 5%
  },
  alerts: {
    discord: process.env.DISCORD_WEBHOOK_URL,
    email: process.env.ALERT_EMAIL,
    supabase: {
      url: process.env.SUPABASE_URL,
      key: process.env.SUPABASE_ANON_KEY
    }
  }
};

class ProductionMonitor {
  constructor() {
    this.sdk = null;
    this.provider = null;
    this.supabase = null;
    this.metrics = {
      gasUsage: [],
      throughput: [],
      errors: [],
      responseTime: []
    };
    this.isRunning = false;
  }

  async initialize() {
    try {
      // Initialize Thirdweb SDK
      const network = process.env.NODE_ENV === 'production' ? 
        MONITORING_CONFIG.network.mainnet : 
        MONITORING_CONFIG.network.testnet;

      this.provider = new ethers.JsonRpcProvider(network.rpcUrl);
      this.sdk = ThirdwebSDK.fromPrivateKey(
        process.env.MONITOR_PRIVATE_KEY,
        network.chainId,
        {
          clientId: process.env.THIRDWEB_CLIENT_ID
        }
      );

      // Initialize Supabase for logging
      if (MONITORING_CONFIG.alerts.supabase.url) {
        this.supabase = createClient(
          MONITORING_CONFIG.alerts.supabase.url,
          MONITORING_CONFIG.alerts.supabase.key
        );
      }

      console.log(`🔍 Production Monitor initialized for ${network.name}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize monitoring:', error);
      return false;
    }
  }

  async startMonitoring() {
    if (!await this.initialize()) {
      process.exit(1);
    }

    this.isRunning = true;
    console.log('🚀 Starting production monitoring...\n');

    // Monitor gas usage every 30 seconds
    setInterval(() => this.monitorGasUsage(), 30000);
    
    // Monitor throughput every 60 seconds
    setInterval(() => this.monitorThroughput(), 60000);
    
    // Monitor contract health every 2 minutes
    setInterval(() => this.monitorContractHealth(), 120000);
    
    // Generate hourly reports
    setInterval(() => this.generateHourlyReport(), 3600000);

    // Graceful shutdown
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  async monitorGasUsage() {
    try {
      const xpBadgeContract = await this.sdk.getContract(MONITORING_CONFIG.contracts.xpBadge);
      
      // Get recent transactions
      const latestBlock = await this.provider.getBlockNumber();
      const fromBlock = latestBlock - 100; // Last 100 blocks (~5 minutes)
      
      const events = await xpBadgeContract.events.getAllEvents({
        fromBlock,
        toBlock: latestBlock
      });

      let totalGas = 0;
      let transactionCount = 0;

      for (const event of events) {
        if (event.transaction && event.transaction.gasUsed) {
          totalGas += parseInt(event.transaction.gasUsed.toString());
          transactionCount++;
        }
      }

      if (transactionCount > 0) {
        const avgGas = totalGas / transactionCount;
        this.metrics.gasUsage.push({
          timestamp: new Date(),
          avgGas,
          totalTransactions: transactionCount
        });

        console.log(`⛽ Gas Monitoring: Avg ${Math.round(avgGas).toLocaleString()} gas/tx (${transactionCount} txs)`);

        // Alert if gas usage exceeds threshold
        if (avgGas > MONITORING_CONFIG.thresholds.maxGasUsage) {
          await this.sendAlert('HIGH_GAS_USAGE', {
            currentGas: Math.round(avgGas),
            threshold: MONITORING_CONFIG.thresholds.maxGasUsage,
            transactions: transactionCount
          });
        }
      }
    } catch (error) {
      console.error('❌ Gas monitoring error:', error.message);
      await this.logError('gas_monitoring', error);
    }
  }

  async monitorThroughput() {
    try {
      const xpBadgeContract = await this.sdk.getContract(MONITORING_CONFIG.contracts.xpBadge);
      
      const startTime = Date.now();
      const latestBlock = await this.provider.getBlockNumber();
      const fromBlock = latestBlock - 300; // Last 300 blocks (~15 minutes)
      
      const events = await xpBadgeContract.events.getAllEvents({
        fromBlock,
        toBlock: latestBlock
      });

      const endTime = Date.now();
      const timeWindow = (endTime - startTime) / 1000; // seconds
      const throughput = events.length / timeWindow;

      this.metrics.throughput.push({
        timestamp: new Date(),
        throughput: throughput,
        operations: events.length,
        timeWindow
      });

      console.log(`📊 Throughput: ${throughput.toFixed(2)} ops/sec (${events.length} ops in ${timeWindow.toFixed(1)}s)`);

      // Alert if throughput drops below threshold
      if (throughput < MONITORING_CONFIG.thresholds.minThroughput) {
        await this.sendAlert('LOW_THROUGHPUT', {
          currentThroughput: throughput.toFixed(2),
          threshold: MONITORING_CONFIG.thresholds.minThroughput,
          operations: events.length
        });
      }
    } catch (error) {
      console.error('❌ Throughput monitoring error:', error.message);
      await this.logError('throughput_monitoring', error);
    }
  }

  async monitorContractHealth() {
    try {
      const startTime = Date.now();
      
      // Test contract connectivity
      const xpBadgeContract = await this.sdk.getContract(MONITORING_CONFIG.contracts.xpBadge);
      const totalSupply = await xpBadgeContract.call("totalSupply");
      
      const responseTime = Date.now() - startTime;
      
      this.metrics.responseTime.push({
        timestamp: new Date(),
        responseTime,
        totalSupply: totalSupply.toString()
      });

      console.log(`🏥 Contract Health: ${responseTime}ms response time, ${totalSupply} total badges`);

      // Alert if response time is too high
      if (responseTime > MONITORING_CONFIG.thresholds.maxResponseTime) {
        await this.sendAlert('SLOW_RESPONSE', {
          responseTime,
          threshold: MONITORING_CONFIG.thresholds.maxResponseTime
        });
      }
    } catch (error) {
      console.error('❌ Contract health check failed:', error.message);
      await this.logError('contract_health', error);
      
      await this.sendAlert('CONTRACT_UNREACHABLE', {
        error: error.message,
        contract: MONITORING_CONFIG.contracts.xpBadge
      });
    }
  }

  async sendAlert(type, data) {
    const alert = {
      type,
      timestamp: new Date().toISOString(),
      data,
      severity: this.getAlertSeverity(type)
    };

    console.log(`🚨 ALERT [${alert.severity}]: ${type}`, data);

    // Log to Supabase
    if (this.supabase) {
      await this.supabase.from('production_alerts').insert([alert]);
    }

    // Send Discord webhook if configured
    if (MONITORING_CONFIG.alerts.discord) {
      await this.sendDiscordAlert(alert);
    }
  }

  async sendDiscordAlert(alert) {
    try {
      const webhook = MONITORING_CONFIG.alerts.discord;
      const embed = {
        title: `🚨 Production Alert: ${alert.type}`,
        color: alert.severity === 'critical' ? 0xff0000 : 
               alert.severity === 'warning' ? 0xffa500 : 0xffff00,
        fields: Object.entries(alert.data).map(([key, value]) => ({
          name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          value: String(value),
          inline: true
        })),
        timestamp: alert.timestamp
      };

      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] })
      });
    } catch (error) {
      console.error('Failed to send Discord alert:', error);
    }
  }

  getAlertSeverity(type) {
    const criticalAlerts = ['CONTRACT_UNREACHABLE', 'HIGH_ERROR_RATE'];
    const warningAlerts = ['HIGH_GAS_USAGE', 'LOW_THROUGHPUT', 'SLOW_RESPONSE'];
    
    if (criticalAlerts.includes(type)) return 'critical';
    if (warningAlerts.includes(type)) return 'warning';
    return 'info';
  }

  async logError(source, error) {
    const errorLog = {
      source,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };

    this.metrics.errors.push(errorLog);

    if (this.supabase) {
      await this.supabase.from('monitoring_errors').insert([errorLog]);
    }
  }

  async generateHourlyReport() {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 3600000);

    // Filter metrics from last hour
    const hourlyGas = this.metrics.gasUsage.filter(m => m.timestamp > hourAgo);
    const hourlyThroughput = this.metrics.throughput.filter(m => m.timestamp > hourAgo);
    const hourlyErrors = this.metrics.errors.filter(m => new Date(m.timestamp) > hourAgo);

    const report = {
      timestamp: now.toISOString(),
      gas: {
        average: hourlyGas.length > 0 ? 
          hourlyGas.reduce((sum, m) => sum + m.avgGas, 0) / hourlyGas.length : 0,
        peak: hourlyGas.length > 0 ? Math.max(...hourlyGas.map(m => m.avgGas)) : 0
      },
      throughput: {
        average: hourlyThroughput.length > 0 ?
          hourlyThroughput.reduce((sum, m) => sum + m.throughput, 0) / hourlyThroughput.length : 0,
        peak: hourlyThroughput.length > 0 ? Math.max(...hourlyThroughput.map(m => m.throughput)) : 0
      },
      errors: hourlyErrors.length,
      uptime: this.calculateUptime()
    };

    console.log('\n📋 Hourly Report:');
    console.log(`   Gas: ${Math.round(report.gas.average).toLocaleString()} avg, ${Math.round(report.gas.peak).toLocaleString()} peak`);
    console.log(`   Throughput: ${report.throughput.average.toFixed(2)} ops/sec avg, ${report.throughput.peak.toFixed(2)} peak`);
    console.log(`   Errors: ${report.errors}`);
    console.log(`   Uptime: ${report.uptime.toFixed(2)}%\n`);

    // Store report
    if (this.supabase) {
      await this.supabase.from('hourly_reports').insert([report]);
    }
  }

  calculateUptime() {
    // Simple uptime calculation based on successful health checks
    const recentHealthChecks = this.metrics.responseTime.filter(
      m => m.timestamp > new Date(Date.now() - 3600000)
    );
    return recentHealthChecks.length > 0 ? 
      (recentHealthChecks.length / (3600 / 120)) * 100 : 100; // Expected 30 checks per hour
  }

  async shutdown() {
    console.log('\n🛑 Shutting down production monitor...');
    this.isRunning = false;
    
    // Generate final report
    await this.generateHourlyReport();
    
    console.log('✅ Production monitor stopped gracefully');
    process.exit(0);
  }
}

// Start monitoring if called directly
if (require.main === module) {
  const monitor = new ProductionMonitor();
  monitor.startMonitoring().catch(console.error);
}

module.exports = ProductionMonitor;