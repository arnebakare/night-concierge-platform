"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { writeAuditLog } from "@/lib/services/audit";
import { createClient } from "@/lib/supabase/server";

export async function assignConversation(formData: FormData) {
  const actor = await requireProfile(["PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const conversationId = required(formData, "conversationId");
  const promoterId = nullable(formData, "promoterId");
  const supabase = await createClient();
  if (promoterId) {
    const { data: promoter } = await supabase.from("profiles").select("id, manager_id").eq("id", promoterId).eq("role", "PROMOTER").eq("active", true).single();
    if (!promoter) throw new Error("Promoter is not available in your team.");
  }
  const { error } = await supabase.rpc("assign_conversation", { p_conversation_id: conversationId, p_promoter_id: promoterId, p_reason: promoterId ? "Assigned in concierge inbox" : "Returned to manager queue" });
  if (error) throw new Error(error.message);
  await writeAuditLog(supabase, { userId: actor.id, action: "CONVERSATION_ASSIGNED", entityType: "conversations", entityId: conversationId, metadata: { promoterId } });
  revalidatePath("/inbox");
  revalidatePath(`/inbox/${conversationId}`);
}

export async function addConversationNote(formData: FormData) {
  const actor = await requireProfile(["PROMOTER", "PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const conversationId = required(formData, "conversationId");
  const body = required(formData, "body").trim();
  if (!body || body.length > 4000) throw new Error("Internal note must be between 1 and 4,000 characters.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("conversation_notes").insert({ conversation_id: conversationId, author_id: actor.id, body }).select("id").single();
  if (error || !data) throw new Error(error?.message ?? "Could not save internal note.");
  await writeAuditLog(supabase, { userId: actor.id, action: "CONVERSATION_NOTE_ADDED", entityType: "conversation_notes", entityId: data.id, metadata: { conversationId } });
  revalidatePath(`/inbox/${conversationId}`);
}

export async function updateConversationStatus(formData: FormData) {
  const actor = await requireProfile(["PROMOTER", "PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const conversationId = required(formData, "conversationId");
  const status = required(formData, "status");
  if (!["OPEN", "PENDING", "RESOLVED"].includes(status)) throw new Error("Invalid conversation status.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_conversation_status", { p_conversation_id: conversationId, p_status: status });
  if (error) throw new Error(error.message);
  await writeAuditLog(supabase, { userId: actor.id, action: "CONVERSATION_STATUS_CHANGED", entityType: "conversations", entityId: conversationId, metadata: { status } });
  revalidatePath("/inbox");
  revalidatePath(`/inbox/${conversationId}`);
}

function required(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || !value) throw new Error(`${key} is required.`);
  return value;
}

function nullable(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value ? value : null;
}
