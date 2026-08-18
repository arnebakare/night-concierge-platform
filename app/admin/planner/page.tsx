import { BrainCircuit } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireProfile } from "@/lib/auth";
import { createScheduleVenueRule, setScheduleVenueRuleActive, updateScheduleVenueRule } from "@/lib/actions/management-actions";
import { getScheduleVenueRules } from "@/lib/data/app";
import type { ScheduleVenueRule } from "@/lib/types";

const venueTypes: ScheduleVenueRule["venue_type"][] = ["BEACH_CLUB", "RESTAURANT", "NIGHTCLUB", "AFTER_PARTY", "HYBRID"];
const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as const;

export default async function AdminPlannerPage() {
  const profile = await requireProfile(["SUPER_ADMIN"]);
  const rules = await getScheduleVenueRules();
  const activeRules = rules.filter((rule) => rule.active);
  const archivedRules = rules.filter((rule) => !rule.active);

  return (
    <AppShell profile={profile} title="Planner rules" eyebrow="Admin">
      <div className="mb-4 grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
        <LuxuryCard className="bg-white text-ink-950">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-md border border-champagne-500/40 bg-champagne-300/10 text-champagne-800">
              <BrainCircuit className="size-5" />
            </div>
            <div>
              <p className="text-base font-semibold text-ink-950">Teach the planner Marbella taste</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                These rules tell the AI how venues are actually used locally. Big confirmed DJ names still have priority, but weights and avoid-pairings steer the normal recommendations.
              </p>
            </div>
          </div>
        </LuxuryCard>
        <LuxuryCard className="bg-white text-ink-950">
          <p className="text-sm font-semibold text-ink-950">How weights work</p>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            <p><span className="font-semibold text-champagne-700">1.0</span> is normal priority.</p>
            <p><span className="font-semibold text-champagne-700">2.0+</span> should show up more often when the date fits.</p>
            <p><span className="font-semibold text-champagne-700">Below 1.0</span> is a fallback or lower-priority venue.</p>
          </div>
        </LuxuryCard>
      </div>

      <LuxuryCard className="mb-4 bg-white text-ink-950">
        <details>
          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between text-sm font-semibold text-ink-950">
            Add planner rule
            <span className="text-xs font-normal text-muted-foreground">Venue, use, priority</span>
          </summary>
          <VenueRuleForm action={createScheduleVenueRule} submitLabel="Add rule" />
        </details>
      </LuxuryCard>

      <div className="compact-list grid gap-2">
        {activeRules.map((rule) => <VenueRuleCard key={rule.id} rule={rule} />)}
        {!activeRules.length && (
          <LuxuryCard>
            <p className="font-semibold">No active planner rules yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">Add a rule for a venue the AI should understand better.</p>
          </LuxuryCard>
        )}
      </div>

      {!!archivedRules.length && (
        <details className="mt-5 rounded-md border border-champagne-700/30 bg-card/70 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-muted-foreground">Archived rules ({archivedRules.length})</summary>
          <div className="mt-3 grid gap-3">
            {archivedRules.map((rule) => <VenueRuleCard key={rule.id} rule={rule} />)}
          </div>
        </details>
      )}
    </AppShell>
  );
}

function VenueRuleCard({ rule }: Readonly<{ rule: ScheduleVenueRule }>) {
  return (
    <LuxuryCard className={`client-row bg-white text-ink-950 ${!rule.active ? "opacity-70" : ""}`}>
      <div className="grid gap-3 md:grid-cols-[minmax(180px,1fr)_minmax(140px,0.45fr)_auto] md:items-center">
        <div className="min-w-0">
          <p className="font-semibold text-ink-950">{rule.venue_name}</p>
          <p className="mt-1 text-xs text-slate-500">{rule.area || "Marbella"} · {rule.priority_days.length ? rule.priority_days.map((day) => day.slice(0, 3)).join(", ") : "No priority day"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Use / weight</p>
          <p className="mt-1 text-sm font-semibold text-ink-950">{formatType(rule.venue_type)} · {rule.weight}</p>
        </div>
        <form action={setScheduleVenueRuleActive}>
          <input type="hidden" name="ruleId" value={rule.id} />
          <input type="hidden" name="active" value={String(!rule.active)} />
          <Button type="submit" variant="outline" size="sm">{rule.active ? "Archive" : "Reactivate"}</Button>
        </form>
      </div>
      <details className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-ink-950">Edit rule</summary>
        <VenueRuleForm rule={rule} action={updateScheduleVenueRule} submitLabel="Save rule" />
      </details>
    </LuxuryCard>
  );
}

function VenueRuleForm({
  rule,
  action,
  submitLabel
}: Readonly<{
  rule?: ScheduleVenueRule;
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
}>) {
  return (
    <form action={action} className="mt-4 grid gap-3">
      {rule && <input type="hidden" name="ruleId" value={rule.id} />}
      <input type="hidden" name="active" value={String(rule?.active ?? true)} />

      <div className="grid gap-3 md:grid-cols-[1.1fr_180px_110px]">
        <div className="space-y-2">
          <Label>Venue</Label>
          <Input name="venueName" defaultValue={rule?.venue_name ?? ""} placeholder="La Plage Casanis" required />
        </div>
        <div className="space-y-2">
          <Label>Use as</Label>
          <select name="venueType" defaultValue={rule?.venue_type ?? "HYBRID"} className="h-12 w-full rounded-md border bg-input px-3 text-sm">
            {venueTypes.map((type) => <option key={type} value={type}>{formatType(type)}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Weight</Label>
          <Input name="weight" type="number" min="0.1" max="10" step="0.1" defaultValue={rule?.weight ?? 1} />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Area</Label>
          <Input name="area" defaultValue={rule?.area ?? ""} placeholder="Elviria, Puente Romano, Puerto Banus..." />
        </div>
        <div className="space-y-2">
          <Label>Avoid in same trail after</Label>
          <Input name="avoidAfterVenueNames" defaultValue={(rule?.avoid_after_venue_names ?? []).join(", ")} placeholder="Bon Bonniere, Motel Particulier" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Priority days</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {days.map((day) => (
            <label key={day} className="flex min-h-11 items-center gap-2 rounded-md border border-champagne-700/30 bg-background/35 px-3 text-xs text-muted-foreground">
              <input name="priorityDays" value={day} type="checkbox" defaultChecked={rule?.priority_days.includes(day)} className="accent-champagne-300" />
              {day.slice(0, 3)}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Local guidance</Label>
        <Textarea name="guidance" defaultValue={rule?.guidance ?? ""} placeholder="Example: Wednesdays and Sundays are party days until 00:00. Do not put dinner between this and Le Jade." />
      </div>

      <Button type="submit" variant="secondary">{submitLabel}</Button>
    </form>
  );
}

function formatType(type: ScheduleVenueRule["venue_type"]) {
  return type.toLowerCase().replaceAll("_", " ");
}
