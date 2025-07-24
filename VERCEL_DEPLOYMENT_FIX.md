# Vercel Deployment Fix for Dodge Hodl Ham Ballers

## Issue Summary
The site https://dodge-hodl-ham-ballers.vercel.app is returning a 404: NOT_FOUND error.

## Root Cause
The project structure has the frontend in a subdirectory (`hamballer-game-starter/frontend/`), but Vercel was not properly configured to build from this location.

## Solution Implemented

### 1. Created `vercel.json` at the project root
```json
{
  "buildCommand": "cd hamballer-game-starter/frontend && npm install && npm run build",
  "outputDirectory": "hamballer-game-starter/frontend/dist",
  "installCommand": "cd hamballer-game-starter/frontend && npm install",
  "framework": null,
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 2. Verified Build Configuration
- **Root Directory**: `/` (keep as root)
- **Build Command**: `cd hamballer-game-starter/frontend && npm install && npm run build`
- **Output Directory**: `hamballer-game-starter/frontend/dist`
- **Install Command**: `cd hamballer-game-starter/frontend && npm install`

## Environment Variables Needed in Vercel

You need to add these environment variables in your Vercel project settings:

```bash
# Abstract Testnet Configuration
VITE_CHAIN_ID=11124
VITE_CHAIN_NAME=Abstract Testnet
VITE_RPC_URL=https://api.testnet.abs.xyz

# Contract Addresses (from deployment)
VITE_XPBADGE_ADDRESS=0xE960B46dffd9de6187Ff1B48B31B3F186A07303b
VITE_XPVERIFIER_ADDRESS=0x5e33911d9c793e5E9172D9e5C4354e21350403E3

# Optional: Backend API (if deployed)
VITE_API_URL=your_backend_url_here
VITE_WS_URL=your_backend_websocket_url_here

# Optional: WalletConnect Project ID
VITE_WALLETCONNECT_PROJECT_ID=your_project_id
```

## Steps to Deploy

1. **Push the changes** (Already done)
   - The `vercel.json` configuration has been committed and pushed to the branch

2. **Trigger Redeployment**
   - Go to your Vercel dashboard
   - Find the Dodge Hodl Ham Ballers project
   - Click on "Redeploy" or wait for automatic deployment from the git push

3. **Add Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add all the variables listed above
   - Make sure to use the correct contract addresses from the deployment

4. **Verify Deployment**
   - Check the deployment logs for any errors
   - Visit https://dodge-hodl-ham-ballers.vercel.app after deployment completes
   - The site should now load properly

## Troubleshooting

If the deployment still fails:

1. **Check Build Logs**
   - Look for any npm install or build errors
   - Verify all dependencies are being installed correctly

2. **Verify Output Directory**
   - The build creates files in `hamballer-game-starter/frontend/dist`
   - Make sure Vercel is serving from the correct directory

3. **Environment Variables**
   - Double-check all VITE_ prefixed variables are set
   - These are needed at build time for Vite

## Project Structure
```
/
├── vercel.json (new configuration file)
├── hamballer-game-starter/
│   ├── frontend/
│   │   ├── package.json
│   │   ├── vite.config.js
│   │   ├── index.html
│   │   ├── src/
│   │   └── dist/ (build output)
│   ├── contracts/
│   └── backend/
```

## Status
✅ Configuration file created and pushed
⏳ Waiting for Vercel to redeploy with new configuration
📝 Environment variables need to be added in Vercel dashboard