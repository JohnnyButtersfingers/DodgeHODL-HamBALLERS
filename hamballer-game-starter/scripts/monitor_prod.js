#!/usr/bin/env node

const ethers = require('ethers');
const axios = require('axios');
const chalk = require('chalk');
const Table = require('cli-table3');
const EventEmitter = require('events');

// Configuration
const CONFIG = {
  RPC_URL: process.env.ABSTRACT_TESTNET_RPC_URL || 'https://api.testnet.abs.xyz',
  VERIFIER_ADDRESS: process.env.XPVERIFIER_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f6E123',
  BADGE_ADDRESS: process.env.XPBADGE_ADDRESS || '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
  THIRDWEB_API_KEY: process.env.THIRDWEB_API_KEY || '',
  ALERT_GAS_THRESHOLD: 300000,
  UPDATE_INTERVAL_MS: 5000,
  METRICS_WINDOW_SIZE: 100,
  ANALYTICS_ENDPOINT: 'https://api.thirdweb.com/analytics/v1'
};

// ABIs
const VERIFIER_ABI = [
  'event ProofVerified(address indexed user, uint256 xp, bytes32 nullifier, uint256 gasUsed)',
  'event NullifierUsed(bytes32 indexed nullifier)',
  'function getVerificationCount() view returns (uint256)',
  'function getNullifierCount() view returns (uint256)'
];

const BADGE_ABI = [
  'event BadgeMinted(address indexed to, uint256 indexed tokenId, uint256 xp, uint256 timestamp)',
  'event BatchMinted(address indexed to, uint256[] tokenIds, uint256[] xpValues)',
  'function totalSupply() view returns (uint256)'
];

// Monitoring state
class ProductionMonitor extends EventEmitter {
  constructor() {
    super();
    this.provider = new ethers.providers.JsonRpcProvider(CONFIG.RPC_URL);
    this.verifierContract = new ethers.Contract(CONFIG.VERIFIER_ADDRESS, VERIFIER_ABI, this.provider);
    this.badgeContract = new ethers.Contract(CONFIG.BADGE_ADDRESS, BADGE_ABI, this.provider);
    
    this.metrics = {
      gasUsage: [],
      throughput: [],
      mintEvents: [],
      errors: [],
      startTime: Date.now(),
      totalVerifications: 0,
      totalMints: 0,
      totalGasUsed: 0n,
      alerts: []
    };
    
    this.lastBlock = 0;
    this.opsBuffer = [];
    this.isRunning = false;
  }

  async start() {
    console.log(chalk.green('🚀 Starting Production Monitor...'));
    console.log(chalk.gray(`Network: Abstract Testnet (Chain ID: 11124)`));
    console.log(chalk.gray(`Verifier: ${CONFIG.VERIFIER_ADDRESS}`));
    console.log(chalk.gray(`Badge: ${CONFIG.BADGE_ADDRESS}`));
    console.log();

    this.isRunning = true;
    this.lastBlock = await this.provider.getBlockNumber();
    
    // Start monitoring loops
    this.monitorEvents();
    this.calculateMetrics();
    this.displayDashboard();
    
    if (CONFIG.THIRDWEB_API_KEY) {
      this.syncThirdwebAnalytics();
    }
    
    // Handle graceful shutdown
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
  }

  async stop() {
    console.log(chalk.yellow('\n📊 Generating final report...'));
    this.isRunning = false;
    await this.generateReport();
    process.exit(0);
  }

  async monitorEvents() {
    while (this.isRunning) {
      try {
        const currentBlock = await this.provider.getBlockNumber();
        
        if (currentBlock > this.lastBlock) {
          // Monitor verification events
          const verificationFilter = this.verifierContract.filters.ProofVerified();
          const verificationEvents = await this.verifierContract.queryFilter(
            verificationFilter,
            this.lastBlock + 1,
            currentBlock
          );
          
          for (const event of verificationEvents) {
            const tx = await event.getTransaction();
            const receipt = await event.getTransactionReceipt();
            const gasUsed = receipt.gasUsed.toNumber();
            
            this.recordVerification({
              user: event.args.user,
              xp: event.args.xp.toNumber(),
              nullifier: event.args.nullifier,
              gasUsed,
              block: event.blockNumber,
              timestamp: Date.now()
            });
            
            // Check for gas alerts
            if (gasUsed > CONFIG.ALERT_GAS_THRESHOLD) {
              this.addAlert('HIGH_GAS', `Gas usage ${gasUsed} exceeds threshold ${CONFIG.ALERT_GAS_THRESHOLD}`, {
                transaction: tx.hash,
                gasUsed,
                user: event.args.user
              });
            }
          }
          
          // Monitor mint events
          const mintFilter = this.badgeContract.filters.BadgeMinted();
          const mintEvents = await this.badgeContract.queryFilter(
            mintFilter,
            this.lastBlock + 1,
            currentBlock
          );
          
          for (const event of mintEvents) {
            this.recordMint({
              to: event.args.to,
              tokenId: event.args.tokenId.toString(),
              xp: event.args.xp.toNumber(),
              block: event.blockNumber,
              timestamp: Date.now()
            });
          }
          
          this.lastBlock = currentBlock;
        }
        
      } catch (error) {
        this.recordError('EVENT_MONITOR', error.message);
      }
      
      await this.sleep(CONFIG.UPDATE_INTERVAL_MS);
    }
  }

