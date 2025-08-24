# HamBaller.xyz Frontend

## 🔥 **Frontend Layer Complete!**

This is the React frontend for HamBaller.xyz built with Vite, React, and Tailwind CSS. The frontend provides a complete Web3 gaming interface with wallet connectivity, real-time WebSocket integration, and smart contract interactions.

## 🎮 **Features Implemented**

### Core Components
- **🏠 Layout**: Navigation, header with wallet connect, responsive design
- **🎮 GameView**: Main game interface with move selection and run execution
- **📊 Dashboard**: Player stats, run history, and performance analytics
- **🏆 Leaderboard**: Global rankings and competitive stats
- **📺 ReplayViewer**: Interactive replay system with playback controls

### Game Features
- **🔌 Wallet Connect**: RainbowKit integration with Abstract testnet
- **🎯 Move Selection**: Visual move selector (UP/DOWN sequences)
- **⚡ Real-time Updates**: WebSocket integration for live game data
- **💎 HODL/CLIMB**: Decision mechanics with risk/reward visualization
- **🚀 Boosts**: NFT boost integration and management
- **📈 Live Price Feed**: Real-time DBP price ticker
- **📊 Statistics**: Comprehensive player analytics

### State Management
- **🏗️ useGameState**: Centralized game state management
- **📡 useWebSocket**: Real-time WebSocket connection handling
- **⛓️ useContracts**: Smart contract interaction hooks

## 🛠 **Tech Stack**

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Web3**: wagmi + viem + RainbowKit
- **Network**: Abstract Testnet
- **WebSocket**: Real-time game updates
- **State**: React Context + useReducer

## 🚀 **Quick Start**

### Prerequisites
```bash
# Make sure you're in the frontend directory
cd frontend

# Copy environment variables
cp .env.example .env
```

### Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Available at http://localhost:5173
```

### Production Build
```bash
# Build for production
npm run build

# Preview build
npm run preview
```

## 📁 **Project Structure**

```
frontend/
├── src/
│   ├── components/           # UI Components
│   │   ├── Layout.jsx       # Main layout with navigation
│   │   ├── GameView.jsx     # Main game interface
│   │   ├── Dashboard.jsx    # Player dashboard
│   │   ├── Leaderboard.jsx  # Global rankings
│   │   ├── ReplayViewer.jsx # Replay system
│   │   ├── RunProgress.jsx  # Game progress UI
│   │   ├── StatOverlay.jsx  # Player stats display
│   │   ├── LiveReplay.jsx   # Live event feed
│   │   └── PriceTicker.jsx  # DBP price display
│   ├── hooks/               # Custom Hooks
│   │   ├── useGameState.jsx # Game state management
│   │   ├── useWebSocket.jsx # WebSocket connection
│   │   └── useContracts.js  # Contract interactions
│   ├── config/
│   │   └── networks.js      # Network & contract config
│   ├── App.jsx             # Main app component
│   └── main.jsx           # Entry point
├── package.json
├── vite.config.js
├── tailwind.config.js
└── .env.example
```

## 🎮 **How It Works**

### Game Flow
1. **🔌 Connect Wallet** → RainbowKit handles Abstract testnet connection
2. **🎯 Select Moves** → Choose 10 UP/DOWN moves for slipnode navigation
3. **🚀 Start Run** → Execute run with optional boost NFTs
4. **📺 Watch Progress** → Real-time visualization of run execution
5. **💎 HODL Decision** → Choose to HODL (risk) or CLIMB (safe) at checkpoint
6. **🏆 Earn Rewards** → Receive DBP tokens based on performance

### WebSocket Channels
- **🚀 XP Channel**: Live XP updates and level progression
- **📺 Replay Channel**: Real-time game event streaming
- **📊 Stats Channel**: Live player statistics updates
- **💰 Price Channel**: DBP token price feed

### Smart Contract Integration
- **🪙 DBP Token**: ERC-20 token for rewards
- **🎁 Boost NFT**: ERC-1155 boost items
- **🎮 HODL Manager**: Core game logic contract

## 🔧 **Configuration**

### Environment Variables
```bash
# API Configuration
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001

# Contract Addresses (populated after deployment)
VITE_DBP_TOKEN_ADDRESS=0x...
VITE_BOOST_NFT_ADDRESS=0x...
VITE_HODL_MANAGER_ADDRESS=0x...

# WalletConnect
VITE_WALLETCONNECT_PROJECT_ID=your_project_id
```

### Network Setup
The frontend is configured for Abstract testnet. Update `src/config/networks.js` for different networks:

```javascript
export const abstractTestnet = {
  id: 11124,
  name: 'Abstract Testnet',
  rpcUrls: {
    default: { http: ['https://api.testnet.abs.xyz'] }
  }
};
```

## 🎨 **UI/UX Features**

### Design System
- **🎨 Modern Dark Theme**: Game-focused dark interface
- **🌈 Gradient Accents**: Green/blue gradients for CTAs
- **📱 Responsive Design**: Mobile-first responsive layout
- **⚡ Smooth Animations**: Tailwind CSS transitions

### User Experience
- **🔄 Real-time Feedback**: Instant WebSocket updates
- **📊 Visual Progress**: Progress bars and move visualization
- **🎯 Intuitive Controls**: Clear game action buttons
- **📈 Data Visualization**: Charts and stat displays

## 🔌 **Integration Points**

### Backend API
- **🎮 Game Endpoints**: `/api/run/*` for game actions
- **📊 Dashboard**: `/api/dashboard/*` for stats
- **💰 Price Feed**: `/api/dbp-price` for token price

### Smart Contracts
- **📖 Read Operations**: Balance checks, stats queries
- **✍️ Write Operations**: Start/end runs, approvals
- **📡 Event Listening**: Transaction confirmations

### WebSocket Events
- **📡 Connection Management**: Auto-reconnect with exponential backoff
- **📢 Channel Subscriptions**: XP, replay, stats, price
- **🔄 State Synchronization**: Real-time state updates

## 🚀 **Deployment**

### Development
```bash
# Start all services
pnpm dev:frontend    # Frontend dev server
pnpm dev:backend     # Backend API server

# Or run individually
cd frontend && npm run dev
```

### Production
```bash
# Build frontend
npm run build

# Serve static files
npm run preview

# Deploy to your preferred hosting platform
```

## 🎯 **Next Steps**

The frontend is fully integrated and ready for:

1. **🔗 Contract Deployment**: Deploy smart contracts and update addresses
2. **🗄️ Database Setup**: Configure Supabase for backend integration
3. **🌐 Production Deploy**: Deploy frontend to Vercel/Netlify
4. **🔧 Environment Config**: Set production environment variables
5. **🧪 End-to-End Testing**: Full integration testing

## 💡 **Features Ready**

✅ **Wallet Connect** - RainbowKit + Abstract integration  
✅ **Game Interface** - Complete move selection and run UI  
✅ **Real-time Updates** - WebSocket integration  
✅ **Player Dashboard** - Stats, history, leaderboards  
✅ **Replay System** - Interactive replay viewer  
✅ **Smart Contract Hooks** - Contract interaction layer  
✅ **Responsive Design** - Mobile-first UI  
✅ **State Management** - Centralized game state  

## 🎮 **Ready to Ship!**

The frontend layer is complete and ready for integration with your deployed backend and smart contracts. The modular architecture makes it easy to customize and extend as needed.

**Start the frontend**: `cd frontend && npm run dev`  
**View at**: `http://localhost:5173`  

🚀 **Let's finish this stack strong!** 💥⚡
