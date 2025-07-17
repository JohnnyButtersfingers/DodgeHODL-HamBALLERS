#!/usr/bin/env node

/**
 * Thirdweb Integration Script
 * 
 * Adds deployed XPBadge contract to Thirdweb dashboard
 * Enables analytics, mint UI, and easier contract management
 */

const fs = require('fs');
const path = require('path');

// Thirdweb integration configuration
const THIRDWEB_CONFIG = {
  chainId: 11124, // Abstract Testnet
  networkName: 'Abstract Testnet',
  contracts: {
    XPBadge: {
      address: process.env.XPBADGE_ADDRESS,
      type: 'ERC1155',
      name: 'HamBaller XP Badge',
      description: 'Achievement badges for HamBaller.xyz DODGE & HODL game',
      symbol: 'HAMXP',
      category: 'nft'
    },
    HODLManager: {
      address: process.env.HODL_MANAGER_ADDRESS,
      type: 'Custom',
      name: 'HamBaller HODL Manager',
      description: 'Core game logic contract for HamBaller.xyz',
      category: 'game'
    },
    DBPToken: {
      address: process.env.DBP_TOKEN_ADDRESS,
      type: 'ERC20',
      name: 'DBP Token',
      description: 'Utility token for HamBaller.xyz',
      symbol: 'DBP',
      category: 'token'
    }
  },
  explorerUrl: 'https://explorer.testnet.abs.xyz',
  dashboardUrl: 'https://thirdweb.com/dashboard'
};

class ThirdwebIntegrator {
  constructor() {
    this.results = [];
  }

  async integrateContracts() {
    console.log('🔗 Starting Thirdweb Integration Process...\n');
    
    this.validateConfig();
    await this.generateThirdwebConfig();
    this.generateIntegrationGuide();
    this.generateAnalyticsSetup();
    
    console.log('\n🎉 Thirdweb integration setup complete!');
  }

  validateConfig() {
    const deployedContracts = Object.entries(THIRDWEB_CONFIG.contracts)
      .filter(([_, config]) => config.address);
    
    if (deployedContracts.length === 0) {
      throw new Error('No deployed contract addresses found. Please set environment variables.');
    }
    
    console.log('📋 Validation complete:');
    console.log(`   Network: ${THIRDWEB_CONFIG.networkName} (Chain ID: ${THIRDWEB_CONFIG.chainId})`);
    console.log(`   Contracts to integrate: ${deployedContracts.length}\n`);
    
    deployedContracts.forEach(([name, config]) => {
      console.log(`   ✅ ${name}: ${config.address}`);
    });
    console.log();
  }

