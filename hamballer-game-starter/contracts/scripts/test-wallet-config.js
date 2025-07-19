const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🔍 Testing Abstract Testnet Wallet Configuration...\n");
  
  // Load environment variables
  const { 
    ABS_WALLET_ADDRESS, 
    ABS_WALLET_PRIVATE_KEY, 
    TESTNET_RPC_URL,
    NETWORK 
  } = process.env;
  
  console.log("📋 Environment Variables Check:");
  console.log(`   NETWORK: ${NETWORK || "❌ Not set"}`);
  console.log(`   TESTNET_RPC_URL: ${TESTNET_RPC_URL || "❌ Not set"}`);
  console.log(`   ABS_WALLET_ADDRESS: ${ABS_WALLET_ADDRESS || "❌ Not set"}`);
  console.log(`   ABS_WALLET_PRIVATE_KEY: ${ABS_WALLET_PRIVATE_KEY ? "✅ Set (hidden)" : "❌ Not set"}`);
  
  if (!ABS_WALLET_PRIVATE_KEY || ABS_WALLET_PRIVATE_KEY === "your_private_key_here_do_not_share") {
    console.error("\n❌ ERROR: ABS_WALLET_PRIVATE_KEY not properly configured!");
    console.error("   Please update your .env file with your actual private key.");
    process.exit(1);
  }
  
  if (!TESTNET_RPC_URL) {
    console.error("\n❌ ERROR: TESTNET_RPC_URL not configured!");
    process.exit(1);
  }
  
  try {
    // Get signer from private key
    const provider = new ethers.JsonRpcProvider(TESTNET_RPC_URL);
    const wallet = new ethers.Wallet(ABS_WALLET_PRIVATE_KEY, provider);
    
    console.log("\n🔗 Network Connection:");
    const network = await provider.getNetwork();
    console.log(`   Connected to: ${network.name}`);
    console.log(`   Chain ID: ${network.chainId}`);
    console.log(`   Expected Chain ID: 11124 (Abstract Testnet)`);
    
    if (network.chainId !== 11124n) {
      console.warn("⚠️  WARNING: Connected to wrong network!");
    }
    
    console.log("\n💰 Wallet Information:");
    console.log(`   Address: ${wallet.address}`);
    console.log(`   Expected: ${ABS_WALLET_ADDRESS}`);
    
    if (wallet.address.toLowerCase() !== ABS_WALLET_ADDRESS?.toLowerCase()) {
      console.warn("⚠️  WARNING: Derived address doesn't match ABS_WALLET_ADDRESS!");
    }
    
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);
    
    if (balance === 0n) {
      console.log("\n⚠️  WARNING: Wallet has no balance!");
      console.log("   Get testnet ETH from: https://faucet.testnet.abs.xyz");
    } else {
      console.log("\n✅ Wallet is funded and ready for deployment!");
    }
    
    // Test transaction capability (without sending)
    console.log("\n🧪 Testing Transaction Capability:");
    try {
      const feeData = await provider.getFeeData();
      console.log(`   Gas Price: ${ethers.formatUnits(feeData.gasPrice || 0n, "gwei")} gwei`);
      console.log(`   Max Fee: ${ethers.formatUnits(feeData.maxFeePerGas || 0n, "gwei")} gwei`);
      console.log(`   Max Priority: ${ethers.formatUnits(feeData.maxPriorityFeePerGas || 0n, "gwei")} gwei`);
      
      // Estimate deployment cost
      const estimatedGas = 3000000n; // Rough estimate for contract deployment
      const estimatedCost = (feeData.gasPrice || 0n) * estimatedGas;
      console.log(`   Estimated deployment cost: ~${ethers.formatEther(estimatedCost)} ETH`);
      
      if (balance > 0n && balance < estimatedCost) {
        console.warn("\n⚠️  WARNING: Balance might be insufficient for deployment!");
      }
    } catch (error) {
      console.error("   ❌ Error getting fee data:", error.message);
    }
    
    console.log("\n✅ Wallet configuration test complete!");
    console.log("\n📝 Next Steps:");
    console.log("   1. Ensure wallet has sufficient balance");
    console.log("   2. Run deployment: npx hardhat run scripts/deploy-xp-contracts.js --network abstract");
    console.log("   3. Update .env with deployed contract addresses");
    
  } catch (error) {
    console.error("\n❌ Configuration test failed:", error.message);
    console.error("\nPossible issues:");
    console.error("   - Invalid private key format");
    console.error("   - Network connection issues");
    console.error("   - RPC URL not accessible");
    process.exit(1);
  }
}

// Run test
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  });