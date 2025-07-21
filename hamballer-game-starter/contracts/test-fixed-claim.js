import axios from 'axios';
import axiosCurlirize from 'axios-curlirize';

// Enable curl debugging
axiosCurlirize(axios);

// Set global timeout to 30 seconds
axios.defaults.timeout = 30000;

console.log('🧪 Testing Badge Claim with Enhanced Logging');
console.log('============================================');

async function testBadgeClaim() {
  try {
    console.log('📡 Testing backend health...');
    
    // Test health endpoint
    const healthResponse = await axios.get('http://localhost:3001/health');
    console.log('✅ Backend health:', healthResponse.data);
    
    // Test claimable badges endpoint
    console.log('\n📡 Testing claimable badges...');
    const claimableResponse = await axios.get('http://localhost:3001/api/badges/claimable');
    console.log('✅ Claimable badges:', claimableResponse.data);
    
    // Test badge claim endpoint (mock data)
    console.log('\n📡 Testing badge claim endpoint...');
    const testWallet = '0x10a36b1C6b960FF36c4DED3f57159C9ea6fb65CD';
    const claimResponse = await axios.post('http://localhost:3001/api/badges/claim', {
      walletAddress: testWallet,
      xpEarned: 100,
      season: 1
    });
    console.log('✅ Badge claim response:', claimResponse.data);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    if (error.cause) {
      console.error('   Cause:', error.cause.message);
    }
  }
}

// Run the test
testBadgeClaim(); 