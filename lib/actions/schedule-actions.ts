"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getEventsForSchedule } from "@/lib/data/app";
import { generateSchedulePlan } from "@/lib/services/ai-schedule";
import { writeAuditLog } from "@/lib/services/audit";

const scheduleSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  spendProfile: z.enum(["NORMAL", "HIGH_SPEND"]),
  clientContext: z.string().trim().max(800).optional().or(z.literal(""))
});

export async function createSchedulePlan(formData: FormData) {
  const profile = await requireProfile(["PROMOTER", "PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const parsed = scheduleSchema.safeParse({
    from: formData.get("from"),
    to: formData.get("to") || "",
    spendProfile: formData.get("spendProfile") || "NORMAL",
    clientContext: formData.get("clientContext") || ""
  });
  if (!parsed.success) return;

  const dateFrom = parsed.data.from;
  const dateTo = parsed.data.to || dateFrom;
  const from = dateFrom <= dateTo ? dateFrom : dateTo;
  const to = dateFrom <= dateTo ? dateTo : dateFrom;
  const events = await getEventsForSchedule(from, to);
  const generated = await generateSchedulePlan({
    dateFrom: from,
    dateTo: to,
    spendProfile: parsed.data.spendProfile,
    city: "Marbella",
    clientContext: parsed.data.clientContext || "",
    events
  });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("schedule_plans")
    .insert({
      user_id: profile.id,
      title: generated.title,
      city: "Marbella",
      date_from: from,
      date_to: to,
      spend_profile: parsed.data.spendProfile,
      prompt_text: parsed.data.clientContext || null,
      message: generated.whatsappMessage,
      plan: generated,
      source: "APP"
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not save schedule plan.");

  await writeAuditLog(supabase, {
    userId: profile.id,
    action: "SCHEDULE_PLAN_CREATED",
    entityType: "schedule_plans",
    entityId: data.id,
    metadata: { from, to, spendProfile: parsed.data.spendProfile, generatedBy: generated.generatedBy }
  });

  revalidatePath("/schedule");
  revalidatePath("/schedule/plans");
  redirect(`/schedule/plans/${data.id}`);
}

const attachSchema = z.object({
  planId: z.string().min(1),
  clientId: z.string().min(1).or(z.literal(""))
});

export async function attachSchedulePlanClient(formData: FormData) {
  const profile = await requireProfile(["PROMOTER", "PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const parsed = attachSchema.safeParse({
    planId: formData.get("planId"),
    clientId: formData.get("clientId") || ""
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("schedule_plans")
    .update({ client_id: parsed.data.clientId || null })
    .eq("id", parsed.data.planId);
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    userId: profile.id,
    action: "SCHEDULE_PLAN_ATTACHED",
    entityType: "schedule_plans",
    entityId: parsed.data.planId,
    metadata: { clientId: parsed.data.clientId || null }
  });

  revalidatePath("/schedule/plans");
  revalidatePath(`/schedule/plans/${parsed.data.planId}`);
}
