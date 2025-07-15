const fs = require('fs').promises;
const path = require('path');
const { ethers } = require('ethers');

// Import database clients
let supabase = null;
try {
  const { createClient } = require('@supabase/supabase-js');
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && 
      !process.env.SUPABASE_URL.includes('your_supabase')) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    console.log('✅ XP Store: Supabase connected');
  }
} catch (error) {
  console.warn('⚠️ XP Store: Supabase not available:', error.message);
}

// Storage configuration
const STORAGE_MODE = process.env.XP_STORAGE_MODE || (supabase ? 'database' : 'json');
const XP_DATA_PATH = path.join(__dirname, '..', 'data', 'xp.json');

// Blockchain configuration for XP verification
let provider = null;
let hodlManagerContract = null;

if (process.env.ABSTRACT_RPC_URL && process.env.HODL_MANAGER_ADDRESS) {
  try {
    provider = new ethers.JsonRpcProvider(process.env.ABSTRACT_RPC_URL);
    
    // Simplified ABI for XP-related functions
    const HODL_MANAGER_ABI = [
      "function getPlayerXP(address player) view returns (uint256)",
      "function getPlayerStats(address player) view returns (tuple(uint256 totalRuns, uint256 completedRuns, uint256 totalCPEarned, uint256 totalDBPEarned, uint256 bestRunCP, uint256 longestRunTime, uint256 currentStreak, uint256 bestStreak))",
      "event XPAwarded(address indexed player, uint256 amount, string reason)",
      "event XPUpdated(address indexed player, uint256 oldXP, uint256 newXP)"
    ];
    
    hodlManagerContract = new ethers.Contract(
      process.env.HODL_MANAGER_ADDRESS, 
      HODL_MANAGER_ABI, 
      provider
    );
    
    console.log('✅ XP Store: Blockchain integration enabled');
  } catch (error) {
    console.warn('⚠️ XP Store: Blockchain integration failed:', error.message);
  }
}

console.log(`📊 XP Store initialized in ${STORAGE_MODE} mode`);

/**
 * Enhanced XP Store with multiple backend support
 */
class XPStore {
  constructor() {
    this.mode = STORAGE_MODE;
    this.supabase = supabase;
    this.provider = provider;
    this.contract = hodlManagerContract;
  }

  /**
   * Get all XP records with pagination and filtering
   */
  async getXpLeaderboard(options = {}) {
    const {
      page = 1,
      limit = 100,
      search = '',
      minXp = 0,
      maxXp = Infinity,
      includeInactive = false
    } = options;

    try {
      if (this.mode === 'database' && this.supabase) {
        return await this._getDatabaseLeaderboard(options);
      } else {
        return await this._getJsonLeaderboard(options);
      }
    } catch (error) {
      console.error('❌ Error getting XP leaderboard:', error);
      
      // Fallback to JSON if database fails
      if (this.mode === 'database') {
        console.log('📄 Falling back to JSON storage...');
        return await this._getJsonLeaderboard(options);
      }
      
      throw error;
    }
  }

