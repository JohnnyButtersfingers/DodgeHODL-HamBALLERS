const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DBPToken", function () {
  it("deploys with initial supply and allows transfers", async function () {
    const [owner, user] = await ethers.getSigners();
    const initialSupply = ethers.parseEther("1000");
    const Token = await ethers.getContractFactory("DBPToken");
    const token = await Token.deploy("Dodge Ball Points", "DBP", initialSupply);
    await token.waitForDeployment();

    expect(await token.totalSupply()).to.equal(initialSupply);
    await token.transfer(user.address, 100n);
    expect(await token.balanceOf(user.address)).to.equal(100n);
  });
});
