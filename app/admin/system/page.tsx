import { CheckCircle2, XCircle } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { requireProfile } from "@/lib/auth";
import { getBuildInfo } from "@/lib/services/build-info";
import { getSystemReadiness } from "@/lib/services/readiness";

export default async function AdminSystemPage() {
  const profile = await requireProfile(["SUPER_ADMIN"]);
  const checks = await getSystemReadiness();
  const build = getBuildInfo();
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

      <LuxuryCard className="mb-4 bg-white text-slate-950">
        <p className="text-xs uppercase tracking-[0.18em] text-champagne-700">Live build</p>
        <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
          <BuildLine label="Commit" value={build.shortSha} />
          <BuildLine label="Branch" value={build.branch} />
          <BuildLine label="Environment" value={build.environment} />
          <BuildLine label="Message" value={build.commitMessage} />
        </div>
        <p className="mt-3 text-xs text-slate-500">You can also open `/api/build` to compare the live commit with the latest commit I give you here.</p>
      </LuxuryCard>

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

      <LuxuryCard className="mt-4 bg-white text-slate-950">
        <p className="text-xs uppercase tracking-[0.18em] text-champagne-700">Database setup</p>
        <h2 className="mt-1 text-lg font-semibold">Latest migrations</h2>
        <div className="mt-3 grid gap-2 text-sm text-slate-600">
          <SetupLine text="Run migration 021 for inbound WhatsApp alerts plus commission labels and notes." />
          <SetupLine text="Run migration 022 for client follow-up tasks and CRM care badges." />
          <SetupLine text="After running migrations, refresh this page to confirm both checks are ready." />
        </div>
      </LuxuryCard>
    </AppShell>
  );
}

function BuildLine({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5">
      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 break-words font-semibold text-slate-950">{value || "Not available"}</p>
    </div>
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

function SetupLine({ text }: Readonly<{ text: string }>) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 p-2.5">
      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
      <span>{text}</span>
    </div>
  );
}
