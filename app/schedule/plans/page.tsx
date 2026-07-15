import Link from "next/link";
import { CalendarDays, MessageCircle } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { requireProfile } from "@/lib/auth";
import { getSchedulePlansForProfile } from "@/lib/data/app";

export default async function SchedulePlansPage() {
  const profile = await requireProfile(["PROMOTER", "PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const plans = await getSchedulePlansForProfile(profile);

  return (
    <AppShell profile={profile} title="Saved schedule trails" eyebrow="AI planner">
      <div className="mb-4 flex justify-end">
        <Button asChild>
          <Link href="/schedule">New trail</Link>
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {plans.map((plan) => (
          <Link href={`/schedule/plans/${plan.id}`} key={plan.id} className="block">
            <LuxuryCard className="h-full transition hover:border-champagne-300/60">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-champagne-300">{plan.source} · {plan.spend_profile === "HIGH_SPEND" ? "High spend" : "Normal"}</p>
                  <h2 className="mt-2 text-lg font-semibold">{plan.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{formatDate(plan.date_from)}{plan.date_from === plan.date_to ? "" : ` to ${formatDate(plan.date_to)}`}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{plan.clients?.name ? `Attached to ${plan.clients.name}` : "No customer attached"}</p>
                </div>
                {plan.source === "WHATSAPP" ? <MessageCircle className="size-5 text-champagne-300" /> : <CalendarDays className="size-5 text-champagne-300" />}
              </div>
            </LuxuryCard>
          </Link>
        ))}
        {!plans.length && (
          <LuxuryCard className="text-center md:col-span-2">
            <p className="font-serif text-2xl">No saved trails yet</p>
            <p className="mt-2 text-sm text-muted-foreground">Create one from the schedule builder or send a WhatsApp command.</p>
          </LuxuryCard>
        )}
      </div>
    </AppShell>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(`${value}T12:00:00`));
}
