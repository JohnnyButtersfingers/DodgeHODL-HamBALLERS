/**
 * Thirdweb Service for Backend
 * 
 * Handles contract interactions using Thirdweb SDK
 */

const { createThirdwebClient, defineChain, getContract, mintTo, hasRole } = require("thirdweb");
const { createWallet } = require("thirdweb/wallets");

// Define Abstract Testnet
const PRIMARY_RPC = "https://api.testnet.abs.xyz";
const FALLBACK_RPC = "https://rpc.abstract.xyz";

// Primary chain definition (will attempt first)
const abstractTestnet = defineChain({
  id: 11124,
  rpc: PRIMARY_RPC,
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  testnet: true,
});

class ThirdwebService {
  constructor() {
    this.client = null;
    this.account = null;
    this.contract = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      const clientId = process.env.THIRDWEB_CLIENT_ID;
      const privateKey = process.env.XPBADGE_MINTER_PRIVATE_KEY || process.env.ABS_WALLET_PRIVATE_KEY;
      const contractAddress = process.env.XPBADGE_ADDRESS;

      if (!clientId || clientId === "your-thirdweb-client-id") {
        throw new Error("THIRDWEB_CLIENT_ID not configured");
      }

      if (!privateKey) {
        throw new Error("XPBADGE_MINTER_PRIVATE_KEY not configured");
      }

      if (!contractAddress) {
        throw new Error("XPBADGE_ADDRESS not configured");
      }

      // Create Thirdweb client
      this.client = createThirdwebClient({ 
        clientId: clientId 
      });

      // Create wallet from private key
      this.account = createWallet("privateKey", { 
        privateKey: privateKey 
      });

      // Get contract instance – attempt primary RPC first, fallback on failure
      try {
        this.contract = getContract({
          client: this.client,
          chain: abstractTestnet,
          address: contractAddress,
        });
      } catch (primaryError) {
        console.warn("⚠️ Thirdweb primary RPC failed, attempting fallback RPC:", primaryError.message);

        const fallbackChain = defineChain({
          id: 11124,
          rpc: FALLBACK_RPC,
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          testnet: true,
        });

        this.contract = getContract({
          client: this.client,
          chain: fallbackChain,
          address: contractAddress,
        });

        console.log("✅ Thirdweb fallback RPC connected");
      }

      this.initialized = true;
      console.log("✅ Thirdweb service initialized");
      console.log("   Contract:", contractAddress);
      console.log("   Account:", this.account.address);

    } catch (error) {
      console.error("❌ Thirdweb service initialization failed:", error.message);
      this.initialized = false;
      throw error;
    }
  }

  async mintBadge(toAddress, tokenId, xp, season) {
    if (!this.initialized) {
      throw new Error("Thirdweb service not initialized");
    }

    try {
      console.log(`🎫 Minting badge via Thirdweb: ${toAddress} (Token ID: ${tokenId}, XP: ${xp})`);

      const transaction = mintTo({
        contract: this.contract,
        to: toAddress,
        tokenId: tokenId,
        amount: 1, // ERC1155 amount
        data: {
          xp: xp,
          season: season
        }
      });

      const tx = await transaction.send();
      console.log("   Transaction hash:", tx.transactionHash);

      // Wait for confirmation
      await tx.wait();
      console.log("✅ Badge minted successfully via Thirdweb");

      return {
        success: true,
        transactionHash: tx.transactionHash,
        tokenId: tokenId,
        xp: xp,
        season: season
      };

    } catch (error) {
      console.error("❌ Thirdweb badge minting failed:", error.message);
      if (error.cause) {
        console.error("   Cause:", error.cause);
      }
      throw error;
    }
  }

  async checkMinterRole(address) {
    if (!this.initialized) {
      throw new Error("Thirdweb service not initialized");
    }

    try {
      const hasMinterRole = await this.contract.read({
        functionName: "hasRole",
        args: ["0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6", address] // MINTER_ROLE hash
      });

      return hasMinterRole;
    } catch (error) {
      console.error("❌ Thirdweb role check failed:", error.message);
      if (error.cause) {
        console.error("   Cause:", error.cause.message);
      }
      return false;
    }
  }

  async getContractInfo() {
    if (!this.initialized) {
      return { initialized: false };
    }

    return {
      initialized: true,
      contractAddress: this.contract.address,
      accountAddress: this.account.address,
      chainId: abstractTestnet.id,
      chainName: abstractTestnet.name
    };
  }

  isInitialized() {
    return this.initialized;
  }
}

// Create singleton instance
const thirdwebService = new ThirdwebService();

module.exports = thirdwebService; 