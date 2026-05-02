const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from Next.js app directory
dotenv.config({ path: path.join('d:', 'an webapp', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
  console.log('Connecting to Supabase Realtime...');
  
  let eventReceived = false;

  const channel = supabase.channel('test-realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'analytics_events' }, (payload) => {
      console.log('✅ SUCCESS! Received real-time payload via socket:');
      console.log(payload.new);
      eventReceived = true;
      
      // Cleanup and exit successfully
      supabase.removeChannel(channel);
      process.exit(0);
    })
    .subscribe();

  // Wait a second for subscription to establish
  await new Promise(r => setTimeout(r, 1500));

  console.log('Inserting mock event into analytics_events...');
  const mockEvent = {
    event_type: 'test_realtime_event',
    metadata: { test: true, timestamp: Date.now() },
    created_at: new Date().toISOString()
  };

  const { error } = await supabase.from('analytics_events').insert([mockEvent]);
  
  if (error) {
    console.error('❌ Failed to insert event:', error);
    process.exit(1);
  }
  
  console.log('Mock event inserted. Waiting for socket trigger...');

  // Wait up to 5 seconds for the socket to receive the event
  await new Promise(r => setTimeout(r, 5000));

  if (!eventReceived) {
    console.error('❌ FAILED: Did not receive real-time event within 5 seconds.');
    process.exit(1);
  }
}

runTest();
