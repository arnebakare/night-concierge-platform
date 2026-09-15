import Link from "next/link";
import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { retryWhatsAppNotification } from "@/lib/actions/management-actions";
import { requireProfile } from "@/lib/auth";
import { getNotificationHistory, getPlatformSetting } from "@/lib/data/app";
import { getMetaConfigStatus } from "@/lib/messaging/meta";
import { getWhatsAppConfigStatus } from "@/lib/services/whatsapp";

export default async function NotificationsPage() {
  const profile = await requireProfile(["PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const [notifications, storedDestination] = await Promise.all([getNotificationHistory(), getPlatformSetting("whatsapp_destination_number")]);
  const whatsApp = getWhatsAppConfigStatus(storedDestination);
  const meta = getMetaConfigStatus();
  const sent = notifications.filter((item) => item.status === "SENT").length;
  const failed = notifications.length - sent;
  return (
    <AppShell profile={profile} title="Meta delivery" eyebrow="Operations">
      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <LuxuryCard><p className="text-xs uppercase tracking-[0.18em] text-champagne-300">Delivery health</p><div className="mt-3 grid grid-cols-2 gap-2"><Metric label="Sent" value={sent} ok /><Metric label="Failed" value={failed} ok={!failed} /></div></LuxuryCard>
        <LuxuryCard><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">Official Meta APIs</h2><p className="mt-1 text-sm text-muted-foreground">Secret values are never displayed.</p></div><Status ok={meta.webhookReady && meta.whatsappReady} label={meta.webhookReady && meta.whatsappReady ? "Ready" : "Check"} /></div><div className="mt-4 grid gap-2 text-sm sm:grid-cols-2"><Line label="Webhook signing" ok={meta.webhookReady} /><Line label="WhatsApp Cloud API" ok={meta.whatsappReady} /><Line label="Instagram Messaging" ok={meta.instagramReady} /><Line label="Alert destination" ok={whatsApp.destinationConfigured} /></div>{whatsApp.issue && <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{whatsApp.issue}</p>}</LuxuryCard>
      </div>
      <div className="grid gap-2">
        {notifications.map((item) => {
          const request = Array.isArray(item.requests) ? item.requests[0] : item.requests;
          const clients = request?.clients as { name?: string } | { name?: string }[] | null;
          const name = Array.isArray(clients) ? clients[0]?.name : clients?.name;
          const ok = item.status === "SENT";
          return <LuxuryCard key={item.id}><div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-center"><div><Link href={`/manager/requests/${item.request_id}`} className="font-semibold">{name ?? "Request notification"}</Link><p className="mt-1 text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()} · {item.provider}</p></div><Status ok={ok} label={ok ? "Sent" : "Failed"} />{!ok && <form action={retryWhatsAppNotification}><input type="hidden" name="notificationId" value={item.id} /><Button type="submit" size="sm" variant="secondary"><RefreshCw className="size-4" />Retry</Button></form>}</div>{item.error_message && <p className="mt-3 rounded-md bg-red-50 p-2 text-sm text-red-700">{item.error_message}</p>}</LuxuryCard>;
        })}
        {!notifications.length && <LuxuryCard className="text-center text-sm text-muted-foreground">No delivery attempts yet.</LuxuryCard>}
      </div>
    </AppShell>
  );
}

function Metric({ label, value, ok }: Readonly<{ label: string; value: number; ok: boolean }>) { return <div className="rounded-md border border-border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className={`mt-1 text-2xl font-semibold ${ok ? "text-emerald-400" : "text-red-300"}`}>{value}</p></div>; }
function Line({ label, ok }: Readonly<{ label: string; ok: boolean }>) { return <div className="flex items-center justify-between rounded-md border border-border bg-secondary px-3 py-2"><span className="text-muted-foreground">{label}</span><span className={ok ? "text-emerald-400" : "text-red-300"}>{ok ? "Configured" : "Missing"}</span></div>; }
function Status({ ok, label }: Readonly<{ ok: boolean; label: string }>) { return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{ok ? <CheckCircle2 className="size-3.5" /> : <AlertCircle className="size-3.5" />}{label}</span>; }
