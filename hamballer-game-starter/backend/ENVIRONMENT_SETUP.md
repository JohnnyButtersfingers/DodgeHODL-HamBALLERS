# 🔧 HamBaller.xyz Environment Setup Guide

This guide will help you configure all the necessary environment variables for the HamBaller.xyz backend to work properly with Supabase, blockchain contracts, and Web3 functionality.

## 📋 Prerequisites

Before starting, make sure you have:
- Node.js 18+ installed
- npm or pnpm package manager
- A Supabase account (free tier works)
- Access to Abstract testnet or your preferred blockchain network

## 🗄️ Step 1: Supabase Setup

### 1.1 Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project" and sign in
3. Click "New Project"
4. Choose your organization
5. Fill in project details:
   - **Name**: `hamballer-xyz`
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your users
6. Click "Create new project"
7. Wait for setup to complete (1-2 minutes)

### 1.2 Get Supabase Credentials

Once your project is ready:

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (looks like: `https://your-project-id.supabase.co`)
   - **Project API Keys**:
     - `anon` `public` key
     - `service_role` `secret` key

### 1.3 Import Database Schema

1. Go to **SQL Editor** in your Supabase dashboard
2. Click **New Query**
3. Copy and paste the entire contents of `backend/database_schema.sql`
4. Click **Run** to execute the schema
5. Verify tables were created in **Table Editor**

### 1.4 Enable Row Level Security (RLS)

Run these commands in **SQL Editor**:

```sql
-- Enable RLS on all tables
ALTER TABLE run_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE replays ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_logs ENABLE ROW LEVEL SECURITY;

-- Allow public read access for leaderboards and stats
CREATE POLICY "Public read access for run_logs" ON run_logs FOR SELECT USING (true);
CREATE POLICY "Public read access for replays" ON replays FOR SELECT USING (true);
CREATE POLICY "Public read access for player_stats" ON player_stats FOR SELECT USING (true);

-- Allow service role full access
CREATE POLICY "Service role full access to run_logs" ON run_logs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to replays" ON replays FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to player_stats" ON player_stats FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to event_logs" ON event_logs FOR ALL USING (auth.role() = 'service_role');
```

## ⛓️ Step 2: Blockchain Setup

### 2.1 Get RPC URL

For Abstract testnet:
- **RPC URL**: `https://api.testnet.abs.xyz`

For other networks, get the appropriate RPC URL from your network provider.

### 2.2 Deploy Smart Contracts

1. Navigate to the contracts directory:
   ```bash
   cd ../contracts
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Deploy contracts:
   ```bash
   npm run deploy:production
   ```

4. Copy the deployed contract addresses from the output.

## 🔧 Step 3: Environment Configuration

### 3.1 Update .env File

Edit `backend/.env` and replace the placeholder values:

```bash
# === Server Configuration ===
PORT=3001
HOST=0.0.0.0
NODE_ENV=development

# === CORS Origins ===
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# === Supabase Configuration ===
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_role_key_here

# === Blockchain Configuration ===
ABSTRACT_RPC_URL=https://api.testnet.abs.xyz

# === Contract Addresses (Update after deployment) ===
DBP_TOKEN_ADDRESS=0x... # From contract deployment
BOOST_NFT_ADDRESS=0x... # From contract deployment
HODL_MANAGER_ADDRESS=0x... # From contract deployment

# === Development Settings ===
LOG_LEVEL=debug
ENABLE_MOCK_DB=false

# === Additional Configuration ===
# For Cursor AI and other integrations
SUBABASE_URL=${SUPABASE_URL}
SUBABASE_KEY=${SUPABASE_ANON_KEY}
RPC_URL=${ABSTRACT_RPC_URL}
```

### 3.2 Environment Variable Reference

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `SUPABASE_URL` | Your Supabase project URL | Yes | `https://abc123.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | Yes | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | Yes | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `ABSTRACT_RPC_URL` | Blockchain RPC endpoint | Yes | `https://api.testnet.abs.xyz` |
| `DBP_TOKEN_ADDRESS` | Deployed DBP token contract | Yes | `0x1234567890abcdef...` |
| `BOOST_NFT_ADDRESS` | Deployed Boost NFT contract | Yes | `0xabcdef1234567890...` |
| `HODL_MANAGER_ADDRESS` | Deployed HODL Manager contract | Yes | `0x7890abcdef123456...` |

## 🧪 Step 4: Testing Configuration

### 4.1 Run Setup Script

```bash
cd backend
node setup-supabase.js
```

This script will:
- Check if your .env file exists
- Validate Supabase credentials
- Test database connection
- Verify database schema
- Test database operations

### 4.2 Start Backend Server

```bash
npm run dev
```

You should see output like:
```
🚀 HamBaller.xyz Backend Server Started
📡 HTTP API: http://0.0.0.0:3001
🔌 WebSocket: ws://0.0.0.0:3001/socket
🎮 Environment: development
⚡ WebSocket clients: 0

🔧 HamBaller.xyz Configuration Status
=====================================

📡 Server:
   Port: 3001
   Host: 0.0.0.0
   Environment: development

🗄️ Supabase:
   Configured: ✅
   URL: Set
   Key: ✅

⛓️ Blockchain:
   Configured: ✅
   RPC URL: https://api.testnet.abs.xyz

📜 Contracts:
   Configured: ✅
   DBP Token: Set
   Boost NFT: Set
   HODL Manager: Set

🎧 Starting RunCompleted event listener...
✅ RunCompleted listener active
```

### 4.3 Test Health Check

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "environment": "development",
  "uptime": 123.456,
  "configuration": {
    "supabase": true,
    "blockchain": true,
    "contracts": true
  },
  "websocket": {
    "clients": 0,
    "server": "running"
  }
}
```

### 4.4 Test Configuration Status

```bash
curl http://localhost:3001/api/config/status
```

## 🔍 Step 5: Troubleshooting

### Common Issues

#### Supabase Connection Failed
- Verify your Supabase URL and keys are correct
- Check if your database schema is imported
- Ensure RLS policies are configured

#### Contract Connection Failed
- Verify contract addresses are correct
- Check if contracts are deployed to the correct network
- Ensure RPC URL is accessible

#### WebSocket Not Working
- Check if the backend is running on the correct port
- Verify CORS settings allow your frontend domain
- Check browser console for connection errors

### Debug Mode

Enable debug logging by setting:
```bash
LOG_LEVEL=debug
```

### Mock Mode

For development without real contracts or database:
```bash
ENABLE_MOCK_DB=true
```

## 🚀 Step 6: Production Deployment

For production deployment:

1. Update environment variables for production:
   ```bash
   NODE_ENV=production
   CORS_ORIGINS=https://your-domain.com
   ```

2. Set up environment variables in your hosting platform (Railway, Render, etc.)

3. Deploy the backend

4. Update frontend environment variables to point to your production backend

## 📞 Support

If you encounter issues:

1. Check the backend logs for error messages
2. Verify all environment variables are set correctly
3. Test each component individually using the setup script
4. Check the troubleshooting section above

For additional help, refer to:
- [Supabase Documentation](https://supabase.com/docs)
- [Abstract Documentation](https://docs.abs.xyz)
- [HamBaller.xyz Documentation](./README.md) 