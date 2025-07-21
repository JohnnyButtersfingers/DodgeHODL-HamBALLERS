#!/bin/bash

echo "🔧 Updating Supabase Configuration..."

# Navigate to the correct directory
cd "$(dirname "$0")"

# Update backend .env file with Supabase credentials
echo "📝 Updating backend .env file with Supabase credentials..."

# Update Supabase URL
sed -i '' 's|SUPABASE_URL=https://your-project-id.supabase.co|SUPABASE_URL=https://your-supabase-instance.supabase.co|' backend/.env

# Update Supabase keys
sed -i '' 's/SUPABASE_ANON_KEY=your_anon_key_here/SUPABASE_ANON_KEY=your_supabase_public_api_key/' backend/.env
sed -i '' 's/SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here/SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key/' backend/.env

# Update main .env file
echo "📝 Updating main .env file with Supabase credentials..."
sed -i '' 's|SUPABASE_URL=https://your-project-id.supabase.co|SUPABASE_URL=https://your-supabase-instance.supabase.co|' .env
sed -i '' 's/SUPABASE_ANON_KEY=your_anon_key_here/SUPABASE_ANON_KEY=your_supabase_public_api_key/' .env
sed -i '' 's/SUPABASE_SERVICE_KEY=your_supabase_service_key_here/SUPABASE_SERVICE_KEY=your_supabase_service_role_key/' .env

echo "✅ Supabase configuration updated!"
echo ""
echo "📋 Next steps:"
echo "1. Replace 'your-supabase-instance' with your actual Supabase project URL"
echo "2. Replace 'your_supabase_public_api_key' with your actual public API key"
echo "3. Replace 'your_supabase_service_role_key' with your actual service role key"
echo "4. Restart the backend: cd backend && node index.js"
echo "5. Test the health endpoint: curl http://localhost:3001/health" 