/**
 * Environment Configuration for HamBaller.xyz Backend
 * 
 * This module centralizes all environment variable handling and provides
 * validation and fallbacks for development and production environments.
 */

require('dotenv').config();

// Environment validation
function validateEnvironment() {
  const required = {
    development: ['PORT', 'HOST'],
    production: ['PORT', 'HOST', 'SUPABASE_URL', 'SUPABASE_ANON_KEY']
  };

  const env = process.env.NODE_ENV || 'development';
  const missing = [];

  if (required[env]) {
    required[env].forEach(key => {
      if (!process.env[key]) {
        missing.push(key);
      }
    });
  }

  if (missing.length > 0) {
    console.warn(`⚠️ Missing required environment variables for ${env}: ${missing.join(', ')}`);
    return false;
  }

  return true;
}

// Environment configuration object
const config = {
  // Server Configuration
  server: {
    port: parseInt(process.env.PORT) || 3001,
    host: process.env.HOST || '0.0.0.0',
    environment: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info'
  },

  // CORS Configuration
  cors: {
    origins: process.env.CORS_ORIGINS ? 
      process.env.CORS_ORIGINS.split(',') : 
      ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  },

  // Supabase Configuration
  supabase: {
    url: process.env.SUPABASE_URL || process.env.SUBABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY || process.env.SUBABASE_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY,
    isConfigured: function() {
      return !!(this.url && this.anonKey && 
                !this.url.includes('your-project-id') && 
                !this.anonKey.includes('your_anon_key'));
    }
  },

  // Blockchain Configuration
  blockchain: {
    rpcUrl: process.env.ABSTRACT_RPC_URL || process.env.RPC_URL || 'https://api.testnet.abs.xyz',
    isConfigured: function() {
      return !!(this.rpcUrl && !this.rpcUrl.includes('your-rpc-url'));
    }
  },

  // Contract Configuration
  contracts: {
    dbpToken: process.env.DBP_TOKEN_ADDRESS,
    boostNft: process.env.BOOST_NFT_ADDRESS,
    hodlManager: process.env.HODL_MANAGER_ADDRESS || process.env.HODL_MANAGER_ADDRESS,
    isConfigured: function() {
      return !!(this.hodlManager && !this.hodlManager.includes('your-hodl-manager'));
    }
  },

  // Development Settings
  development: {
    enableMockDb: process.env.ENABLE_MOCK_DB === 'true',
    enableDebugLogs: process.env.LOG_LEVEL === 'debug'
  }
};

// Validation helpers
const validation = {
  isSupabaseReady() {
    return config.supabase.isConfigured();
  },

  isBlockchainReady() {
    return config.blockchain.isConfigured();
  },

  isContractsReady() {
    return config.contracts.isConfigured();
  },

  isProduction() {
    return config.server.environment === 'production';
  },

  isDevelopment() {
    return config.server.environment === 'development';
  }
};

// Configuration status report
function getConfigurationStatus() {
  const status = {
    server: {
      port: config.server.port,
      host: config.server.host,
      environment: config.server.environment
    },
    supabase: {
      configured: validation.isSupabaseReady(),
      url: config.supabase.url ? 'Set' : 'Not set',
      hasKey: !!config.supabase.anonKey,
      hasServiceKey: !!config.supabase.serviceKey
    },
    blockchain: {
      configured: validation.isBlockchainReady(),
      rpcUrl: config.blockchain.rpcUrl
    },
    contracts: {
      configured: validation.isContractsReady(),
      dbpToken: config.contracts.dbpToken ? 'Set' : 'Not set',
      boostNft: config.contracts.boostNft ? 'Set' : 'Not set',
      hodlManager: config.contracts.hodlManager ? 'Set' : 'Not set'
    }
  };

  return status;
}

// Print configuration status
function printConfigurationStatus() {
  const status = getConfigurationStatus();
  
  console.log('\n🔧 HamBaller.xyz Configuration Status');
  console.log('=====================================');
  
  console.log(`\n📡 Server:`);
  console.log(`   Port: ${status.server.port}`);
  console.log(`   Host: ${status.server.host}`);
  console.log(`   Environment: ${status.server.environment}`);
  
  console.log(`\n🗄️ Supabase:`);
  console.log(`   Configured: ${status.supabase.configured ? '✅' : '❌'}`);
  console.log(`   URL: ${status.supabase.url}`);
  console.log(`   Key: ${status.supabase.hasKey ? '✅' : '❌'}`);
  console.log(`   Service Key: ${status.supabase.hasServiceKey ? '✅' : '❌'}`);
  
  console.log(`\n⛓️ Blockchain:`);
  console.log(`   Configured: ${status.blockchain.configured ? '✅' : '❌'}`);
  console.log(`   RPC URL: ${status.blockchain.rpcUrl}`);
  
  console.log(`\n📜 Contracts:`);
  console.log(`   Configured: ${status.contracts.configured ? '✅' : '❌'}`);
  console.log(`   DBP Token: ${status.contracts.dbpToken}`);
  console.log(`   Boost NFT: ${status.contracts.boostNft}`);
  console.log(`   HODL Manager: ${status.contracts.hodlManager}`);
  
  if (!status.supabase.configured) {
    console.log('\n📋 To configure Supabase:');
    console.log('   1. Create a project at https://supabase.com');
    console.log('   2. Copy your project URL and anon key');
    console.log('   3. Update your .env file');
    console.log('   4. Import database schema from database_schema.sql');
  }
  
  if (!status.contracts.configured) {
    console.log('\n📋 To configure contracts:');
    console.log('   1. Deploy contracts using: cd ../contracts && npm run deploy:production');
    console.log('   2. Copy contract addresses to .env file');
  }
  
  console.log('');
}

// Export configuration
module.exports = {
  config,
  validation,
  getConfigurationStatus,
  printConfigurationStatus,
  validateEnvironment
}; 