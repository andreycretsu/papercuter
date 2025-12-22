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

async function checkUsers() {
  console.log("Checking users in database...");

  const { data, error } = await supabase
    .from("users")
    .select("id, email")
    .ilike("email", "%@peopleforce.io%")
    .limit(10);

  if (error) {
    console.error("Error:", error);
  } else if (data.length === 0) {
    console.log("❌ No @peopleforce.io users found in database!");
    console.log("\nYou need to create a user with a @peopleforce.io email first.");
  } else {
    console.log(`✅ Found ${data.length} @peopleforce.io users:`);
    data.forEach(user => {
      console.log(`  - ${user.email} (ID: ${user.id})`);
    });
  }
}

checkUsers();
