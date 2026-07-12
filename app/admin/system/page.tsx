import { CheckCircle2, XCircle } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { requireProfile } from "@/lib/auth";
import { getSystemReadiness } from "@/lib/services/readiness";

export default async function AdminSystemPage() {
  const profile = await requireProfile(["SUPER_ADMIN"]);
  const checks = await getSystemReadiness();
  const ready = checks.every((check) => check.ok);
  return <AppShell profile={profile} title="Launch readiness" eyebrow="System"><LuxuryCard className="mb-4"><p className="text-sm text-muted-foreground">Overall status</p><p className={`mt-2 font-serif text-3xl ${ready ? "text-emerald-400" : "text-champagne-300"}`}>{ready ? "Ready for launch" : "Setup required"}</p></LuxuryCard><div className="space-y-3">{checks.map((check) => <LuxuryCard key={check.label}><div className="flex items-start gap-3">{check.ok ? <CheckCircle2 className="size-5 shrink-0 text-emerald-400" /> : <XCircle className="size-5 shrink-0 text-red-300" />}<div><p className="font-semibold">{check.label}</p><p className="mt-1 text-sm text-muted-foreground">{check.detail}</p></div></div></LuxuryCard>)}</div></AppShell>;
}
