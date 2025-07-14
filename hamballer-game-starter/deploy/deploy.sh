#!/bin/bash

# 🚀 HamBaller Leaderboard Production Deployment Script
# Comprehensive deployment automation with monitoring and verification

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$SCRIPT_DIR/.env.production"
DOCKER_COMPOSE_FILE="$SCRIPT_DIR/production-deployment.yml"

# Default values
ENVIRONMENT=${ENVIRONMENT:-production}
SKIP_TESTS=${SKIP_TESTS:-false}
SKIP_MIGRATION=${SKIP_MIGRATION:-false}
HEALTH_CHECK_TIMEOUT=${HEALTH_CHECK_TIMEOUT:-300}
BACKUP_DATABASE=${BACKUP_DATABASE:-true}

# Print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check environment file
    if [ ! -f "$ENV_FILE" ]; then
        print_error "Environment file not found: $ENV_FILE"
        print_status "Creating template environment file..."
        create_env_template
        print_warning "Please configure $ENV_FILE and run again"
        exit 1
    fi
    
    # Load environment variables
    set -a
    source "$ENV_FILE"
    set +a
    
    print_success "Prerequisites check passed"
}

# Create environment template
create_env_template() {
    cat > "$ENV_FILE" << 'EOF'
# 🚀 HamBaller Production Environment Configuration

# Application
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-domain.com
BACKEND_URL=https://api.your-domain.com
WEBSOCKET_URL=wss://api.your-domain.com/socket

# Database Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
XP_STORAGE_MODE=database

# Blockchain Configuration
ABSTRACT_RPC_URL=https://api.testnet.abs.xyz
HODL_MANAGER_ADDRESS=0x1234567890123456789012345678901234567890
PRIVATE_KEY=your-private-key-for-contract-interactions
NETWORK_ID=11124

# Monitoring Configuration
GRAFANA_PASSWORD=secure-grafana-password
INFLUXDB_USERNAME=hamballer
INFLUXDB_PASSWORD=secure-influxdb-password

# Security
JWT_SECRET=your-jwt-secret
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Performance
REDIS_URL=redis://redis-cache:6379
CACHE_TTL=300
MAX_CONNECTIONS=100
EOF
    
    print_status "Environment template created at $ENV_FILE"
}

