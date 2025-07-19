const { ethers } = require('ethers');

console.log('🔑 Generating new wallet for deployment...\n');

// Generate a random wallet
const wallet = ethers.Wallet.createRandom();

console.log('📋 NEW WALLET GENERATED:');
console.log('='.repeat(50));
console.log('Address:     ', wallet.address);
console.log('Private Key: ', wallet.privateKey.slice(2)); // Remove 0x prefix
console.log('='.repeat(50));

console.log('\n⚠️  IMPORTANT SECURITY NOTES:');
console.log('1. Save this private key securely!');
console.log('2. Never share your private key with anyone');
console.log('3. Fund this address with testnet ETH for deployment');
console.log('4. Copy the private key (without 0x) to contracts/.env');

console.log('\n💰 To get testnet ETH:');
console.log('1. Visit Abstract testnet faucet (check Abstract docs)');
console.log('2. Request testnet ETH for address:', wallet.address);
console.log('3. Wait for confirmation, then proceed with deployment');
