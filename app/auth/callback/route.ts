import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { roleHome } from "@/lib/auth";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : null;

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
    const { data } = await supabase.auth.getUser();

    if (data.user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
      if (profile?.role === "CLIENT") await supabase.rpc("claim_client_profile");
      if (!profile?.role) return NextResponse.redirect(new URL("/login", request.url));
      return NextResponse.redirect(new URL(safeNext || roleHome(profile.role), request.url));
    }
  }

  return NextResponse.redirect(new URL("/login", request.url));
}
