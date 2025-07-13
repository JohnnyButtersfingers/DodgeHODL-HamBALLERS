#!/bin/bash
echo "🗄️ Supabase Setup Verification for HamBaller.xyz"
echo "================================================"

# Check if we're in the right directory
if [ ! -f "backend/package.json" ]; then
    echo "❌ Please run this from the project root directory"
    exit 1
fi

echo "📋 Checking backend environment files..."

# Check for required files
if [ ! -f "backend/.env.production" ]; then
    echo "❌ Missing backend/.env.production file"
    echo "💡 Create this file with your Supabase credentials"
else
    echo "✅ backend/.env.production exists"
fi

if [ ! -f "backend/test-db-connection.js" ]; then
    echo "❌ Missing test-db-connection.js"
else
    echo "✅ Database connection test script ready"
fi

if [ ! -f "backend/database_schema.sql" ]; then
    echo "❌ Missing database schema"
else
    echo "✅ Database schema ready for import"
fi

if [ ! -f "backend/setup-rls.sql" ]; then
    echo "❌ Missing RLS setup script"
else
    echo "✅ RLS policies ready for setup"
fi

echo ""
echo "📋 Supabase Setup Checklist:"
echo "==========================="
echo "1. [ ] Create Supabase project at https://supabase.com"
echo "2. [ ] Copy project URL and API keys from Settings → API"
echo "3. [ ] Import database_schema.sql in SQL Editor"
echo "4. [ ] Import setup-rls.sql in SQL Editor"
echo "5. [ ] Update backend/.env.production with your credentials"
echo "6. [ ] Run: cd backend && node test-db-connection.js"
echo ""
echo "🎯 Ready to test connection once Supabase is configured!"
