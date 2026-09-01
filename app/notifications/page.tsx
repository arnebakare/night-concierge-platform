import Link from "next/link";
import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { retryWhatsAppNotification } from "@/lib/actions/management-actions";
import { requireProfile } from "@/lib/auth";
import { getInboundWhatsAppHistory, getNotificationHistory, getPlatformSetting } from "@/lib/data/app";
import { getWhatsAppConfigStatus } from "@/lib/services/whatsapp";

export default async function NotificationsPage({
  searchParams
}: Readonly<{ searchParams: Promise<{ inbound?: string }> }>) {
  const profile = await requireProfile(["PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const params = await searchParams;
  const [notifications, inboundMessages, storedDestination] = await Promise.all([
    getNotificationHistory(),
    getInboundWhatsAppHistory(),
    getPlatformSetting("whatsapp_destination_number")
  ]);
  const inboundFilter = params.inbound === "failed" || params.inbound === "review" || params.inbound === "created" ? params.inbound : "all";
  const filteredInboundMessages = inboundMessages.filter((item) => {
    if (inboundFilter === "failed") return item.status === "FAILED";
    if (inboundFilter === "review") return item.status === "NEEDS_REVIEW";
    if (inboundFilter === "created") return item.status === "CREATED";
    return true;
  });
  const config = getWhatsAppConfigStatus(storedDestination);
  const sent = notifications.filter((item) => item.status === "SENT").length;
  const failed = notifications.length - sent;
  const inboundFailed = inboundMessages.filter((item) => item.status === "FAILED" || item.status === "NEEDS_REVIEW").length;
  const inboundNotAlerted = inboundMessages.filter((item) => (item.status === "FAILED" || item.status === "NEEDS_REVIEW") && !item.alert_sent_at).length;
  const inboundCreated = inboundMessages.filter((item) => item.status === "CREATED").length;
  const scheduleCommands = inboundMessages.filter((item) => getInboundKind(item.body) === "schedule").length;
  const leadMessages = inboundMessages.filter((item) => getInboundKind(item.body) === "lead").length;
  const senderHealth = getSenderHealth(inboundMessages);

  return (
    <AppShell profile={profile} title="WhatsApp delivery" eyebrow="Operations">
      <div className="mb-4 grid gap-3 md:grid-cols-[0.75fr_1.25fr]">
        <LuxuryCard className="ops-summary">
          <p className="text-xs uppercase tracking-[0.18em] text-champagne-300">Delivery health</p>
          <div className="mt-3 grid grid-cols-3 divide-x divide-border overflow-hidden rounded-md border border-border">
            <Metric label="Sent" value={String(sent)} tone="good" />
            <Metric label="Failed" value={String(failed)} tone={failed ? "bad" : "good"} />
            <Metric label="Inbound" value={String(inboundFailed)} tone={inboundFailed ? "bad" : "good"} />
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

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <AlertMetric label="Inbound created" value={String(inboundCreated)} tone="good" />
        <AlertMetric label="Needs review" value={String(inboundFailed)} tone={inboundFailed ? "bad" : "good"} />
        <AlertMetric label="Not alerted" value={String(inboundNotAlerted)} tone={inboundNotAlerted ? "warning" : "good"} />
        <AlertMetric label="Schedules" value={String(scheduleCommands)} tone="good" />
        <AlertMetric label="Leads" value={String(leadMessages)} tone="good" />
      </div>

      <LuxuryCard className="mb-4 bg-white text-slate-950">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-champagne-700">Inbound monitor</p>
            <h2 className="mt-1 text-lg font-semibold">WhatsApp commands and pasted leads</h2>
          </div>
          <StatusPill ok={!inboundFailed} label={inboundFailed ? "Review" : "Healthy"} />
        </div>
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          <MonitorFilter href="/notifications" active={inboundFilter === "all"} label="All" />
          <MonitorFilter href="/notifications?inbound=failed" active={inboundFilter === "failed"} label="Failed" />
          <MonitorFilter href="/notifications?inbound=review" active={inboundFilter === "review"} label="Review" />
          <MonitorFilter href="/notifications?inbound=created" active={inboundFilter === "created"} label="Created" />
        </div>
        <div className="divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200">
          {filteredInboundMessages.slice(0, 12).map((message) => (
            <div key={message.id} className="grid gap-2 p-3 text-sm md:grid-cols-[0.8fr_1fr_auto] md:items-center">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-950">{message.profile_name ?? message.from_number}</p>
                <p className="mt-0.5 truncate text-xs text-slate-500">{new Date(message.created_at).toLocaleString()}</p>
              </div>
              <p className="line-clamp-2 text-slate-600">{message.body}</p>
              <div className="flex flex-wrap gap-1.5 md:justify-end">
                <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {formatInboundKind(getInboundKind(message.body))}
                </span>
                {message.created_request_id && (
                  <Link href={`/manager/requests/${message.created_request_id}`} className="w-fit rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    request
                  </Link>
                )}
                {message.created_schedule_plan_id && (
                  <Link href={`/schedule/plans/${message.created_schedule_plan_id}`} className="w-fit rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    schedule
                  </Link>
                )}
                <StatusPill ok={message.status === "CREATED" || message.status === "RECEIVED"} label={message.status.toLowerCase().replaceAll("_", " ")} />
                {(message.status === "FAILED" || message.status === "NEEDS_REVIEW") && (
                  <span className={`w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${message.alert_sent_at ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
                    {message.alert_sent_at ? "alert sent" : "not alerted"}
                  </span>
                )}
              </div>
              {message.error_message && <p className="rounded bg-red-50 p-2 text-xs text-red-700 md:col-span-3">{message.error_message}</p>}
            </div>
          ))}
          {!filteredInboundMessages.length && <div className="p-6 text-center text-sm text-slate-500">No inbound WhatsApp messages match this filter.</div>}
        </div>
      </LuxuryCard>

      <LuxuryCard className="mb-4 bg-white text-slate-950">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-champagne-700">Sender health</p>
            <h2 className="mt-1 text-lg font-semibold">Who needs attention</h2>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{senderHealth.length} senders</span>
        </div>
        <div className="divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200">
          {senderHealth.slice(0, 8).map((sender) => (
            <div key={sender.from} className="grid gap-2 p-3 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-950">{sender.name ?? sender.from}</p>
                <p className="mt-0.5 truncate text-xs text-slate-500">{sender.name ? sender.from : "Unknown sender"} · last {new Date(sender.last_at).toLocaleString()}</p>
              </div>
              <div className="flex flex-wrap gap-1.5 sm:justify-end">
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">{sender.created} created</span>
                <span className={sender.review ? "rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800" : "rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500"}>{sender.review} review</span>
                <span className={sender.failed ? "rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700" : "rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500"}>{sender.failed} failed</span>
              </div>
            </div>
          ))}
          {!senderHealth.length && <div className="p-6 text-center text-sm text-slate-500">No inbound sender history yet.</div>}
        </div>
      </LuxuryCard>

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
        <DeliveryIssue message={item.error_message} />
      )}
    </LuxuryCard>
  );
}

function DeliveryIssue({ message }: Readonly<{ message: string }>) {
  const issue = explainTwilioIssue(message);
  return (
    <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-2.5 text-sm text-red-700">
      <p className="font-semibold">{issue.title}</p>
      <p className="mt-1">{issue.detail}</p>
      <p className="mt-2 rounded bg-white/70 px-2 py-1 text-xs text-red-800">Raw: {message}</p>
    </div>
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

function AlertMetric({ label, value, tone }: Readonly<{ label: string; value: string; tone: "good" | "warning" | "bad" }>) {
  const styles = tone === "good" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : tone === "warning" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-red-200 bg-red-50 text-red-700";
  return (
    <div className={`rounded-lg border p-3 ${styles}`}>
      <p className="text-[11px] font-medium">{label}</p>
      <p className="mt-1 text-xl font-semibold leading-none">{value}</p>
    </div>
  );
}

function MonitorFilter({ href, active, label }: Readonly<{ href: string; active: boolean; label: string }>) {
  return (
    <Button asChild size="sm" variant={active ? "default" : "secondary"} className={active ? "bg-slate-950 text-white hover:bg-slate-800" : "bg-slate-100 text-slate-900 hover:bg-slate-200"}>
      <Link href={href}>{label}</Link>
    </Button>
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

function explainTwilioIssue(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("authenticate") || lower.includes("auth")) {
    return {
      title: "Twilio login details do not match",
      detail: "Check that the Account SID and Auth Token in Vercel come from the same Twilio account, then redeploy."
    };
  }
  if (lower.includes("sandbox") || lower.includes("join")) {
    return {
      title: "WhatsApp sandbox recipient is not joined",
      detail: "The receiving phone must first join the Twilio WhatsApp sandbox, unless you have an approved production WhatsApp sender."
    };
  }
  if (lower.includes("from") || lower.includes("sender")) {
    return {
      title: "WhatsApp sender is not valid",
      detail: "Check that TWILIO_WHATSAPP_FROM starts with whatsapp:+ and belongs to your Twilio WhatsApp sender."
    };
  }
  if (lower.includes("to") || lower.includes("number") || lower.includes("recipient")) {
    return {
      title: "Destination number needs checking",
      detail: "Use international format with whatsapp:+, country code, and no spaces."
    };
  }
  return {
    title: "Delivery failed",
    detail: "Retry once. If it fails again, check the Twilio logs for this message and compare the sender, destination, and account."
  };
}

function getInboundKind(body: string) {
  const normalized = body.trim().toLowerCase();
  if (/^(schedule|plan)\b/.test(normalized)) return "schedule";
  if (/(table|guestlist|vip|booking|book|guests?|personer|personas|people)/.test(normalized)) return "lead";
  return "message";
}

function formatInboundKind(kind: ReturnType<typeof getInboundKind>) {
  if (kind === "schedule") return "schedule command";
  if (kind === "lead") return "lead message";
  return "message";
}

function getSenderHealth(messages: Awaited<ReturnType<typeof getInboundWhatsAppHistory>>) {
  const grouped = messages.reduce<Record<string, { from: string; name: string | null; created: number; review: number; failed: number; last_at: string }>>((senders, message) => {
    const current = senders[message.from_number] ?? {
      from: message.from_number,
      name: message.profile_name,
      created: 0,
      review: 0,
      failed: 0,
      last_at: message.created_at
    };
    if (message.profile_name) current.name = message.profile_name;
    if (message.status === "CREATED") current.created += 1;
    if (message.status === "NEEDS_REVIEW") current.review += 1;
    if (message.status === "FAILED") current.failed += 1;
    if (message.created_at > current.last_at) current.last_at = message.created_at;
    senders[message.from_number] = current;
    return senders;
  }, {});
  return Object.values(grouped).sort((a, b) => (b.failed + b.review) - (a.failed + a.review) || b.last_at.localeCompare(a.last_at));
}
