const { ethers } = require('ethers');
const EventEmitter = require('events');
const { performanceMonitor } = require('./performanceMonitor');
const { xpStore } = require('./xpStoreV2');

/**
 * ⛓️ Blockchain Integration for HamBaller Leaderboard System
 * Comprehensive smart contract interaction and XP verification
 */
class BlockchainIntegration extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      rpcUrl: config.rpcUrl || process.env.ABSTRACT_RPC_URL,
      hodlManagerAddress: config.hodlManagerAddress || process.env.HODL_MANAGER_ADDRESS,
      privateKey: config.privateKey || process.env.PRIVATE_KEY,
      networkId: config.networkId || process.env.NETWORK_ID || 11124,
      syncInterval: config.syncInterval || 60000, // 1 minute
      batchSize: config.batchSize || 100,
      retryAttempts: config.retryAttempts || 3,
      ...config
    };

    // Contract ABIs
    this.abis = {
      hodlManager: [
        // Player XP and stats functions
        "function getPlayerXP(address player) view returns (uint256)",
        "function getPlayerStats(address player) view returns (tuple(uint256 totalRuns, uint256 completedRuns, uint256 totalCPEarned, uint256 totalDBPEarned, uint256 bestRunCP, uint256 longestRunTime, uint256 currentStreak, uint256 bestStreak))",
        "function getTopPlayers(uint256 count) view returns (address[] players, uint256[] xpAmounts)",
        "function isPlayerRegistered(address player) view returns (bool)",
        
        // XP management functions
        "function updatePlayerXP(address player, uint256 xp) external",
        "function batchUpdateXP(address[] players, uint256[] xpAmounts) external",
        
        // Events
        "event XPAwarded(address indexed player, uint256 amount, string reason, uint256 timestamp)",
        "event XPUpdated(address indexed player, uint256 oldXP, uint256 newXP, uint256 timestamp)",
        "event PlayerRegistered(address indexed player, uint256 timestamp)",
        "event LeaderboardUpdated(address[] topPlayers, uint256[] xpAmounts, uint256 timestamp)",
        
        // Administrative functions
        "function owner() view returns (address)",
        "function paused() view returns (bool)",
        "function totalPlayers() view returns (uint256)",
        "function totalXPAwarded() view returns (uint256)"
      ]
    };

    // Initialize blockchain connection
    this.provider = null;
    this.signer = null;
    this.hodlManagerContract = null;
    this.isConnected = false;
    this.syncRunning = false;
    this.lastSyncBlock = 0;

    // Metrics
    this.metrics = {
      contractCalls: 0,
      xpUpdates: 0,
      eventsProcessed: 0,
      syncErrors: 0,
      lastSyncTime: null,
      avgContractCallTime: 0,
      totalGasUsed: 0
    };

    // Initialize connection
    this.initialize();
  }

  /**
   * Initialize blockchain connection and contracts
   */
  async initialize() {
    try {
      console.log('⛓️ Initializing blockchain integration...');

      if (!this.config.rpcUrl || !this.config.hodlManagerAddress) {
        console.warn('⚠️ Blockchain configuration incomplete - running in offline mode');
        return;
      }

      // Initialize provider
      this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
      await this.provider.getNetwork();

      // Initialize signer if private key provided
      if (this.config.privateKey) {
        this.signer = new ethers.Wallet(this.config.privateKey, this.provider);
        console.log('🔑 Signer initialized:', this.signer.address);
      }

      // Initialize contract
      this.hodlManagerContract = new ethers.Contract(
        this.config.hodlManagerAddress,
        this.abis.hodlManager,
        this.signer || this.provider
      );

      // Test connection
      await this.testConnection();

      this.isConnected = true;
      console.log('✅ Blockchain integration initialized successfully');

      // Start event listening and synchronization
      this.startEventListening();
      this.startPeriodicSync();

      this.emit('connected');
    } catch (error) {
      console.error('❌ Failed to initialize blockchain integration:', error);
      this.emit('error', error);
    }
  }

  /**
   * Test blockchain connection
   */
  async testConnection() {
    const startTime = Date.now();
    
    try {
      // Test provider
      const network = await this.provider.getNetwork();
      console.log(`🌐 Connected to network: ${network.name} (${network.chainId})`);

      // Test contract
      const totalPlayers = await this.hodlManagerContract.totalPlayers();
      console.log(`👥 Total players on contract: ${totalPlayers}`);

      const callTime = Date.now() - startTime;
      this.updateMetrics('contract_call', callTime);

      return true;
    } catch (error) {
      throw new Error(`Connection test failed: ${error.message}`);
    }
  }

  /**
   * Start listening to contract events
   */
  startEventListening() {
    if (!this.hodlManagerContract) return;

    console.log('👂 Starting contract event listening...');

    // Listen for XP awarded events
    this.hodlManagerContract.on('XPAwarded', async (player, amount, reason, timestamp, event) => {
      try {
        console.log(`📈 XP Awarded: ${player} +${amount} (${reason})`);
        
        await this.handleXPEvent(player, amount, 'awarded', reason, event);
        this.metrics.eventsProcessed++;
        
        this.emit('xp_awarded', { player, amount, reason, timestamp });
      } catch (error) {
        console.error('❌ Error handling XPAwarded event:', error);
        this.metrics.syncErrors++;
      }
    });

    // Listen for XP updated events
    this.hodlManagerContract.on('XPUpdated', async (player, oldXP, newXP, timestamp, event) => {
      try {
        console.log(`🔄 XP Updated: ${player} ${oldXP} -> ${newXP}`);
        
        await this.handleXPEvent(player, newXP, 'updated', 'direct_update', event);
        this.metrics.eventsProcessed++;
        
        this.emit('xp_updated', { player, oldXP, newXP, timestamp });
      } catch (error) {
        console.error('❌ Error handling XPUpdated event:', error);
        this.metrics.syncErrors++;
      }
    });

    // Listen for player registration events
    this.hodlManagerContract.on('PlayerRegistered', async (player, timestamp, event) => {
      try {
        console.log(`👤 Player Registered: ${player}`);
        
        // Initialize player with 0 XP
        await this.handleXPEvent(player, 0, 'registered', 'new_player', event);
        
        this.emit('player_registered', { player, timestamp });
      } catch (error) {
        console.error('❌ Error handling PlayerRegistered event:', error);
      }
    });

    // Listen for leaderboard updates
    this.hodlManagerContract.on('LeaderboardUpdated', async (topPlayers, xpAmounts, timestamp, event) => {
      try {
        console.log(`🏆 Leaderboard Updated: ${topPlayers.length} players`);
        
        await this.handleLeaderboardUpdate(topPlayers, xpAmounts, event);
        
        this.emit('leaderboard_updated', { topPlayers, xpAmounts, timestamp });
      } catch (error) {
        console.error('❌ Error handling LeaderboardUpdated event:', error);
      }
    });
  }

  /**
   * Handle XP events from blockchain
   */
  async handleXPEvent(player, xp, eventType, reason, event) {
    try {
      const xpNumber = parseInt(xp.toString());
      
      // Update local XP store
      await xpStore.updatePlayerXP(player, xpNumber, 'blockchain', reason);
      
      // Track metrics
      this.metrics.xpUpdates++;
      performanceMonitor.trackLeaderboardUpdate();
      
      // Broadcast to WebSocket clients
      if (global.wsClients) {
        const message = JSON.stringify({
          type: 'blockchain_xp_update',
          data: {
            player,
            xp: xpNumber,
            eventType,
            reason,
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash
          },
          timestamp: new Date().toISOString()
        });

        global.wsClients.forEach(client => {
          if (client.readyState === 1) { // WebSocket.OPEN
            client.send(message);
          }
        });
      }
    } catch (error) {
      console.error('❌ Error handling XP event:', error);
      throw error;
    }
  }

  /**
   * Handle leaderboard update events
   */
  async handleLeaderboardUpdate(players, xpAmounts, event) {
    try {
      const updates = [];
      
      for (let i = 0; i < players.length; i++) {
        const player = players[i];
        const xp = parseInt(xpAmounts[i].toString());
        
        await xpStore.updatePlayerXP(player, xp, 'blockchain', 'leaderboard_sync');
        updates.push({ player, xp, rank: i + 1 });
      }

      // Broadcast leaderboard update
      if (global.wsClients) {
        const message = JSON.stringify({
          type: 'blockchain_leaderboard_update',
          data: updates,
          timestamp: new Date().toISOString()
        });

        global.wsClients.forEach(client => {
          if (client.readyState === 1) {
            client.send(message);
          }
        });
      }
    } catch (error) {
      console.error('❌ Error handling leaderboard update:', error);
      throw error;
    }
  }

  /**
   * Start periodic synchronization
   */
  startPeriodicSync() {
    if (this.syncRunning) return;

    console.log(`🔄 Starting periodic sync (${this.config.syncInterval}ms interval)`);
    
    this.syncRunning = true;
    
    setInterval(async () => {
      await this.syncWithContract();
    }, this.config.syncInterval);
  }

  /**
   * Synchronize with smart contract
   */
  async syncWithContract() {
    if (!this.isConnected || !this.hodlManagerContract) return;

    const startTime = Date.now();
    
    try {
      console.log('🔄 Starting contract synchronization...');

      // Get current block
      const currentBlock = await this.provider.getBlockNumber();
      const fromBlock = this.lastSyncBlock || currentBlock - 1000; // Sync last 1000 blocks if first time

      // Sync XP events
      await this.syncXPEvents(fromBlock, currentBlock);

      // Verify top players
      await this.verifyTopPlayers();

      this.lastSyncBlock = currentBlock;
      this.metrics.lastSyncTime = new Date();

      const syncTime = Date.now() - startTime;
      console.log(`✅ Contract sync completed in ${syncTime}ms`);

      this.emit('sync_completed', { fromBlock, currentBlock, syncTime });
    } catch (error) {
      console.error('❌ Contract sync failed:', error);
      this.metrics.syncErrors++;
      this.emit('sync_error', error);
    }
  }

  /**
   * Sync XP events from blockchain
   */
  async syncXPEvents(fromBlock, toBlock) {
    try {
      // Get XPAwarded events
      const xpAwardedFilter = this.hodlManagerContract.filters.XPAwarded();
      const xpAwardedEvents = await this.hodlManagerContract.queryFilter(xpAwardedFilter, fromBlock, toBlock);

      // Get XPUpdated events
      const xpUpdatedFilter = this.hodlManagerContract.filters.XPUpdated();
      const xpUpdatedEvents = await this.hodlManagerContract.queryFilter(xpUpdatedFilter, fromBlock, toBlock);

      // Process events in chronological order
      const allEvents = [...xpAwardedEvents, ...xpUpdatedEvents].sort((a, b) => {
        if (a.blockNumber !== b.blockNumber) {
          return a.blockNumber - b.blockNumber;
        }
        return a.transactionIndex - b.transactionIndex;
      });

      console.log(`📊 Processing ${allEvents.length} XP events from blocks ${fromBlock}-${toBlock}`);

      for (const event of allEvents) {
        if (event.event === 'XPAwarded') {
          const [player, amount, reason] = event.args;
          await this.handleXPEvent(player, amount, 'awarded', reason, event);
        } else if (event.event === 'XPUpdated') {
          const [player, oldXP, newXP] = event.args;
          await this.handleXPEvent(player, newXP, 'updated', 'direct_update', event);
        }
      }
    } catch (error) {
      console.error('❌ Error syncing XP events:', error);
      throw error;
    }
  }

  /**
   * Verify top players against contract
   */
  async verifyTopPlayers(count = 10) {
    try {
      const startTime = Date.now();
      
      // Get top players from contract
      const [contractPlayers, contractXP] = await this.hodlManagerContract.getTopPlayers(count);

      // Get top players from local store
      const localResult = await xpStore.getXpLeaderboard({ limit: count });
      const localPlayers = localResult.data;

      // Compare and identify discrepancies
      const discrepancies = [];
      
      for (let i = 0; i < Math.min(contractPlayers.length, localPlayers.length); i++) {
        const contractPlayer = contractPlayers[i].toLowerCase();
        const contractXPAmount = parseInt(contractXP[i].toString());
        const localPlayer = localPlayers[i]?.address.toLowerCase();
        const localXPAmount = localPlayers[i]?.xp || 0;

        if (contractPlayer !== localPlayer || contractXPAmount !== localXPAmount) {
          discrepancies.push({
            rank: i + 1,
            contract: { player: contractPlayer, xp: contractXPAmount },
            local: { player: localPlayer, xp: localXPAmount }
          });
        }
      }

      if (discrepancies.length > 0) {
        console.warn(`⚠️ Found ${discrepancies.length} leaderboard discrepancies:`, discrepancies);
        
        // Optionally auto-correct discrepancies
        for (const discrepancy of discrepancies) {
          await xpStore.updatePlayerXP(
            discrepancy.contract.player,
            discrepancy.contract.xp,
            'blockchain_correction',
            'sync_verification'
          );
        }

        this.emit('discrepancies_found', discrepancies);
      }

      const verifyTime = Date.now() - startTime;
      this.updateMetrics('verification', verifyTime);

      console.log(`✅ Top players verification completed in ${verifyTime}ms`);
    } catch (error) {
      console.error('❌ Error verifying top players:', error);
      throw error;
    }
  }

  /**
   * Get player XP from contract
   */
  async getPlayerXPFromContract(playerAddress) {
    if (!this.isConnected) {
      throw new Error('Blockchain not connected');
    }

    const startTime = Date.now();
    
    try {
      const xp = await this.hodlManagerContract.getPlayerXP(playerAddress);
      const xpNumber = parseInt(xp.toString());

      const callTime = Date.now() - startTime;
      this.updateMetrics('contract_call', callTime);

      return {
        address: playerAddress,
        xp: xpNumber,
        verified: true,
        timestamp: new Date().toISOString(),
        source: 'contract'
      };
    } catch (error) {
      console.error(`❌ Error getting XP for ${playerAddress}:`, error);
      return {
        address: playerAddress,
        xp: 0,
        verified: false,
        error: error.message,
        source: 'contract'
      };
    }
  }

  /**
   * Get player stats from contract
   */
  async getPlayerStatsFromContract(playerAddress) {
    if (!this.isConnected) {
      throw new Error('Blockchain not connected');
    }

    const startTime = Date.now();
    
    try {
      const stats = await this.hodlManagerContract.getPlayerStats(playerAddress);
      
      const callTime = Date.now() - startTime;
      this.updateMetrics('contract_call', callTime);

      return {
        address: playerAddress,
        stats: {
          totalRuns: parseInt(stats.totalRuns.toString()),
          completedRuns: parseInt(stats.completedRuns.toString()),
          totalCPEarned: parseInt(stats.totalCPEarned.toString()),
          totalDBPEarned: parseInt(stats.totalDBPEarned.toString()),
          bestRunCP: parseInt(stats.bestRunCP.toString()),
          longestRunTime: parseInt(stats.longestRunTime.toString()),
          currentStreak: parseInt(stats.currentStreak.toString()),
          bestStreak: parseInt(stats.bestStreak.toString())
        },
        verified: true,
        timestamp: new Date().toISOString(),
        source: 'contract'
      };
    } catch (error) {
      console.error(`❌ Error getting stats for ${playerAddress}:`, error);
      return {
        address: playerAddress,
        stats: null,
        verified: false,
        error: error.message,
        source: 'contract'
      };
    }
  }

  /**
   * Update player XP on contract (if signer available)
   */
  async updatePlayerXPOnContract(playerAddress, xp) {
    if (!this.signer) {
      throw new Error('No signer available for contract transactions');
    }

    const startTime = Date.now();
    
    try {
      const tx = await this.hodlManagerContract.updatePlayerXP(playerAddress, xp);
      const receipt = await tx.wait();

      const callTime = Date.now() - startTime;
      this.updateMetrics('contract_transaction', callTime);
      this.metrics.totalGasUsed += parseInt(receipt.gasUsed.toString());

      console.log(`✅ XP updated on contract: ${playerAddress} -> ${xp} (Gas: ${receipt.gasUsed})`);

      return {
        success: true,
        transactionHash: receipt.transactionHash,
        gasUsed: receipt.gasUsed,
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      console.error(`❌ Error updating XP on contract:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Batch update XP on contract
   */
  async batchUpdateXPOnContract(updates) {
    if (!this.signer) {
      throw new Error('No signer available for contract transactions');
    }

    const startTime = Date.now();
    
    try {
      const players = updates.map(u => u.address);
      const xpAmounts = updates.map(u => u.xp);

      const tx = await this.hodlManagerContract.batchUpdateXP(players, xpAmounts);
      const receipt = await tx.wait();

      const callTime = Date.now() - startTime;
      this.updateMetrics('contract_transaction', callTime);
      this.metrics.totalGasUsed += parseInt(receipt.gasUsed.toString());

      console.log(`✅ Batch XP update completed: ${updates.length} players (Gas: ${receipt.gasUsed})`);

      return {
        success: true,
        transactionHash: receipt.transactionHash,
        gasUsed: receipt.gasUsed,
        blockNumber: receipt.blockNumber,
        updatesCount: updates.length
      };
    } catch (error) {
      console.error(`❌ Error batch updating XP:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update metrics
   */
  updateMetrics(type, duration) {
    this.metrics.contractCalls++;
    
    if (type === 'contract_call' || type === 'verification' || type === 'contract_transaction') {
      this.metrics.avgContractCallTime = (
        (this.metrics.avgContractCallTime * (this.metrics.contractCalls - 1)) + duration
      ) / this.metrics.contractCalls;
    }
  }

  /**
   * Get blockchain integration status
   */
  getStatus() {
    return {
      connected: this.isConnected,
      config: {
        rpcUrl: this.config.rpcUrl,
        contractAddress: this.config.hodlManagerAddress,
        networkId: this.config.networkId,
        hasSigner: !!this.signer
      },
      metrics: this.metrics,
      lastSyncBlock: this.lastSyncBlock,
      syncRunning: this.syncRunning
    };
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect() {
    try {
      if (this.hodlManagerContract) {
        this.hodlManagerContract.removeAllListeners();
      }
      
      this.isConnected = false;
      this.syncRunning = false;
      
      console.log('⛓️ Blockchain integration disconnected');
      this.emit('disconnected');
    } catch (error) {
      console.error('❌ Error disconnecting blockchain integration:', error);
    }
  }
}

// Create singleton instance
const blockchainIntegration = new BlockchainIntegration();

module.exports = {
  BlockchainIntegration,
  blockchainIntegration
};