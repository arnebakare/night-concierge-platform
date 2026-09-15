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
const required = ["NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "META_APP_SECRET", "META_WEBHOOK_VERIFY_TOKEN", "META_WHATSAPP_PHONE_NUMBER_ID"];
if (!values.META_ACCESS_TOKEN && !values.META_WHATSAPP_ACCESS_TOKEN) required.push("META_ACCESS_TOKEN or META_WHATSAPP_ACCESS_TOKEN");
const missing = required.filter((key) => !values[key]);
if (missing.length) {
  console.error(`Missing configuration: ${missing.join(", ")}`);
  process.exit(1);
}
if (!values.NEXT_PUBLIC_SUPABASE_URL.startsWith("https://") || !values.NEXT_PUBLIC_SUPABASE_URL.includes(".supabase.co")) {
  console.error("NEXT_PUBLIC_SUPABASE_URL does not look like a Supabase project URL.");
  process.exit(1);
}
if (values.META_GRAPH_API_VERSION && !/^v\d+\.\d+$/.test(values.META_GRAPH_API_VERSION)) {
  console.error("META_GRAPH_API_VERSION must look like v26.0");
  process.exit(1);
}
console.log("Environment configuration looks complete. No secret values were printed.");
