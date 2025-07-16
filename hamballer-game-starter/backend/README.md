# HamBaller.xyz Backend API

Express.js backend providing REST API and WebSocket services for the HamBaller.xyz game.

## 🚀 Features

- **REST API** for game run management
- **WebSocket** real-time updates for live XP, replays, stats
- **Supabase** database integration for run logs and replays
- **Smart Contract** integration with Abstract blockchain
- **DBP Price Tracking** with simulated market data
- **Dashboard Analytics** and leaderboards

## 📡 API Endpoints

### Game Runs
- `POST /api/run/start` - Start a new game run
- `POST /api/run/complete` - Complete a run and claim rewards
- `POST /api/run/fail` - Mark a run as failed
- `GET /api/run/history/:address` - Get player's run history
- `GET /api/run/current/:address` - Get current run status
- `GET /api/run/leaderboard` - Get global leaderboard

### Dashboard
- `GET /api/dashboard/:address` - Get comprehensive player data
- `GET /api/dashboard/leaderboard/:type` - Get leaderboard by type
- `GET /api/dashboard/stats/global` - Get global game statistics
- `GET /api/dashboard/replays/recent` - Get recent replay data
- `GET /api/dashboard/replay/:runId` - Get specific replay

### DBP Price
- `GET /api/dbp-price/current` - Get current DBP token price
- `GET /api/dbp-price/history` - Get price history
- `GET /api/dbp-price/stats` - Get market statistics

### System
- `GET /health` - Health check endpoint
- `POST /api/broadcast` - WebSocket broadcast utility (testing)

## 🔌 WebSocket Channels

Connect to `ws://localhost:3001/socket` and subscribe to:

- `runs` - Game run events (start/complete/fail)
- `xp` - Player XP and stats updates
- `replay` - Live replay data streams
- `stats` - Global statistics updates
- `price` - DBP price updates
- `all` - All event types

### WebSocket Message Format
```javascript
// Subscribe to channels
ws.send(JSON.stringify({
  type: 'subscribe',
  channels: ['runs', 'xp', 'replay']
}));

// Incoming messages
{
  type: 'run_update',
  event: 'run_completed',
  data: {
    playerAddress: '0x...',
    cpEarned: 450,
    dbpMinted: 45,
    timestamp: '2025-07-09T12:34:56Z'
  }
}
```

## 🗄️ Database Schema

The backend uses Supabase PostgreSQL with these main tables:

- `run_logs` - All game run records
- `replays` - Game replay data (JSONB)
- `player_stats` - Aggregated player statistics
- `event_logs` - System event tracking

See `database_schema.sql` for complete schema.

## 🔧 Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Configure required variables
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
DBP_TOKEN_ADDRESS=0x...
BOOST_NFT_ADDRESS=0x...
HODL_MANAGER_ADDRESS=0x...
```

## 🚀 Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Start with environment variables
NODE_ENV=development PORT=3001 node index.js
```

## 🏗️ Smart Contract Integration

The backend integrates with three main contracts:

1. **DBPToken** - ERC-20 token balance queries
2. **BoostNFT** - ERC-1155 boost balance queries  
3. **HODLManager** - Game state and player statistics

Contract interactions are read-only from the backend. All state changes happen via frontend wallet transactions.

## 📊 Mock Data Mode

When Supabase is not configured, the backend runs in mock mode:
- Database operations log to console
- Contract calls may fail gracefully
- Price simulation still works
- WebSocket broadcasting functional

This allows development without full infrastructure setup.

## 🔒 Security Notes

- All database writes use Supabase RLS policies
- Rate limiting implemented (configurable)
- CORS configured for allowed origins
- Input validation with Joi schemas
- Helmet.js security headers

## 🧪 Testing

```bash
# Test health endpoint
curl http://localhost:3001/health

# Test WebSocket connection
wscat -c ws://localhost:3001/socket

# Test run creation (example)
curl -X POST http://localhost:3001/api/run/start \
  -H "Content-Type: application/json" \
  -d '{"playerAddress":"0x742d35Cc6634C0532925a3b8D5c3Ba4F8b0A87F6","seed":"0x1234..."}'
```

## 🎫 XPBadge NFT Minting

The backend automatically mints XPBadge NFTs when players complete runs, based on their XP earned.

### Badge Tiers
- **Participation Badge (ID: 0)**: 1-24 XP earned
- **Common Badge (ID: 1)**: 25-49 XP earned  
- **Rare Badge (ID: 2)**: 50-74 XP earned
- **Epic Badge (ID: 3)**: 75-99 XP earned
- **Legendary Badge (ID: 4)**: 100+ XP earned

### Configuration
Required environment variables:
```bash
XPBADGE_ADDRESS=0x...  # XPBadge contract address
XPBADGE_MINTER_PRIVATE_KEY=0x...  # Wallet with MINTER_ROLE
```

### Process Flow
1. **RunCompleted Event**: Triggered by HODLManager contract
2. **XP Calculation**: Using existing XP pipeline (`calculateXPReward`)
3. **Badge Tier**: Determined by XP amount earned
4. **Minting Queue**: Transactions processed sequentially to avoid nonce conflicts
5. **Database Update**: Supabase updated with tokenId and transaction hash
6. **Error Handling**: Failed mints logged but don't block run completion

### Database Integration
XPBadge information is stored in the `run_logs` table:
```sql
xp_badge_token_id INTEGER  -- Badge tier (0-4)
xp_badge_tx_hash VARCHAR(66)  -- Mint transaction hash
xp_badge_minted_at TIMESTAMPTZ  -- Mint timestamp
```

Analytics view available:
```sql
SELECT * FROM xp_badge_summary WHERE player_address = '0x...';
```

### Monitoring
- Real-time logging of minting attempts and results
- Gas estimation and price monitoring
- Transaction confirmation tracking (2 blocks)
- Queue status and processing metrics

## 📈 Performance

- Database queries optimized with indexes
- WebSocket broadcasting is non-blocking
- Contract calls cached where appropriate
- Graceful error handling for network issues

## 🚦 Status Monitoring

The `/health` endpoint provides:
- Server uptime
- WebSocket client count
- Environment information
- Database connection status

Ready for production deployment! 🎮⚡
