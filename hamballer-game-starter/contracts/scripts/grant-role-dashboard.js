import { createThirdwebClient, defineChain, getContract, sendTransaction } from "thirdweb";
import { createWallet } from "thirdweb/wallets";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🔗 Thirdweb Dashboard MINTER_ROLE Grant Script');
console.log('==============================================');

// Configuration
const CLIENT_ID = "bc234f34695e0631abfea4e2ae1823ee";
const XP_BADGE_ADDRESS = "0xE960B46dffd9de6187Ff1B48B31B3F186A07303b";
const MINTER_ADDRESS = "0x10a36b1C6b960FF36c4DED3f57159C9ea6fb65CD"; // Dedicated minter
const PRIVATE_KEY = process.env.ABS_WALLET_PRIVATE_KEY;

console.log('📋 Configuration:');
console.log(`   Client ID: ${CLIENT_ID ? '✅ Set' : '❌ Missing'}`);
console.log(`   Private Key: ${PRIVATE_KEY ? '✅ Set' : '❌ Missing'}`);
console.log(`   XPBadge Address: ${XP_BADGE_ADDRESS}`);
console.log(`   Minter Address: ${MINTER_ADDRESS}`);

if (!PRIVATE_KEY) {
  console.error('❌ ABS_WALLET_PRIVATE_KEY not found in environment variables');
  process.exit(1);
}

async function grantMinterRole() {
  try {
    // Create Thirdweb client
    const client = createThirdwebClient({ clientId: CLIENT_ID });
    console.log('✅ Thirdweb client created');

    // Define Abstract Testnet
    const abstractTestnet = defineChain({
      id: 11124,
      rpc: "https://api.testnet.abs.xyz",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      testnet: true,
    });

    // Create wallet from private key
    const account = createWallet("privateKey", { privateKey: PRIVATE_KEY });
    console.log('✅ Wallet created from private key');

    // Get contract instance using dashboard-generated snippet
    const contract = getContract({
      client,
      chain: abstractTestnet,
      address: XP_BADGE_ADDRESS,
    });
    console.log('✅ Contract instance created');

    console.log('🔍 Checking current role status...');
    
    // Check if minter already has the role using dashboard-generated snippet
    try {
      const hasRole = await contract.read({
        functionName: "hasRole",
        args: ["0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6", MINTER_ADDRESS] // MINTER_ROLE hash
      });
      
      if (hasRole) {
        console.log('✅ Minter already has MINTER_ROLE');
        return;
      } else {
        console.log('❌ Minter does not have MINTER_ROLE, proceeding with grant...');
      }
    } catch (error) {
      console.log('⚠️ Could not check role status, proceeding with grant...');
      console.log('   Error:', error.message);
    }

    console.log('🎫 Granting MINTER_ROLE...');
    
    // Use dashboard-generated snippet for grantRole
    const transaction = await contract.write({
      functionName: "grantRole",
      args: ["0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6", MINTER_ADDRESS] // MINTER_ROLE hash
    });

    console.log('⏳ Transaction sent:', transaction.transactionHash);
    
    // Wait for confirmation
    console.log('⏳ Waiting for confirmation...');
    await transaction.wait();
    
    console.log('✅ MINTER_ROLE granted successfully!');
    console.log(`🧾 Transaction: ${transaction.transactionHash}`);
    console.log(`🔗 Explorer: https://testnet.abs.xyz/tx/${transaction.transactionHash}`);
    
    // Verify the role was granted
    console.log('🔍 Verifying role grant...');
    const hasRole = await contract.read({
      functionName: "hasRole",
      args: ["0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6", MINTER_ADDRESS]
    });
    
    if (hasRole) {
      console.log('✅ Role verification successful!');
      console.log(`🎉 MINTER_ROLE is now active for ${MINTER_ADDRESS}`);
    } else {
      console.log('❌ Role verification failed');
    }

  } catch (error) {
    console.error('❌ Failed to grant MINTER_ROLE:', error.message);
    if (error.cause) {
      console.error('   Cause:', error.cause);
    }
    if (error.stack) {
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the script
grantMinterRole(); 