  recordVerification(data) {
    this.metrics.totalVerifications++;
    this.metrics.totalGasUsed += BigInt(data.gasUsed);
    this.metrics.gasUsage.push(data.gasUsed);
    
    // Keep sliding window
    if (this.metrics.gasUsage.length > CONFIG.METRICS_WINDOW_SIZE) {
      this.metrics.gasUsage.shift();
    }
    
    this.opsBuffer.push({
      type: 'verification',
      timestamp: data.timestamp
    });
    
    this.emit('verification', data);
  }

  recordMint(data) {
    this.metrics.totalMints++;
    this.metrics.mintEvents.push(data);
    
    // Keep recent mints
    if (this.metrics.mintEvents.length > 50) {
      this.metrics.mintEvents.shift();
    }
    
    this.emit('mint', data);
  }

  recordError(type, message) {
    const error = {
      type,
      message,
      timestamp: Date.now()
    };
    
    this.metrics.errors.push(error);
    
    // Keep recent errors
    if (this.metrics.errors.length > 20) {
      this.metrics.errors.shift();
    }
    
    this.emit('error', error);
  }

  addAlert(type, message, data = {}) {
    const alert = {
      type,
      message,
      data,
      timestamp: Date.now()
    };
    
    this.metrics.alerts.push(alert);
    console.log(chalk.red(`\n⚠️  ALERT: ${message}`));
    
    this.emit('alert', alert);
  }

  async calculateMetrics() {
    while (this.isRunning) {
      try {
        // Calculate throughput (ops/sec)
        const now = Date.now();
        const recentOps = this.opsBuffer.filter(op => now - op.timestamp < 60000);
        const throughput = recentOps.length / 60;
        
        this.metrics.throughput.push({
          value: throughput,
          timestamp: now
        });
        
        // Keep sliding window
        if (this.metrics.throughput.length > CONFIG.METRICS_WINDOW_SIZE) {
          this.metrics.throughput.shift();
        }
        
        // Clean old ops from buffer
        this.opsBuffer = this.opsBuffer.filter(op => now - op.timestamp < 300000);
        
      } catch (error) {
        this.recordError('METRICS_CALC', error.message);
      }
      
      await this.sleep(5000);
    }
  }

  async syncThirdwebAnalytics() {
    while (this.isRunning) {
      try {
        // Fetch Thirdweb analytics if available
        const response = await axios.get(`${CONFIG.ANALYTICS_ENDPOINT}/contract/${CONFIG.VERIFIER_ADDRESS}`, {
          headers: {
            'Authorization': `Bearer ${CONFIG.THIRDWEB_API_KEY}`
          },
          timeout: 10000
        });
        
        if (response.data) {
          this.emit('thirdweb-analytics', response.data);
        }
        
      } catch (error) {
        // Thirdweb analytics is optional
        if (error.response?.status !== 404) {
          this.recordError('THIRDWEB_SYNC', error.message);
        }
      }
      
      await this.sleep(60000); // Sync every minute
    }
  }

