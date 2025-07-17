#!/usr/bin/env node

/**
 * HamBaller.xyz Supabase Setup Script
 * 
 * This script helps configure Supabase credentials and test the database connection.
 * Run this script after creating your Supabase project to verify everything is working.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n${step}. ${message}`, 'blue');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️ ${message}`, 'yellow');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

async function checkEnvironment() {
  logStep(1, 'Checking environment configuration...');
  
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    logError('No .env file found in backend directory');
    log('Creating .env file with template...', 'yellow');
    
    const envTemplate = `# === Server Configuration ===
PORT=3001
HOST=0.0.0.0
NODE_ENV=development

# === CORS Origins ===
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# === Supabase Configuration ===
# Replace these with your actual Supabase credentials
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_role_key_here

# === Blockchain Configuration ===
ABSTRACT_RPC_URL=https://api.testnet.abs.xyz

# === Contract Addresses (Update after deployment) ===
# These will be populated after contract deployment
DBP_TOKEN_ADDRESS=
BOOST_NFT_ADDRESS=
HODL_MANAGER_ADDRESS=

# === Development Settings ===
LOG_LEVEL=debug
ENABLE_MOCK_DB=true
`;
    
    fs.writeFileSync(envPath, envTemplate);
    logSuccess('Created .env file with template');
    logWarning('Please update the Supabase credentials in .env file');
    return false;
  }
  
  logSuccess('Environment file exists');
  return true;
}

async function checkSupabaseCredentials() {
  logStep(2, 'Checking Supabase credentials...');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    logError('Missing Supabase credentials in .env file');
    log('Please add your Supabase URL and anon key to the .env file', 'yellow');
    return false;
  }
  
  if (supabaseUrl.includes('your-project-id') || supabaseKey.includes('your_anon_key')) {
    logWarning('Supabase credentials are placeholder values');
    log('Please update your .env file with actual Supabase credentials', 'yellow');
    return false;
  }
  
  logSuccess('Supabase credentials found');
  return true;
}

async function testSupabaseConnection() {
  logStep(3, 'Testing Supabase connection...');
  
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    // Test basic connection
    const { data, error } = await supabase
      .from('run_logs')
      .select('count')
      .limit(1);
    
    if (error) {
      if (error.code === 'PGRST116') {
        logWarning('Database connected but tables may not exist');
        log('Please import the database schema from database_schema.sql', 'yellow');
        return false;
      } else {
        logError(`Connection failed: ${error.message}`);
        return false;
      }
    }
    
    logSuccess('Supabase connection successful');
    return true;
    
  } catch (error) {
    logError(`Connection error: ${error.message}`);
    return false;
  }
}

async function checkDatabaseSchema() {
  logStep(4, 'Checking database schema...');
  
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    // Check if required tables exist
    const tables = ['run_logs', 'replays', 'player_stats', 'event_logs'];
    const missingTables = [];
    
    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('count')
          .limit(1);
        
        if (error && error.code === 'PGRST116') {
          missingTables.push(table);
        }
      } catch (error) {
        missingTables.push(table);
      }
    }
    
    if (missingTables.length > 0) {
      logWarning(`Missing tables: ${missingTables.join(', ')}`);
      log('Please import the database schema from database_schema.sql', 'yellow');
      return false;
    }
    
    logSuccess('Database schema verified');
    return true;
    
  } catch (error) {
    logError(`Schema check failed: ${error.message}`);
    return false;
  }
}

async function testDatabaseOperations() {
  logStep(5, 'Testing database operations...');
  
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    // Test insert operation
    const testData = {
      player_address: '0x0000000000000000000000000000000000000000',
      start_time: new Date().toISOString(),
      end_time: new Date().toISOString(),
      cp_earned: '100',
      dbp_minted: '10',
      status: 'completed',
      bonus_throw_used: false,
      boosts_used: [],
      seed: 'test-seed',
      duration: 60,
      created_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('run_logs')
      .insert([testData])
      .select()
      .single();
    
    if (error) {
      logError(`Insert test failed: ${error.message}`);
      return false;
    }
    
    logSuccess('Database operations working');
    
    // Clean up test data
    await supabase
      .from('run_logs')
      .delete()
      .eq('player_address', '0x0000000000000000000000000000000000000000');
    
    return true;
    
  } catch (error) {
    logError(`Database operations test failed: ${error.message}`);
    return false;
  }
}

async function main() {
  log('🚀 HamBaller.xyz Supabase Setup', 'green');
  log('================================', 'green');
  
  const steps = [
    checkEnvironment,
    checkSupabaseCredentials,
    testSupabaseConnection,
    checkDatabaseSchema,
    testDatabaseOperations
  ];
  
  let allPassed = true;
  
  for (const step of steps) {
    const result = await step();
    if (!result) {
      allPassed = false;
      break;
    }
  }
  
  if (allPassed) {
    log('\n🎉 Supabase setup completed successfully!', 'green');
    log('Your backend is ready to use with Supabase.', 'green');
  } else {
    log('\n📋 Next steps:', 'yellow');
    log('1. Create a Supabase project at https://supabase.com', 'yellow');
    log('2. Copy your project URL and anon key', 'yellow');
    log('3. Update the .env file with your credentials', 'yellow');
    log('4. Import the database schema from database_schema.sql', 'yellow');
    log('5. Run this script again to verify the setup', 'yellow');
  }
  
  log('\n📚 For more information, see SUPABASE_SETUP.md', 'blue');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  checkEnvironment,
  checkSupabaseCredentials,
  testSupabaseConnection,
  checkDatabaseSchema,
  testDatabaseOperations
}; 