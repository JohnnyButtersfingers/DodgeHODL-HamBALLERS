# Thirdweb Integration Guide for HamBaller.xyz

## 🎯 Overview

This guide helps you integrate Thirdweb into your HamBaller.xyz project for simplified Web3 development, including wallet onboarding, contract interactions, and asset management.

## ✅ Current Status

### What's Already Set Up:
- ✅ Thirdweb SDK packages installed (`@thirdweb-dev/react`, `@thirdweb-dev/sdk`, `@thirdweb-dev/chains`)
- ✅ Contract addresses configured (XPBadge: `0xE960B46dffd9de6187Ff1B48B31B3F186A07303b`)
- ✅ Configuration file created (`thirdweb-config.json`)
- ✅ Example component created (`ThirdwebIntegration.jsx`)
- ✅ Integration script available (`thirdweb-integration.js`)

### What You Need to Do:
- 🔧 Get Thirdweb Client ID
- 🔧 Import contracts to Thirdweb Dashboard
- 🔧 Update frontend to use Thirdweb instead of Wagmi
- 🔧 Test wallet connection and contract interactions

## 🚀 Quick Start

### Step 1: Get Your Thirdweb Client ID

1. Visit [thirdweb.com/dashboard](https://thirdweb.com/dashboard)
2. Sign up or log in to your account
3. Create a new project or select existing one
4. Go to Settings → API Keys
5. Copy your Client ID

### Step 2: Update Configuration

Update the `clientId` in `frontend/src/components/ThirdwebIntegration.jsx`:

```javascript
const THIRDWEB_CONFIG = {
  clientId: "your-actual-client-id-here", // Replace with your Client ID
  supportedChains: [AbstractTestnet],
  contracts: {
    xpBadge: "0xE960B46dffd9de6187Ff1B48B31B3F186A07303b",
    xpVerifier: "0x5e33911d9c793e5E9172D9e5C4354e21350403E3"
  }
};
```

### Step 3: Import Contracts to Thirdweb Dashboard

1. Go to your Thirdweb Dashboard
2. Click "Import Contract"
3. Select "Abstract Testnet" network (Chain ID: 11124)
4. Import these contracts:

#### XPBadge Contract
- **Address**: `0xE960B46dffd9de6187Ff1B48B31B3F186A07303b`
- **Type**: ERC1155
- **Name**: HamBaller XP Badge

#### XPVerifier Contract
- **Address**: `0x5e33911d9c793e5E9172D9e5C4354e21350403E3`
- **Type**: Custom Contract
- **Name**: XPVerifier

### Step 4: Test the Integration

1. Start your frontend: `cd frontend && npm run dev`
2. Navigate to the Thirdweb integration page
3. Connect your wallet
4. Test badge minting functionality

## 🔧 Integration Options

### Option 1: Replace Wagmi with Thirdweb (Recommended)

Replace your current Wagmi setup with Thirdweb for a complete solution:

```javascript
// Replace in App.jsx
import { ThirdwebProvider } from '@thirdweb-dev/react';
import { AbstractTestnet } from '@thirdweb-dev/chains';

function App() {
  return (
    <ThirdwebProvider 
      clientId="your-client-id"
      supportedChains={[AbstractTestnet]}
    >
      {/* Your app components */}
    </ThirdwebProvider>
  );
}
```

### Option 2: Hybrid Approach

Keep Wagmi for some features and add Thirdweb for specific functionality:

```javascript
// Use both providers
<WagmiConfig config={wagmiConfig}>
  <ThirdwebProvider clientId="your-client-id">
    {/* Your app */}
  </ThirdwebProvider>
</WagmiConfig>
```

## 📋 Available Thirdweb Features

### 1. Wallet Connection
```javascript
import { ConnectWallet } from '@thirdweb-dev/react';

<ConnectWallet 
  theme="dark"
  btnTitle="Connect Wallet"
  modalSize="wide"
/>
```

### 2. Contract Interactions
```javascript
import { useContract, useContractRead, useContractWrite } from '@thirdweb-dev/react';

const { contract } = useContract("0xE960B46dffd9de6187Ff1B48B31B3F186A07303b");
const { data: balance } = useContractRead(contract, "balanceOf", [address, 1]);
const { mutateAsync: mintBadge } = useContractWrite(contract, "mintBadge");
```

### 3. NFT Management
```javascript
import { useNFT, useNFTs } from '@thirdweb-dev/react';

const { data: nft } = useNFT(contract, 1);
const { data: nfts } = useNFTs(contract);
```

### 4. Analytics & Events
```javascript
import { useContractEvents } from '@thirdweb-dev/react';

const { data: events } = useContractEvents(contract, "BadgeMinted");
```

## 🎮 Game-Specific Integration

### Badge Minting Flow
```javascript
const handleGameCompletion = async (xpEarned, runId) => {
  try {
    // Mint badge through Thirdweb
    await mintBadge({
      args: [playerAddress, badgeTokenId, xpEarned, currentSeason],
    });
    
    // Update game state
    setGameState(prev => ({
      ...prev,
      badges: [...prev.badges, { tokenId: badgeTokenId, xp: xpEarned }]
    }));
  } catch (error) {
    console.error("Failed to mint badge:", error);
  }
};
```

### Badge Display
```javascript
const BadgeGallery = () => {
  const { data: nfts } = useNFTs(contract);
  
  return (
    <div className="grid grid-cols-3 gap-4">
      {nfts?.map((nft) => (
        <div key={nft.metadata.id} className="badge-card">
          <img src={nft.metadata.image} alt={nft.metadata.name} />
          <h3>{nft.metadata.name}</h3>
          <p>XP: {nft.metadata.attributes?.xp}</p>
        </div>
      ))}
    </div>
  );
};
```

## 🔍 Testing & Debugging

### Test Wallet Connection
```javascript
import { useAddress, useDisconnect } from '@thirdweb-dev/react';

const address = useAddress();
const disconnect = useDisconnect();

console.log("Connected address:", address);
```

### Test Contract Interactions
```javascript
// Test reading contract data
const { data, isLoading, error } = useContractRead(contract, "totalSupply");

// Test writing to contract
const { mutateAsync, isLoading: isWriting } = useContractWrite(contract, "mintBadge");
```

### Debug Thirdweb Provider
```javascript
import { useSDK } from '@thirdweb-dev/react';

const sdk = useSDK();
console.log("Thirdweb SDK:", sdk);
```

## 📊 Analytics & Monitoring

### Enable Analytics
1. Go to your Thirdweb Dashboard
2. Navigate to Analytics
3. Enable event tracking for your contracts
4. Monitor:
   - Badge minting events
   - User engagement
   - Gas usage
   - Transaction success rates

### Custom Analytics
```javascript
import { useContractEvents } from '@thirdweb-dev/react';

const { data: badgeEvents } = useContractEvents(contract, "BadgeMinted");

useEffect(() => {
  if (badgeEvents) {
    // Track badge minting analytics
    analytics.track('badge_minted', {
      totalBadges: badgeEvents.length,
      recentMints: badgeEvents.slice(-5)
    });
  }
}, [badgeEvents]);
```

## 🚨 Troubleshooting

### Common Issues

1. **Client ID Error**
   - Ensure you've set the correct Client ID
   - Check that your domain is whitelisted in Thirdweb Dashboard

2. **Contract Not Found**
   - Verify contract addresses are correct
   - Ensure contracts are deployed on Abstract Testnet
   - Check that contracts are imported in Thirdweb Dashboard

3. **Network Issues**
   - Confirm Abstract Testnet is supported
   - Check RPC endpoint availability
   - Verify chain ID (11124)

4. **Wallet Connection Issues**
   - Test with different wallets (MetaMask, WalletConnect)
   - Check browser console for errors
   - Ensure wallet is connected to Abstract Testnet

### Debug Commands
```bash
# Check Thirdweb packages
npm list @thirdweb-dev/react @thirdweb-dev/sdk

# Test contract connection
node -e "
const { ThirdwebSDK } = require('@thirdweb-dev/sdk');
const sdk = new ThirdwebSDK('abstract-testnet');
console.log('SDK initialized:', !!sdk);
"
```

## 📈 Next Steps

### Phase 1: Basic Integration ✅
- [x] Install Thirdweb packages
- [x] Create configuration
- [x] Set up example component

### Phase 2: Full Integration
- [ ] Replace Wagmi with Thirdweb
- [ ] Update all contract interactions
- [ ] Implement badge minting flow
- [ ] Add analytics tracking

### Phase 3: Advanced Features
- [ ] Batch operations for multiple badges
- [ ] Advanced analytics dashboard
- [ ] Custom contract interactions
- [ ] Multi-chain support

## 🔗 Resources

- [Thirdweb Documentation](https://portal.thirdweb.com)
- [React SDK Guide](https://portal.thirdweb.com/react)
- [Contract Integration](https://portal.thirdweb.com/contracts)
- [Analytics Setup](https://portal.thirdweb.com/analytics)
- [Discord Community](https://discord.gg/thirdweb)

## 📞 Support

If you encounter issues:
1. Check the [Thirdweb Documentation](https://portal.thirdweb.com)
2. Join the [Discord Community](https://discord.gg/thirdweb)
3. Review the troubleshooting section above
4. Check browser console for detailed error messages

---

**Ready to integrate Thirdweb?** Follow the steps above and you'll have a fully functional Web3 integration with simplified wallet onboarding and contract interactions! 🚀 