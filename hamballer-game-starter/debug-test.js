#!/usr/bin/env node

const axios = require('axios');

console.log('🔍 Debug Test - Checking axios vs curl');

async function debugTest() {
  const API_BASE = 'http://localhost:3001';
  const FRONTEND_BASE = 'http://localhost:3000';
  
  console.log('\n📋 Testing Backend Health:');
  try {
    const response = await axios.get(`${API_BASE}/health`, { timeout: 10000 });
    console.log('   ✅ Axios success:', response.status);
  } catch (error) {
    console.log('   ❌ Axios failed:', error.message);
  }
  
  console.log('\n📋 Testing Retry Queue Stats:');
  try {
    const response = await axios.get(`${API_BASE}/api/badges/retry-queue/stats`, { timeout: 10000 });
    console.log('   ✅ Axios success:', response.status);
  } catch (error) {
    console.log('   ❌ Axios failed:', error.message);
  }
  
  console.log('\n📋 Testing Frontend:');
  try {
    const response = await axios.get(`${FRONTEND_BASE}`, { timeout: 10000 });
    console.log('   ✅ Axios success:', response.status);
  } catch (error) {
    console.log('   ❌ Axios failed:', error.message);
  }
}

debugTest().catch(console.error); 