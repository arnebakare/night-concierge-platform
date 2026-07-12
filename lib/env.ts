export function hasSupabaseBrowserEnv() {
  return isConfiguredValue(process.env.NEXT_PUBLIC_SUPABASE_URL) && isConfiguredValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function hasSupabaseServiceEnv() {
  return isConfiguredValue(process.env.NEXT_PUBLIC_SUPABASE_URL) && isConfiguredValue(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function isDemoAuthEnabled() {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true" || !hasSupabaseBrowserEnv();
}

export function isConfiguredValue(value?: string) {
  if (!value) return false;
  const trimmed = value.trim();
  return Boolean(trimmed && trimmed !== "..." && trimmed !== "_" && trimmed !== "YOUR_VALUE_HERE");
}
