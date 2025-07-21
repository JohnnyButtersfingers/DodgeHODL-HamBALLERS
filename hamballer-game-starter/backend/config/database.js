const { createClient } = require('@supabase/supabase-js');
const { ethers } = require('ethers');
const { config, validation } = require('./environment');

// Supabase client - with fallback for development
let supabase = null;
let supabaseService = null;

// Enhanced Supabase initialization with better error handling
function initializeSupabase() {
  // Check if credentials are properly configured
  if (!validation.isSupabaseReady()) {
    console.warn('⚠️ Supabase credentials not configured');
    console.log('📋 To configure Supabase:');
    console.log('   1. Create a Supabase project at https://supabase.com');
    console.log('   2. Copy your project URL and anon key');
    console.log('   3. Add them to your .env file:');
    console.log('      SUPABASE_URL=https://your-project-id.supabase.co');
    console.log('      SUPABASE_ANON_KEY=your_anon_key_here');
    console.log('      SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here');
    console.log('   4. Import the database schema from backend/database_schema.sql');
    console.log('   5. Restart the backend server');
    return false;
  }

  try {
    // Initialize both anon and service role clients
    supabase = createClient(config.supabase.url, config.supabase.anonKey);
    
    if (config.supabase.serviceKey) {
      supabaseService = createClient(config.supabase.url, config.supabase.serviceKey);
      console.log('✅ Supabase service role client initialized');
    }
    
    console.log('✅ Supabase client initialized successfully');
    
    // Test the connection
    testSupabaseConnection();
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Supabase client:', error.message);
    return false;
  }
}

async function testSupabaseConnection() {
  if (!supabase) return;
  
  try {
    // Simple test query to verify connection
    const { data, error } = await supabase
      .from('run_logs')
      .select('count')
      .limit(1);
    
    if (error) {
      console.warn('⚠️ Supabase connection test failed:', error.message);
      console.log('📋 This might be due to:');
      console.log('   - Database schema not imported');
      console.log('   - RLS policies not configured');
      console.log('   - Network connectivity issues');
    } else {
      console.log('✅ Supabase connection test successful');
    }
  } catch (error) {
    console.warn('⚠️ Supabase connection test failed:', error.message);
  }
}

// Initialize Supabase on module load
const supabaseInitialized = initializeSupabase();

// Blockchain provider and contracts
let provider, dbpToken, boostNFT, hodlManager;

// Contract ABIs (simplified - replace with your actual ABIs after compilation)
const DBP_TOKEN_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)"
];

const BOOST_NFT_ABI = [
  "function balanceOf(address account, uint256 id) view returns (uint256)",
  "function getBoostInfo(uint256 id) view returns (tuple(string name, string description, uint256 rarity, uint256 maxSupply, bool isActive))",
  "function totalSupply(uint256 id) view returns (uint256)"
];

const HODL_MANAGER_ABI = [
  "function getCurrentRun(address player) view returns (tuple(address player, uint256 startTime, uint256 endTime, uint256 cpEarned, uint256 dbpMinted, uint8 status, bool bonusThrowUsed, uint256[] boostsUsed, bytes32 seed))",
  "function getPlayerStats(address player) view returns (tuple(uint256 totalRuns, uint256 completedRuns, uint256 totalCPEarned, uint256 totalDBPEarned, uint256 bestRunCP, uint256 longestRunTime, uint256 currentStreak, uint256 bestStreak))",
  "function totalRuns() view returns (uint256)",
  "function totalCPGenerated() view returns (uint256)",
  "function totalDBPMinted() view returns (uint256)"
];

// Initialize blockchain connection
function initializeContracts() {
  try {
    // Use configured RPC URL
    provider = new ethers.JsonRpcProvider(config.blockchain.rpcUrl);

    // Initialize contract instances
    if (config.contracts.dbpToken) {
      dbpToken = new ethers.Contract(config.contracts.dbpToken, DBP_TOKEN_ABI, provider);
    }
    
    if (config.contracts.boostNft) {
      boostNFT = new ethers.Contract(config.contracts.boostNft, BOOST_NFT_ABI, provider);
    }
    
    if (config.contracts.hodlManager) {
      hodlManager = new ethers.Contract(config.contracts.hodlManager, HODL_MANAGER_ABI, provider);
    }

    console.log('✅ Blockchain contracts initialized');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize contracts:', error);
    return false;
  }
}

