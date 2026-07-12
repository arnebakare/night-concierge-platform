import { existsSync, readFileSync } from "node:fs";

const file = ".env.local";
if (!existsSync(file)) {
  console.error("Missing .env.local. Create it from .env.example first.");
  process.exit(1);
}

const values = Object.fromEntries(readFileSync(file, "utf8").split(/\r?\n/).filter((line) => line && !line.startsWith("#") && line.includes("=")).map((line) => {
  const index = line.indexOf("=");
  return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^["']|["']$/g, "")];
}));
const required = ["NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_WHATSAPP_FROM"];
const missing = required.filter((key) => !values[key]);
if (missing.length) {
  console.error(`Missing configuration: ${missing.join(", ")}`);
  process.exit(1);
}
if (!values.NEXT_PUBLIC_SUPABASE_URL.startsWith("https://") || !values.NEXT_PUBLIC_SUPABASE_URL.includes(".supabase.co")) {
  console.error("NEXT_PUBLIC_SUPABASE_URL does not look like a Supabase project URL.");
  process.exit(1);
}
if (!values.TWILIO_WHATSAPP_FROM.startsWith("whatsapp:+")) {
  console.error("TWILIO_WHATSAPP_FROM must start with whatsapp:+");
  process.exit(1);
}
if (!values.TWILIO_ACCOUNT_SID.startsWith("AC")) {
  console.error("TWILIO_ACCOUNT_SID must be the Account SID that starts with AC, not an API key SID.");
  process.exit(1);
}
console.log("Environment configuration looks complete. No secret values were printed.");
