const express = require('express');
const router = express.Router();
const { getFriendLeaderboard, getFriendsList, addFriend } = require('../utils/friendXpStore');

// TODO: Replace friends.json with wallet-based follow system
// Future implementation: Smart contract or database-based friend/follow system

/**
 * GET /api/friends/leaderboard
 * Get friend leaderboard for a specific wallet address
 * Query params:
 *   - wallet: The wallet address to get friends leaderboard for
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const { wallet } = req.query;

    // Validate wallet address parameter
    if (!wallet) {
      return res.status(400).json({
        error: 'Missing required parameter: wallet',
        message: 'Please provide a wallet address as query parameter'
      });
    }

    // Validate wallet address format (basic Ethereum address validation)
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethAddressRegex.test(wallet)) {
      return res.status(400).json({
        error: 'Invalid wallet address format',
        message: 'Wallet address must be a valid Ethereum address (0x followed by 40 hex characters)'
      });
    }

    console.log(`👥 Getting friend leaderboard for wallet: ${wallet}`);

    // Get friend leaderboard data
    const friendLeaderboard = await getFriendLeaderboard(wallet);

    // Add rank to each friend
    const friendLeaderboardWithRank = friendLeaderboard.map((friend, index) => ({
      ...friend,
      rank: index + 1
    }));

    const response = {
      success: true,
      data: {
        wallet: wallet,
        friends: friendLeaderboardWithRank,
        totalFriends: friendLeaderboard.length
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
    console.log(`✅ Returned friend leaderboard for ${wallet}: ${friendLeaderboard.length} friends`);

  } catch (error) {
    console.error(`❌ Error getting friend leaderboard for ${req.query.wallet}:`, error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve friend leaderboard',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/friends/list
 * Get friends list for a specific wallet address
 * Query params:
 *   - wallet: The wallet address to get friends list for
 */
router.get('/list', async (req, res) => {
  try {
    const { wallet } = req.query;

    if (!wallet) {
      return res.status(400).json({
        error: 'Missing required parameter: wallet',
        message: 'Please provide a wallet address as query parameter'
      });
    }

    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethAddressRegex.test(wallet)) {
      return res.status(400).json({
        error: 'Invalid wallet address format',
        message: 'Wallet address must be a valid Ethereum address'
      });
    }

    console.log(`👥 Getting friends list for wallet: ${wallet}`);

    const friendsList = await getFriendsList(wallet);

    const response = {
      success: true,
      data: {
        wallet: wallet,
        friends: friendsList,
        totalFriends: friendsList.length
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
    console.log(`✅ Returned friends list for ${wallet}: ${friendsList.length} friends`);

  } catch (error) {
    console.error(`❌ Error getting friends list for ${req.query.wallet}:`, error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve friends list',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/friends/add
 * Add a friend to a wallet's friends list
 * Body:
 *   - wallet: The wallet address to add friend to
 *   - friend: The friend's wallet address to add
 */
router.post('/add', async (req, res) => {
  try {
    const { wallet, friend } = req.body;

    if (!wallet || !friend) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'Please provide both wallet and friend addresses'
      });
    }

    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethAddressRegex.test(wallet) || !ethAddressRegex.test(friend)) {
      return res.status(400).json({
        error: 'Invalid wallet address format',
        message: 'Both wallet and friend addresses must be valid Ethereum addresses'
      });
    }

    if (wallet.toLowerCase() === friend.toLowerCase()) {
      return res.status(400).json({
        error: 'Invalid operation',
        message: 'Cannot add yourself as a friend'
      });
    }

    console.log(`👥 Adding friend ${friend} to wallet: ${wallet}`);

    await addFriend(wallet, friend);

    const response = {
      success: true,
      message: 'Friend added successfully',
      data: {
        wallet: wallet,
        friend: friend
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
    console.log(`✅ Successfully added friend ${friend} to ${wallet}`);

  } catch (error) {
    console.error(`❌ Error adding friend for ${req.body.wallet}:`, error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to add friend',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;