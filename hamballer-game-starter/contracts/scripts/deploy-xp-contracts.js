const hre = require("hardhat");

async function main() {
    console.log("🚀 Deploying XPVerifier and XPBadge contracts...");

    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

    // Deploy XPVerifier
    console.log("\n📋 Deploying XPVerifier...");
    const XPVerifier = await hre.ethers.getContractFactory("XPVerifier");
    const xpVerifier = await XPVerifier.deploy();
    await xpVerifier.deployed();
    console.log("✅ XPVerifier deployed to:", xpVerifier.address);

    // Deploy XPBadge
    console.log("\n🎖️ Deploying XPBadge...");
    const XPBadge = await hre.ethers.getContractFactory("XPBadge");
    const xpBadge = await XPBadge.deploy(
        "HamBaller XP Badges",
        "HBXP",
        "https://api.hamballer.xyz/metadata/badges/"
    );
    await xpBadge.deployed();
    console.log("✅ XPBadge deployed to:", xpBadge.address);

    // Grant MINTER_ROLE to the backend wallet if provided
    if (process.env.XPBADGE_MINTER_ADDRESS) {
        console.log("\n🔑 Granting MINTER_ROLE to backend wallet...");
        const MINTER_ROLE = await xpBadge.MINTER_ROLE();
        await xpBadge.grantRole(MINTER_ROLE, process.env.XPBADGE_MINTER_ADDRESS);
        console.log("✅ MINTER_ROLE granted to:", process.env.XPBADGE_MINTER_ADDRESS);
    }

    // Grant VERIFIER_ROLE to the backend wallet if provided
    if (process.env.XPVERIFIER_OPERATOR_ADDRESS) {
        console.log("\n🔑 Granting VERIFIER_ROLE to backend wallet...");
        const VERIFIER_ROLE = await xpVerifier.VERIFIER_ROLE();
        await xpVerifier.grantRole(VERIFIER_ROLE, process.env.XPVERIFIER_OPERATOR_ADDRESS);
        console.log("✅ VERIFIER_ROLE granted to:", process.env.XPVERIFIER_OPERATOR_ADDRESS);
    }

    // Save deployment info
    const deploymentInfo = {
        network: hre.network.name,
        deployer: deployer.address,
        contracts: {
            XPVerifier: {
                address: xpVerifier.address,
                deploymentBlock: xpVerifier.deployTransaction.blockNumber
            },
            XPBadge: {
                address: xpBadge.address,
                deploymentBlock: xpBadge.deployTransaction.blockNumber
            }
        },
        timestamp: new Date().toISOString()
    };

    console.log("\n📄 Deployment Summary:");
    console.log(JSON.stringify(deploymentInfo, null, 2));

    // Write deployment info to file
    const fs = require('fs');
    const deploymentPath = `./deployments/xp-contracts-${hre.network.name}.json`;
    
    // Create deployments directory if it doesn't exist
    if (!fs.existsSync('./deployments')) {
        fs.mkdirSync('./deployments');
    }
    
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\n💾 Deployment info saved to: ${deploymentPath}`);

    // Generate .env update instructions
    console.log("\n📝 Add these to your backend .env file:");
    console.log(`XPVERIFIER_ADDRESS=${xpVerifier.address}`);
    console.log(`XPBADGE_ADDRESS=${xpBadge.address}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });