# Railway Deployment Guide

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **Supabase Project**: Create a Supabase project and get credentials

## Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository: `JohnnyButtersfingers/DodgeHODL-HamBALLERS`
5. Select the `hamballer-game-starter/backend` directory as the source

## Step 2: Configure Environment Variables

In your Railway project dashboard, go to the "Variables" tab and add:

```bash
# Server Configuration
PORT=3001
HOST=0.0.0.0
NODE_ENV=production

# CORS Origins (add your frontend URL)
CORS_ORIGINS=https://your-app.vercel.app,http://localhost:5173

# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Blockchain Configuration
ABSTRACT_RPC_URL=https://api.testnet.abs.xyz
ABSTRACT_TESTNET_CHAIN_ID=11124
NETWORK=abstract

# Contract Addresses
DBP_TOKEN_ADDRESS=0xabcdef1234567890abcdef1234567890abcdef12
BOOST_NFT_ADDRESS=
HODL_MANAGER_ADDRESS=0x1234567890123456789012345678901234567890
XPBADGE_ADDRESS=0xE960B46dffd9de6187Ff1B48B31B3F186A07303b
XPVERIFIER_ADDRESS=0x5e33911d9c793e5E9172D9e5C4354e21350403E3

# XP Badge Minting Configuration
XPBADGE_MINTER_PRIVATE_KEY=0xbf763b5ab27e7e71b639f8452000d88ffeea1844dff66d5acd780de5b0a09c00
XPBADGE_MINTER_ADDRESS=0x10a36b1C6b960FF36c4DED3f57159C9ea6fb65CD

# Production Settings
LOG_LEVEL=info
ENABLE_MOCK_DB=false

# Additional Configuration
SUBABASE_URL=${SUPABASE_URL}
SUBABASE_KEY=${SUPABASE_ANON_KEY}
RPC_URL=${ABSTRACT_RPC_URL}
THIRDWEB_CLIENT_ID=bc234f34695e0631abfea4e2ae1823ee
```

## Step 3: Deploy

1. Railway will automatically detect the Node.js project
2. It will install dependencies and start the server
3. The deployment URL will be shown in the dashboard

## Step 4: Update Frontend Configuration

Once deployed, update your frontend environment variables:

```bash
# In hamballer-game-starter/frontend/.env
VITE_API_URL=https://your-railway-app.railway.app
VITE_WS_URL=wss://your-railway-app.railway.app
```

## Step 5: Test Deployment

1. Check the health endpoint: `https://your-railway-app.railway.app/api/health`
2. Test API endpoints: `https://your-railway-app.railway.app/api/badges`
3. Verify WebSocket connections work

## Troubleshooting

### Common Issues:

1. **Port Issues**: Make sure `PORT` is set to `3001` and `HOST` to `0.0.0.0`
2. **CORS Errors**: Add your frontend domain to `CORS_ORIGINS`
3. **Database Connection**: Ensure Supabase credentials are correct
4. **Build Failures**: Check the Railway logs for dependency issues

### Logs and Monitoring:

- View logs in the Railway dashboard
- Set up alerts for deployment failures
- Monitor API response times

## Alternative: Render Deployment

If you prefer Render:

1. Go to [render.com](https://render.com)
2. Create a new Web Service
3. Connect your GitHub repository
4. Set the root directory to `hamballer-game-starter/backend`
5. Use the same environment variables as above
6. Set build command: `npm install`
7. Set start command: `npm start` 