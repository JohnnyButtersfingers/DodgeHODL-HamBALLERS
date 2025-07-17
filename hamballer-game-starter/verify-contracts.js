#!/usr/bin/env node

/**
 * Contract Verification Script for Abstract Testnet
 * 
 * Verifies deployed contracts on Abstract Testnet explorer
 * using Etherscan-compatible API for public access and ABI visibility
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const VERIFICATION_CONFIG = {
  network: 'abstract-testnet',
  explorerUrl: 'https://explorer.testnet.abs.xyz',
  apiUrl: 'https://api.explorer.testnet.abs.xyz/api',
  apiKey: process.env.ABSTRACT_API_KEY || process.env.ETHERSCAN_API_KEY,
  contracts: {
    DBPToken: {
      address: process.env.DBP_TOKEN_ADDRESS,
      name: 'DBPToken',
      sourcePath: './contracts/contracts/DBPToken.sol'
    },
    HODLManager: {
      address: process.env.HODL_MANAGER_ADDRESS,
      name: 'HODLManager',
      sourcePath: './contracts/contracts/HODLManager.sol'
    },
    BoostNFT: {
      address: process.env.BOOST_NFT_ADDRESS,
      name: 'BoostNFT',
      sourcePath: './contracts/contracts/BoostNFT.sol'
    },
    XPBadge: {
      address: process.env.XPBADGE_ADDRESS,
      name: 'XPBadge',
      sourcePath: './contracts/contracts/XPBadge.sol'
    }
  }
};

class ContractVerifier {
  constructor() {
    this.results = [];
  }

  async verifyAllContracts() {
    console.log('🔍 Starting Contract Verification Process...\n');
    
    // Validate configuration
    this.validateConfig();
    
    // Check if we're in the contracts directory
    const contractsDir = path.join(__dirname, 'contracts');
    if (!fs.existsSync(contractsDir)) {
      throw new Error('Contracts directory not found. Please run from project root.');
    }
    
    // Verify each contract
    for (const [contractName, config] of Object.entries(VERIFICATION_CONFIG.contracts)) {
      if (config.address) {
        await this.verifyContract(contractName, config);
      } else {
        console.log(`⚠️ Skipping ${contractName} - no address provided\n`);
        this.results.push({
          contract: contractName,
          status: 'skipped',
          reason: 'No address provided'
        });
      }
    }
    
    // Generate report
    this.generateReport();
  }

  validateConfig() {
    const missing = [];
    
    if (!VERIFICATION_CONFIG.apiKey) {
      missing.push('ABSTRACT_API_KEY or ETHERSCAN_API_KEY');
    }
    
    const deployedContracts = Object.values(VERIFICATION_CONFIG.contracts)
      .filter(config => config.address);
    
    if (deployedContracts.length === 0) {
      missing.push('At least one deployed contract address');
    }
    
    if (missing.length > 0) {
      throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }
    
    console.log(`📋 Configuration validated:`);
    console.log(`   Network: ${VERIFICATION_CONFIG.network}`);
    console.log(`   Explorer: ${VERIFICATION_CONFIG.explorerUrl}`);
    console.log(`   Contracts to verify: ${deployedContracts.length}\n`);
  }

  async verifyContract(contractName, config) {
    console.log(`🔍 Verifying ${contractName}...`);
    console.log(`   Address: ${config.address}`);
    console.log(`   Source: ${config.sourcePath}`);
    
    try {
      // Check if contract is already verified
      const isVerified = await this.checkIfVerified(config.address);
      
      if (isVerified) {
        console.log(`✅ ${contractName} is already verified\n`);
        this.results.push({
          contract: contractName,
          address: config.address,
          status: 'already_verified',
          explorerUrl: `${VERIFICATION_CONFIG.explorerUrl}/address/${config.address}`
        });
        return;
      }
      
      // Attempt verification using Hardhat
      await this.verifyWithHardhat(contractName, config);
      
    } catch (error) {
      console.error(`❌ Failed to verify ${contractName}: ${error.message}\n`);
      this.results.push({
        contract: contractName,
        address: config.address,
        status: 'failed',
        error: error.message
      });
    }
  }

  async checkIfVerified(address) {
    try {
      // Check via API if available
      if (VERIFICATION_CONFIG.apiKey) {
        const response = await fetch(
          `${VERIFICATION_CONFIG.apiUrl}?module=contract&action=getsourcecode&address=${address}&apikey=${VERIFICATION_CONFIG.apiKey}`
        );
        
        if (response.ok) {
          const data = await response.json();
          return data.result?.[0]?.SourceCode !== '';
        }
      }
      
      return false;
    } catch (error) {
      console.warn(`⚠️ Could not check verification status: ${error.message}`);
      return false;
    }
  }

  async verifyWithHardhat(contractName, config) {
    console.log(`📤 Submitting ${contractName} for verification...`);
    
    try {
      // Change to contracts directory
      const originalDir = process.cwd();
      const contractsDir = path.join(__dirname, 'contracts');
      
      process.chdir(contractsDir);
      
      // Prepare verification command
      const verifyCmd = [
        'npx hardhat verify',
        `--network ${VERIFICATION_CONFIG.network}`,
        config.address
      ].join(' ');
      
      // Add constructor arguments if needed
      const constructorArgs = this.getConstructorArgs(contractName);
      if (constructorArgs.length > 0) {
        verifyCmd += ` ${constructorArgs.join(' ')}`;
      }
      
      console.log(`   Command: ${verifyCmd}`);
      
      // Execute verification
      const output = execSync(verifyCmd, { 
        encoding: 'utf8', 
        timeout: 120000 // 2 minutes timeout
      });
      
      console.log('   Output:', output);
      
      // Return to original directory
      process.chdir(originalDir);
      
      // Check if verification was successful
      if (output.includes('Successfully verified') || output.includes('Already Verified')) {
        console.log(`✅ ${contractName} verified successfully\n`);
        this.results.push({
          contract: contractName,
          address: config.address,
          status: 'verified',
          explorerUrl: `${VERIFICATION_CONFIG.explorerUrl}/address/${config.address}`,
          verificationOutput: output
        });
      } else {
        throw new Error('Verification output did not indicate success');
      }
      
    } catch (error) {
      // Return to original directory on error
      if (process.cwd() !== __dirname) {
        process.chdir(__dirname);
      }
      
      // Parse common errors
      let errorMessage = error.message;
      
      if (error.message.includes('Already Verified')) {
        console.log(`✅ ${contractName} was already verified\n`);
        this.results.push({
          contract: contractName,
          address: config.address,
          status: 'already_verified',
          explorerUrl: `${VERIFICATION_CONFIG.explorerUrl}/address/${config.address}`
        });
        return;
      }
      
      if (error.message.includes('Contract source code already verified')) {
        console.log(`✅ ${contractName} source code already verified\n`);
        this.results.push({
          contract: contractName,
          address: config.address,
          status: 'already_verified',
          explorerUrl: `${VERIFICATION_CONFIG.explorerUrl}/address/${config.address}`
        });
        return;
      }
      
      throw new Error(errorMessage);
    }
  }

  getConstructorArgs(contractName) {
    // Return constructor arguments for each contract
    // These would be the same arguments used during deployment
    
    const constructorArgs = {
      DBPToken: [], // Usually no constructor args for basic ERC20
      HODLManager: [
        // Add constructor arguments used during deployment
        // e.g., DBP token address, boost NFT address, etc.
      ],
      BoostNFT: [], // Usually no constructor args for basic NFT
      XPBadge: [] // Add constructor args if needed
    };
    
    return constructorArgs[contractName] || [];
  }

  generateReport() {
    console.log('\n📊 VERIFICATION REPORT');
    console.log('======================');
    
    const verified = this.results.filter(r => r.status === 'verified' || r.status === 'already_verified');
    const failed = this.results.filter(r => r.status === 'failed');
    const skipped = this.results.filter(r => r.status === 'skipped');
    
    console.log(`Total Contracts: ${this.results.length}`);
    console.log(`Verified: ${verified.length} ✅`);
    console.log(`Failed: ${failed.length} ❌`);
    console.log(`Skipped: ${skipped.length} ⚠️`);
    
    console.log('\nDetailed Results:');
    console.log('=================');
    
    for (const result of this.results) {
      const status = this.getStatusIcon(result.status);
      console.log(`${status} ${result.contract}`);
      
      if (result.address) {
        console.log(`   Address: ${result.address}`);
      }
      
      if (result.explorerUrl) {
        console.log(`   Explorer: ${result.explorerUrl}`);
      }
      
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      
      console.log();
    }
    
    // Save detailed report
    const report = {
      summary: {
        total: this.results.length,
        verified: verified.length,
        failed: failed.length,
        skipped: skipped.length
      },
      network: VERIFICATION_CONFIG.network,
      explorerUrl: VERIFICATION_CONFIG.explorerUrl,
      results: this.results,
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(
      path.join(__dirname, 'verification-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    console.log(`📄 Detailed report saved to: verification-report.json`);
    
    // Print next steps
    this.printNextSteps();
  }

  getStatusIcon(status) {
    const icons = {
      verified: '✅',
      already_verified: '✅',
      failed: '❌',
      skipped: '⚠️'
    };
    return icons[status] || '❓';
  }

  printNextSteps() {
    console.log('\n🎯 NEXT STEPS');
    console.log('==============');
    
    const verifiedContracts = this.results.filter(
      r => r.status === 'verified' || r.status === 'already_verified'
    );
    
    if (verifiedContracts.length > 0) {
      console.log('✅ Verified contracts are now publicly accessible with:');
      console.log('   • Source code visibility');
      console.log('   • ABI access');
      console.log('   • Read/Write contract interface');
      console.log('   • Event logs and transaction history');
      
      console.log('\n🔗 Contract Links:');
      for (const contract of verifiedContracts) {
        if (contract.explorerUrl) {
          console.log(`   ${contract.contract}: ${contract.explorerUrl}`);
        }
      }
    }
    
    const failedContracts = this.results.filter(r => r.status === 'failed');
    if (failedContracts.length > 0) {
      console.log('\n❌ Failed verifications can be retried with:');
      console.log('   • Correct constructor arguments');
      console.log('   • Matching compiler version');
      console.log('   • Proper optimization settings');
      console.log('   • Valid API key');
    }
    
    console.log('\n📋 For Thirdweb integration:');
    console.log('   1. Add verified contract addresses to Thirdweb dashboard');
    console.log('   2. Import contracts using the explorer links above');
    console.log('   3. Enable analytics and management features');
  }
}

// CLI execution
if (require.main === module) {
  const verifier = new ContractVerifier();
  verifier.verifyAllContracts()
    .then(() => {
      console.log('\n🎉 Contract verification process complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Contract verification failed:', error.message);
      process.exit(1);
    });
}

module.exports = ContractVerifier;