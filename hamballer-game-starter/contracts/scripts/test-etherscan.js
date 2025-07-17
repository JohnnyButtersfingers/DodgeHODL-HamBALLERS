const axios = require('axios');
require("dotenv").config();

async function testEtherscanAPI() {
  console.log("🔍 Testing Etherscan API key...");
  
  const apiKey = process.env.ETHERSCAN_API_KEY;
  
  if (!apiKey || apiKey === 'your_etherscan_api_key') {
    console.log("❌ Etherscan API key not configured");
    console.log("📝 To configure:");
    console.log("1. Get API key from: https://explorer.testnet.abs.xyz");
    console.log("2. Edit .env file and replace 'your_etherscan_api_key' with your actual key");
    return;
  }
  
  console.log(`✅ API Key found: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);
  
  try {
    // Test the API with a simple request
    const response = await axios.get('https://api-testnet.abs.xyz/api', {
      params: {
        module: 'account',
        action: 'balance',
        address: '0xdAc1428c8268Cb2A8692d9c88d96878C6B9F0388',
        apikey: apiKey
      }
    });
    
    if (response.data.status === '1') {
      console.log("✅ Etherscan API key is working!");
      console.log(`📊 Balance: ${response.data.result} wei`);
    } else {
      console.log("❌ API request failed:", response.data.message);
    }
    
  } catch (error) {
    console.log("❌ Error testing API:", error.message);
    console.log("💡 This might be normal if the API key is not yet configured");
  }
  
  console.log("\n📋 Etherscan API is used for:");
  console.log("• Contract verification after deployment");
  console.log("• Viewing contract source code on explorer");
  console.log("• Optional: Not required for basic deployment");
}

testEtherscanAPI()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }); 