import Link from "next/link";
import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { retryWhatsAppNotification } from "@/lib/actions/management-actions";
import { requireProfile } from "@/lib/auth";
import { getNotificationHistory, getPlatformSetting } from "@/lib/data/app";
import { getWhatsAppConfigStatus } from "@/lib/services/whatsapp";

export default async function NotificationsPage() {
  const profile = await requireProfile(["PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const [notifications, storedDestination] = await Promise.all([
    getNotificationHistory(),
    getPlatformSetting("whatsapp_destination_number")
  ]);
  const config = getWhatsAppConfigStatus(storedDestination);
  const sent = notifications.filter((item) => item.status === "SENT").length;
  const failed = notifications.length - sent;

  return (
    <AppShell profile={profile} title="WhatsApp delivery" eyebrow="Operations">
      <div className="mb-4 grid gap-3 md:grid-cols-[0.75fr_1.25fr]">
        <LuxuryCard className="ops-summary">
          <p className="text-xs uppercase tracking-[0.18em] text-champagne-300">Delivery health</p>
          <div className="mt-3 grid grid-cols-2 divide-x divide-border overflow-hidden rounded-md border border-border">
            <Metric label="Sent" value={String(sent)} tone="good" />
            <Metric label="Failed" value={String(failed)} tone={failed ? "bad" : "good"} />
          </div>
        </LuxuryCard>

        <LuxuryCard>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Twilio setup</h2>
              <p className="mt-1 text-sm text-muted-foreground">Credentials are checked without showing secrets.</p>
            </div>
            <StatusPill ok={config.ready} label={config.ready ? "Ready" : "Check"} />
          </div>
          {config.issue && <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{config.issue}</p>}
          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <ConfigLine label="Account SID" ok={config.accountSidConfigured} value={config.accountSidConfigured ? "Configured" : "Missing"} />
            <ConfigLine label="Auth Token" ok={config.authTokenConfigured} value={config.authTokenConfigured ? "Configured" : "Missing"} />
            <ConfigLine label="Sender" ok={config.fromConfigured} value={config.from || "Missing"} />
            <ConfigLine label="Destination" ok={config.destinationConfigured} value={config.destination || "Missing"} />
          </div>
        </LuxuryCard>
      </div>

      <div className="compact-list grid gap-2">
        {notifications.map((item) => <NotificationRow key={item.id} item={item} />)}
        {!notifications.length && (
          <LuxuryCard className="text-center text-sm text-muted-foreground">
            No delivery attempts yet.
          </LuxuryCard>
        )}
      </div>
    </AppShell>
  );
}

function NotificationRow({ item }: Readonly<{ item: Awaited<ReturnType<typeof getNotificationHistory>>[number] }>) {
  const request = Array.isArray(item.requests) ? item.requests[0] : item.requests;
  const clients = request?.clients as { name?: string } | { name?: string }[] | null;
  const clubs = request?.clubs as { name?: string } | { name?: string }[] | null;
  const clientName = Array.isArray(clients) ? clients[0]?.name : clients?.name;
  const clubName = Array.isArray(clubs) ? clubs[0]?.name : clubs?.name;
  const ok = item.status === "SENT";

  return (
    <LuxuryCard className="client-row">
      <div className="grid gap-3 md:grid-cols-[minmax(180px,1fr)_minmax(180px,0.8fr)_auto] md:items-center">
        <div className="min-w-0">
          <Link href={`/manager/requests/${item.request_id}`} className="truncate text-sm font-semibold text-foreground md:text-base">
            {clientName ?? "Request"}
          </Link>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {clubName ?? "Club"} · {item.destination_number}
          </p>
        </div>
        <div className="min-w-0 text-xs text-muted-foreground">
          <p>{new Date(item.created_at).toLocaleString()}</p>
          <p className="truncate">{item.provider_message_id ?? item.provider}</p>
        </div>
        <div className="flex items-center justify-between gap-2 md:justify-end">
          <StatusPill ok={ok} label={ok ? "Sent" : "Failed"} />
          {!ok && (
            <form action={retryWhatsAppNotification}>
              <input type="hidden" name="notificationId" value={item.id} />
              <Button type="submit" size="sm" variant="secondary">
                <RefreshCw className="size-4" /> Retry
              </Button>
            </form>
          )}
        </div>
      </div>
      {item.error_message && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-2.5 text-sm text-red-700">
          {item.error_message}
        </p>
      )}
    </LuxuryCard>
  );
}

function Metric({ label, value, tone }: Readonly<{ label: string; value: string; tone: "good" | "bad" }>) {
  return (
    <div className="bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        {tone === "good" ? <CheckCircle2 className="size-4 text-emerald-400" /> : <AlertCircle className="size-4 text-red-300" />}
      </div>
      <p className="mt-2 text-2xl font-semibold leading-none tracking-tight">{value}</p>
    </div>
  );
}

function ConfigLine({ label, ok, value }: Readonly<{ label: string; ok: boolean; value: string }>) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-secondary px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={ok ? "font-semibold text-foreground" : "font-semibold text-red-300"}>{value}</span>
    </div>
  );
}

function StatusPill({ ok, label }: Readonly<{ ok: boolean; label: string }>) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
      {ok ? <CheckCircle2 className="size-3.5" /> : <AlertCircle className="size-3.5" />}
      {label}
    </span>
  );
}
