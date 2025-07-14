const express = require('express');
const router = express.Router();

// Mock leaderboard data - in a real app this would come from a database
const mockLeaderboardData = [
  { address: "0x742d35Cc6634C0532925a3b8D4C5bc57F4e8F9e2", xp: 1250 },
  { address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", xp: 980 },
  { address: "0x8ba1f109551bD432803012645Hac136c5C2eE5e3", xp: 875 },
  { address: "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f", xp: 420 },
  { address: "0xaB5801a7D398351b8bE11C439e05C5B3259aeC9B", xp: 350 }
];

// GET /api/leaderboard - Get top 5 users by XP
router.get('/', async (req, res) => {
  try {
    console.log('📊 Fetching leaderboard data');

    // In a real implementation, you would:
    // 1. Query the database for users ordered by XP
    // 2. Limit results to top 5
    // 3. Handle pagination if needed
    
    // For now, return mock data
    const leaderboard = mockLeaderboardData.slice(0, 5);

    res.json({
      success: true,
      data: leaderboard,
      timestamp: new Date().toISOString(),
      count: leaderboard.length
    });

  } catch (error) {
    console.error('❌ Error fetching leaderboard:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leaderboard data',
      message: error.message
    });
  }
});

// GET /api/leaderboard/rank/:address - Get specific user's rank (bonus endpoint)
router.get('/rank/:address', async (req, res) => {
  try {
    const { address } = req.params;

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Ethereum address format'
      });
    }

    // Find user's position in leaderboard
    const userIndex = mockLeaderboardData.findIndex(
      user => user.address.toLowerCase() === address.toLowerCase()
    );

    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'User not found in leaderboard'
      });
    }

    const userRank = {
      address: mockLeaderboardData[userIndex].address,
      xp: mockLeaderboardData[userIndex].xp,
      rank: userIndex + 1,
      isTopFive: userIndex < 5
    };

    res.json({
      success: true,
      data: userRank,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching user rank:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user rank',
      message: error.message
    });
  }
});

module.exports = router;