#!/bin/bash

# HamBaller.xyz Integration Testing Script
# Tests the complete MVP flow end-to-end

set -e

echo "🧪 HamBaller.xyz Integration Testing"
echo "===================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_test() {
    echo -e "${BLUE}🧪 Testing: $1${NC}"
}

print_pass() {
    echo -e "${GREEN}✅ PASS: $1${NC}"
}

print_fail() {
    echo -e "${RED}❌ FAIL: $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️ $1${NC}"
}

# Test configuration
FRONTEND_URL="http://localhost:5173"
BACKEND_URL="http://localhost:3001"

print_test "Backend Health Check"
if curl -f "$BACKEND_URL/health" >/dev/null 2>&1; then
    print_pass "Backend is responding"
else
    print_fail "Backend is not responding at $BACKEND_URL"
    echo "Please start the backend with: cd backend && npm run dev"
    exit 1
fi

print_test "Frontend Build Check"
cd frontend
if npm run build >/dev/null 2>&1; then
    print_pass "Frontend builds successfully"
else
    print_fail "Frontend build failed"
    exit 1
fi
cd ..

print_test "Contract Compilation"
cd contracts
if npm run compile >/dev/null 2>&1; then
    print_pass "Contracts compile successfully"
else
    print_fail "Contract compilation failed"
    exit 1
fi
cd ..

print_test "API Endpoints"

# Test dashboard endpoint
if curl -f "$BACKEND_URL/api/dashboard/stats/0x1234567890123456789012345678901234567890" >/dev/null 2>&1; then
    print_pass "Dashboard endpoint responding"
else
    print_fail "Dashboard endpoint not responding"
fi

# Test DBP price endpoint
if curl -f "$BACKEND_URL/api/dbp-price" >/dev/null 2>&1; then
    print_pass "DBP price endpoint responding"
else
    print_fail "DBP price endpoint not responding"
fi

# Test run endpoint (should return 400 for invalid data, but still responding)
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BACKEND_URL/api/run/start" -H "Content-Type: application/json" -d '{}')
if [ "$HTTP_CODE" -eq 400 ]; then
    print_pass "Run endpoint responding (expected 400 for invalid data)"
else
    print_info "Run endpoint returned code: $HTTP_CODE"
fi

print_test "WebSocket Connection"
# Note: This is a basic test. In production, you'd want more sophisticated WebSocket testing
if command -v wscat >/dev/null 2>&1; then
    if timeout 5 wscat -c "ws://localhost:3001" >/dev/null 2>&1; then
        print_pass "WebSocket connection successful"
    else
        print_fail "WebSocket connection failed"
    fi
else
    print_info "wscat not installed, skipping WebSocket test"
    print_info "Install with: npm install -g wscat"
fi

print_test "Environment Configuration"

# Check frontend env
if [ -f "frontend/.env" ] || [ -f "frontend/.env.local" ]; then
    print_pass "Frontend environment file exists"
else
    print_info "No frontend .env file found (using defaults)"
fi

# Check backend env
if [ -f "backend/.env" ]; then
    print_pass "Backend environment file exists"
else
    print_info "No backend .env file found (using defaults)"
fi

# Check contract env
if [ -f "contracts/.env" ]; then
    print_pass "Contracts environment file exists"
else
    print_info "No contracts .env file found"
fi

echo ""
echo "🎯 Manual Testing Checklist:"
echo "=============================="
echo ""
echo "Frontend Tests (http://localhost:5173):"
echo "□ Page loads without errors"
echo "□ Wallet connect button appears"
echo "□ Game interface renders correctly"
echo "□ Navigation works between pages"
echo "□ Dashboard shows placeholder data"
echo "□ Leaderboard displays mock rankings"
echo "□ Replay viewer interface loads"
echo ""
echo "Integration Tests:"
echo "□ Wallet connects to Abstract testnet"
echo "□ Move selection works (10 moves)"
echo "□ Start run communicates with backend"
echo "□ HODL/CLIMB decision interface appears"
echo "□ XP updates in real-time"
echo "□ Stats overlay shows data"
echo "□ Price ticker updates"
echo "□ WebSocket connection indicator shows 'Live'"
echo ""
echo "Contract Tests (if deployed):"
echo "□ DBP token balance queries work"
echo "□ Boost NFT balance checks function"
echo "□ HODL Manager contract interactions"
echo "□ Transaction confirmations"
echo ""

echo "🚀 Integration test completed!"
echo ""
echo "Next steps:"
echo "1. Run manual tests above"
echo "2. Deploy contracts with: cd contracts && npm run deploy:production"
echo "3. Deploy backend to Railway/Render"
echo "4. Deploy frontend to Vercel"
echo "5. Run end-to-end tests with live deployments"
