import Link from "next/link";
import { CalendarDays, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { Textarea } from "@/components/ui/textarea";
import { createSchedulePlan } from "@/lib/actions/schedule-actions";
import { requireProfile } from "@/lib/auth";
import { getSchedulePlansForProfile } from "@/lib/data/app";

export default async function SchedulePage() {
  const profile = await requireProfile(["PROMOTER", "PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const plans = await getSchedulePlansForProfile(profile);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const todayString = today.toISOString().slice(0, 10);

  return (
    <AppShell profile={profile} title="AI schedule trail" eyebrow="Marbella planner">
      <div className="space-y-5">
        <LuxuryCard className="overflow-hidden border-champagne-300/35 bg-[radial-gradient(circle_at_top_right,rgba(216,183,100,0.16),transparent_38%),rgba(17,17,19,0.92)]">
          <div className="flex items-start gap-3">
            <div className="rounded-md border border-champagne-700/40 bg-champagne-500/10 p-3 text-champagne-200">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h2 className="font-serif text-2xl">Build a customer-ready party trail</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Choose dates and spend level. AI suggests beach-club parties, DJs, dinner only where it helps the night, and clubs per day, with La Plage and Le Jade prioritized on Wednesdays and Sundays.
              </p>
            </div>
          </div>

          <form action={createSchedulePlan} className="mt-5 space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-champagne-300">Start date</span>
                <Input name="from" type="date" defaultValue={todayString} required />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-champagne-300">End date</span>
                <Input name="to" type="date" defaultValue={todayString} />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <SpendOption value="NORMAL" label="Normal" description="Polished party flow" defaultChecked />
              <SpendOption value="HIGH_SPEND" label="High spend" description="Best tables and bigger nights" />
            </div>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-champagne-300">Client preference optional</span>
              <Textarea name="clientContext" placeholder="Example: group of 6, wants DJs/party beach club, big-name acts if available, one late club option..." />
            </label>

            <Button type="submit" size="lg" className="w-full">
              <Sparkles className="size-5" /> Generate trail
            </Button>
          </form>
        </LuxuryCard>

        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Saved trails</p>
            <h2 className="font-serif text-2xl">Latest plans</h2>
          </div>
          <Button asChild variant="secondary">
            <Link href="/schedule/plans">View all</Link>
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {plans.slice(0, 4).map((plan) => (
            <Link key={plan.id} href={`/schedule/plans/${plan.id}`} className="block">
              <LuxuryCard className="transition hover:border-champagne-300/60">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-champagne-300">{plan.source} · {plan.spend_profile === "HIGH_SPEND" ? "High spend" : "Normal"}</p>
                    <h3 className="mt-2 text-lg font-semibold">{plan.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{formatDate(plan.date_from)}{plan.date_from === plan.date_to ? "" : ` to ${formatDate(plan.date_to)}`}</p>
                  </div>
                  <CalendarDays className="size-5 text-champagne-300" />
                </div>
              </LuxuryCard>
            </Link>
          ))}
          {!plans.length && (
            <LuxuryCard className="text-center md:col-span-2">
              <p className="font-serif text-2xl">No saved trails yet</p>
              <p className="mt-2 text-sm text-muted-foreground">Generate the first Marbella trail above.</p>
            </LuxuryCard>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function SpendOption({
  value,
  label,
  description,
  defaultChecked
}: Readonly<{ value: string; label: string; description: string; defaultChecked?: boolean }>) {
  return (
    <label className="flex min-h-24 cursor-pointer flex-col justify-between rounded-lg border border-champagne-700/35 bg-ink-800/80 p-4 has-[:checked]:border-champagne-300 has-[:checked]:bg-champagne-300/10">
      <input type="radio" name="spendProfile" value={value} defaultChecked={defaultChecked} className="sr-only" />
      <span className="font-semibold">{label}</span>
      <span className="text-sm text-muted-foreground">{description}</span>
    </label>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(`${value}T12:00:00`));
}
