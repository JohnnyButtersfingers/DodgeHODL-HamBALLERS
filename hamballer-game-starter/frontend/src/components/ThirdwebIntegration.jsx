import React, { useState, useEffect } from 'react';
import { 
  ThirdwebProvider, 
  ConnectWallet, 
  useContract, 
  useContractRead, 
  useContractWrite,
  useAddress,
  useDisconnect
} from '@thirdweb-dev/react';
import { AbstractTestnet } from '@thirdweb-dev/chains';

// Thirdweb configuration
const THIRDWEB_CONFIG = {
  clientId: "bc234f34695e0631abfea4e2ae1823ee", // From https://thirdweb.com/dashboard
  supportedChains: [AbstractTestnet],
  contracts: {
    xpBadge: "0xE960B46dffd9de6187Ff1B48B31B3F186A07303b",
    xpVerifier: "0x5e33911d9c793e5E9172D9e5C4354e21350403E3"
  }
};

// XPBadge Contract Component
const XPBadgeContract = () => {
  const address = useAddress();
  const { contract } = useContract(THIRDWEB_CONFIG.contracts.xpBadge);
  
  const [badgeBalance, setBadgeBalance] = useState(0);
  const [minting, setMinting] = useState(false);

  // Read badge balance
  const { data: balance, isLoading: balanceLoading } = useContractRead(
    contract,
    "balanceOf",
    [address, 1] // Check balance of badge ID 1
  );

  // Mint badge function
  const { mutateAsync: mintBadge, isLoading: mintLoading } = useContractWrite(
    contract,
    "mintBadge"
  );

  useEffect(() => {
    if (balance) {
      setBadgeBalance(balance.toNumber());
    }
  }, [balance]);

  const handleMintBadge = async () => {
    if (!address) return;
    
    try {
      setMinting(true);
      await mintBadge({
        args: [address, 1, 100, 1], // to, tokenId, xp, season
      });
      console.log("Badge minted successfully!");
    } catch (error) {
      console.error("Failed to mint badge:", error);
    } finally {
      setMinting(false);
    }
  };

  if (!address) {
    return (
      <div className="p-6 bg-gray-800 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">XP Badge Contract</h3>
        <p className="text-gray-400">Please connect your wallet to interact with badges.</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-800 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">XP Badge Contract</h3>
      
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-400">Connected Address:</p>
          <p className="text-sm font-mono">{address}</p>
        </div>
        
        <div>
          <p className="text-sm text-gray-400">Badge Balance (ID 1):</p>
          {balanceLoading ? (
            <p className="text-sm">Loading...</p>
          ) : (
            <p className="text-sm font-bold">{badgeBalance}</p>
          )}
        </div>
        
        <button
          onClick={handleMintBadge}
          disabled={mintLoading || minting}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {mintLoading || minting ? "Minting..." : "Mint Badge"}
        </button>
      </div>
    </div>
  );
};

// Main Thirdweb Integration Component
const ThirdwebIntegration = () => {
  const [clientId, setClientId] = useState(THIRDWEB_CONFIG.clientId);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Thirdweb Integration</h1>
        <p className="text-gray-400 mb-4">
          This demonstrates Thirdweb integration for wallet connection and contract interactions.
        </p>
        
        <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4 mb-6">
          <h3 className="text-yellow-400 font-semibold mb-2">Setup Required:</h3>
          <ol className="text-sm text-yellow-300 space-y-1">
            <li>1. Get your Thirdweb Client ID from <a href="https://thirdweb.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline">thirdweb.com/dashboard</a></li>
            <li>2. Update the clientId in the component</li>
            <li>3. Import contracts to your Thirdweb dashboard</li>
          </ol>
        </div>
      </div>

      <ThirdwebProvider 
        clientId={clientId}
        supportedChains={THIRDWEB_CONFIG.supportedChains}
      >
        <div className="space-y-6">
          {/* Wallet Connection */}
          <div className="p-6 bg-gray-800 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Wallet Connection</h3>
            <ConnectWallet 
              theme="dark"
              btnTitle="Connect Wallet"
              modalSize="wide"
            />
          </div>

          {/* Contract Interactions */}
          <XPBadgeContract />
        </div>
      </ThirdwebProvider>
    </div>
  );
};

export default ThirdwebIntegration; 