  /**
   * Get leaderboard from Supabase database
   */
  async _getDatabaseLeaderboard(options) {
    const { page, limit, search, minXp, maxXp } = options;
    const offset = (page - 1) * limit;

    let query = this.supabase
      .from('player_xp')
      .select('player_address, xp, last_xp_update, created_at')
      .gte('xp', minXp)
      .order('xp', { ascending: false });

    if (maxXp !== Infinity) {
      query = query.lte('xp', maxXp);
    }

    if (search.trim()) {
      query = query.ilike('player_address', `%${search.toLowerCase()}%`);
    }

    // Get total count for pagination
    const { count } = await this.supabase
      .from('player_xp')
      .select('*', { count: 'exact', head: true })
      .gte('xp', minXp)
      .lte('xp', maxXp === Infinity ? 999999999 : maxXp);

    // Get paginated results
    const { data, error } = await query
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      data: data.map(row => ({
        address: row.player_address,
        xp: parseInt(row.xp),
        lastUpdated: row.last_xp_update
      })),
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    };
  }

  /**
   * Get leaderboard from JSON file (fallback)
   */
  async _getJsonLeaderboard(options) {
    const { page, limit, search, minXp, maxXp } = options;
    
    try {
      const data = await fs.readFile(XP_DATA_PATH, 'utf8');
      let players = JSON.parse(data);

      // Apply filters
      players = players.filter(player => {
        const matchesSearch = !search.trim() || 
          player.address.toLowerCase().includes(search.toLowerCase());
        const matchesXpRange = player.xp >= minXp && player.xp <= maxXp;
        return matchesSearch && matchesXpRange;
      });

      // Sort by XP descending
      players.sort((a, b) => b.xp - a.xp);

      // Apply pagination
      const total = players.length;
      const offset = (page - 1) * limit;
      const paginatedPlayers = players.slice(offset, offset + limit);

      return {
        data: paginatedPlayers.map(player => ({
          address: player.address,
          xp: player.xp,
          lastUpdated: player.lastUpdated
        })),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('❌ Error reading JSON XP data:', error);
      return {
        data: [],
        pagination: { total: 0, page: 1, limit, totalPages: 0 }
      };
    }
  }

  /**
   * Get specific player's XP and rank
   */
  async getPlayerXPAndRank(address) {
    try {
      if (this.mode === 'database' && this.supabase) {
        return await this._getDatabasePlayerRank(address);
      } else {
        return await this._getJsonPlayerRank(address);
      }
    } catch (error) {
      console.error('❌ Error getting player rank:', error);
      
      // Fallback to JSON if database fails
      if (this.mode === 'database') {
        return await this._getJsonPlayerRank(address);
      }
      
      throw error;
    }
  }

  /**
   * Get player rank from database with context
   */
  async _getDatabasePlayerRank(address) {
    const { data: player, error } = await this.supabase
      .from('player_xp')
      .select('player_address, xp, last_xp_update')
      .eq('player_address', address.toLowerCase())
      .single();

    if (error || !player) {
      return null;
    }

    // Get rank using window function
    const { data: rankData } = await this.supabase
      .rpc('get_player_rank', { player_addr: address.toLowerCase() });

    const rank = rankData?.[0]?.rank || null;
    const isTopFive = rank && rank <= 5;

    // Get context (players above and below)
    const { data: above } = await this.supabase
      .from('player_xp')
      .select('player_address, xp')
      .gt('xp', player.xp)
      .order('xp', { ascending: false })
      .limit(1);

    const { data: below } = await this.supabase
      .from('player_xp')
      .select('player_address, xp')
      .lt('xp', player.xp)
      .order('xp', { ascending: false })
      .limit(1);

    return {
      address: player.player_address,
      xp: parseInt(player.xp),
      rank,
      isTopFive,
      lastUpdated: player.last_xp_update,
      context: {
        above: above?.[0] ? {
          address: above[0].player_address,
          xp: parseInt(above[0].xp)
        } : null,
        below: below?.[0] ? {
          address: below[0].player_address,
          xp: parseInt(below[0].xp)
        } : null
      }
    };
  }

  /**
   * Get player rank from JSON (fallback)
   */
  async _getJsonPlayerRank(address) {
    try {
      const { data: allPlayers } = await this._getJsonLeaderboard({ limit: 10000 });
      
      const playerIndex = allPlayers.findIndex(
        player => player.address.toLowerCase() === address.toLowerCase()
      );

      if (playerIndex === -1) {
        return null;
      }

      const playerData = allPlayers[playerIndex];
      const rank = playerIndex + 1;

      return {
        address: playerData.address,
        xp: playerData.xp,
        rank,
        isTopFive: rank <= 5,
        lastUpdated: playerData.lastUpdated,
        context: {
          above: playerIndex > 0 ? allPlayers[playerIndex - 1] : null,
          below: playerIndex < allPlayers.length - 1 ? allPlayers[playerIndex + 1] : null
        }
      };
    } catch (error) {
      console.error('❌ Error getting JSON player rank:', error);
      return null;
    }
  }

  /**
   * Update player XP with history tracking
   */
  async updatePlayerXP(address, xp, source = 'manual', reason = null) {
    try {
      if (this.mode === 'database' && this.supabase) {
        return await this._updateDatabaseXP(address, xp, source, reason);
      } else {
        return await this._updateJsonXP(address, xp);
      }
    } catch (error) {
      console.error('❌ Error updating player XP:', error);
      throw error;
    }
  }

  /**
   * Update XP in database with full audit trail
   */
  async _updateDatabaseXP(address, xp, source, reason) {
    const normalizedAddress = address.toLowerCase();

    // Upsert player XP
    const { data, error } = await this.supabase
      .from('player_xp')
      .upsert({
        player_address: normalizedAddress,
        xp: xp,
        xp_source: source,
        last_xp_update: new Date().toISOString(),
        total_xp_earned: xp // For now, assume XP is cumulative
      }, {
        onConflict: 'player_address'
      })
      .select()
      .single();

    if (error) throw error;

    // Refresh leaderboard cache
    await this.supabase.rpc('refresh_leaderboard_cache');

    console.log(`✅ Updated XP for ${address}: ${xp} (${source})`);
    return data;
  }

  /**
   * Update XP in JSON file (fallback)
   */
  async _updateJsonXP(address, xp) {
    try {
      const data = await fs.readFile(XP_DATA_PATH, 'utf8');
      const players = JSON.parse(data);
      const now = new Date().toISOString();
      
      const playerIndex = players.findIndex(
        player => player.address.toLowerCase() === address.toLowerCase()
      );

      if (playerIndex !== -1) {
        players[playerIndex].xp = xp;
        players[playerIndex].lastUpdated = now;
      } else {
        players.push({
          address,
          xp,
          lastUpdated: now
        });
      }

      await fs.writeFile(XP_DATA_PATH, JSON.stringify(players, null, 2));
      console.log(`✅ Updated JSON XP for ${address}: ${xp}`);
      
      return { player_address: address, xp, last_xp_update: now };
    } catch (error) {
      console.error('❌ Error updating JSON XP:', error);
      throw error;
    }
  }

  /**
   * Verify XP from blockchain (if available)
   */
  async verifyXPFromBlockchain(address) {
    if (!this.contract) {
      throw new Error('Blockchain integration not available');
    }

    try {
      const onChainXP = await this.contract.getPlayerXP(address);
      return {
        address,
        onChainXP: parseInt(onChainXP.toString()),
        verified: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error verifying blockchain XP:', error);
      return {
        address,
        onChainXP: 0,
        verified: false,
        error: error.message
      };
    }
  }

  /**
   * Sync XP from blockchain events
   */
  async syncFromBlockchain(startBlock = 'latest') {
    if (!this.contract) {
      throw new Error('Blockchain integration not available');
    }

    try {
      console.log('🔍 Syncing XP from blockchain events...');
      
      // Listen for XP events
      const filter = this.contract.filters.XPAwarded();
      const events = await this.contract.queryFilter(filter, startBlock);

      const updates = [];
      for (const event of events) {
        const { player, amount, reason } = event.args;
        
        try {
          await this.updatePlayerXP(
            player, 
            parseInt(amount.toString()), 
            'blockchain', 
            reason
          );
          
          updates.push({
            player,
            xp: parseInt(amount.toString()),
            reason,
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash
          });
        } catch (error) {
          console.error(`❌ Failed to sync XP for ${player}:`, error);
        }
      }

      console.log(`✅ Synced ${updates.length} XP updates from blockchain`);
      return updates;
    } catch (error) {
      console.error('❌ Error syncing from blockchain:', error);
      throw error;
    }
  }

  /**
   * Get leaderboard statistics
   */
  async getLeaderboardStats() {
    try {
      if (this.mode === 'database' && this.supabase) {
        const { data, error } = await this.supabase
          .rpc('get_leaderboard_stats');

        if (error) throw error;
        return data;
      } else {
        const { data: allPlayers } = await this._getJsonLeaderboard({ limit: 10000 });
        
        return {
          totalPlayers: allPlayers.length,
          totalXP: allPlayers.reduce((sum, p) => sum + p.xp, 0),
          averageXP: allPlayers.length > 0 ? 
            Math.round(allPlayers.reduce((sum, p) => sum + p.xp, 0) / allPlayers.length) : 0,
          highestXP: allPlayers.length > 0 ? allPlayers[0].xp : 0,
          lowestXP: allPlayers.length > 0 ? allPlayers[allPlayers.length - 1].xp : 0,
          topTenThreshold: allPlayers.length >= 10 ? allPlayers[9].xp : 0
        };
      }
    } catch (error) {
      console.error('❌ Error getting leaderboard stats:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive player profile including lifetime XP, rank, and history
   * Phase 6: Player Profiles
   * @param {string} address - Player's wallet address
   * @returns {Promise<Object|null>} Complete player profile or null if not found
   */
  async getPlayerProfile(address) {
    try {
      if (this.mode === 'database' && this.supabase) {
        return await this._getDatabasePlayerProfile(address);
      } else {
        return await this._getJsonPlayerProfile(address);
      }
    } catch (error) {
      console.error('❌ Error getting player profile:', error);
      
      // Fallback to JSON if database fails
      if (this.mode === 'database') {
        return await this._getJsonPlayerProfile(address);
      }
      
      throw error;
    }
  }

  /**
   * Get player rank only (lightweight version)
   * Phase 6: Player Profiles
   * @param {string} address - Player's wallet address
   * @returns {Promise<Object|null>} Player rank information or null if not found
   */
  async getPlayerRank(address) {
    try {
      // This can use the existing getPlayerXPAndRank function
      const playerData = await this.getPlayerXPAndRank(address);
      
      if (!playerData) {
        return null;
      }

      return {
        address: playerData.address,
        rank: playerData.rank,
        xp: playerData.xp,
        isTopFive: playerData.isTopFive,
        totalPlayers: playerData.totalPlayers || null
      };
    } catch (error) {
      console.error('❌ Error getting player rank:', error);
      throw error;
    }
  }

  /**
   * Get database player profile with comprehensive data
   */
  async _getDatabasePlayerProfile(address) {
    // Get basic player data
    const { data: player, error } = await this.supabase
      .from('player_xp')
      .select('player_address, xp, last_xp_update, created_at')
      .eq('player_address', address.toLowerCase())
      .single();

    if (error || !player) {
      return null;
    }

    // Get rank using window function
    const { data: rankData } = await this.supabase
      .rpc('get_player_rank', { player_addr: address.toLowerCase() });

    const rank = rankData?.[0]?.rank || null;

    // Get XP history
    const { data: history } = await this.supabase
      .from('xp_history')
      .select('xp_amount, transaction_hash, block_number, timestamp, reason')
      .eq('player_address', address.toLowerCase())
      .order('timestamp', { ascending: false })
      .limit(100); // Last 100 transactions

    // Get total players for context
    const { count: totalPlayers } = await this.supabase
      .from('player_xp')
      .select('*', { count: 'exact', head: true });

    // Calculate additional statistics
    const lifetimeXP = history?.reduce((sum, h) => sum + (h.xp_amount || 0), 0) || player.xp;
    const totalTransactions = history?.length || 0;
    const averageXPPerTransaction = totalTransactions > 0 ? Math.round(lifetimeXP / totalTransactions) : 0;

    // Format history for response
    const formattedHistory = (history || []).map(h => ({
      timestamp: Math.floor(new Date(h.timestamp).getTime() / 1000),
      amount: h.xp_amount,
      transactionHash: h.transaction_hash,
      blockNumber: h.block_number,
      reason: h.reason,
      date: h.timestamp
    }));

    return {
      address: player.player_address,
      xp: player.xp,
      rank: rank,
      isTopFive: rank && rank <= 5,
      lifetimeXP: lifetimeXP,
      totalPlayers: totalPlayers,
      joinedAt: player.created_at,
      lastUpdated: player.last_xp_update,
      statistics: {
        totalTransactions,
        averageXPPerTransaction,
        bestTransaction: Math.max(...(history?.map(h => h.xp_amount) || [0]))
      },
      history: formattedHistory
    };
  }

  /**
   * Get JSON player profile with comprehensive data
   */
  async _getJsonPlayerProfile(address) {
    // Load XP data
    const allRecords = await this._loadJsonData();
    
    // Find player
    const player = allRecords.find(
      record => record.address.toLowerCase() === address.toLowerCase()
    );

    if (!player) {
      return null;
    }

    // Calculate rank
    const sortedPlayers = allRecords.sort((a, b) => b.xp - a.xp);
    const rank = sortedPlayers.findIndex(p => 
      p.address.toLowerCase() === address.toLowerCase()
    ) + 1;

    // Get history from player record
    const history = (player.history || []).map(entry => ({
      timestamp: entry.ts,
      amount: entry.amount,
      date: new Date(entry.ts * 1000).toISOString()
    }));

    // Calculate statistics
    const lifetimeXP = history.reduce((sum, h) => sum + h.amount, 0);
    const totalTransactions = history.length;
    const averageXPPerTransaction = totalTransactions > 0 ? Math.round(lifetimeXP / totalTransactions) : 0;
    const bestTransaction = Math.max(...(history.map(h => h.amount) || [0]));

    return {
      address: player.address,
      xp: player.xp,
      rank: rank,
      isTopFive: rank <= 5,
      lifetimeXP: lifetimeXP,
      totalPlayers: allRecords.length,
      joinedAt: null, // Not tracked in JSON mode
      lastUpdated: player.lastUpdated,
      statistics: {
        totalTransactions,
        averageXPPerTransaction,
        bestTransaction
      },
      history: history.slice(-100) // Last 100 transactions
    };
  }

  /**
   * Migrate data from JSON to database
   */
  async migrateJsonToDatabase() {
    if (!this.supabase) {
      throw new Error('Database not available for migration');
    }

    try {
      console.log('🔄 Starting JSON to database migration...');
      
      const data = await fs.readFile(XP_DATA_PATH, 'utf8');
      const players = JSON.parse(data);

      const migrationResults = [];
      
      for (const player of players) {
        try {
          await this._updateDatabaseXP(
            player.address, 
            player.xp, 
            'migration', 
            'Migrated from JSON'
          );
          
          migrationResults.push({
            address: player.address,
            xp: player.xp,
            status: 'success'
          });
        } catch (error) {
          migrationResults.push({
            address: player.address,
            xp: player.xp,
            status: 'failed',
            error: error.message
          });
        }
      }

      console.log(`✅ Migration completed. ${migrationResults.filter(r => r.status === 'success').length}/${players.length} players migrated successfully`);
      return migrationResults;
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Get current storage mode and health
   */
  getStorageInfo() {
    return {
      mode: this.mode,
      database: {
        available: !!this.supabase,
        connected: !!this.supabase
      },
      blockchain: {
        available: !!this.contract,
        provider: !!this.provider,
        contractAddress: process.env.HODL_MANAGER_ADDRESS || null
      },
      features: {
        pagination: true,
        search: true,
        filtering: true,
        realTimeUpdates: this.mode === 'database',
        blockchainVerification: !!this.contract,
        historyTracking: this.mode === 'database'
      }
    };
  }
}

// Create and export singleton instance
const xpStore = new XPStore();

// Backward compatibility exports
module.exports = {
  // Enhanced XP Store class
  XPStore,
  
  // Singleton instance
  xpStore,
  
  // Backward compatible functions
  getXpLeaderboard: (options = {}) => xpStore.getXpLeaderboard(options),
  getPlayerXPAndRank: (address) => xpStore.getPlayerXPAndRank(address),
  updatePlayerXP: (address, xp, source, reason) => xpStore.updatePlayerXP(address, xp, source, reason),
  getLeaderboardStats: () => xpStore.getLeaderboardStats(),
  
  // Phase 6: Player Profiles
  getPlayerProfile: (address) => xpStore.getPlayerProfile(address),
  getPlayerRank: (address) => xpStore.getPlayerRank(address),
  
  // New enhanced functions
  verifyXPFromBlockchain: (address) => xpStore.verifyXPFromBlockchain(address),
  syncFromBlockchain: (startBlock) => xpStore.syncFromBlockchain(startBlock),
  migrateJsonToDatabase: () => xpStore.migrateJsonToDatabase(),
  getStorageInfo: () => xpStore.getStorageInfo(),
  
  // Legacy functions for compatibility
  getAllXPRecords: () => xpStore.getXpLeaderboard({ limit: 10000 }).then(result => result.data),
  saveXpData: async (data) => {
    // This is more complex now - would need to update each player individually
    const results = [];
    for (const player of data) {
      try {
        await xpStore.updatePlayerXP(player.address, player.xp, 'bulk_save', 'Bulk data save');
        results.push({ address: player.address, status: 'success' });
      } catch (error) {
        results.push({ address: player.address, status: 'failed', error: error.message });
      }
    }
    return results;
  },
  getTotalPlayerCount: async () => {
    const stats = await xpStore.getLeaderboardStats();
    return stats.totalPlayers;
  }
};