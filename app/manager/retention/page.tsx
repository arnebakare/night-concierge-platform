import { AppShell } from "@/components/layout/app-shell";
import { RetentionClientCard } from "@/components/client/retention-client-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { requireProfile } from "@/lib/auth";
import { getRetentionClientsForProfile } from "@/lib/data/app";
import { getEmailConfigStatus } from "@/lib/services/email";
import { getWhatsAppConfigStatus } from "@/lib/services/whatsapp";

export default async function RetentionPage({
  searchParams
}: Readonly<{ searchParams: Promise<{ days?: string }> }>) {
  const profile = await requireProfile(["PROMOTER", "PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const params = await searchParams;
  const days = Number.parseInt(params.days ?? "45", 10);
  const threshold = Number.isFinite(days) && days > 0 ? days : 45;
  const [clients, emailConfig] = await Promise.all([
    getRetentionClientsForProfile(profile, threshold),
    Promise.resolve(getEmailConfigStatus())
  ]);
  const whatsAppConfig = getWhatsAppConfigStatus("+34000000000");

  return (
    <AppShell profile={profile} title="Retention" eyebrow="Client care">
      <LuxuryCard className="mb-4">
        <form action="/manager/retention" className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div>
            <p className="font-serif text-2xl">Clients to re-activate</p>
            <p className="mt-1 text-sm text-muted-foreground">Find clients who have not booked recently and send a personal check-in.</p>
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Input name="days" type="number" min={7} defaultValue={threshold} aria-label="Dormant days" />
            <Button type="submit">Apply</Button>
          </div>
        </form>
      </LuxuryCard>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <ConfigCard label="WhatsApp" ready={whatsAppConfig.accountSidConfigured && whatsAppConfig.authTokenConfigured && whatsAppConfig.fromConfigured} detail={whatsAppConfig.fromConfigured ? "Twilio sender configured" : "Add Twilio sender in Vercel"} />
        <ConfigCard label="Email" ready={emailConfig.ready} detail={emailConfig.ready ? `Sending from ${emailConfig.from}` : "Add RESEND_API_KEY and EMAIL_FROM in Vercel"} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {clients.length ? clients.map((client) => <RetentionClientCard key={client.id} client={client} />) : (
          <LuxuryCard className="text-center text-sm text-muted-foreground md:col-span-2">
            No clients match this retention window.
          </LuxuryCard>
        )}
      </div>
    </AppShell>
  );
}

function ConfigCard({ label, ready, detail }: Readonly<{ label: string; ready: boolean; detail: string }>) {
  return (
    <LuxuryCard>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{label}</p>
          <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
        </div>
        <span className={ready ? "text-xs font-semibold text-emerald-400" : "text-xs font-semibold text-red-300"}>
          {ready ? "READY" : "SETUP"}
        </span>
      </div>
    </LuxuryCard>
  );
}