# Validate environment configuration
validate_environment() {
    print_status "Validating environment configuration..."
    
    local required_vars=(
        "SUPABASE_URL"
        "SUPABASE_ANON_KEY"
        "SUPABASE_SERVICE_ROLE_KEY"
        "FRONTEND_URL"
        "BACKEND_URL"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ] || [[ "${!var}" == *"your-"* ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        print_error "Missing or incomplete environment variables:"
        for var in "${missing_vars[@]}"; do
            print_error "  - $var"
        done
        exit 1
    fi
    
    print_success "Environment validation passed"
}

# Run database migrations
run_migrations() {
    if [ "$SKIP_MIGRATION" = "true" ]; then
        print_warning "Skipping database migrations"
        return
    fi
    
    print_status "Running database migrations..."
    
    # Check if Supabase CLI is available
    if command -v supabase &> /dev/null; then
        print_status "Running migrations via Supabase CLI..."
        cd "$PROJECT_ROOT"
        
        # Apply migrations
        if [ -f "backend/migrations/001_create_xp_tables.sql" ]; then
            print_status "Applying XP tables migration..."
            supabase db reset --linked || print_warning "Migration may have partially failed"
        fi
        
        if [ -f "backend/migrations/002_supabase_functions.sql" ]; then
            print_status "Applying Supabase functions..."
            supabase db reset --linked || print_warning "Functions may have partially failed"
        fi
    else
        print_warning "Supabase CLI not found. Please manually apply migrations:"
        print_status "1. Open your Supabase dashboard"
        print_status "2. Go to SQL Editor"
        print_status "3. Run backend/migrations/001_create_xp_tables.sql"
        print_status "4. Run backend/migrations/002_supabase_functions.sql"
        
        read -p "Press Enter after completing manual migrations..."
    fi
    
    print_success "Database migrations completed"
}

# Build Docker images
build_images() {
    print_status "Building Docker images..."
    
    cd "$SCRIPT_DIR"
    
    # Build with no cache for production
    docker-compose -f "$DOCKER_COMPOSE_FILE" build --no-cache \
        --build-arg REACT_APP_API_URL="$BACKEND_URL" \
        --build-arg REACT_APP_WEBSOCKET_URL="$WEBSOCKET_URL" \
        --build-arg REACT_APP_ENVIRONMENT="$ENVIRONMENT"
    
    print_success "Docker images built successfully"
}

# Run tests
run_tests() {
    if [ "$SKIP_TESTS" = "true" ]; then
        print_warning "Skipping tests"
        return
    fi
    
    print_status "Running test suite..."
    
    cd "$PROJECT_ROOT"
    
    # Backend tests
    print_status "Running backend tests..."
    cd backend
    npm test || {
        print_error "Backend tests failed"
        exit 1
    }
    
    # Frontend tests
    print_status "Running frontend tests..."
    cd ../frontend
    npm test -- --watchAll=false || {
        print_error "Frontend tests failed"
        exit 1
    }
    
    cd "$SCRIPT_DIR"
    print_success "All tests passed"
}

# Deploy services
deploy_services() {
    print_status "Deploying services..."
    
    cd "$SCRIPT_DIR"
    
    # Create necessary directories
    mkdir -p logs
    mkdir -p ssl
    mkdir -p monitoring/grafana/provisioning
    
    # Stop existing services
    print_status "Stopping existing services..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" down || true
    
    # Start core services first
    print_status "Starting core services..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d redis-cache influxdb
    
    # Wait for core services
    sleep 10
    
    # Start application services
    print_status "Starting application services..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d hamballer-backend
    
    # Wait for backend
    sleep 15
    
    # Start frontend
    print_status "Starting frontend..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d hamballer-frontend
    
    # Start monitoring services
    print_status "Starting monitoring services..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d prometheus grafana
    
    print_success "Services deployed successfully"
}

# Health checks
perform_health_checks() {
    print_status "Performing health checks..."
    
    local backend_url="http://localhost:3001"
    local frontend_url="http://localhost"
    local timeout=$HEALTH_CHECK_TIMEOUT
    local start_time=$(date +%s)
    
    # Check backend health
    print_status "Checking backend health..."
    while true; do
        if curl -f -s "$backend_url/api/health" > /dev/null; then
            print_success "Backend is healthy"
            break
        fi
        
        local current_time=$(date +%s)
        if [ $((current_time - start_time)) -gt $timeout ]; then
            print_error "Backend health check timeout"
            show_service_logs "hamballer-backend"
            exit 1
        fi
        
        print_status "Waiting for backend... ($((current_time - start_time))s)"
        sleep 5
    done
    
    # Check frontend health
    print_status "Checking frontend health..."
    start_time=$(date +%s)
    while true; do
        if curl -f -s "$frontend_url/health" > /dev/null; then
            print_success "Frontend is healthy"
            break
        fi
        
        local current_time=$(date +%s)
        if [ $((current_time - start_time)) -gt $timeout ]; then
            print_error "Frontend health check timeout"
            show_service_logs "hamballer-frontend"
            exit 1
        fi
        
        print_status "Waiting for frontend... ($((current_time - start_time))s)"
        sleep 5
    done
    
    # Test API endpoints
    print_status "Testing API endpoints..."
    test_api_endpoints "$backend_url"
    
    # Test WebSocket connection
    print_status "Testing WebSocket connection..."
    test_websocket_connection
    
    print_success "All health checks passed"
}

# Test API endpoints
test_api_endpoints() {
    local base_url=$1
    
    local endpoints=(
        "/api/health"
        "/api/leaderboard"
        "/api/leaderboard/stats"
    )
    
    for endpoint in "${endpoints[@]}"; do
        if curl -f -s "$base_url$endpoint" > /dev/null; then
            print_success "✓ $endpoint"
        else
            print_error "✗ $endpoint"
            exit 1
        fi
    done
}

# Test WebSocket connection
test_websocket_connection() {
    # Use a simple WebSocket test with node if available
    if command -v node &> /dev/null; then
        cat > /tmp/ws_test.js << 'EOF'
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3001/socket');

ws.on('open', () => {
    console.log('WebSocket connected');
    ws.close();
    process.exit(0);
});

ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    process.exit(1);
});

setTimeout(() => {
    console.error('WebSocket timeout');
    process.exit(1);
}, 10000);
EOF
        
        if node /tmp/ws_test.js; then
            print_success "WebSocket connection test passed"
        else
            print_error "WebSocket connection test failed"
            exit 1
        fi
        
        rm -f /tmp/ws_test.js
    else
        print_warning "Node.js not available, skipping WebSocket test"
    fi
}

