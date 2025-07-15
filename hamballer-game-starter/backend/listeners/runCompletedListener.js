const { ethers } = require('ethers');
const { db } = require('../config/database');

const ABI = [
  'event RunCompleted(address indexed user, uint256 xpEarned)'
];

function listenRunCompleted() {
  const rpc = process.env.ABSTRACT_RPC_URL;
  const manager = process.env.HODL_MANAGER_ADDRESS;
  if (!rpc || !manager) {
    console.log('RunCompleted listener not configured');
    return;
  }
  const provider = new ethers.JsonRpcProvider(rpc);
  const contract = new ethers.Contract(manager, ABI, provider);
  contract.on('RunCompleted', async (user, xp) => {
    console.log(`RunCompleted event for ${user}: ${xp.toString()} XP`);
    try {
      await db.updateXP(user, xp.toString());
    } catch (err) {
      console.error('Failed to persist XP:', err.message);
    }
  });
}

module.exports = { listenRunCompleted };

