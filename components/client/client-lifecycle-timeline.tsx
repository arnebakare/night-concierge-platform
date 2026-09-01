import { CalendarDays, MessageSquareText, UserRound } from "lucide-react";
import { LuxuryCard } from "@/components/ui/luxury-card";
import type { ClientAlias, ClientBookingHistoryItem } from "@/lib/types";
import { formatEnum } from "@/lib/utils";

type NoteLike = {
  id?: string;
  content: string;
  note_type: string;
  visibility: string;
  created_at?: string;
  profiles?: { name?: string | null; email?: string | null } | null;
  clubs?: { name?: string | null } | null;
};

type TimelineItem = {
  id: string;
  icon: typeof CalendarDays;
  label: string;
  detail: string;
  date: string;
  tone: "booking" | "note" | "alias";
};

export function ClientLifecycleTimeline({
  history,
  notes,
  aliases
}: Readonly<{ history: ClientBookingHistoryItem[]; notes: NoteLike[]; aliases: ClientAlias[] }>) {
  const items = [
    ...history.map((request) => ({
      id: `request-${request.id}`,
      icon: CalendarDays,
      label: `${formatEnum(request.request_type)} · ${request.clubs?.name ?? "Venue"}`,
      detail: `${formatEnum(request.status)} · ${request.guest_count} guests${request.budget ? ` · ${request.budget}` : ""}`,
      date: request.created_at,
      tone: "booking" as const
    })),
    ...notes.map((note, index) => ({
      id: `note-${note.id ?? index}`,
      icon: MessageSquareText,
      label: `${formatEnum(note.note_type)} note`,
      detail: `${note.content.slice(0, 120)}${note.content.length > 120 ? "..." : ""}`,
      date: note.created_at ?? new Date().toISOString(),
      tone: "note" as const
    })),
    ...aliases.map((alias, index) => ({
      id: `alias-${alias.name}-${index}`,
      icon: UserRound,
      label: "Name captured",
      detail: `${alias.name} · ${formatEnum(alias.source)}`,
      date: alias.created_at,
      tone: "alias" as const
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 14);

  return (
    <LuxuryCard className="bg-white text-slate-950">
      <div className="mb-3">
        <p className="text-xs uppercase tracking-[0.18em] text-champagne-700">Relationship timeline</p>
        <h3 className="mt-1 text-lg font-semibold">Latest client activity</h3>
      </div>
      <div className="space-y-2">
        {items.map((item) => <TimelineRow key={item.id} item={item} />)}
        {!items.length && <p className="rounded-md border border-slate-200 p-4 text-center text-sm text-slate-500">No activity yet.</p>}
      </div>
    </LuxuryCard>
  );
}

function TimelineRow({ item }: Readonly<{ item: TimelineItem }>) {
  const Icon = item.icon;
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className={`mt-0.5 flex size-8 items-center justify-center rounded-md ${item.tone === "booking" ? "bg-slate-950 text-white" : item.tone === "note" ? "bg-champagne-100 text-champagne-900" : "bg-white text-slate-500"}`}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-950">{item.label}</p>
        <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-600">{item.detail}</p>
      </div>
      <time className="text-right text-[11px] text-slate-400">{new Date(item.date).toLocaleDateString()}</time>
    </div>
  );
}
