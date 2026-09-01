import { AppShell } from "@/components/layout/app-shell";
import { StatusSubmitButton } from "@/components/request/status-submit-button";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MessageTemplateManager } from "@/components/settings/message-template-manager";
import { requireProfile } from "@/lib/auth";
import { getMessageTemplates, getPlatformSetting } from "@/lib/data/app";
import { savePlatformSetting } from "@/lib/actions/management-actions";
import Link from "next/link";

export default async function AdminSettingsPage() {
  const profile = await requireProfile(["SUPER_ADMIN"]);
  const [destination, templates] = await Promise.all([getPlatformSetting("whatsapp_destination_number"), getMessageTemplates()]);
  return (
    <AppShell profile={profile} title="Platform settings" eyebrow="Admin">
      <div className="mb-3 grid grid-cols-3 overflow-hidden rounded-lg border border-slate-200 bg-white text-center text-slate-950">
        <Metric label="WhatsApp" value={destination ? "Set" : "Missing"} />
        <Metric label="Templates" value={String(templates.length)} />
        <Metric label="App URL" value={process.env.NEXT_PUBLIC_APP_URL ? "Set" : "Missing"} />
      </div>
      <LuxuryCard className="bg-white text-slate-950">
        <form action={savePlatformSetting} className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <input type="hidden" name="key" value="whatsapp_destination_number" />
          <div className="space-y-2"><Label className="text-slate-700">WhatsApp destination</Label><Input name="value" type="tel" inputMode="tel" pattern="(whatsapp:)?\+[1-9][0-9]{7,14}" placeholder="+34600111222" defaultValue={destination} required className="border-slate-200 bg-white text-slate-950" /><p className="text-xs text-slate-500">Use international format with + and country code.</p></div>
          <div className="space-y-2"><Label className="text-slate-700">Public app URL</Label><Input value={process.env.NEXT_PUBLIC_APP_URL ?? "Not configured"} readOnly className="border-slate-200 bg-slate-50 text-slate-600" /></div>
          <StatusSubmitButton label="Save" pendingLabel="Saving" />
        </form>
      </LuxuryCard>
      <MessageTemplateManager templates={templates} />
      <Button asChild variant="secondary" className="mt-4 w-full md:w-auto"><Link href="/notifications">View delivery history</Link></Button>
    </AppShell>
  );
}

function Metric({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="border-r border-slate-200 p-2.5 last:border-r-0">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}