// Database helper functions with fallbacks
const db = {
  // Mock from method for routes that use db.from() directly
  from: (tableName) => {
    if (!supabase) {
      // Return a comprehensive mock query builder
      const mockQueryBuilder = {
        select: (columns = '*') => ({
          eq: (column, value) => ({
            is: (column2, value2) => ({
              gte: (column3, value3) => ({
                order: (column4, options = {}) => ({
                  limit: (count) => Promise.resolve({ data: [], error: null })
                })
              })
            }),
            neq: (column2, value2) => ({
              order: (column3, options = {}) => ({
                limit: (count) => Promise.resolve({ data: [], error: null })
              })
            }),
            order: (column2, options = {}) => ({
              limit: (count) => Promise.resolve({ data: [], error: null })
            }),
            limit: (count) => Promise.resolve({ data: [], error: null }),
            single: () => Promise.resolve({ data: null, error: null })
          }),
          in: (column, values) => ({
            order: (column2, options = {}) => ({
              limit: (count) => Promise.resolve({ data: [], error: null })
            }),
            limit: (count) => Promise.resolve({ data: [], error: null })
          }),
          lt: (column, value) => ({
            order: (column2, options = {}) => ({
              limit: (count) => Promise.resolve({ data: [], error: null })
            }),
            limit: (count) => Promise.resolve({ data: [], error: null })
          }),
          gte: (column, value) => ({
            order: (column2, options = {}) => ({
              limit: (count) => Promise.resolve({ data: [], error: null })
            }),
            limit: (count) => Promise.resolve({ data: [], error: null })
          }),
          order: (column, options = {}) => ({
            limit: (count) => Promise.resolve({ data: [], error: null })
          }),
          limit: (count) => Promise.resolve({ data: [], error: null }),
          single: () => Promise.resolve({ data: null, error: null })
        }),
        insert: (data) => ({
          select: (columns = '*') => ({
            single: () => Promise.resolve({ data: null, error: null })
          })
        }),
        update: (data) => ({
          eq: (column, value) => ({
            select: (columns = '*') => ({
              single: () => Promise.resolve({ data: null, error: null })
            })
          })
        }),
        delete: () => ({
          eq: (column, value) => Promise.resolve({ data: null, error: null })
        }),
        upsert: (data) => ({
          select: (columns = '*') => ({
            single: () => Promise.resolve({ data: null, error: null })
          })
        })
      };
      
      return mockQueryBuilder;
    }
    return supabase.from(tableName);
  },
  
  // Run logs table operations
  async createRunLog(runData) {
    if (!supabase) {
      // Mock implementation for development
      console.log('📝 Mock: Creating run log', runData);
      return { id: 'mock-' + Date.now(), ...runData };
    }

    const { data, error } = await supabase
      .from('run_logs')
      .insert([{
        player_address: runData.playerAddress,
        start_time: runData.startTime,
        end_time: runData.endTime,
        cp_earned: runData.cpEarned,
        dbp_minted: runData.dbpMinted,
        status: runData.status,
        bonus_throw_used: runData.bonusThrowUsed,
        boosts_used: runData.boostsUsed,
        seed: runData.seed,
        duration: runData.duration,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ Database error creating run log:', error);
      throw error;
    }

    return data;
  },

  async getRunLogs(playerAddress, limit = 50) {
    if (!supabase) {
      // Mock implementation
      console.log('📝 Mock: Getting run logs for', playerAddress);
      return [];
    }

    const query = supabase
      .from('run_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (playerAddress) {
      query.eq('player_address', playerAddress);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Database error fetching run logs:', error);
      throw error;
    }

    return data || [];
  },

  // Replay data table operations
  async saveReplayData(replayData) {
    if (!supabase) {
      console.log('📝 Mock: Saving replay data', replayData);
      return { id: 'mock-replay-' + Date.now(), ...replayData };
    }

    const { data, error } = await supabase
      .from('replays')
      .insert([{
        run_id: replayData.runId,
        player_address: replayData.playerAddress,
        replay_data: replayData.replayData,
        duration: replayData.duration,
        cp_earned: replayData.cpEarned,
        status: replayData.status,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ Database error saving replay:', error);
      throw error;
    }

    return data;
  },

  async getReplay(runId) {
    if (!supabase) {
      console.log('📝 Mock: Getting replay for', runId);
      return null;
    }

    const { data, error } = await supabase
      .from('replays')
      .select('*')
      .eq('run_id', runId)
      .single();

    if (error) {
      console.error('❌ Database error fetching replay:', error);
      throw error;
    }

    return data;
  },

  async getRecentReplays(limit = 20) {
    if (!supabase) {
      console.log('📝 Mock: Getting recent replays');
      return [];
    }

    const { data, error } = await supabase
      .from('replays')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Database error fetching recent replays:', error);
      throw error;
    }

    return data || [];
  },

  // Leaderboard operations
  async getLeaderboard(type = 'cp_earned', limit = 100) {
    if (!supabase) {
      console.log('📝 Mock: Getting leaderboard');
      return [];
    }

    const { data, error } = await supabase
      .from('run_logs')
      .select('player_address, cp_earned, dbp_minted, duration, created_at')
      .eq('status', 'completed')
      .order(type, { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Database error fetching leaderboard:', error);
      throw error;
    }

    return data || [];
  },

  // Player stats operations
  async getPlayerStats(playerAddress) {
    if (!supabase) {
      console.log('📝 Mock: Getting player stats for', playerAddress);
      return {
        player_address: playerAddress,
        current_xp: '0',
        level: '1',
        total_dbp_earned: '0',
        total_runs: '0',
        successful_runs: '0'
      };
    }

    const { data, error } = await supabase
      .from('player_stats')
      .select('*')
      .eq('player_address', playerAddress)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ Database error fetching player stats:', error);
      throw error;
    }

    return data || {
      player_address: playerAddress,
      current_xp: '0',
      level: '1',
      total_dbp_earned: '0',
      total_runs: '0',
      successful_runs: '0'
    };
  },

  async updatePlayerStats(playerAddress, stats) {
    if (!supabase) {
      console.log('📝 Mock: Updating player stats for', playerAddress, stats);
      return { success: true };
    }

    const { error } = await supabase
      .from('player_stats')
      .upsert({
        player_address: playerAddress,
        ...stats,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'player_address'
      });

    if (error) {
      console.error('❌ Database error updating player stats:', error);
      throw error;
    }

    return { success: true };
  },

  // XP Update function - specifically for RunCompleted events
  async updateXP(playerAddress, xpEarned, dbpEarned, runId) {
    console.log(`🎯 Updating XP for ${playerAddress}: +${xpEarned} XP, +${dbpEarned} DBP`);
    
    if (!supabase) {
      console.log('📝 Mock: XP update would happen here');
      return { success: true, xpEarned, dbpEarned };
    }

    try {
      // Get current player stats
      const { data: currentStats } = await supabase
        .from('player_stats')
        .select('*')
        .eq('player_address', playerAddress)
        .single();

      const currentXp = currentStats ? parseInt(currentStats.current_xp || 0) : 0;
      const currentDbp = currentStats ? parseInt(currentStats.total_dbp_earned || 0) : 0;
      
      const newXp = currentXp + parseInt(xpEarned);
      const newDbp = currentDbp + parseInt(dbpEarned);
      const newLevel = calculateLevel(newXp);

      // Update player stats with new XP and DBP
      const { error: updateError } = await supabase
        .from('player_stats')
        .upsert({
          player_address: playerAddress,
          current_xp: newXp.toString(),
          level: newLevel.toString(),
          total_dbp_earned: newDbp.toString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'player_address'
        });

      if (updateError) {
        console.error('❌ Error updating player stats:', updateError);
        throw updateError;
      }

      // Log the XP reward event
      const { error: logError } = await supabase
        .from('event_logs')
        .insert({
          event_type: 'xp_reward',
          player_address: playerAddress,
          xp_earned: xpEarned.toString(),
          dbp_earned: dbpEarned.toString(),
          run_id: runId,
          event_data: JSON.stringify({
            xpEarned,
            dbpEarned,
            runId,
            previousXp: currentXp,
            newXp,
            previousLevel: calculateLevel(currentXp),
            newLevel,
            timestamp: new Date().toISOString()
          }),
          created_at: new Date().toISOString()
        });

      if (logError) {
        console.error('❌ Error logging XP reward event:', logError);
        // Don't throw here, as the main update succeeded
      }

      console.log(`✅ XP update successful: ${playerAddress} now has ${newXp} XP (Level ${newLevel}) and ${newDbp} DBP`);
      
      return {
        success: true,
        playerAddress,
        xpEarned: parseInt(xpEarned),
        dbpEarned: parseInt(dbpEarned),
        previousXp: currentXp,
        newXp,
        previousLevel: calculateLevel(currentXp),
        newLevel,
        runId
      };

    } catch (error) {
      console.error('❌ Error in updateXP:', error);
      throw error;
    }
  },

  // Test Supabase write functionality
  async testSupabaseWrite() {
    if (!supabase) {
      return { success: false, message: 'Supabase not configured' };
    }

    try {
      const testData = {
        player_address: '0x0000000000000000000000000000000000000000',
        current_xp: '100',
        level: '2',
        total_dbp_earned: '50',
        total_runs: '5',
        successful_runs: '3',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('player_stats')
        .upsert([testData], {
          onConflict: 'player_address'
        })
        .select()
        .single();

      if (error) {
        return { success: false, message: error.message };
      }

      // Clean up test data
      await supabase
        .from('player_stats')
        .delete()
        .eq('player_address', '0x0000000000000000000000000000000000000000');

      return { success: true, message: 'Supabase write test successful', data };

    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  // Add supabase reference for direct access when needed
  supabase,
  supabaseService
};

// Contract interaction helpers
const contracts = {
  async getPlayerBalance(playerAddress) {
    if (!dbpToken) return null;
    
    try {
      const balance = await dbpToken.balanceOf(playerAddress);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('❌ Error fetching player balance:', error);
      return null;
    }
  },

  async getPlayerStats(playerAddress) {
    if (!hodlManager) return null;
    
    try {
      const stats = await hodlManager.getPlayerStats(playerAddress);
      return {
        totalRuns: stats[0].toString(),
        completedRuns: stats[1].toString(),
        totalCPEarned: stats[2].toString(),
        totalDBPEarned: stats[3].toString(),
        bestRunCP: stats[4].toString(),
        longestRunTime: stats[5].toString(),
        currentStreak: stats[6].toString(),
        bestStreak: stats[7].toString()
      };
    } catch (error) {
      console.error('❌ Error fetching player stats from contract:', error);
      return null;
    }
  },

  async getCurrentRun(playerAddress) {
    if (!hodlManager) return null;
    
    try {
      const run = await hodlManager.getCurrentRun(playerAddress);
      return {
        player: run[0],
        startTime: run[1].toString(),
        endTime: run[2].toString(),
        cpEarned: run[3].toString(),
        dbpMinted: run[4].toString(),
        status: run[5],
        bonusThrowUsed: run[6],
        boostsUsed: run[7].map(b => b.toString()),
        seed: run[8]
      };
    } catch (error) {
      console.error('❌ Error fetching current run:', error);
      return null;
    }
  },

  async getBoostBalance(playerAddress, boostId) {
    if (!boostNFT) return '0';
    
    try {
      const balance = await boostNFT.balanceOf(playerAddress, boostId);
      return balance.toString();
    } catch (error) {
      console.error('❌ Error fetching boost balance:', error);
      return '0';
    }
  },

  async getGlobalStats() {
    if (!hodlManager) return null;
    
    try {
      const [totalRuns, totalCP, totalDBP] = await Promise.all([
        hodlManager.totalRuns(),
        hodlManager.totalCPGenerated(),
        hodlManager.totalDBPMinted()
      ]);
      
      return {
        totalRuns: totalRuns.toString(),
        totalCPGenerated: totalCP.toString(),
        totalDBPMinted: totalDBP.toString()
      };
    } catch (error) {
      console.error('❌ Error fetching global stats:', error);
      return null;
    }
  }
};

// Helper function for level calculation
function calculateLevel(xp) {
  // Simple level calculation: every 100 XP = 1 level
  return Math.floor(xp / 100) + 1;
}

// Initialize contracts on module load
const contractsInitialized = initializeContracts();

module.exports = { db, contracts, supabaseInitialized, contractsInitialized };
