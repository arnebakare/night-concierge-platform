import { CheckCircle2, XCircle } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { requireProfile } from "@/lib/auth";
import { getSystemReadiness } from "@/lib/services/readiness";

export default async function AdminSystemPage() {
  const profile = await requireProfile(["SUPER_ADMIN"]);
  const checks = await getSystemReadiness();
  const readyCount = checks.filter((check) => check.ok).length;
  const ready = readyCount === checks.length;

  return (
    <AppShell profile={profile} title="Launch readiness" eyebrow="System">
      <div className="ops-summary mb-4 overflow-hidden rounded-lg border border-border bg-card">
        <div className="grid grid-cols-2 divide-x divide-border">
          <Metric label="Ready" value={`${readyCount}/${checks.length}`} />
          <Metric label="Status" value={ready ? "Live ready" : "Needs setup"} />
        </div>
      </div>

      <div className="compact-list grid gap-2">
        {checks.map((check) => (
          <LuxuryCard key={check.label} className="client-row">
            <div className="grid gap-3 md:grid-cols-[auto_1fr_auto] md:items-center">
              {check.ok ? <CheckCircle2 className="size-5 text-emerald-400" /> : <XCircle className="size-5 text-red-300" />}
              <div className="min-w-0">
                <p className="font-semibold">{check.label}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{check.detail}</p>
              </div>
              <span className={check.ok ? "text-xs font-semibold text-emerald-400" : "text-xs font-semibold text-red-300"}>
                {check.ok ? "Ready" : "Check"}
              </span>
            </div>
          </LuxuryCard>
        ))}
      </div>
    </AppShell>
  );
}

function Metric({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}
