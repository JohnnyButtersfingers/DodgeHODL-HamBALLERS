#!/bin/bash
echo "📊 HamBaller.xyz Deployment Status Dashboard"
echo "============================================"

# Colors for status
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check status
check_status() {
    if [ "$1" = "true" ]; then
        echo -e "${GREEN}✅ COMPLETE${NC}"
    elif [ "$1" = "progress" ]; then
        echo -e "${YELLOW}🔄 IN PROGRESS${NC}"
    else
        echo -e "${RED}❌ PENDING${NC}"
    fi
}

echo "🎯 DEPLOYMENT PIPELINE STATUS"
echo "============================="

# Check contracts
echo -n "📋 Smart Contracts: "
if [ -f "contracts/deployment-info.json" ]; then
    check_status "true"
else
    check_status "false"
fi

# Check Supabase
echo -n "🗄️ Supabase Database: "
if [ -f "backend/.env.production" ] && grep -q "supabase" backend/.env.production; then
    if [ -f "backend/test-db-connection.js" ]; then
        check_status "progress"
        echo "   💡 Run: cd backend && node test-db-connection.js"
    else
        check_status "false"
    fi
else
    check_status "false"
    echo "   💡 Configure backend/.env.production with Supabase credentials"
fi

# Check backend deployment
echo -n "🖥️ Backend API: "
if curl -s "http://localhost:3001/health" > /dev/null 2>&1; then
    check_status "true"
    echo "   🌐 Running locally - deploy to Railway/Render for production"
elif [ -f "backend/Dockerfile" ]; then
    check_status "progress"
    echo "   💡 Ready for deployment - run ./deploy-backend.sh"
else
    check_status "false"
fi

# Check frontend deployment
echo -n "🎮 Frontend App: "
if [ -d "frontend/dist" ] || [ -d "frontend/build" ]; then
    check_status "progress"
    echo "   💡 Built locally - deploy to Vercel with ./deploy-frontend.sh"
elif [ -f "frontend/package.json" ]; then
    check_status "progress"
    echo "   💡 Ready for build and deployment"
else
    check_status "false"
fi

# Check integration
echo -n "🧪 Integration Tests: "
if [ -x "test-deployment.sh" ]; then
    check_status "progress"
    echo "   💡 Run: ./test-deployment.sh [frontend_url] [backend_url]"
else
    check_status "false"
fi

echo ""
echo "🚀 QUICK DEPLOYMENT COMMANDS"
echo "============================"
echo "1. Verify Supabase:    ./verify-supabase.sh"
echo "2. Deploy Backend:     ./deploy-backend.sh"
echo "3. Deploy Frontend:    ./deploy-frontend.sh"
echo "4. Test Integration:   ./test-deployment.sh"
echo "5. Full Integration:   ./test-integration.sh"
echo ""

# Show next action
echo "🎯 NEXT ACTION NEEDED:"
if [ ! -f "contracts/deployment-info.json" ]; then
    echo "   📋 Deploy smart contracts to Abstract testnet"
    echo "   Command: cd contracts && npx hardhat run scripts/deploy_production.js --network abstract"
elif [ ! -f "backend/.env.production" ] || ! grep -q "supabase" backend/.env.production; then
    echo "   🗄️ Configure Supabase in backend/.env.production"
    echo "   Guide: Open SUPABASE_SETUP.md"
else
    echo "   🖥️ Deploy backend API to Railway/Render"
    echo "   Command: ./deploy-backend.sh"
fi

echo ""
echo "📈 PROGRESS: $(( $(find . -name "*.json" -o -name "*.js" -o -name "*.sql" | wc -l) ))+ files ready for deployment!"
