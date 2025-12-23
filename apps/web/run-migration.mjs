#!/usr/bin/env node

/**
 * This script removes the unique constraint from papercut_likes table
 * to allow unlimited likes per user.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔧 Removing unique constraint from papercut_likes table...\n');

const migrationSQL = `
DO $$
DECLARE
    constraint_name text;
BEGIN
    FOR constraint_name IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'papercut_likes'::regclass
        AND contype = 'u'
    LOOP
        EXECUTE format('ALTER TABLE papercut_likes DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END LOOP;
END $$;
`;

try {
  const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

  if (error) {
    console.error('❌ Migration failed:', error);
    console.error('\n📝 Please run this SQL manually in Supabase SQL Editor:');
    console.log(migrationSQL);
    process.exit(1);
  }

  console.log('✅ Migration completed successfully!');
  console.log('   Unique constraint has been removed.');
  console.log('   Users can now like papercuts unlimited times.\n');

  // Verify
  console.log('🔍 Verifying constraint removal...');
  const { data: verifyData } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT conname, contype, pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = 'papercut_likes'::regclass AND contype = 'u';
    `
  });

  if (verifyData && verifyData.length === 0) {
    console.log('✅ Verified: No unique constraints remain on papercut_likes table\n');
  } else {
    console.log('⚠️  Warning: Some unique constraints still exist:', verifyData);
  }

} catch (err) {
  console.error('❌ Error running migration:', err.message);
  console.error('\n📝 Please run the SQL migration manually in your Supabase SQL Editor.');
  console.error('   See: apps/web/supabase-migrations/fix-papercut-likes-constraint.sql\n');
  process.exit(1);
}
