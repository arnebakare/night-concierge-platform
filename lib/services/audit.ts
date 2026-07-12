import type { SupabaseClient } from "@supabase/supabase-js";

export async function writeAuditLog(
  supabase: SupabaseClient,
  input: {
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  }
) {
  await supabase.from("audit_logs").insert({
    user_id: input.userId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId,
    metadata: input.metadata ?? {}
  });
}
