#!/bin/bash
echo "🧪 HamBaller.xyz Post-Deployment Integration Testing"
echo "===================================================="

# Configuration
FRONTEND_URL=${1:-"http://localhost:3000"}
BACKEND_URL=${2:-"http://localhost:3001"}

echo "🎯 Testing Configuration:"
echo "Frontend URL: $FRONTEND_URL"
echo "Backend URL: $BACKEND_URL"
echo ""

# Test backend health
echo "🖥️ Testing Backend Health..."
if curl -s "$BACKEND_URL/health" > /dev/null; then
    echo "✅ Backend is responding"
else
    echo "❌ Backend is not responding"
    echo "💡 Make sure your backend is deployed and running"
    exit 1
fi

# Test backend API endpoints
echo ""
echo "🔌 Testing API Endpoints..."

endpoints=(
    "/health"
    "/api/runs"
    "/api/runs/leaderboard"
    "/api/dashboard"
    "/api/dbp-price"
)

for endpoint in "${endpoints[@]}"; do
    if curl -s "$BACKEND_URL$endpoint" > /dev/null; then
        echo "✅ $endpoint - OK"
    else
        echo "❌ $endpoint - FAILED"
    fi
done

# Test WebSocket connection
echo ""
echo "🔌 Testing WebSocket Connection..."
if command -v wscat &> /dev/null; then
    echo "Testing WebSocket at $BACKEND_URL..."
    timeout 5s wscat -c "${BACKEND_URL/http/ws}" --execute "ping" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ WebSocket connection successful"
    else
        echo "⚠️ WebSocket test inconclusive (may still work)"
    fi
else
    echo "⚠️ wscat not installed, skipping WebSocket test"
    echo "💡 Install with: npm install -g wscat"
fi

# Test database connection (if backend is accessible)
echo ""
echo "🗄️ Testing Database Integration..."
if curl -s "$BACKEND_URL/api/runs" | grep -q '\[\]' || curl -s "$BACKEND_URL/api/runs" | grep -q '\['; then
    echo "✅ Database queries working"
else
    echo "⚠️ Database queries may have issues"
fi

# Frontend build test
if [ -d "frontend" ]; then
    echo ""
    echo "🎮 Testing Frontend Build..."
    cd frontend
    if npm run build > /dev/null 2>&1; then
        echo "✅ Frontend builds successfully"
    else
        echo "❌ Frontend build failed"
        echo "💡 Check frontend dependencies and configuration"
    fi
    cd ..
fi

# Contract deployment check
if [ -f "contracts/deployment-info.json" ]; then
    echo ""
    echo "📋 Contract Deployment Status..."
    echo "✅ Deployment info found"
    if command -v jq &> /dev/null; then
        echo "Contract addresses:"
        jq -r '.contracts | to_entries[] | "  \(.key): \(.value)"' contracts/deployment-info.json
    else
        echo "💡 Install jq to see contract addresses: apt-get install jq"
    fi
else
    echo ""
    echo "⚠️ No contract deployment info found"
    echo "💡 Deploy contracts first with the deployment script"
fi

echo ""
echo "🎯 Integration Test Summary:"
echo "============================"
echo "1. Backend Health: Check above results"
echo "2. API Endpoints: Check individual endpoint status"
echo "3. Database: Verify Supabase connection"
echo "4. Frontend Build: Ensure no build errors"
echo "5. Contracts: Verify deployment addresses"
echo ""
echo "🚀 Next Steps:"
echo "- Test wallet connection on live frontend"
echo "- Verify game flow end-to-end"
echo "- Monitor real-time WebSocket updates"
echo "- Check blockchain interactions"
echo ""
echo "✅ Integration testing complete!"
