#!/usr/bin/env node

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { CONTRACT_ABIS } from '../src/config/networks.js';

dotenv.config({ path: '.env.local' });

const DEPLOYED_ADDRESSES = {
  XP_VERIFIER: process.env.VITE_XPVERIFIER_ADDRESS,
  XP_BADGE: process.env.VITE_XPBADGE_ADDRESS
};

console.log('🔍 Testing Live Contracts on Abstract Testnet');
console.log('==========================================\n');

async function testContracts() {
  // Connect to Abstract Testnet
  const provider = new ethers.providers.JsonRpcProvider('https://api.testnet.abs.xyz');
  
  console.log('📍 Contract Addresses:');
  console.log(`   XPVerifier: ${DEPLOYED_ADDRESSES.XP_VERIFIER}`);
  console.log(`   XPBadge: ${DEPLOYED_ADDRESSES.XP_BADGE}\n`);

  // Test XPVerifier
  console.log('🔧 Testing XPVerifier Contract...');
  const xpVerifier = new ethers.Contract(
    DEPLOYED_ADDRESSES.XP_VERIFIER,
    CONTRACT_ABIS.XP_VERIFIER,
    provider
  );

  try {
    // Test 1: Get threshold
    const threshold = await xpVerifier.getThreshold();
    console.log(`✅ Threshold: ${threshold.toString()}`);

    // Test 2: Check random nullifier
    const testNullifier = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test'));
    const isUsed = await xpVerifier.isNullifierUsed(testNullifier);
    console.log(`✅ Nullifier check: ${isUsed ? 'Used' : 'Available'}`);

    // Test 3: Verify contract is deployed
    const code = await provider.getCode(DEPLOYED_ADDRESSES.XP_VERIFIER);
    console.log(`✅ Contract deployed: ${code.length > 2 ? 'Yes' : 'No'}`);
    
  } catch (error) {
    console.error('❌ XPVerifier test failed:', error.message);
  }

  // Test XPBadge
  console.log('\n🔧 Testing XPBadge Contract...');
  const xpBadge = new ethers.Contract(
    DEPLOYED_ADDRESSES.XP_BADGE,
    CONTRACT_ABIS.XP_BADGE,
    provider
  );

  try {
    // Test 1: Check URI
    const uri = await xpBadge.uri(0);
    console.log(`✅ Badge URI: ${uri.slice(0, 50)}...`);

    // Test 2: Check balance for test address
    const testAddress = '0x0000000000000000000000000000000000000001';
    const balance = await xpBadge.balanceOf(testAddress, 0);
    console.log(`✅ Test balance: ${balance.toString()}`);

    // Test 3: Verify contract is deployed
    const code = await provider.getCode(DEPLOYED_ADDRESSES.XP_BADGE);
    console.log(`✅ Contract deployed: ${code.length > 2 ? 'Yes' : 'No'}`);
    
  } catch (error) {
    console.error('❌ XPBadge test failed:', error.message);
  }

  console.log('\n✨ Live contract testing complete!');
}

// Run tests
testContracts().catch(console.error);