const fs = require('fs').promises;
const path = require('path');
const { getAllXPRecords } = require('./xpStore');

// TODO: Replace this local file system store with wallet-based follow system
// Future implementation: Smart contract or database-based friend/follow system
// where users can add/remove friends through wallet interactions

const FRIENDS_DATA_PATH = path.join(__dirname, '..', 'data', 'friends.json');

/**
 * Get all friends data from the local JSON store
 * @returns {Promise<Object>} Object mapping wallet addresses to friend arrays
 */
async function getAllFriendsData() {
  try {
    const data = await fs.readFile(FRIENDS_DATA_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Error reading friends data:', error);
    // Return empty object if file doesn't exist or is corrupted
    return {};
  }
}

/**
 * Get friend leaderboard for a specific wallet address
 * @param {string} walletAddress - Player's wallet address
 * @returns {Promise<Array>} Array of friends sorted by XP (descending)
 */
async function getFriendLeaderboard(walletAddress) {
  try {
    // Normalize address to lowercase for comparison
    const normalizedAddress = walletAddress.toLowerCase();
    
    // Get friends data and XP records
    const [friendsData, allXPRecords] = await Promise.all([
      getAllFriendsData(),
      getAllXPRecords()
    ]);

    // Find friends for this wallet address (case-insensitive search)
    const friendAddresses = Object.keys(friendsData).reduce((found, key) => {
      if (key.toLowerCase() === normalizedAddress) {
        return friendsData[key];
      }
      return found;
    }, []);

    if (!friendAddresses || friendAddresses.length === 0) {
      console.log(`📋 No friends found for address: ${walletAddress}`);
      return [];
    }

    // Create XP lookup map for efficient searching
    const xpLookup = {};
    allXPRecords.forEach(record => {
      xpLookup[record.address.toLowerCase()] = record;
    });

    // Build friend leaderboard with XP data
    const friendLeaderboard = [];
    
    for (const friendAddress of friendAddresses) {
      const normalizedFriendAddress = friendAddress.toLowerCase();
      const xpData = xpLookup[normalizedFriendAddress];
      
      if (xpData) {
        friendLeaderboard.push({
          address: xpData.address, // Use original casing from XP data
          xp: xpData.xp,
          lastUpdated: xpData.lastUpdated
        });
      } else {
        // Friend exists but has no XP data yet
        friendLeaderboard.push({
          address: friendAddress,
          xp: 0,
          lastUpdated: null
        });
      }
    }

    // Sort by XP in descending order
    const sortedFriendLeaderboard = friendLeaderboard.sort((a, b) => b.xp - a.xp);

    console.log(`👥 Retrieved friend leaderboard for ${walletAddress}: ${sortedFriendLeaderboard.length} friends`);
    return sortedFriendLeaderboard;

  } catch (error) {
    console.error('❌ Error getting friend leaderboard:', error);
    throw error;
  }
}

/**
 * Get friends list for a specific wallet address
 * @param {string} walletAddress - Player's wallet address
 * @returns {Promise<Array>} Array of friend addresses
 */
async function getFriendsList(walletAddress) {
  try {
    const normalizedAddress = walletAddress.toLowerCase();
    const friendsData = await getAllFriendsData();

    // Find friends for this wallet address (case-insensitive search)
    const friendAddresses = Object.keys(friendsData).reduce((found, key) => {
      if (key.toLowerCase() === normalizedAddress) {
        return friendsData[key];
      }
      return found;
    }, []);

    return friendAddresses || [];
  } catch (error) {
    console.error('❌ Error getting friends list:', error);
    throw error;
  }
}

/**
 * Add a friend to a wallet's friends list
 * TODO: Replace with wallet-based follow system
 * @param {string} walletAddress - Player's wallet address
 * @param {string} friendAddress - Friend's wallet address to add
 * @returns {Promise<void>}
 */
async function addFriend(walletAddress, friendAddress) {
  try {
    const friendsData = await getAllFriendsData();
    const normalizedAddress = walletAddress.toLowerCase();
    
    // Find the correct key (preserving original casing)
    let userKey = Object.keys(friendsData).find(key => 
      key.toLowerCase() === normalizedAddress
    );

    if (!userKey) {
      userKey = walletAddress; // Use provided address if not found
      friendsData[userKey] = [];
    }

    // Add friend if not already in list
    if (!friendsData[userKey].includes(friendAddress)) {
      friendsData[userKey].push(friendAddress);
      
      // Save updated friends data
      await fs.writeFile(FRIENDS_DATA_PATH, JSON.stringify(friendsData, null, 2));
      console.log(`✅ Added friend ${friendAddress} to ${walletAddress}`);
    } else {
      console.log(`📋 Friend ${friendAddress} already exists for ${walletAddress}`);
    }
  } catch (error) {
    console.error('❌ Error adding friend:', error);
    throw error;
  }
}

module.exports = {
  getFriendLeaderboard,
  getFriendsList,
  addFriend,
  getAllFriendsData
};