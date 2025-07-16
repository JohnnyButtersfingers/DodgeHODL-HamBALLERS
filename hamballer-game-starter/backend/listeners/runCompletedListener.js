const { ethers } = require('ethers');
const { db } = require('../config/database');

const ABI = [
  'event RunCompleted(address indexed user, uint256 xpEarned)'
];
const BADGE_ABI = [
  'function mintBadge(address to, uint256 xpValue, uint256 seasonId) returns (uint256)'
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

  const badgeAddress = process.env.XP_BADGE_ADDRESS;
  const pk = process.env.PRIVATE_KEY;
  let badge;
  if (badgeAddress && pk) {
    const wallet = new ethers.Wallet(pk.startsWith('0x') ? pk : `0x${pk}`, provider);
    badge = new ethers.Contract(badgeAddress, BADGE_ABI, wallet);
  }
  contract.on('RunCompleted', async (user, xp) => {
    console.log(`RunCompleted event for ${user}: ${xp.toString()} XP`);
    try {
      await db.updateXP(user, xp.toString());
      if (badge) {
        try {
          const tx = await badge.mintBadge(user, xp, 1);
          await tx.wait();
          console.log(`Minted XPBadge to ${user}`);
        } catch (err) {
          console.error('Failed to mint XPBadge:', err.message);
        }
      }
    } catch (err) {
      console.error('Failed to persist XP:', err.message);
    }
  });
}

module.exports = { listenRunCompleted };

