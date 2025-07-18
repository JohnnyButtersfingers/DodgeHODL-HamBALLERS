const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe("HODLManager basic", function () {
  let dbpToken, boostNFT, hodlManager;
  let owner, player;

  beforeEach(async function () {
    [owner, player] = await ethers.getSigners();

    const DBPToken = await ethers.getContractFactory("DBPToken");
    dbpToken = await DBPToken.deploy("Dodge Ball Points", "DBP", ethers.parseEther("1000"));
    await dbpToken.waitForDeployment();

    const BoostNFT = await ethers.getContractFactory("BoostNFT");
    boostNFT = await BoostNFT.deploy("https://api.hamballer.xyz/metadata/");
    await boostNFT.waitForDeployment();

    const HODLManager = await ethers.getContractFactory("HODLManager");
    hodlManager = await HODLManager.deploy(await dbpToken.getAddress(), await boostNFT.getAddress());
    await hodlManager.waitForDeployment();

    await dbpToken.grantRole(await dbpToken.MINTER_ROLE(), await hodlManager.getAddress());
  });

  it("starts and completes a run", async function () {
    await hodlManager.connect(player).startRun(ethers.id("seed"));
    
    // Advance time to meet MIN_RUN_DURATION requirement (30 seconds)
    await network.provider.send("evm_increaseTime", [31]);
    await network.provider.send("evm_mine");
    
    const before = await dbpToken.balanceOf(player.address);
    await hodlManager.connect(player).completeRun(100, false);
    const after = await dbpToken.balanceOf(player.address);
    expect(after).to.be.gt(before);
  });
});
