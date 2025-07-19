const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("XPVerifier Contract", function () {
    let xpVerifier;
    let owner, verifier, user1, user2;
    const VERIFIER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("VERIFIER_ROLE"));
    const PAUSER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PAUSER_ROLE"));

    // Test proof data (example values)
    const validProof = {
        a: [1, 2],
        b: [[3, 4], [5, 6]],
        c: [7, 8]
    };

    beforeEach(async function () {
        [owner, verifier, user1, user2] = await ethers.getSigners();

        const XPVerifier = await ethers.getContractFactory("XPVerifier");
        xpVerifier = await XPVerifier.deploy();
        await xpVerifier.deployed();

        // Grant verifier role
        await xpVerifier.grantRole(VERIFIER_ROLE, verifier.address);
    });

    describe("Deployment", function () {
        it("Should set the correct owner", async function () {
            expect(await xpVerifier.hasRole(await xpVerifier.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
        });

        it("Should grant all initial roles to deployer", async function () {
            expect(await xpVerifier.hasRole(VERIFIER_ROLE, owner.address)).to.be.true;
            expect(await xpVerifier.hasRole(PAUSER_ROLE, owner.address)).to.be.true;
        });

        it("Should initialize with season 1", async function () {
            expect(await xpVerifier.currentSeason()).to.equal(1);
        });

        it("Should have season 1 active", async function () {
            expect(await xpVerifier.seasonActive(1)).to.be.true;
        });
    });

    describe("Proof Verification", function () {
        it("Should verify a valid proof", async function () {
            const nullifier = 12345;
            const xpAmount = 50;
            const playerAddress = BigInt(user1.address);
            const season = 1;
            
            const inputs = [nullifier, xpAmount, playerAddress, season];

            await expect(xpVerifier.verifyProof(
                validProof.a,
                validProof.b,
                validProof.c,
                inputs
            )).to.emit(xpVerifier, "ProofVerified")
              .withArgs(user1.address, nullifier, xpAmount, season, await ethers.provider.getBlock('latest').then(b => b.timestamp + 1));

            // Check nullifier is marked as used
            expect(await xpVerifier.isNullifierUsed(nullifier)).to.be.true;
            expect(await xpVerifier.isClaimVerified(user1.address, nullifier)).to.be.true;
        });

        it("Should reject proof with invalid player address", async function () {
            const inputs = [12346, 50, 0, 1]; // Zero address

            await expect(xpVerifier.verifyProof(
                validProof.a,
                validProof.b,
                validProof.c,
                inputs
            )).to.be.revertedWith("Invalid player address");
        });

        it("Should reject proof with invalid season", async function () {
            const inputs = [12347, 50, BigInt(user1.address), 2]; // Wrong season

            await expect(xpVerifier.verifyProof(
                validProof.a,
                validProof.b,
                validProof.c,
                inputs
            )).to.be.revertedWith("Invalid season");
        });

        it("Should reject proof with already used nullifier", async function () {
            const nullifier = 12348;
            const inputs = [nullifier, 50, BigInt(user1.address), 1];

            // First verification should succeed
            await xpVerifier.verifyProof(
                validProof.a,
                validProof.b,
                validProof.c,
                inputs
            );

            // Second verification with same nullifier should fail
            await expect(xpVerifier.verifyProof(
                validProof.a,
                validProof.b,
                validProof.c,
                inputs
            )).to.be.revertedWith("Nullifier already used");
        });

        it("Should reject proof with invalid XP amount", async function () {
            const inputs = [12349, 0, BigInt(user1.address), 1]; // Zero XP

            await expect(xpVerifier.verifyProof(
                validProof.a,
                validProof.b,
                validProof.c,
                inputs
            )).to.be.revertedWith("Invalid XP amount");
        });

        it("Should reject proof with XP amount over limit", async function () {
            const inputs = [12350, 1001, BigInt(user1.address), 1]; // Over 1000 XP

            await expect(xpVerifier.verifyProof(
                validProof.a,
                validProof.b,
                validProof.c,
                inputs
            )).to.be.revertedWith("Invalid XP amount");
        });
    });

    describe("Season Management", function () {
        it("Should allow admin to update season", async function () {
            await xpVerifier.updateSeason(2);
            expect(await xpVerifier.currentSeason()).to.equal(2);
            expect(await xpVerifier.seasonActive(1)).to.be.false;
            expect(await xpVerifier.seasonActive(2)).to.be.true;
        });

        it("Should reject season update from non-admin", async function () {
            await expect(
                xpVerifier.connect(user1).updateSeason(2)
            ).to.be.revertedWith(`AccessControl: account ${user1.address.toLowerCase()} is missing role ${await xpVerifier.DEFAULT_ADMIN_ROLE()}`);
        });

        it("Should reject season update to lower or same season", async function () {
            await xpVerifier.updateSeason(2);
            
            await expect(xpVerifier.updateSeason(2)).to.be.revertedWith("New season must be greater");
            await expect(xpVerifier.updateSeason(1)).to.be.revertedWith("New season must be greater");
        });
    });

    describe("Verifying Key Management", function () {
        it("Should allow admin to update verifying key", async function () {
            const newAlpha = [100, 200];
            const newBeta = [[300, 400], [500, 600]];
            const newGamma = [[700, 800], [900, 1000]];
            const newDelta = [[1100, 1200], [1300, 1400]];
            const newIc = [[1500, 1600], [1700, 1800]];

            await expect(xpVerifier.updateVerifyingKey(
                newAlpha,
                newBeta,
                newGamma,
                newDelta,
                newIc
            )).to.emit(xpVerifier, "VerificationParametersUpdated")
              .withArgs(owner.address, await ethers.provider.getBlock('latest').then(b => b.timestamp + 1));
        });

        it("Should reject verifying key update from non-admin", async function () {
            await expect(
                xpVerifier.connect(user1).updateVerifyingKey(
                    [1, 2], [[3, 4], [5, 6]], [[7, 8], [9, 10]], [[11, 12], [13, 14]], [[15, 16]]
                )
            ).to.be.revertedWith(`AccessControl: account ${user1.address.toLowerCase()} is missing role ${await xpVerifier.DEFAULT_ADMIN_ROLE()}`);
        });
    });

    describe("Pausable", function () {
        it("Should allow pauser to pause contract", async function () {
            await xpVerifier.connect(owner).pause();
            expect(await xpVerifier.paused()).to.be.true;
        });

        it("Should reject proof verification when paused", async function () {
            await xpVerifier.pause();

            const inputs = [12351, 50, BigInt(user1.address), 1];
            await expect(xpVerifier.verifyProof(
                validProof.a,
                validProof.b,
                validProof.c,
                inputs
            )).to.be.revertedWith("Pausable: paused");
        });

        it("Should allow unpausing", async function () {
            await xpVerifier.pause();
            await xpVerifier.unpause();
            expect(await xpVerifier.paused()).to.be.false;
        });

        it("Should reject pause from non-pauser", async function () {
            await expect(
                xpVerifier.connect(user1).pause()
            ).to.be.revertedWith(`AccessControl: account ${user1.address.toLowerCase()} is missing role ${PAUSER_ROLE}`);
        });
    });

    describe("Access Control", function () {
        it("Should allow granting and revoking roles", async function () {
            // Grant VERIFIER_ROLE to user1
            await xpVerifier.grantRole(VERIFIER_ROLE, user1.address);
            expect(await xpVerifier.hasRole(VERIFIER_ROLE, user1.address)).to.be.true;

            // Revoke VERIFIER_ROLE from user1
            await xpVerifier.revokeRole(VERIFIER_ROLE, user1.address);
            expect(await xpVerifier.hasRole(VERIFIER_ROLE, user1.address)).to.be.false;
        });

        it("Should allow role renunciation", async function () {
            await xpVerifier.grantRole(VERIFIER_ROLE, user1.address);
            await xpVerifier.connect(user1).renounceRole(VERIFIER_ROLE, user1.address);
            expect(await xpVerifier.hasRole(VERIFIER_ROLE, user1.address)).to.be.false;
        });
    });

    describe("View Functions", function () {
        it("Should correctly report nullifier usage", async function () {
            const nullifier = 12352;
            expect(await xpVerifier.isNullifierUsed(nullifier)).to.be.false;

            const inputs = [nullifier, 50, BigInt(user1.address), 1];
            await xpVerifier.verifyProof(
                validProof.a,
                validProof.b,
                validProof.c,
                inputs
            );

            expect(await xpVerifier.isNullifierUsed(nullifier)).to.be.true;
        });

        it("Should correctly report claim verification status", async function () {
            const nullifier = 12353;
            expect(await xpVerifier.isClaimVerified(user1.address, nullifier)).to.be.false;

            const inputs = [nullifier, 50, BigInt(user1.address), 1];
            await xpVerifier.verifyProof(
                validProof.a,
                validProof.b,
                validProof.c,
                inputs
            );

            expect(await xpVerifier.isClaimVerified(user1.address, nullifier)).to.be.true;
        });
    });
});