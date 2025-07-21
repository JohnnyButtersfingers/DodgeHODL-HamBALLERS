# HamBaller.xyz 🎮

**Web3-native game hub featuring DODGE & HODL**

> Slipnode-based gameplay with 1-move tension, on-chain rewards, and live replay streaming.

## 🏗️ Architecture

```
hamballer-xyz/
├── contracts/          # Smart contracts (Abstract Blockchain)
│   ├── DBPToken.sol     # ERC-20 game currency
│   ├── BoostNFT.sol     # ERC-1155 one-use boosts  
│   └── HODLManager.sol  # Core game logic
├── backend/            # Express API + WebSocket
│   ├── routes/         # REST endpoints
│   └── controllers/    # Business logic
└── frontend/           # React + Vite app
    ├── components/     # Game UI components
    └── hooks/          # Web3 integration
```

## 🎯 Game Features

- **🎮 DODGE & HODL**: Slipnode-based gameplay loop
- **🟡 Chess Puffs (CP)**: Soft in-game currency (off-chain)
- **🟢 DBP Tokens**: ERC-20 rewards minted on-chain
- **🎯 Bonus Throw™**: Multiplier mechanics
- **🧩 NFT Boosts**: ERC-1155 power-ups
- **📡 Live Replays**: WebSocket streaming with XP logging

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm 8+
- Git

### Installation
```bash
# Clone and setup
git clone <repo-url>
cd hamballer-game-starter
cp .env.example .env

# Install all dependencies
pnpm install:all
```

### Development
```bash
# Start local blockchain
pnpm dev:contracts

# Start backend API
pnpm dev:backend

# Start frontend
pnpm dev:frontend
```

### Deployment
```bash
# Deploy contracts to Abstract
pnpm deploy:contracts

# Build all packages
pnpm build:all
```

## 🔧 Offline Development

For environments without internet access, you can set up dependencies using a local pnpm store:

### Prerequisites
- OpenZeppelin contracts v5.3.0 (already configured)
- pnpm v8.10.0+ (v10+ recommended for better offline support)
- All required packages: jest, vitest, hardhat, @openzeppelin/contracts@5.3.0, solc@0.8.20

### Method 1: Using the setup script (recommended)
```bash
# On a machine with internet access:
cd hamballer-game-starter
pnpm install:all
cp -r $(pnpm store path)/* ../scripts/pnpm-store/

# Transfer the project to offline environment, then:
cd /path/to/project
./scripts/setup-offline.sh
```

### Method 2: Manual store setup (pnpm v10+)
```bash
# On a machine with internet access:
cd hamballer-game-starter
pnpm install:all

# Find your store location and copy it
pnpm store path
cp -r $(pnpm store path)/* ../scripts/pnpm-store/

# Transfer the project with scripts/pnpm-store/ to offline environment
```

### Installing in offline environment
```bash
# Option A: Use the automated script
./scripts/setup-offline.sh

# Option B: Manual installation
export PNPM_STORE_DIR="./scripts/pnpm-store"
cd hamballer-game-starter
pnpm install:all --offline
```

### Required tarballs verified
The offline store includes all necessary packages:
- jest@29.7.0 (backend testing)
- vitest@0.34.6 (frontend testing)  
- hardhat@2.25.0 (contract development)
- @openzeppelin/contracts@5.3.0 (smart contract framework)
- solc@0.8.20 (Solidity compiler)

**Note**: The `pnpm store export` command was deprecated in pnpm v10+. Use the manual copy method as shown above.

## 🔧 Technology Stack

- **Contracts**: Hardhat + OpenZeppelin + Abstract Blockchain
- **Backend**: Express.js + WebSocket + Supabase
- **Frontend**: React + Vite + Tailwind + RainbowKit
- **Package Management**: pnpm workspaces

## 📡 API Endpoints

- `POST /api/run` - Submit game run
- `GET /api/dashboard` - Player statistics  
- `GET /api/logs` - Replay data
- `WS /socket` - Live updates

## 🎮 Game Flow

1. **Connect Wallet** → RainbowKit integration
2. **Start Run** → Slipnode gameplay begins  
3. **Submit Move** → Wallet-signed transaction
4. **Earn Rewards** → CP + DBP token minting
5. **Use Boosts** → NFT-based enhancements
6. **View Replay** → Live WebSocket streaming

## 🔐 Smart Contract Addresses

*Deployed on Abstract Testnet:*
- DBP Token: `TBD`
- Boost NFT: `TBD` 
- HODL Manager: `TBD`

## 📄 License

MIT © HamBaller Team