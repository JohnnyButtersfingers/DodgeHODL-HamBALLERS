# 🗄️ Supabase Setup Guide for HamBaller.xyz

## 🎯 Step 1: Create Your Supabase Project

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

## 🔑 Step 2: Get Your Project Credentials

Once your project is ready:

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (looks like: `https://your-project-id.supabase.co`)
   - **Project API Keys**:
     - `anon` `public` key
     - `service_role` `secret` key

## 📋 Step 3: Import Database Schema

1. Go to **SQL Editor** in your Supabase dashboard
2. Click **New Query**
3. Copy and paste the entire contents of `backend/database_schema.sql`
4. Click **Run** to execute the schema
5. Verify tables were created in **Table Editor**

## 🔐 Step 4: Enable Row Level Security (RLS)

Run these commands in **SQL Editor**:

\`\`\`sql
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
\`\`\`

## ⚙️ Step 5: Configure Backend Environment

Create `backend/.env.production`:

\`\`\`bash
# === Server Configuration ===
PORT=3001
HOST=0.0.0.0
NODE_ENV=production

# === CORS Origins ===
CORS_ORIGINS=https://your-frontend-domain.vercel.app,https://hamballer.xyz

# === Supabase Configuration ===
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_role_key_here

# === Blockchain Configuration ===
ABSTRACT_RPC_URL=https://api.testnet.abs.xyz
PRIVATE_KEY=your_wallet_private_key

# === Contract Addresses (Update after deployment) ===
DBP_TOKEN_ADDRESS=0x...
BOOST_NFT_ADDRESS=0x...
HODL_MANAGER_ADDRESS=0x...
\`\`\`

## 🧪 Step 6: Test Database Connection

Run this test script to verify everything works:

\`\`\`bash
cd backend
npm install
node test-db-connection.js
\`\`\`

## 🚀 Next Steps

After Supabase is configured:
1. ✅ Deploy backend to Railway/Render
2. ✅ Deploy frontend to Vercel
3. ✅ Run integration tests
4. ✅ Launch HamBaller.xyz!

---

## 📞 Need Help?

- Check Supabase logs in **Logs** → **API** 
- Verify RLS policies in **Authentication** → **Policies**
- Test queries in **SQL Editor**
