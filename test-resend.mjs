import { Resend } from "resend";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, 'apps/web/.env.local') });

const resend = new Resend(process.env.RESEND_API_KEY);

async function testEmail() {
  console.log("Testing Resend with API key:", process.env.RESEND_API_KEY?.substring(0, 10) + "...");

  try {
    const { data, error } = await resend.emails.send({
      from: "Papercuts <noreply@resend.dev>",
      to: "andrey.cretsu@peopleforce.io",
      subject: "Test Password Reset",
      html: "<p>This is a test email from the password reset system.</p>",
    });

    if (error) {
      console.error("❌ Failed to send email:", error);
    } else {
      console.log("✅ Email sent successfully!");
      console.log("Email ID:", data.id);
    }
  } catch (error) {
    console.error("❌ Exception:", error);
  }
}

testEmail();
