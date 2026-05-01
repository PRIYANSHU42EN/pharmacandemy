const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ibrfcnfreoputaqpzagu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlicmZjbmZyZW9wdXRhcXB6YWd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njk4NjQzOCwiZXhwIjoyMDkyNTYyNDM4fQ.mSuPSsP05jlTvOr9IRFKJFr6FV8cSFlIEHkmrnn44XI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function promoteAdmin() {
  const { data, error } = await supabase
    .from('users')
    .update({ role: 'admin' })
    .eq('email', 'testadmin@example.com')
    .select();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success:', data);
  }
}

promoteAdmin();
