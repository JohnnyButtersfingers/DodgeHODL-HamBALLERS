require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testDatabaseConnection() {
  console.log('🧪 Testing Supabase Database Connection...\n');

  // Check environment variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Missing Supabase credentials in .env file');
    console.log('Required: SUPABASE_URL, SUPABASE_SERVICE_KEY');
    return;
  }

  console.log('✅ Environment variables found');
  console.log('📋 Supabase URL:', supabaseUrl);
  console.log('🔑 Service Key:', supabaseKey.substring(0, 20) + '...\n');

  try {
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Test basic connection
    console.log('🔌 Testing connection...');
    const { data, error } = await supabase
      .from('run_logs')
      .select('count', { count: 'exact', head: true });

    if (error) {
      console.log('❌ Connection failed:', error.message);
      return;
    }

    console.log('✅ Successfully connected to Supabase!');
    console.log('📊 Total runs in database:', data || 0);

    // Test table structure
    console.log('\n🏗️ Checking table structure...');
    
    const tables = ['run_logs', 'replays', 'player_stats', 'event_logs'];
    
    for (const table of tables) {
      const { data: tableData, error: tableError } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (tableError) {
        console.log(`❌ Table ${table}: ${tableError.message}`);
      } else {
        console.log(`✅ Table ${table}: OK`);
      }
    }

    // Test insert/delete (cleanup after)
    console.log('\n✍️ Testing write operations...');
    
    const testRun = {
      player_address: '0x0000000000000000000000000000000000000000',
      start_time: new Date().toISOString(),
      status: 'completed',
      cp_earned: 100,
      dbp_minted: '10.5'
    };

    const { data: insertData, error: insertError } = await supabase
      .from('run_logs')
      .insert(testRun)
      .select();

    if (insertError) {
      console.log('❌ Insert test failed:', insertError.message);
    } else {
      console.log('✅ Insert test successful');
      
      // Clean up test data
      const { error: deleteError } = await supabase
        .from('run_logs')
        .delete()
        .eq('id', insertData[0].id);
      
      if (!deleteError) {
        console.log('✅ Cleanup successful');
      }
    }

    console.log('\n🎉 Database connection test complete!');
    console.log('🚀 Ready for backend deployment!');

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

testDatabaseConnection();
