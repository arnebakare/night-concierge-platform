"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { isDemoAuthEnabled } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/services/audit";
import { roleHome } from "@/lib/auth";

const profileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30).optional().or(z.literal(""))
});

export async function updateOwnProfile(formData: FormData) {
  const profile = await requireProfile();
  const parsed = profileSchema.safeParse({ name: formData.get("name"), phone: formData.get("phone") || "" });
  if (!parsed.success || isDemoAuthEnabled()) { revalidatePath("/profile"); return; }
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ name: parsed.data.name, phone: parsed.data.phone || null }).eq("id", profile.id);
  if (error) throw new Error(error.message);
  if (profile.role === "CLIENT") {
    const { error: clientError } = await supabase.rpc("update_own_client_contact", { p_name: parsed.data.name, p_phone: parsed.data.phone || "", p_email: profile.email || "" });
    if (clientError) throw new Error(clientError.message);
  }
  await writeAuditLog(supabase, { userId: profile.id, action: "PROFILE_UPDATED", entityType: "profiles", entityId: profile.id, metadata: {} });
  revalidatePath("/profile");
}

export async function signOut() {
  if (!isDemoAuthEnabled()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(8) });

export async function signInWithPassword(input: { email: string; password: string }) {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, message: "Enter a valid email and password." };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    const details = error ? [error.message, "code" in error ? String(error.code ?? "") : "", "status" in error ? String(error.status ?? "") : ""].filter((value) => value && value !== "{}").join(" · ") : "";
    return { ok: false as const, message: details || "Supabase Auth returned an empty provider error." };
  }
  const { data: profile } = await supabase.from("profiles").select("role, active").eq("id", data.user.id).single();
  if (!profile?.active) { await supabase.auth.signOut(); return { ok: false as const, message: "This account is inactive." }; }
  return { ok: true as const, home: roleHome(profile.role) };
}

export async function sendLoginMagicLink(email: string, next: string) {
  const parsed = z.string().email().safeParse(email);
  if (!parsed.success) return { ok: false as const, message: "Enter a valid email." };
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3001";
  const { error } = await supabase.auth.signInWithOtp({ email: parsed.data, options: { emailRedirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent(safeNext)}` } });
  return error ? { ok: false as const, message: error.message } : { ok: true as const, message: "Magic link sent. Check your email." };
}

export async function sendPasswordRecovery(email: string) {
  const parsed = z.string().email().safeParse(email);
  if (!parsed.success) return { ok: false as const, message: "Enter a valid email." };
  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3001";
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, { redirectTo: `${appUrl}/auth/callback?next=/update-password` });
  return error ? { ok: false as const, message: error.message } : { ok: true as const, message: "Password recovery email sent." };
}

export async function updatePassword(password: string) {
  const parsed = z.string().min(8).safeParse(password);
  if (!parsed.success) return { ok: false as const, message: "Use at least 8 characters." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  return error ? { ok: false as const, message: error.message } : { ok: true as const };
}
