const { createClient } = require('@supabase/supabase-js');
const { ethers } = require('ethers');

// Supabase client - with fallback for development
let supabase = null;

if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && 
    !process.env.SUPABASE_URL.includes('your_supabase') && 
    !process.env.SUPABASE_ANON_KEY.includes('your_supabase')) {
  try {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    console.log('✅ Supabase client initialized');
  } catch (error) {
    console.warn('⚠️ Failed to initialize Supabase client:', error.message);
  }
} else {
  console.warn('⚠️ Supabase credentials not configured - using mock database');
}

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
    // Use Abstract testnet or localhost
    const rpcUrl = process.env.ABSTRACT_RPC_URL || 'http://127.0.0.1:8545';
    provider = new ethers.JsonRpcProvider(rpcUrl);

    // Initialize contract instances
    if (process.env.DBP_TOKEN_ADDRESS) {
      dbpToken = new ethers.Contract(process.env.DBP_TOKEN_ADDRESS, DBP_TOKEN_ABI, provider);
    }
    
    if (process.env.BOOST_NFT_ADDRESS) {
      boostNFT = new ethers.Contract(process.env.BOOST_NFT_ADDRESS, BOOST_NFT_ABI, provider);
    }
    
    if (process.env.HODL_MANAGER_ADDRESS) {
      hodlManager = new ethers.Contract(process.env.HODL_MANAGER_ADDRESS, HODL_MANAGER_ABI, provider);
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

  async updateXP(playerAddress, xpEarned) {
    if (!supabase) {
      console.log('📝 Mock: Updating XP', playerAddress, xpEarned);
      return { player_address: playerAddress, xp: xpEarned };
    }

    const { data, error } = await supabase
      .from('event_logs')
      .insert([{ event_type: 'xp_earned', player_address: playerAddress, event_data: { xpEarned } }])
      .select()
      .single();

    if (error) {
      console.error('❌ Database error recording XP:', error);
      throw error;
    }

    return data;
  },

  // Add supabase reference for direct access when needed
  supabase
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
        totalRuns: stats.totalRuns.toString(),
        completedRuns: stats.completedRuns.toString(),
        totalCPEarned: stats.totalCPEarned.toString(),
        totalDBPEarned: ethers.formatEther(stats.totalDBPEarned),
        bestRunCP: stats.bestRunCP.toString(),
        longestRunTime: stats.longestRunTime.toString(),
        currentStreak: stats.currentStreak.toString(),
        bestStreak: stats.bestStreak.toString()
      };
    } catch (error) {
      console.error('❌ Error fetching player stats:', error);
      return null;
    }
  },

  async getCurrentRun(playerAddress) {
    if (!hodlManager) return null;

    try {
      const run = await hodlManager.getCurrentRun(playerAddress);
      return {
        player: run.player,
        startTime: run.startTime.toString(),
        endTime: run.endTime.toString(),
        cpEarned: run.cpEarned.toString(),
        dbpMinted: ethers.formatEther(run.dbpMinted),
        status: run.status,
        bonusThrowUsed: run.bonusThrowUsed,
        boostsUsed: run.boostsUsed.map(id => id.toString()),
        seed: run.seed
      };
    } catch (error) {
      console.error('❌ Error fetching current run:', error);
      return null;
    }
  },

  async getBoostBalance(playerAddress, boostId) {
    if (!boostNFT) return null;

    try {
      const balance = await boostNFT.balanceOf(playerAddress, boostId);
      return balance.toString();
    } catch (error) {
      console.error('❌ Error fetching boost balance:', error);
      return null;
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
        totalDBPMinted: ethers.formatEther(totalDBP)
      };
    } catch (error) {
      console.error('❌ Error fetching global stats:', error);
      return null;
    }
  }
};

// Initialize on module load
initializeContracts();

module.exports = {
  supabase,
  db,
  contracts,
  provider,
  initializeContracts
};
