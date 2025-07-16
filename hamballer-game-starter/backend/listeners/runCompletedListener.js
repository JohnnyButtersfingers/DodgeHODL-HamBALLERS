const { ethers } = require('ethers');
const { db } = require('../config/database');

const ABI = [
  'event RunCompleted(address indexed user, uint256 xpEarned)'
];
const BADGE_ABI = [
  'function mintBadge(address to, uint256 xpValue, uint256 seasonId) returns (uint256)'
];

async function mintBadgeWithRetry(badge, user, xp, retries = 1, delayMs = 5000) {
  try {
    const tx = await badge.mintBadge(user, xp, 1);
    if (tx.wait) await tx.wait();
    return true;
  } catch (err) {
    console.error('Failed to mint XPBadge:', err.message);
    if (retries > 0) {
      console.log('Retrying XPBadge mint...');
      await new Promise((res) => setTimeout(res, delayMs));
      return mintBadgeWithRetry(badge, user, xp, retries - 1, delayMs);
    }
    return false;
  }
}

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
        const success = await mintBadgeWithRetry(badge, user, xp, 1);
        if (success) {
          console.log(`Minted XPBadge to ${user}`);
        } else {
          console.error('Failed to mint XPBadge after retry');
        }
      }
    } catch (err) {
      console.error('Failed to persist XP:', err.message);
    }
  });
}

module.exports = { listenRunCompleted, mintBadgeWithRetry };

