require('dotenv').config();
const hre = require('hardhat');

async function main() {
  console.log('🚀 Deploying HamBaller.xyz contracts to Abstract Testnet...\n');

  // Get deployer
  const [deployer] = await hre.ethers.getSigners();
  console.log('📋 Deploying with account:', deployer.address);
  console.log('💰 Account balance:', hre.ethers.utils.formatEther(await deployer.getBalance()), 'ETH\n');

  // Deploy DBP Token
  console.log('🪙 Deploying DBP Token...');
  const DBPToken = await hre.ethers.getContractFactory('DBPToken');
  const dbpToken = await DBPToken.deploy(
    'Chess Puffs',
    'DBP',
    deployer.address, // owner
    deployer.address  // minter initially
  );
  await dbpToken.deployed();
  console.log('✅ DBP Token deployed to:', dbpToken.address);

  // Deploy Boost NFT
  console.log('\n🎁 Deploying Boost NFT...');
  const BoostNFT = await hre.ethers.getContractFactory('BoostNFT');
  const boostNFT = await BoostNFT.deploy(
    'https://api.hamballer.xyz/metadata/boost/', // base URI
    deployer.address, // owner
    deployer.address  // minter initially
  );
  await boostNFT.deployed();
  console.log('✅ Boost NFT deployed to:', boostNFT.address);

  // Deploy HODL Manager
  console.log('\n🎮 Deploying HODL Manager...');
  const HODLManager = await hre.ethers.getContractFactory('HODLManager');
  const hodlManager = await HODLManager.deploy(
    dbpToken.address,
    boostNFT.address,
    deployer.address // owner
  );
  await hodlManager.deployed();
  console.log('✅ HODL Manager deployed to:', hodlManager.address);

  // Setup permissions
  console.log('\n🔐 Setting up permissions...');
  
  // Grant HODL Manager permission to mint DBP tokens
  const MINTER_ROLE = await dbpToken.MINTER_ROLE();
  await dbpToken.grantRole(MINTER_ROLE, hodlManager.address);
  console.log('✅ Granted MINTER_ROLE to HODL Manager for DBP tokens');

  // Grant HODL Manager permission to burn Boost NFTs
  const BURNER_ROLE = await boostNFT.BURNER_ROLE();
  await boostNFT.grantRole(BURNER_ROLE, hodlManager.address);
  console.log('✅ Granted BURNER_ROLE to HODL Manager for Boost NFTs');

  // Mint some initial boost NFTs for testing
  console.log('\n🎁 Minting initial boost NFTs...');
  for (let i = 0; i < 5; i++) {
    await boostNFT.mint(deployer.address, i, 10, '0x'); // 10 of each boost type
  }
  console.log('✅ Minted 10 of each boost type (0-4) to deployer');

  // Verify contracts
  console.log('\n🔍 Verifying deployment...');
  
  const dbpSupply = await dbpToken.totalSupply();
  const dbpBalance = await dbpToken.balanceOf(deployer.address);
  const boostBalance = await boostNFT.balanceOf(deployer.address, 0);
  
  console.log('📊 DBP Token total supply:', hre.ethers.utils.formatEther(dbpSupply));
  console.log('📊 Deployer DBP balance:', hre.ethers.utils.formatEther(dbpBalance));
  console.log('📊 Deployer Speed Boost balance:', boostBalance.toString());

  // Output deployment summary
  console.log('\n🎉 DEPLOYMENT COMPLETE!\n');
  console.log('📋 Contract Addresses:');
  console.log('='.repeat(50));
  console.log('DBP Token:       ', dbpToken.address);
  console.log('Boost NFT:       ', boostNFT.address);
  console.log('HODL Manager:    ', hodlManager.address);
  console.log('='.repeat(50));

  // Output for frontend configuration
  console.log('\n📱 Frontend Configuration:');
  console.log('Copy these to frontend/.env:');
  console.log('='.repeat(50));
  console.log(`VITE_DBP_TOKEN_ADDRESS=${dbpToken.address}`);
  console.log(`VITE_BOOST_NFT_ADDRESS=${boostNFT.address}`);
  console.log(`VITE_HODL_MANAGER_ADDRESS=${hodlManager.address}`);
  console.log('='.repeat(50));

  // Output for backend configuration
  console.log('\n🖥️ Backend Configuration:');
  console.log('Copy these to backend/.env:');
  console.log('='.repeat(50));
  console.log(`DBP_TOKEN_ADDRESS=${dbpToken.address}`);
  console.log(`BOOST_NFT_ADDRESS=${boostNFT.address}`);
  console.log(`HODL_MANAGER_ADDRESS=${hodlManager.address}`);
  console.log('='.repeat(50));

  // Save addresses to file for automated config
  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      DBPToken: dbpToken.address,
      BoostNFT: boostNFT.address,
      HODLManager: hodlManager.address
    },
    frontendEnv: [
      `VITE_DBP_TOKEN_ADDRESS=${dbpToken.address}`,
      `VITE_BOOST_NFT_ADDRESS=${boostNFT.address}`,
      `VITE_HODL_MANAGER_ADDRESS=${hodlManager.address}`
    ],
    backendEnv: [
      `DBP_TOKEN_ADDRESS=${dbpToken.address}`,
      `BOOST_NFT_ADDRESS=${boostNFT.address}`,
      `HODL_MANAGER_ADDRESS=${hodlManager.address}`
    ]
  };

  const fs = require('fs');
  fs.writeFileSync(
    'deployment-info.json',
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log('\n💾 Deployment info saved to deployment-info.json');

  console.log('\n🚀 Ready for backend and frontend integration!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });
