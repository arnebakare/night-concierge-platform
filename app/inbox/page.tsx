import Link from "next/link";
import { Instagram, MessageCircle, Search } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireProfile } from "@/lib/auth";
import { getConversations } from "@/lib/data/messaging";

export default async function InboxPage({ searchParams }: Readonly<{ searchParams: Promise<{ channel?: string; assignment?: string; q?: string }> }>) {
  const profile = await requireProfile(["PROMOTER", "PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const filters = await searchParams;
  const conversations = await getConversations(profile, filters);
  return (
    <AppShell profile={profile} title="Concierge inbox" eyebrow="Instagram + WhatsApp">
      <form className="mb-3 flex gap-2 rounded-lg border border-slate-200 bg-white p-2 text-slate-950">
        <div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-3 size-4 text-slate-400" /><Input name="q" defaultValue={filters.q} placeholder="Search customers or messages" className="border-slate-200 bg-white pl-9 text-slate-950" /></div>
        <Button type="submit" variant="secondary">Search</Button>
      </form>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <Filter href="/inbox" active={!filters.channel && !filters.assignment} label="All" />
        <Filter href="/inbox?channel=WHATSAPP" active={filters.channel === "WHATSAPP"} label="WhatsApp" />
        <Filter href="/inbox?channel=INSTAGRAM" active={filters.channel === "INSTAGRAM"} label="Instagram" />
        {profile.role !== "PROMOTER" && <Filter href="/inbox?assignment=unassigned" active={filters.assignment === "unassigned"} label="Unassigned" />}
        <Filter href="/inbox?assignment=mine" active={filters.assignment === "mine"} label="Mine" />
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-950">
        {conversations.map((conversation) => {
          const Icon = conversation.channel === "WHATSAPP" ? MessageCircle : Instagram;
          const name = conversation.clients?.name || conversation.identity?.display_name || conversation.identity?.username || "New guest";
          return (
            <Link key={conversation.id} href={`/inbox/${conversation.id}`} className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3 border-b border-slate-100 p-3 transition last:border-0 hover:bg-slate-50 md:p-4">
              <span className={`mt-0.5 grid size-10 place-items-center rounded-full ${conversation.channel === "WHATSAPP" ? "bg-emerald-50 text-emerald-700" : "bg-fuchsia-50 text-fuchsia-700"}`}><Icon className="size-5" /></span>
              <span className="min-w-0"><span className="flex items-center gap-2"><span className="truncate font-semibold">{name}</span>{conversation.unread_count > 0 && <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white">{conversation.unread_count}</span>}</span><span className="mt-1 block truncate text-sm text-slate-600">{conversation.last_message_preview || "New conversation"}</span><span className="mt-1 block text-xs text-slate-400">{conversation.promoter?.name ? `Assigned to ${conversation.promoter.name}` : "Unassigned · manager review"}</span></span>
              <span className="whitespace-nowrap text-xs text-slate-400">{relativeTime(conversation.last_message_at)}</span>
            </Link>
          );
        })}
        {!conversations.length && <div className="p-8 text-center text-sm text-slate-500">No conversations match this view.</div>}
      </div>
    </AppShell>
  );
}

function Filter({ href, active, label }: Readonly<{ href: string; active: boolean; label: string }>) {
  return <Link href={href} className={`whitespace-nowrap rounded-full border px-3 py-2 text-sm font-medium ${active ? "border-champagne-300 bg-champagne-300 text-ink-950" : "border-champagne-700/40 bg-ink-900 text-slate-300"}`}>{label}</Link>;
}

function relativeTime(value: string | null) {
  if (!value) return "";
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