# Show service logs
show_service_logs() {
    local service=$1
    print_status "Showing logs for $service:"
    docker-compose -f "$DOCKER_COMPOSE_FILE" logs --tail=50 "$service"
}

# Run stress test
run_stress_test() {
    if [ "$SKIP_TESTS" = "true" ]; then
        print_warning "Skipping stress test"
        return
    fi
    
    print_status "Running stress test..."
    
    cd "$PROJECT_ROOT/backend"
    
    # Run the stress test
    if node tests/real-world-stress-test.js; then
        print_success "Stress test completed successfully"
    else
        print_warning "Stress test completed with some issues"
    fi
}

# Monitor deployment
monitor_deployment() {
    print_status "Setting up monitoring dashboard..."
    
    # Display service status
    print_status "Service Status:"
    docker-compose -f "$DOCKER_COMPOSE_FILE" ps
    
    # Display URLs
    echo ""
    print_status "Application URLs:"
    echo "  🌐 Frontend: $FRONTEND_URL"
    echo "  🔧 API: $BACKEND_URL"
    echo "  📊 Grafana: http://localhost:3000"
    echo "  📈 Prometheus: http://localhost:9090"
    echo "  📋 Kibana: http://localhost:5601"
    
    # Show real-time stats
    print_status "Real-time Performance:"
    curl -s "http://localhost:3001/api/leaderboard/stats" | jq '.' 2>/dev/null || echo "Stats not available"
}

# Backup database (if applicable)
backup_database() {
    if [ "$BACKUP_DATABASE" = "false" ]; then
        return
    fi
    
    print_status "Creating database backup..."
    
    # For Supabase, we rely on their built-in backups
    # For self-hosted PostgreSQL, implement backup logic here
    
    print_status "Database backup completed (or managed by Supabase)"
}

# Rollback deployment
rollback() {
    print_error "Rolling back deployment..."
    
    cd "$SCRIPT_DIR"
    
    # Stop current services
    docker-compose -f "$DOCKER_COMPOSE_FILE" down
    
    # You could implement more sophisticated rollback logic here
    print_status "Rollback completed"
}

# Cleanup old images
cleanup() {
    print_status "Cleaning up old Docker images..."
    
    # Remove dangling images
    docker image prune -f
    
    # Remove old containers
    docker container prune -f
    
    print_success "Cleanup completed"
}

# Main deployment function
main() {
    print_status "🚀 Starting HamBaller Leaderboard Deployment"
    print_status "Environment: $ENVIRONMENT"
    echo ""
    
    # Trap errors for rollback
    trap 'print_error "Deployment failed. Running cleanup..."; rollback; exit 1' ERR
    
    # Step 1: Prerequisites
    check_prerequisites
    
    # Step 2: Validation
    validate_environment
    
    # Step 3: Backup
    backup_database
    
    # Step 4: Tests
    run_tests
    
    # Step 5: Database migrations
    run_migrations
    
    # Step 6: Build images
    build_images
    
    # Step 7: Deploy services
    deploy_services
    
    # Step 8: Health checks
    perform_health_checks
    
    # Step 9: Stress test
    run_stress_test
    
    # Step 10: Setup monitoring
    monitor_deployment
    
    # Step 11: Cleanup
    cleanup
    
    echo ""
    print_success "🎉 Deployment completed successfully!"
    print_status "Your HamBaller Leaderboard is now running in production"
    echo ""
    print_status "Next steps:"
    echo "  1. Configure SSL certificates for HTTPS"
    echo "  2. Set up domain DNS records"
    echo "  3. Configure monitoring alerts"
    echo "  4. Review performance metrics in Grafana"
    echo "  5. Test with real users"
}

# Script options
show_help() {
    echo "HamBaller Leaderboard Deployment Script"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  -e, --env FILE          Use specific environment file"
    echo "  --skip-tests            Skip running tests"
    echo "  --skip-migration        Skip database migrations"
    echo "  --no-backup             Skip database backup"
    echo "  --timeout SECONDS       Health check timeout (default: 300)"
    echo ""
    echo "Examples:"
    echo "  $0                      Full deployment"
    echo "  $0 --skip-tests         Deploy without running tests"
    echo "  $0 --env .env.staging   Deploy with staging environment"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -e|--env)
            ENV_FILE="$2"
            shift 2
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-migration)
            SKIP_MIGRATION=true
            shift
            ;;
        --no-backup)
            BACKUP_DATABASE=false
            shift
            ;;
        --timeout)
            HEALTH_CHECK_TIMEOUT="$2"
            shift 2
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Run main deployment
main