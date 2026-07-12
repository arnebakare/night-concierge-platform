"use client";

import { createBrowserClient } from "@supabase/ssr";
import { hasSupabaseBrowserEnv } from "@/lib/env";

export function createClient() {
  if (!hasSupabaseBrowserEnv()) {
    throw new Error("Supabase browser credentials are missing. Enable demo mode or add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
