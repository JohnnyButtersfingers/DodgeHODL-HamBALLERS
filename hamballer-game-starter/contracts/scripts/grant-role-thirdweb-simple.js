#!/usr/bin/env node

/**
 * Simple Thirdweb MINTER_ROLE Grant Script
 * 
 * Uses available Thirdweb SDK functions
 */

import { createThirdwebClient, defineChain, getContract, sendAndConfirmTransaction, readContract, prepareContractCall } from "thirdweb";
import { createWallet } from "thirdweb/wallets";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const THIRDWEB_CLIENT_ID = process.env.THIRDWEB_CLIENT_ID || "your-thirdweb-client-id";
const PRIVATE_KEY = process.env.ABS_WALLET_PRIVATE_KEY;
const XPBADGE_ADDRESS = process.env.XPBADGE_ADDRESS || "0xE960B46dffd9de6187Ff1B48B31B3F186A07303b";
const MINTER_ADDRESS = process.env.XPBADGE_MINTER_ADDRESS || "0xdAc1428c8268Cb2A8692d9c88d96878C6B9F0388";

async function main() {
  console.log("🔗 Simple Thirdweb MINTER_ROLE Grant Script");
  console.log("===========================================");

  // Validate environment
  if (!PRIVATE_KEY) {
    console.error("❌ Missing ABS_WALLET_PRIVATE_KEY in environment");
    process.exit(1);
  }

  if (THIRDWEB_CLIENT_ID === "your-thirdweb-client-id") {
    console.error("❌ Please set THIRDWEB_CLIENT_ID in environment");
    console.error("   Get it from: https://thirdweb.com/dashboard");
    process.exit(1);
  }

  console.log("📋 Configuration:");
  console.log("   Client ID:", THIRDWEB_CLIENT_ID ? "✅ Set" : "❌ Missing");
  console.log("   Private Key:", PRIVATE_KEY ? "✅ Set" : "❌ Missing");
  console.log("   XPBadge Address:", XPBADGE_ADDRESS);
  console.log("   Minter Address:", MINTER_ADDRESS);

  try {
    // Create Thirdweb client
    const client = createThirdwebClient({ 
      clientId: THIRDWEB_CLIENT_ID 
    });

    // Define Abstract Testnet
    const abstractTestnet = defineChain({
      id: 11124,
      rpc: "https://api.testnet.abs.xyz",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      testnet: true,
    });

    // Create wallet from private key
    const account = createWallet("privateKey", { 
      privateKey: PRIVATE_KEY 
    });

    console.log("✅ Thirdweb client and wallet created");

    // Get contract instance
    const contract = getContract({
      client,
      chain: abstractTestnet,
      address: XPBADGE_ADDRESS,
    });

    console.log("✅ Contract instance created");

    // Check current role status using readContract
    console.log("\n🔍 Checking current role status...");
    
    try {
      // MINTER_ROLE = keccak256("MINTER_ROLE")
      const MINTER_ROLE = "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6";
      
      const deployerHasRole = await readContract({
        contract,
        method: "hasRole",
        params: [MINTER_ROLE, account.address],
      });

      const minterHasRole = await readContract({
        contract,
        method: "hasRole",
        params: [MINTER_ROLE, MINTER_ADDRESS],
      });

      console.log("   Deployer has MINTER_ROLE:", deployerHasRole);
      console.log("   Minter has MINTER_ROLE:", minterHasRole);

      if (minterHasRole) {
        console.log("\n✅ MINTER_ROLE is already granted!");
        return;
      }

      // Grant MINTER_ROLE
      console.log("\n🚀 Granting MINTER_ROLE...");
      
      const grantCall = prepareContractCall({
        contract,
        method: "grantRole",
        params: [MINTER_ROLE, MINTER_ADDRESS],
      });

      console.log("   Transaction prepared, sending...");
      
      const tx = await sendAndConfirmTransaction({
        transaction: grantCall,
        account,
      });

      console.log("✅ Transaction confirmed!");
      console.log("   Transaction hash:", tx.transactionHash);

      // Verify the role was granted
      console.log("\n🔍 Verifying role grant...");
      
      const finalRole = await readContract({
        contract,
        method: "hasRole",
        params: [MINTER_ROLE, MINTER_ADDRESS],
      });

      if (finalRole) {
        console.log("🎉 MINTER_ROLE successfully granted!");
        console.log("   Minter address:", MINTER_ADDRESS);
        console.log("   Transaction:", tx.transactionHash);
      } else {
        console.log("❌ MINTER_ROLE grant verification failed!");
        process.exit(1);
      }

    } catch (contractError) {
      console.error("❌ Contract interaction failed:", contractError.message);
      console.error("   This might be due to ABI issues or contract not supporting AccessControl");
      console.error("   Falling back to Hardhat script...");
      process.exit(1);
    }

  } catch (error) {
    console.error("❌ Script failed:", error);
    console.error("   Error details:", error.message);
    if (error.cause) {
      console.error("   Cause:", error.cause);
    }
    process.exit(1);
  }
}

main(); 