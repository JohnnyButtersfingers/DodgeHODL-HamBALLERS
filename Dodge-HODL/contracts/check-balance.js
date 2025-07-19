require('dotenv').config();
const hre = require('hardhat');

async function checkBalance() {
  if (!process.env.PRIVATE_KEY) {
    console.log('❌ No PRIVATE_KEY found in .env file');
    return;
  }

  try {
    // Get the deployer signer
    const [deployer] = await hre.ethers.getSigners();
    
    console.log('🔍 Checking wallet balance...\n');
    console.log('📋 Wallet Address:', deployer.address);
    
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    const balanceInEth = hre.ethers.formatEther(balance);
    
    console.log('💰 Balance:', balanceInEth, 'ETH');
    
    if (parseFloat(balanceInEth) > 0.001) {
      console.log('✅ Sufficient balance for deployment!');
      console.log('\n🚀 Ready to deploy contracts!');
      console.log('Run: npx hardhat run scripts/deploy_production.js --network abstract');
    } else {
      console.log('⚠️  Low balance. You need testnet ETH to deploy.');
      console.log('💡 Visit Abstract testnet faucet and request ETH for:', deployer.address);
    }
  } catch (error) {
    console.error('❌ Error checking balance:', error.message);
  }
}

checkBalance();
