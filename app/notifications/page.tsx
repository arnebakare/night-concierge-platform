import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { requireProfile } from "@/lib/auth";
import { getNotificationHistory } from "@/lib/data/app";
import { Button } from "@/components/ui/button";
import { retryWhatsAppNotification } from "@/lib/actions/management-actions";

export default async function NotificationsPage() {
  const profile = await requireProfile(["PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const notifications = await getNotificationHistory();
  const sent = notifications.filter((item) => item.status === "SENT").length;
  return <AppShell profile={profile} title="WhatsApp delivery" eyebrow="Operations"><div className="mb-4 grid grid-cols-2 gap-3"><LuxuryCard><p className="text-sm text-muted-foreground">Sent</p><p className="mt-2 font-serif text-4xl">{sent}</p></LuxuryCard><LuxuryCard><p className="text-sm text-muted-foreground">Failed</p><p className="mt-2 font-serif text-4xl">{notifications.length - sent}</p></LuxuryCard></div><div className="space-y-3">{notifications.map((item) => { const request = Array.isArray(item.requests) ? item.requests[0] : item.requests; const clients = request?.clients as { name?: string } | { name?: string }[] | null; const clubs = request?.clubs as { name?: string } | { name?: string }[] | null; return <LuxuryCard key={item.id}><div className="flex items-start justify-between gap-3"><div><Link href={`/manager/requests/${item.request_id}`} className="font-semibold text-champagne-100">{Array.isArray(clients) ? clients[0]?.name : clients?.name ?? "Request"}</Link><p className="mt-1 text-sm text-muted-foreground">{Array.isArray(clubs) ? clubs[0]?.name : clubs?.name ?? "Club"} · {item.destination_number}</p></div><span className={item.status === "SENT" ? "text-xs font-semibold text-emerald-400" : "text-xs font-semibold text-red-300"}>{item.status}</span></div>{item.error_message && <p className="mt-3 rounded-md bg-destructive/10 p-3 text-sm text-red-200">{item.error_message}</p>}<div className="mt-3 flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()} · {item.provider_message_id ?? item.provider}</p>{item.status === "FAILED" && <form action={retryWhatsAppNotification}><input type="hidden" name="notificationId" value={item.id} /><Button type="submit" size="sm" variant="secondary">Retry</Button></form>}</div></LuxuryCard>; })}{!notifications.length && <LuxuryCard className="text-center text-sm text-muted-foreground">No delivery attempts yet.</LuxuryCard>}</div></AppShell>;
}
