import { getSupabaseAdmin } from "../src/server/supabase-admin";
import * as fs from "fs";
import * as path from "path";

async function runMigration() {
  const supabase = getSupabaseAdmin();

  // Read the migration file
  const migrationPath = path.join(__dirname, "../supabase-migrations/create-password-reset-tokens.sql");
  const migrationSQL = fs.readFileSync(migrationPath, "utf-8");

  console.log("Running migration: create-password-reset-tokens.sql");
  console.log(migrationSQL);

  // Execute the migration
  const { data, error } = await supabase.rpc("exec_sql", { sql: migrationSQL });

  if (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }

  console.log("Migration completed successfully!");
  process.exit(0);
}

runMigration();
