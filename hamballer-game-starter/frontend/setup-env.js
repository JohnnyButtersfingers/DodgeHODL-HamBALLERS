#!/usr/bin/env node

/**
 * Frontend Environment Setup Script
 * 
 * This script helps set up the frontend .env file with contract addresses
 * and other configuration needed for the HamBaller.xyz frontend.
 */

const fs = require('fs');
const path = require('path');

function log(message, color = 'reset') {
  const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
  };
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n${step}. ${message}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️ ${message}`, 'yellow');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

async function setupFrontendEnv() {
  log('\n🚀 HamBaller.xyz Frontend Environment Setup');
  log('============================================\n');

  const envPath = path.join(__dirname, '.env');
  
  // Check if .env already exists
  if (fs.existsSync(envPath)) {
    logWarning('Frontend .env file already exists');
    log('If you want to update it with new contract addresses, please:');
    log('1. Back up your current .env file');
    log('2. Delete the existing .env file');
    log('3. Run this script again');
    return;
  }

  logStep(1, 'Creating frontend .env file...');

  const envTemplate = `# HamBaller.xyz Frontend Environment Configuration
# =============================================

# API Configuration
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001

# Contract Addresses (Update after deployment)
# Replace these with your actual deployed contract addresses
VITE_DBP_TOKEN_ADDRESS=your_dbp_token_address_here
VITE_BOOST_NFT_ADDRESS=your_boost_nft_address_here
VITE_HODL_MANAGER_ADDRESS=your_hodl_manager_address_here

# Network Configuration
VITE_NETWORK_ID=11124
VITE_NETWORK_NAME=Abstract Testnet
VITE_RPC_URL=https://api.testnet.abs.xyz

# Feature Flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG_LOGS=true
`;

  try {
    fs.writeFileSync(envPath, envTemplate);
    logSuccess('Created frontend .env file with template');
    
    logStep(2, 'Next steps:');
    log('1. Deploy your contracts using: cd ../contracts && npm run deploy:production');
    log('2. Copy the contract addresses from the deployment output');
    log('3. Update the .env file with your actual contract addresses:');
    log('   - VITE_DBP_TOKEN_ADDRESS');
    log('   - VITE_BOOST_NFT_ADDRESS');
    log('   - VITE_HODL_MANAGER_ADDRESS');
    log('4. Start the frontend: npm run dev');
    
    logStep(3, 'Current .env template:');
    log('📄 ' + envPath);
    
  } catch (error) {
    logError(`Failed to create .env file: ${error.message}`);
  }
}

// Run if called directly
if (require.main === module) {
  setupFrontendEnv().catch(console.error);
}

module.exports = { setupFrontendEnv }; 