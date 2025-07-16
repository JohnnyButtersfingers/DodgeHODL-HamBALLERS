/**
 * Contract loader utility for HamBaller.xyz
 * Dynamically loads deployed contract addresses and ABIs
 */

let contractsData = null;

/**
 * Load contracts.json file (generated after deployment)
 * Falls back to environment variables if contracts.json doesn't exist
 */
export async function loadContracts() {
  if (contractsData) {
    return contractsData;
  }

  try {
    // Try to load the deployed contracts.json file
    const response = await fetch('/src/config/contracts.json');
    if (response.ok) {
      contractsData = await response.json();
      console.log('📄 Loaded contracts from contracts.json:', contractsData.timestamp);
      return contractsData;
    }
  } catch (error) {
    console.warn('⚠️ contracts.json not found, falling back to environment variables');
  }

  // Fallback to environment variables and simplified ABIs
  const { CONTRACT_ADDRESSES, CONTRACT_ABIS } = await import('./networks.js');
  
  contractsData = {
    network: {
      name: 'Unknown',
      chainId: 0
    },
    timestamp: new Date().toISOString(),
    contracts: {
      DBPToken: {
        address: CONTRACT_ADDRESSES.DBP_TOKEN,
        abi: CONTRACT_ABIS.DBP_TOKEN.map(sig => ({ type: 'function', name: sig.split(' ')[1].split('(')[0] }))
      },
      BoostNFT: {
        address: CONTRACT_ADDRESSES.BOOST_NFT,
        abi: CONTRACT_ABIS.BOOST_NFT.map(sig => ({ type: 'function', name: sig.split(' ')[1].split('(')[0] }))
      },
      HODLManager: {
        address: CONTRACT_ADDRESSES.HODL_MANAGER,
        abi: CONTRACT_ABIS.HODL_MANAGER.map(sig => ({ type: 'function', name: sig.split(' ')[1].split('(')[0] }))
      }
    }
  };

  return contractsData;
}

/**
 * Get a specific contract's data
 */
export async function getContract(contractName) {
  const contracts = await loadContracts();
  return contracts.contracts[contractName];
}

/**
 * Get all contract addresses
 */
export async function getContractAddresses() {
  const contracts = await loadContracts();
  return {
    DBPToken: contracts.contracts.DBPToken.address,
    BoostNFT: contracts.contracts.BoostNFT.address,
    HODLManager: contracts.contracts.HODLManager.address,
  };
}

/**
 * Check if contracts are deployed (have valid addresses)
 */
export async function areContractsDeployed() {
  const addresses = await getContractAddresses();
  return Object.values(addresses).every(addr => addr && addr !== '');
}

export default {
  loadContracts,
  getContract,
  getContractAddresses,
  areContractsDeployed,
};