  async generateThirdwebConfig() {
    console.log('⚙️ Generating Thirdweb configuration...');
    
    const config = {
      name: 'HamBaller.xyz Contracts',
      description: 'Smart contracts for the HamBaller.xyz DODGE & HODL game',
      network: {
        chainId: THIRDWEB_CONFIG.chainId,
        name: THIRDWEB_CONFIG.networkName,
        rpc: process.env.ABSTRACT_RPC_URL || 'https://api.testnet.abs.xyz'
      },
      contracts: {},
      features: {
        analytics: true,
        events: true,
        contractInteraction: true,
        batchOperations: true
      },
      metadata: {
        createdAt: new Date().toISOString(),
        version: '1.0.0',
        repository: 'https://github.com/your-org/hamballer-game-starter'
      }
    };
    
    // Add each deployed contract
    for (const [contractName, contractConfig] of Object.entries(THIRDWEB_CONFIG.contracts)) {
      if (contractConfig.address) {
        config.contracts[contractName] = {
          address: contractConfig.address,
          type: contractConfig.type,
          name: contractConfig.name,
          description: contractConfig.description,
          symbol: contractConfig.symbol,
          category: contractConfig.category,
          explorerUrl: `${THIRDWEB_CONFIG.explorerUrl}/address/${contractConfig.address}`,
          features: this.getContractFeatures(contractConfig.type),
          abi: await this.getContractABI(contractName)
        };
      }
    }
    
    // Save configuration
    const configPath = path.join(__dirname, 'thirdweb-config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    console.log(`✅ Configuration saved to: ${configPath}`);
    
    this.results.push({
      step: 'Configuration Generation',
      status: 'completed',
      output: configPath
    });
  }

  getContractFeatures(contractType) {
    const features = {
      ERC1155: [
        'mint',
        'burn',
        'transfer',
        'batch_operations',
        'metadata',
        'supply_tracking',
        'royalties'
      ],
      ERC20: [
        'mint',
        'burn',
        'transfer',
        'allowance',
        'supply_tracking'
      ],
      Custom: [
        'read_functions',
        'write_functions',
        'events',
        'analytics'
      ]
    };
    
    return features[contractType] || ['basic_interaction'];
  }

  async getContractABI(contractName) {
    // Try to load ABI from artifacts or simplified version
    const abiSources = [
      path.join(__dirname, 'contracts', 'artifacts', 'contracts', 'contracts', `${contractName}.sol`, `${contractName}.json`),
      path.join(__dirname, 'contracts', 'abis', `${contractName}.json`)
    ];
    
    for (const abiPath of abiSources) {
      try {
        if (fs.existsSync(abiPath)) {
          const artifact = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
          return artifact.abi || artifact;
        }
      } catch (error) {
        console.warn(`⚠️ Could not load ABI from ${abiPath}`);
      }
    }
    
    // Return minimal ABI if not found
    return this.getMinimalABI(contractName);
  }

  getMinimalABI(contractName) {
    const minimalABIs = {
      XPBadge: [
        'function balanceOf(address account, uint256 id) view returns (uint256)',
        'function balanceOfBatch(address[] accounts, uint256[] ids) view returns (uint256[])',
        'function mintBadge(address to, uint256 tokenId, uint256 xp, uint256 season) returns (bool)',
        'function uri(uint256 tokenId) view returns (string)',
        'event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)',
        'event BadgeMinted(address indexed player, uint256 indexed tokenId, uint256 xp, uint256 season)'
      ],
      HODLManager: [
        'function startRun(uint8[] moves, uint256[] boostIds) returns (bytes32)',
        'function endRun(bytes32 runId, bool hodlDecision) returns (bool)',
        'function getPlayerStats(address player) view returns (tuple)',
        'function getCurrentPrice() view returns (uint256)',
        'event RunStarted(bytes32 indexed runId, address indexed player, uint256 startTime)',
        'event RunCompleted(bytes32 indexed runId, address indexed player, uint256 xpEarned, uint256 dbpEarned, bool successful)'
      ],
      DBPToken: [
        'function balanceOf(address account) view returns (uint256)',
        'function totalSupply() view returns (uint256)',
        'function transfer(address to, uint256 amount) returns (bool)',
        'function allowance(address owner, address spender) view returns (uint256)',
        'function approve(address spender, uint256 amount) returns (bool)',
        'event Transfer(address indexed from, address indexed to, uint256 value)'
      ]
    };
    
    return minimalABIs[contractName] || [];
  }

  generateIntegrationGuide() {
    console.log('📖 Generating integration guide...');
    
    const guide = `# Thirdweb Integration Guide for HamBaller.xyz

## Overview
This guide helps you integrate your deployed HamBaller.xyz contracts with Thirdweb for enhanced analytics, management, and UI capabilities.

## Prerequisites
- Verified contracts on Abstract Testnet Explorer
- Thirdweb account (free at https://thirdweb.com)
- Contract addresses from deployment

## Integration Steps

### 1. Import Contracts to Thirdweb Dashboard

#### XPBadge Contract (ERC1155)
1. Visit: ${THIRDWEB_CONFIG.dashboardUrl}
2. Click "Import Contract"
3. Enter contract details:
   - **Network**: Abstract Testnet (Chain ID: ${THIRDWEB_CONFIG.chainId})
   - **Contract Address**: \`${THIRDWEB_CONFIG.contracts.XPBadge.address || 'YOUR_XPBADGE_ADDRESS'}\`
   - **Contract Type**: ERC1155
   - **Name**: ${THIRDWEB_CONFIG.contracts.XPBadge.name}

#### HODLManager Contract (Custom)
1. Import as Custom Contract
2. Contract Address: \`${THIRDWEB_CONFIG.contracts.HODLManager.address || 'YOUR_HODLMANAGER_ADDRESS'}\`
3. Upload ABI (from thirdweb-config.json)

#### DBPToken Contract (ERC20)
1. Import as ERC20 Token
2. Contract Address: \`${THIRDWEB_CONFIG.contracts.DBPToken.address || 'YOUR_DBP_TOKEN_ADDRESS'}\`

### 2. Enable Analytics Features

After importing contracts, enable:
- **Event Monitoring**: Track minting, transfers, and game events
- **User Analytics**: Monitor player engagement and badge distribution
- **Performance Metrics**: Gas usage, transaction success rates
- **Revenue Tracking**: DBP token distribution and earning patterns

### 3. Set Up Contract Management

#### Badge Management (XPBadge)
- **Batch Minting**: Mint multiple badges efficiently
- **Metadata Management**: Update badge URIs and descriptions
- **Supply Tracking**: Monitor badge distribution across tiers
- **Transfer Monitoring**: Track badge ownership changes

#### Game Analytics (HODLManager)
- **Run Statistics**: Monitor game completion rates
- **XP Distribution**: Track XP earning patterns
- **Performance Metrics**: Success rates, average scores
- **Player Retention**: User engagement over time

### 4. API Integration

Use Thirdweb's SDK to:
\`\`\`javascript
// Initialize SDK
import { ThirdwebSDK } from "@thirdweb-dev/sdk";

const sdk = new ThirdwebSDK("abstract-testnet");

// Get XPBadge contract
const xpBadge = await sdk.getContract("${THIRDWEB_CONFIG.contracts.XPBadge.address || 'YOUR_ADDRESS'}");

// Monitor events
xpBadge.events.addEventListener("BadgeMinted", (event) => {
  console.log("Badge minted:", event.data);
});

// Get analytics
const events = await xpBadge.events.getEvents("BadgeMinted");
\`\`\`

### 5. Dashboard Widgets

Create custom dashboard widgets for:
- **Real-time Badge Minting**: Live feed of new achievements
- **Player Leaderboards**: Top performers by XP and badges
- **Revenue Dashboard**: DBP token metrics and distribution
- **Game Health**: Success rates, completion times, error rates

## Benefits of Thirdweb Integration

### Analytics & Insights
- **Real-time Monitoring**: Live contract activity and user engagement
- **Historical Analysis**: Trends in badge minting and game performance
- **User Segmentation**: Player behavior patterns and retention analysis
- **Revenue Tracking**: Token economics and earning distribution

### Management Tools
- **Batch Operations**: Efficient multi-user badge minting
- **Access Control**: Role-based permissions for contract functions
- **Metadata Management**: Easy updates to badge descriptions and images
- **Gas Optimization**: Transaction batching and gas estimation

### Developer Experience
- **SDK Integration**: Easy contract interaction from frontend
- **Event Subscriptions**: Real-time notifications for contract events
- **API Access**: RESTful endpoints for contract data
- **Documentation**: Auto-generated API docs and examples

## Next Steps

1. **Import Contracts**: Add all contracts to your Thirdweb dashboard
2. **Configure Analytics**: Set up event monitoring and alerts
3. **Integrate SDK**: Update frontend to use Thirdweb SDK
4. **Create Dashboards**: Build admin panels for game management
5. **Monitor Performance**: Track KPIs and user engagement metrics

## Support

- Thirdweb Documentation: https://portal.thirdweb.com
- Discord Community: https://discord.gg/thirdweb
- GitHub Issues: https://github.com/thirdweb-dev/js

## Configuration Files

- Contract Configuration: \`thirdweb-config.json\`
- Integration Script: \`thirdweb-integration.js\`
- Analytics Setup: \`thirdweb-analytics.js\`
`;

    const guidePath = path.join(__dirname, 'THIRDWEB_INTEGRATION.md');
    fs.writeFileSync(guidePath, guide);
    
    console.log(`✅ Integration guide saved to: ${guidePath}`);
    
    this.results.push({
      step: 'Integration Guide',
      status: 'completed',
      output: guidePath
    });
  }

  generateAnalyticsSetup() {
    console.log('📊 Generating analytics setup...');
    
    const analyticsScript = `#!/usr/bin/env node

/**
 * Thirdweb Analytics Setup
 * 
 * Configures analytics and monitoring for HamBaller.xyz contracts
 */

const { ThirdwebSDK } = require("@thirdweb-dev/sdk");

class ThirdwebAnalytics {
  constructor() {
    this.sdk = new ThirdwebSDK("abstract-testnet");
    this.contracts = {};
  }

  async initialize() {
    console.log('🚀 Initializing Thirdweb Analytics...');
    
    // Initialize contracts
    this.contracts.xpBadge = await this.sdk.getContract("${THIRDWEB_CONFIG.contracts.XPBadge.address || 'YOUR_ADDRESS'}");
    this.contracts.hodlManager = await this.sdk.getContract("${THIRDWEB_CONFIG.contracts.HODLManager.address || 'YOUR_ADDRESS'}");
    this.contracts.dbpToken = await this.sdk.getContract("${THIRDWEB_CONFIG.contracts.DBPToken.address || 'YOUR_ADDRESS'}");
    
    console.log('✅ Contracts initialized');
  }

  async setupEventMonitoring() {
    console.log('📡 Setting up event monitoring...');
    
    // Badge minting events
    this.contracts.xpBadge.events.addEventListener("BadgeMinted", (event) => {
      this.logBadgeMinting(event.data);
    });
    
    // Game completion events
    this.contracts.hodlManager.events.addEventListener("RunCompleted", (event) => {
      this.logGameCompletion(event.data);
    });
    
    // Token transfer events
    this.contracts.dbpToken.events.addEventListener("Transfer", (event) => {
      this.logTokenTransfer(event.data);
    });
    
    console.log('✅ Event monitoring active');
  }

  async getAnalytics() {
    const analytics = {
      badges: await this.getBadgeAnalytics(),
      games: await this.getGameAnalytics(),
      tokens: await this.getTokenAnalytics(),
      users: await this.getUserAnalytics()
    };
    
    return analytics;
  }

  async getBadgeAnalytics() {
    const events = await this.contracts.xpBadge.events.getEvents("BadgeMinted");
    
    return {
      totalBadgesMinted: events.length,
      uniqueRecipients: [...new Set(events.map(e => e.data.player))].length,
      badgesByTier: this.groupBadgesByTier(events),
      mintingTrend: this.calculateMintingTrend(events)
    };
  }

  async getGameAnalytics() {
    const events = await this.contracts.hodlManager.events.getEvents("RunCompleted");
    
    return {
      totalRuns: events.length,
      successRate: this.calculateSuccessRate(events),
      averageXP: this.calculateAverageXP(events),
      playerEngagement: this.calculateEngagement(events)
    };
  }

  async getTokenAnalytics() {
    const totalSupply = await this.contracts.dbpToken.totalSupply();
    const transferEvents = await this.contracts.dbpToken.events.getEvents("Transfer");
    
    return {
      totalSupply: totalSupply.toString(),
      circulation: this.calculateCirculation(transferEvents),
      distribution: this.calculateDistribution(transferEvents)
    };
  }

  // Helper methods for analytics calculations
  groupBadgesByTier(events) {
    const tiers = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
    events.forEach(event => {
      const tokenId = event.data.tokenId;
      tiers[tokenId] = (tiers[tokenId] || 0) + 1;
    });
    return tiers;
  }

  calculateSuccessRate(events) {
    const successful = events.filter(e => e.data.successful).length;
    return events.length > 0 ? (successful / events.length) * 100 : 0;
  }

  calculateAverageXP(events) {
    const totalXP = events.reduce((sum, e) => sum + parseInt(e.data.xpEarned), 0);
    return events.length > 0 ? totalXP / events.length : 0;
  }

  // Logging methods
  logBadgeMinting(data) {
    console.log(\`🎫 Badge Minted: Player \${data.player} earned Token \${data.tokenId} with \${data.xp} XP\`);
  }

  logGameCompletion(data) {
    console.log(\`🎮 Game Completed: Player \${data.player} earned \${data.xpEarned} XP, \${data.dbpEarned} DBP\`);
  }

  logTokenTransfer(data) {
    console.log(\`💰 Token Transfer: \${data.value} DBP from \${data.from} to \${data.to}\`);
  }
}

module.exports = ThirdwebAnalytics;

// CLI execution
if (require.main === module) {
  const analytics = new ThirdwebAnalytics();
  analytics.initialize()
    .then(() => analytics.setupEventMonitoring())
    .then(() => console.log('🎉 Thirdweb Analytics setup complete!'))
    .catch(console.error);
}
`;

    const analyticsPath = path.join(__dirname, 'thirdweb-analytics.js');
    fs.writeFileSync(analyticsPath, analyticsScript);
    
    console.log(`✅ Analytics setup saved to: ${analyticsPath}`);
    
    this.results.push({
      step: 'Analytics Setup',
      status: 'completed',
      output: analyticsPath
    });
  }

  generateReport() {
    console.log('\n📊 THIRDWEB INTEGRATION REPORT');
    console.log('===============================');
    
    console.log('Generated Files:');
    this.results.forEach(result => {
      console.log(`✅ ${result.step}: ${result.output}`);
    });
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Visit https://thirdweb.com/dashboard');
    console.log('2. Import contracts using the addresses above');
    console.log('3. Follow the integration guide (THIRDWEB_INTEGRATION.md)');
    console.log('4. Set up analytics monitoring (thirdweb-analytics.js)');
    console.log('5. Configure dashboard widgets and alerts');
    
    console.log('\n📋 Contract Addresses:');
    Object.entries(THIRDWEB_CONFIG.contracts).forEach(([name, config]) => {
      if (config.address) {
        console.log(`   ${name}: ${config.address}`);
      }
    });
  }
}

// CLI execution
if (require.main === module) {
  const integrator = new ThirdwebIntegrator();
  integrator.integrateContracts()
    .then(() => integrator.generateReport())
    .catch(console.error);
}

module.exports = ThirdwebIntegrator;