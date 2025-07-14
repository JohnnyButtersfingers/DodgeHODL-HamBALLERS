const fs = require('fs').promises;
const path = require('path');

// TODO: Replace this local file system store with database queries or contract calls
// when integrating with Supabase or blockchain contract storage

const XP_DATA_PATH = path.join(__dirname, '..', 'data', 'xp.json');

/**
 * Get all XP records from the local JSON store
 * @returns {Promise<Array>} Array of XP records
 */
async function getAllXPRecords() {
  try {
    const data = await fs.readFile(XP_DATA_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Error reading XP data:', error);
    // Return empty array if file doesn't exist or is corrupted
    return [];
  }
}

/**
 * Get XP leaderboard sorted by XP (descending)
 * @returns {Promise<Array>} Array of players sorted by XP
 */
async function getXpLeaderboard() {
  try {
    const allRecords = await getAllXPRecords();
    
    // Sort by XP in descending order and return only address + xp
    const leaderboard = allRecords
      .sort((a, b) => b.xp - a.xp)
      .map(player => ({
        address: player.address,
        xp: player.xp
      }));

    console.log(`📊 Retrieved ${leaderboard.length} players for leaderboard`);
    return leaderboard;
  } catch (error) {
    console.error('❌ Error getting XP leaderboard:', error);
    throw error;
  }
}

/**
 * Get a specific player's XP and rank
 * @param {string} address - Player's wallet address
 * @returns {Promise<Object|null>} Player's XP data with rank, or null if not found
 */
async function getPlayerXPAndRank(address) {
  try {
    const allRecords = await getAllXPRecords();
    
    // Sort by XP descending to calculate rank
    const sortedRecords = allRecords.sort((a, b) => b.xp - a.xp);
    
    // Find player in sorted list
    const playerIndex = sortedRecords.findIndex(
      player => player.address.toLowerCase() === address.toLowerCase()
    );

    if (playerIndex === -1) {
      return null;
    }

    const playerData = sortedRecords[playerIndex];
    return {
      address: playerData.address,
      xp: playerData.xp,
      rank: playerIndex + 1,
      isTopFive: playerIndex < 5,
      lastUpdated: playerData.lastUpdated
    };
  } catch (error) {
    console.error('❌ Error getting player rank:', error);
    throw error;
  }
}

/**
 * Save XP data array to JSON file
 * @param {Array} data - Array of XP records to save
 * @returns {Promise<void>}
 */
async function saveXpData(data) {
  try {
    // Ensure directory exists
    const dir = path.dirname(XP_DATA_PATH);
    await fs.mkdir(dir, { recursive: true });
    
    // Add lastUpdated timestamp to each record if not present
    const dataWithTimestamps = data.map(record => ({
      ...record,
      lastUpdated: record.lastUpdated || new Date().toISOString()
    }));

    // Write to file
    await fs.writeFile(XP_DATA_PATH, JSON.stringify(dataWithTimestamps, null, 2));
    console.log(`✅ Saved ${data.length} XP records to store`);
  } catch (error) {
    console.error('❌ Error saving XP data:', error);
    throw error;
  }
}

/**
 * Add or update a player's XP
 * TODO: This will be replaced with database updates or contract events
 * @param {string} address - Player's wallet address
 * @param {number} xp - Player's XP amount
 * @returns {Promise<void>}
 */
async function updatePlayerXP(address, xp) {
  try {
    const allRecords = await getAllXPRecords();
    const now = new Date().toISOString();
    
    // Find existing player or add new one
    const playerIndex = allRecords.findIndex(
      player => player.address.toLowerCase() === address.toLowerCase()
    );

    if (playerIndex !== -1) {
      // Update existing player
      allRecords[playerIndex].xp = xp;
      allRecords[playerIndex].lastUpdated = now;
    } else {
      // Add new player
      allRecords.push({
        address,
        xp,
        lastUpdated: now
      });
    }

    // Save updated data
    await saveXpData(allRecords);
    console.log(`✅ Updated XP for ${address}: ${xp}`);
  } catch (error) {
    console.error('❌ Error updating player XP:', error);
    throw error;
  }
}

/**
 * Get total number of players
 * @returns {Promise<number>} Total player count
 */
async function getTotalPlayerCount() {
  try {
    const allRecords = await getAllXPRecords();
    return allRecords.length;
  } catch (error) {
    console.error('❌ Error getting player count:', error);
    return 0;
  }
}

module.exports = {
  getXpLeaderboard,
  saveXpData,
  getAllXPRecords,
  getPlayerXPAndRank,
  updatePlayerXP,
  getTotalPlayerCount
};