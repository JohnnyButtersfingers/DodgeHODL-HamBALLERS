#!/usr/bin/env node

/**
 * Verify Private Key Script
 * 
 * Validates that the private key in .env derives the correct deployer address
 */

require('dotenv').config();
const { ethers } = require('ethers');

async function verifyPrivateKey() {
  console.log('🔍 Verifying Private Key Configuration...\n');
  
  const privateKey = process.env.ABS_WALLET_PRIVATE_KEY || process.env.PRIVATE_KEY;
  
  if (!privateKey) {
    console.error('❌ ERROR: No private key found in environment variables!');
    console.error('   Please set ABS_WALLET_PRIVATE_KEY in contracts/.env');
    process.exit(1);
  }
  
  if (privateKey === 'your_actual_deployer_private_key_here') {
    console.error('❌ ERROR: Private key is still the placeholder!');
    console.error('   Please replace with actual 32-byte private key in contracts/.env');
    process.exit(1);
  }
  
  try {
    // Create wallet from private key
    const wallet = new ethers.Wallet(privateKey);
    const address = wallet.address;
    
    console.log('✅ Private Key Configuration:');
    console.log(`   Address: ${address}`);
    console.log(`   Expected: 0xdAc1428c8268Cb2A8692d9c88d96878C6B9F0388`);
    console.log(`   Match: ${address === '0xdAc1428c8268Cb2A8692d9c88d96878C6B9F0388' ? '✅ YES' : '❌ NO'}`);
    
    if (address !== '0xdAc1428c8268Cb2A8692d9c88d96878C6B9F0388') {
      console.error('\n❌ ERROR: Private key does not derive the correct address!');
      console.error('   This private key will not have admin permissions on the contract.');
      process.exit(1);
    }
    
    console.log('\n✅ Private key verification successful!');
    console.log('   Ready to grant MINTER_ROLE...');
    
  } catch (error) {
    console.error('❌ ERROR: Invalid private key format!');
    console.error('   Error:', error.message);
    console.error('   Make sure the private key is a valid 32-byte hex string');
    process.exit(1);
  }
}

verifyPrivateKey(); 