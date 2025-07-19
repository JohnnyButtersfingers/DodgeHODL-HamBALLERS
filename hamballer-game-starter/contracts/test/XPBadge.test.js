const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("XPBadge Contract", function () {
    let xpBadge;
    let owner, minter, user1, user2;
    const MINTER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MINTER_ROLE"));
    const PAUSER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PAUSER_ROLE"));
    const URI_SETTER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("URI_SETTER_ROLE"));

    const BASE_URI = "https://api.hamballer.xyz/metadata/badges/";

    beforeEach(async function () {
        [owner, minter, user1, user2] = await ethers.getSigners();

        const XPBadge = await ethers.getContractFactory("XPBadge");
        xpBadge = await XPBadge.deploy("HamBaller XP Badges", "HBXP", BASE_URI);
        await xpBadge.deployed();

        // Grant minter role
        await xpBadge.grantRole(MINTER_ROLE, minter.address);
    });

    describe("Deployment", function () {
        it("Should set the correct name and symbol", async function () {
            expect(await xpBadge.name()).to.equal("HamBaller XP Badges");
            expect(await xpBadge.symbol()).to.equal("HBXP");
        });

        it("Should set the correct base URI", async function () {
            // Mint a badge to test URI
            await xpBadge.mintBadge(user1.address, 0, 10, 1);
            expect(await xpBadge.tokenURI(0)).to.equal(BASE_URI + "participation.json");
        });

        it("Should grant all initial roles to deployer", async function () {
            expect(await xpBadge.hasRole(await xpBadge.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
            expect(await xpBadge.hasRole(MINTER_ROLE, owner.address)).to.be.true;
            expect(await xpBadge.hasRole(PAUSER_ROLE, owner.address)).to.be.true;
            expect(await xpBadge.hasRole(URI_SETTER_ROLE, owner.address)).to.be.true;
        });

        it("Should initialize with season 1", async function () {
            expect(await xpBadge.currentSeason()).to.equal(1);
        });
    });

    describe("Badge Minting", function () {
        it("Should mint participation badge correctly", async function () {
            const tier = 0; // PARTICIPATION_TIER
            const xp = 10;
            const season = 1;

            await expect(xpBadge.connect(minter).mintBadge(user1.address, tier, xp, season))
                .to.emit(xpBadge, "BadgeMinted")
                .withArgs(user1.address, 0, tier, xp, season);

            expect(await xpBadge.balanceOf(user1.address)).to.equal(1);
            expect(await xpBadge.ownerOf(0)).to.equal(user1.address);
        });

        it("Should mint all tier badges with correct XP ranges", async function () {
            const testCases = [
                { tier: 0, xp: 24 },  // Participation
                { tier: 1, xp: 25 },  // Common
                { tier: 2, xp: 50 },  // Rare
                { tier: 3, xp: 75 },  // Epic
                { tier: 4, xp: 100 }  // Legendary
            ];

            for (let i = 0; i < testCases.length; i++) {
                const { tier, xp } = testCases[i];
                await xpBadge.mintBadge(user1.address, tier, xp, 1);
                
                const metadata = await xpBadge.badgeMetadata(i);
                expect(metadata.tier).to.equal(tier);
                expect(metadata.xpEarned).to.equal(xp);
                expect(metadata.season).to.equal(1);
            }
        });

        it("Should reject minting with mismatched tier and XP", async function () {
            await expect(
                xpBadge.mintBadge(user1.address, 0, 25, 1) // 25 XP should be Common tier
            ).to.be.revertedWith("XP doesn't match tier");
        });

        it("Should reject minting from non-minter", async function () {
            await expect(
                xpBadge.connect(user1).mintBadge(user2.address, 0, 10, 1)
            ).to.be.revertedWith(`AccessControl: account ${user1.address.toLowerCase()} is missing role ${MINTER_ROLE}`);
        });

        it("Should track player badges correctly", async function () {
            await xpBadge.mintBadge(user1.address, 0, 10, 1);
            await xpBadge.mintBadge(user1.address, 1, 30, 1);
            await xpBadge.mintBadge(user1.address, 2, 60, 1);

            expect(await xpBadge.totalBadgesPerPlayer(user1.address)).to.equal(3);
            
            const participationBadges = await xpBadge.getPlayerBadgesByTier(user1.address, 0);
            expect(participationBadges.length).to.equal(1);
            expect(participationBadges[0]).to.equal(0);

            const commonBadges = await xpBadge.getPlayerBadgesByTier(user1.address, 1);
            expect(commonBadges.length).to.equal(1);
            expect(commonBadges[0]).to.equal(1);
        });
    });

    describe("Batch Minting", function () {
        it("Should batch mint badges successfully", async function () {
            const recipients = [user1.address, user2.address, user1.address];
            const tiers = [0, 1, 2];
            const xpAmounts = [10, 30, 60];
            const season = 1;

            await xpBadge.batchMintBadges(recipients, tiers, xpAmounts, season);

            expect(await xpBadge.balanceOf(user1.address)).to.equal(2);
            expect(await xpBadge.balanceOf(user2.address)).to.equal(1);
        });

        it("Should reject batch mint with mismatched arrays", async function () {
            await expect(
                xpBadge.batchMintBadges([user1.address], [0, 1], [10], 1)
            ).to.be.revertedWith("Array length mismatch");
        });

        it("Should reject batch mint over 100 items", async function () {
            const recipients = new Array(101).fill(user1.address);
            const tiers = new Array(101).fill(0);
            const xpAmounts = new Array(101).fill(10);

            await expect(
                xpBadge.batchMintBadges(recipients, tiers, xpAmounts, 1)
            ).to.be.revertedWith("Batch too large");
        });
    });

    describe("Helper Functions", function () {
        it("Should correctly determine tier from XP", async function () {
            expect(await xpBadge.getTierFromXP(1)).to.equal(0);   // Participation
            expect(await xpBadge.getTierFromXP(24)).to.equal(0);  // Participation
            expect(await xpBadge.getTierFromXP(25)).to.equal(1);  // Common
            expect(await xpBadge.getTierFromXP(49)).to.equal(1);  // Common
            expect(await xpBadge.getTierFromXP(50)).to.equal(2);  // Rare
            expect(await xpBadge.getTierFromXP(74)).to.equal(2);  // Rare
            expect(await xpBadge.getTierFromXP(75)).to.equal(3);  // Epic
            expect(await xpBadge.getTierFromXP(99)).to.equal(3);  // Epic
            expect(await xpBadge.getTierFromXP(100)).to.equal(4); // Legendary
            expect(await xpBadge.getTierFromXP(500)).to.equal(4); // Legendary
        });

        it("Should get all player badges", async function () {
            await xpBadge.mintBadge(user1.address, 0, 10, 1);
            await xpBadge.mintBadge(user1.address, 1, 30, 1);
            await xpBadge.mintBadge(user1.address, 0, 15, 1);

            const allBadges = await xpBadge.getPlayerBadges(user1.address);
            expect(allBadges.length).to.equal(3);
            expect(allBadges[0]).to.equal(0);
            expect(allBadges[1]).to.equal(2);
            expect(allBadges[2]).to.equal(1);
        });

        it("Should get player badge count by tier", async function () {
            await xpBadge.mintBadge(user1.address, 0, 10, 1);
            await xpBadge.mintBadge(user1.address, 0, 15, 1);
            await xpBadge.mintBadge(user1.address, 1, 30, 1);

            expect(await xpBadge.getPlayerBadgeCount(user1.address, 0)).to.equal(2);
            expect(await xpBadge.getPlayerBadgeCount(user1.address, 1)).to.equal(1);
            expect(await xpBadge.getPlayerBadgeCount(user1.address, 2)).to.equal(0);
        });
    });

    describe("Season Management", function () {
        it("Should update season correctly", async function () {
            await xpBadge.updateSeason(2);
            expect(await xpBadge.currentSeason()).to.equal(2);
        });

        it("Should reject minting with future season", async function () {
            await expect(
                xpBadge.mintBadge(user1.address, 0, 10, 2)
            ).to.be.revertedWith("Invalid season");
        });

        it("Should reject season downgrade", async function () {
            await xpBadge.updateSeason(2);
            await expect(xpBadge.updateSeason(1)).to.be.revertedWith("New season must be greater");
        });
    });

    describe("Metadata Management", function () {
        it("Should generate correct token URIs", async function () {
            await xpBadge.mintBadge(user1.address, 0, 10, 1);
            await xpBadge.mintBadge(user1.address, 1, 30, 1);
            await xpBadge.mintBadge(user1.address, 2, 60, 1);
            await xpBadge.mintBadge(user1.address, 3, 80, 1);
            await xpBadge.mintBadge(user1.address, 4, 150, 1);

            expect(await xpBadge.tokenURI(0)).to.equal(BASE_URI + "participation.json");
            expect(await xpBadge.tokenURI(1)).to.equal(BASE_URI + "common.json");
            expect(await xpBadge.tokenURI(2)).to.equal(BASE_URI + "rare.json");
            expect(await xpBadge.tokenURI(3)).to.equal(BASE_URI + "epic.json");
            expect(await xpBadge.tokenURI(4)).to.equal(BASE_URI + "legendary.json");
        });

        it("Should update base URI", async function () {
            const newBaseURI = "https://api.hamballer.xyz/v2/metadata/badges/";
            await xpBadge.setBaseURI(newBaseURI);

            await xpBadge.mintBadge(user1.address, 0, 10, 1);
            expect(await xpBadge.tokenURI(0)).to.equal(newBaseURI + "participation.json");
        });

        it("Should reject base URI update from non-setter", async function () {
            await expect(
                xpBadge.connect(user1).setBaseURI("https://malicious.com/")
            ).to.be.revertedWith(`AccessControl: account ${user1.address.toLowerCase()} is missing role ${URI_SETTER_ROLE}`);
        });
    });

    describe("Pausable", function () {
        it("Should pause and unpause correctly", async function () {
            await xpBadge.pause();
            expect(await xpBadge.paused()).to.be.true;

            await expect(
                xpBadge.mintBadge(user1.address, 0, 10, 1)
            ).to.be.revertedWith("Pausable: paused");

            await xpBadge.unpause();
            expect(await xpBadge.paused()).to.be.false;

            await xpBadge.mintBadge(user1.address, 0, 10, 1);
            expect(await xpBadge.balanceOf(user1.address)).to.equal(1);
        });

        it("Should pause transfers when paused", async function () {
            await xpBadge.mintBadge(user1.address, 0, 10, 1);
            await xpBadge.pause();

            await expect(
                xpBadge.connect(user1).transferFrom(user1.address, user2.address, 0)
            ).to.be.revertedWith("Pausable: paused");
        });
    });
});
