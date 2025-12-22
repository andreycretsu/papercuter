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

async function checkAndCreateTable() {
  console.log("Checking if password_reset_tokens table exists...");

  // Try to query the table
  const { data, error } = await supabase
    .from("password_reset_tokens")
    .select("id")
    .limit(1);

  if (error) {
    if (error.message.includes("does not exist") || error.code === "42P01") {
      console.log("Table does not exist. Please run the SQL migration in Supabase dashboard:");
      console.log("\nGo to: https://supabase.com/dashboard/project/YOUR_PROJECT/editor");
      console.log("\nRun this SQL:\n");
      console.log(`
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
      `);
    } else {
      console.error("Error checking table:", error);
    }
  } else {
    console.log("✅ Table exists!");
  }
}

checkAndCreateTable();