  async displayDashboard() {
    while (this.isRunning) {
      console.clear();
      
      // Header
      console.log(chalk.cyan('═'.repeat(80)));
      console.log(chalk.cyan.bold('           HamBaller XP Verification System - Production Monitor'));
      console.log(chalk.cyan('═'.repeat(80)));
      console.log();
      
      // Overview table
      const overviewTable = new Table({
        head: ['Metric', 'Value'],
        colWidths: [30, 45],
        style: { head: ['cyan'] }
      });
      
      const runtime = Math.floor((Date.now() - this.metrics.startTime) / 1000);
      const avgGas = this.metrics.gasUsage.length > 0 
        ? Math.floor(this.metrics.gasUsage.reduce((a, b) => a + b, 0) / this.metrics.gasUsage.length)
        : 0;
      const currentThroughput = this.metrics.throughput.length > 0
        ? this.metrics.throughput[this.metrics.throughput.length - 1].value.toFixed(2)
        : '0.00';
      
      overviewTable.push(
        ['Network', 'Abstract Testnet (11124)'],
        ['Total Verifications', this.metrics.totalVerifications.toString()],
        ['Total Mints', this.metrics.totalMints.toString()],
        ['Avg Gas Usage', avgGas > 0 ? `${avgGas.toLocaleString()} gas` : 'N/A'],
        ['Current Throughput', `${currentThroughput} ops/sec`],
        ['Runtime', `${runtime}s`],
        ['Active Alerts', this.metrics.alerts.length.toString()]
      );
      
      console.log(overviewTable.toString());
      console.log();
      
      // Gas metrics
      if (this.metrics.gasUsage.length > 0) {
        console.log(chalk.yellow('📊 Gas Usage Metrics:'));
        const gasTable = new Table({
          head: ['Metric', 'Value', 'Status'],
          colWidths: [20, 20, 35]
        });
        
        const minGas = Math.min(...this.metrics.gasUsage);
        const maxGas = Math.max(...this.metrics.gasUsage);
        
        gasTable.push(
          ['Current', avgGas.toLocaleString(), avgGas > CONFIG.ALERT_GAS_THRESHOLD ? chalk.red('⚠️  Above threshold') : chalk.green('✅ Normal')],
          ['Min', minGas.toLocaleString(), chalk.green('✅')],
          ['Max', maxGas.toLocaleString(), maxGas > CONFIG.ALERT_GAS_THRESHOLD ? chalk.red('⚠️  Above threshold') : chalk.green('✅')],
          ['Target', '<300,000', chalk.gray('Optimization target')]
        );
        
        console.log(gasTable.toString());
        console.log();
      }
      
      // Recent mints
      if (this.metrics.mintEvents.length > 0) {
        console.log(chalk.green('🏆 Recent Badge Mints:'));
        const mintTable = new Table({
          head: ['Time', 'User', 'XP', 'Token ID'],
          colWidths: [15, 25, 10, 25]
        });
        
        this.metrics.mintEvents.slice(-5).forEach(mint => {
          const timeAgo = Math.floor((Date.now() - mint.timestamp) / 1000);
          mintTable.push([
            `${timeAgo}s ago`,
            `${mint.to.slice(0, 6)}...${mint.to.slice(-4)}`,
            mint.xp.toString(),
            mint.tokenId
          ]);
        });
        
        console.log(mintTable.toString());
        console.log();
      }
      
      // Alerts
      if (this.metrics.alerts.length > 0) {
        console.log(chalk.red('⚠️  Active Alerts:'));
        const alertTable = new Table({
          head: ['Type', 'Message', 'Time'],
          colWidths: [15, 45, 15]
        });
        
        this.metrics.alerts.slice(-3).forEach(alert => {
          const timeAgo = Math.floor((Date.now() - alert.timestamp) / 1000);
          alertTable.push([
            alert.type,
            alert.message.slice(0, 42) + '...',
            `${timeAgo}s ago`
          ]);
        });
        
        console.log(alertTable.toString());
        console.log();
      }
      
      // Footer
      console.log(chalk.gray('─'.repeat(80)));
      console.log(chalk.gray(`Last update: ${new Date().toLocaleTimeString()} | Press Ctrl+C to stop`));
      
      await this.sleep(CONFIG.UPDATE_INTERVAL_MS);
    }
  }

  async generateReport() {
    const report = {
      summary: {
        startTime: new Date(this.metrics.startTime).toISOString(),
        endTime: new Date().toISOString(),
        runtime: Math.floor((Date.now() - this.metrics.startTime) / 1000),
        totalVerifications: this.metrics.totalVerifications,
        totalMints: this.metrics.totalMints,
        totalGasUsed: this.metrics.totalGasUsed.toString()
      },
      gasMetrics: {
        average: this.metrics.gasUsage.length > 0 
          ? Math.floor(this.metrics.gasUsage.reduce((a, b) => a + b, 0) / this.metrics.gasUsage.length)
          : 0,
        min: this.metrics.gasUsage.length > 0 ? Math.min(...this.metrics.gasUsage) : 0,
        max: this.metrics.gasUsage.length > 0 ? Math.max(...this.metrics.gasUsage) : 0,
        samples: this.metrics.gasUsage.length
      },
      throughputMetrics: {
        average: this.metrics.throughput.length > 0
          ? (this.metrics.throughput.reduce((a, b) => a + b.value, 0) / this.metrics.throughput.length).toFixed(2)
          : '0.00',
        peak: this.metrics.throughput.length > 0
          ? Math.max(...this.metrics.throughput.map(t => t.value)).toFixed(2)
          : '0.00'
      },
      alerts: this.metrics.alerts,
      errors: this.metrics.errors
    };
    
    // Save report
    const filename = `monitor_report_${Date.now()}.json`;
    require('fs').writeFileSync(filename, JSON.stringify(report, null, 2));
    
    console.log(chalk.green(`\n✅ Report saved to ${filename}`));
    console.log(chalk.yellow('\nSummary:'));
    console.log(`  Total Verifications: ${report.summary.totalVerifications}`);
    console.log(`  Total Mints: ${report.summary.totalMints}`);
    console.log(`  Avg Gas: ${report.gasMetrics.average.toLocaleString()}`);
    console.log(`  Avg Throughput: ${report.throughputMetrics.average} ops/sec`);
    console.log(`  Alerts: ${report.alerts.length}`);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main execution
async function main() {
  const monitor = new ProductionMonitor();
  
  // Set up event handlers for external integrations
  monitor.on('alert', (alert) => {
    // Could send to external monitoring service
    console.error('Alert triggered:', alert);
  });
  
  monitor.on('error', (error) => {
    // Could send to error tracking service
    console.error('Error recorded:', error);
  });
  
  try {
    await monitor.start();
  } catch (error) {
    console.error(chalk.red('Failed to start monitor:'), error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = ProductionMonitor;