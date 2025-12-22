import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, 'apps/web/.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

const { data, error } = await supabase
  .from('users')
  .select('id, email')
  .eq('email', 'andreycretsu@gmail.com')
  .single();

if (error || !data) {
  console.log('❌ No user found with andreycretsu@gmail.com');
  console.log('\nTo test password reset:');
  console.log('1. Go to https://cleaqops.com/signup');
  console.log('2. Create account with: andreycretsu@gmail.com');
  console.log('3. Then test forgot password');
} else {
  console.log('✅ User exists:', data.email);
  console.log('You can now test password reset!');
}
