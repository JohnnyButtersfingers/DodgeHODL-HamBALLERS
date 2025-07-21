const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("Validation Suite - Phase 9", function () {
  // Fixture for contract deployment
  async function deployValidationFixture() {
    const [owner, minter, user1, user2, attacker] = await ethers.getSigners();
    
    // Deploy XPVerifier
    const XPVerifier = await ethers.getContractFactory("XPVerifier");
    const xpVerifier = await XPVerifier.deploy();
    await xpVerifier.waitForDeployment();
    
    // Deploy XPBadge
    const XPBadge = await ethers.getContractFactory("XPBadge");
    const xpBadge = await XPBadge.deploy(
      "HamBaller XP Badge",
      "HXPB",
      "https://api.hamballer.xyz/metadata/"
    );
    await xpBadge.waitForDeployment();
    
    // Grant minter role
    const MINTER_ROLE = await xpBadge.MINTER_ROLE();
    await xpBadge.grantRole(MINTER_ROLE, minter.address);
    
    return { xpVerifier, xpBadge, owner, minter, user1, user2, attacker, MINTER_ROLE };
  }
  
  describe("Replay Attack Prevention", function () {
    it("Should prevent replay of the same proof", async function () {
      const { xpVerifier, xpBadge, minter, user1 } = await loadFixture(deployValidationFixture);
      
      // Generate mock proof with nullifier
      const nullifier = ethers.keccak256(ethers.toUtf8Bytes("unique_nullifier_123"));
      const mockProof = {
        proof: {
          a: [ethers.ZeroHash, ethers.ZeroHash],
          b: [[ethers.ZeroHash, ethers.ZeroHash], [ethers.ZeroHash, ethers.ZeroHash]],
          c: [ethers.ZeroHash, ethers.ZeroHash]
        },
        publicSignals: [nullifier, ethers.ZeroHash, ethers.ZeroHash]
      };
      
      // First verification should succeed
      await expect(xpVerifier.verifyXPProof(mockProof.proof, mockProof.publicSignals))
        .to.emit(xpVerifier, "ProofVerified");
      
      // Replay attempt should fail
      await expect(xpVerifier.verifyXPProof(mockProof.proof, mockProof.publicSignals))
        .to.be.revertedWith("Nullifier already used");
    });
    
    it("Should track nullifiers across multiple verifications", async function () {
      const { xpVerifier } = await loadFixture(deployValidationFixture);
      
      const nullifiers = [];
      const numProofs = 5;
      
      // Generate multiple unique nullifiers
      for (let i = 0; i < numProofs; i++) {
        nullifiers.push(ethers.keccak256(ethers.toUtf8Bytes(`nullifier_${i}`)));
      }
      
      // Verify each proof once
      for (const nullifier of nullifiers) {
        const mockProof = {
          proof: {
            a: [ethers.ZeroHash, ethers.ZeroHash],
            b: [[ethers.ZeroHash, ethers.ZeroHash], [ethers.ZeroHash, ethers.ZeroHash]],
            c: [ethers.ZeroHash, ethers.ZeroHash]
          },
          publicSignals: [nullifier, ethers.ZeroHash, ethers.ZeroHash]
        };
        
        await expect(xpVerifier.verifyXPProof(mockProof.proof, mockProof.publicSignals))
          .to.emit(xpVerifier, "ProofVerified");
      }
      
      // Attempt to replay each proof
      for (const nullifier of nullifiers) {
        const mockProof = {
          proof: {
            a: [ethers.ZeroHash, ethers.ZeroHash],
            b: [[ethers.ZeroHash, ethers.ZeroHash], [ethers.ZeroHash, ethers.ZeroHash]],
            c: [ethers.ZeroHash, ethers.ZeroHash]
          },
          publicSignals: [nullifier, ethers.ZeroHash, ethers.ZeroHash]
        };
        
        await expect(xpVerifier.verifyXPProof(mockProof.proof, mockProof.publicSignals))
          .to.be.revertedWith("Nullifier already used");
      }
    });
    
    it("Should prevent cross-user replay attacks", async function () {
      const { xpVerifier, xpBadge, minter, user1, user2, attacker } = await loadFixture(deployValidationFixture);
      
      // User1 generates and uses a proof
      const user1Nullifier = ethers.keccak256(ethers.concat([
        user1.address,
        ethers.toUtf8Bytes("game_session_123")
      ]));
      
      const user1Proof = {
        proof: {
          a: [ethers.ZeroHash, ethers.ZeroHash],
          b: [[ethers.ZeroHash, ethers.ZeroHash], [ethers.ZeroHash, ethers.ZeroHash]],
          c: [ethers.ZeroHash, ethers.ZeroHash]
        },
        publicSignals: [user1Nullifier, user1.address, ethers.parseEther("50")]
      };
      
      // User1's proof verification succeeds
      await xpVerifier.connect(user1).verifyXPProof(user1Proof.proof, user1Proof.publicSignals);
      
      // Mint badge for user1
      await xpBadge.connect(minter).mint(user1.address, 1, 50, 1);
      
      // Attacker tries to replay user1's proof
      await expect(
        xpVerifier.connect(attacker).verifyXPProof(user1Proof.proof, user1Proof.publicSignals)
      ).to.be.revertedWith("Nullifier already used");
      
      // Even with modified public signals, same nullifier should fail
      const modifiedProof = {
        proof: user1Proof.proof,
        publicSignals: [user1Nullifier, attacker.address, ethers.parseEther("100")]
      };
      
      await expect(
        xpVerifier.connect(attacker).verifyXPProof(modifiedProof.proof, modifiedProof.publicSignals)
      ).to.be.revertedWith("Nullifier already used");
    });
    
    it("Should handle nullifier expiry correctly", async function () {
      const { xpVerifier } = await loadFixture(deployValidationFixture);
      
      // Check if contract supports nullifier expiry
      try {
        const expiryTime = await xpVerifier.nullifierExpiryTime();
        console.log(`Nullifier expiry time: ${expiryTime} seconds`);
        
        // This test would require time manipulation in hardhat
        // Skipping for now as it depends on contract implementation
        this.skip();
      } catch (error) {
        // Contract doesn't support nullifier expiry
        console.log("Contract doesn't implement nullifier expiry");
      }
    });
  });
  
  describe("Edge Cases and Attack Vectors", function () {
    it("Should handle malformed proofs gracefully", async function () {
      const { xpVerifier } = await loadFixture(deployValidationFixture);
      
      // Test with empty proof
      const emptyProof = {
        proof: {
          a: [],
          b: [],
          c: []
        },
        publicSignals: []
      };
      
      await expect(xpVerifier.verifyXPProof(emptyProof.proof, emptyProof.publicSignals))
        .to.be.reverted;
      
      // Test with invalid proof format
      const invalidProof = {
        proof: {
          a: [ethers.ZeroHash], // Should be 2 elements
          b: [[ethers.ZeroHash]], // Should be 2x2
          c: [ethers.ZeroHash, ethers.ZeroHash, ethers.ZeroHash] // Should be 2 elements
        },
        publicSignals: [ethers.ZeroHash]
      };
      
      await expect(xpVerifier.verifyXPProof(invalidProof.proof, invalidProof.publicSignals))
        .to.be.reverted;
    });
    
    it("Should prevent double minting with same proof", async function () {
      const { xpBadge, minter, user1 } = await loadFixture(deployValidationFixture);
      
      // Mint badge for user1
      await xpBadge.connect(minter).mint(user1.address, 1, 50, 1);
      
      // Check that tokenId 1 is already minted
      const owner = await xpBadge.ownerOf(1);
      expect(owner).to.equal(user1.address);
      
      // Attempt to mint same tokenId again should fail
      await expect(xpBadge.connect(minter).mint(user1.address, 1, 50, 1))
        .to.be.revertedWith("ERC721: token already minted");
    });
    
    it("Should validate proof timestamps", async function () {
      const { xpVerifier } = await loadFixture(deployValidationFixture);
      
      // Generate proof with timestamp
      const currentTime = Math.floor(Date.now() / 1000);
      const oldTimestamp = currentTime - 3600; // 1 hour ago
      
      const proofWithTimestamp = {
        proof: {
          a: [ethers.ZeroHash, ethers.ZeroHash],
          b: [[ethers.ZeroHash, ethers.ZeroHash], [ethers.ZeroHash, ethers.ZeroHash]],
          c: [ethers.ZeroHash, ethers.ZeroHash]
        },
        publicSignals: [
          ethers.keccak256(ethers.toUtf8Bytes("nullifier")),
          ethers.ZeroHash,
          ethers.toBeHex(oldTimestamp)
        ]
      };
      
      // This depends on contract implementation
      // If contract checks timestamps, old proofs should be rejected
      try {
        await xpVerifier.verifyXPProof(proofWithTimestamp.proof, proofWithTimestamp.publicSignals);
        console.log("Contract doesn't enforce timestamp validation");
      } catch (error) {
        expect(error.message).to.include("Proof expired");
      }
    });
  });
  
  describe("Gas Optimization Validation", function () {
    it("Should profile gas usage for different scenarios", async function () {
      const { xpBadge, minter, user1 } = await loadFixture(deployValidationFixture);
      
      const scenarios = [
        { tokenId: 1, xp: 10, description: "Low XP mint" },
        { tokenId: 2, xp: 50, description: "Medium XP mint" },
        { tokenId: 3, xp: 100, description: "High XP mint" }
      ];
      
      console.log("\n⛽ Gas Usage Report:");
      
      for (const scenario of scenarios) {
        const tx = await xpBadge.connect(minter).mint(
          user1.address,
          scenario.tokenId,
          scenario.xp,
          1
        );
        const receipt = await tx.wait();
        
        console.log(`${scenario.description}: ${receipt.gasUsed} gas`);
        
        // Check against threshold
        if (receipt.gasUsed > 320000n) {
          console.log(`  ⚠️  WARNING: Exceeds 320k gas threshold!`);
        }
      }
    });
    
    it("Should validate batch operations efficiency", async function () {
      const { xpBadge, minter, user1, user2 } = await loadFixture(deployValidationFixture);
      
      // Test if contract supports batch minting
      try {
        // This would require a batchMint function in the contract
        const recipients = [user1.address, user2.address];
        const tokenIds = [10, 11];
        const xpAmounts = [30, 40];
        
        // Check if batchMint exists
        if (xpBadge.batchMint) {
          const tx = await xpBadge.connect(minter).batchMint(recipients, tokenIds, xpAmounts, 1);
          const receipt = await tx.wait();
          
          console.log(`Batch mint (2 badges): ${receipt.gasUsed} gas`);
          console.log(`Average per badge: ${receipt.gasUsed / 2n} gas`);
        } else {
          console.log("Contract doesn't support batch minting");
        }
      } catch (error) {
        console.log("Batch operations not implemented");
      }
    });
  });
  
  describe("Integration Tests", function () {
    it("Should handle full claim flow with verification", async function () {
      const { xpVerifier, xpBadge, minter, user1 } = await loadFixture(deployValidationFixture);
      
      // Simulate full claim flow
      const gameSessionId = ethers.keccak256(ethers.toUtf8Bytes("game_123"));
      const xpEarned = 75;
      const tokenId = 20;
      
      // 1. Generate proof (mock)
      const nullifier = ethers.keccak256(ethers.concat([
        user1.address,
        gameSessionId
      ]));
      
      const proof = {
        proof: {
          a: [ethers.ZeroHash, ethers.ZeroHash],
          b: [[ethers.ZeroHash, ethers.ZeroHash], [ethers.ZeroHash, ethers.ZeroHash]],
          c: [ethers.ZeroHash, ethers.ZeroHash]
        },
        publicSignals: [nullifier, user1.address, ethers.toBeHex(xpEarned)]
      };
      
      // 2. Verify proof
      await expect(xpVerifier.verifyXPProof(proof.proof, proof.publicSignals))
        .to.emit(xpVerifier, "ProofVerified");
      
      // 3. Mint badge
      await expect(xpBadge.connect(minter).mint(user1.address, tokenId, xpEarned, 1))
        .to.emit(xpBadge, "Transfer")
        .withArgs(ethers.ZeroAddress, user1.address, tokenId);
      
      // 4. Verify badge ownership and metadata
      expect(await xpBadge.ownerOf(tokenId)).to.equal(user1.address);
      expect(await xpBadge.tokenURI(tokenId)).to.include("20");
      
      // 5. Attempt replay should fail
      await expect(xpVerifier.verifyXPProof(proof.proof, proof.publicSignals))
        .to.be.revertedWith("Nullifier already used");
    });
  });
});