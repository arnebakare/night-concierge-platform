import { LuxuryCard } from "@/components/ui/luxury-card";
import { formatEnum } from "@/lib/utils";

export function ClientNoteCard({
  note
}: Readonly<{ note: { note_type: string; visibility: string; content: string; created_at?: string; author?: { name?: string } | null } }>) {
  return (
    <LuxuryCard className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatEnum(note.note_type)} · {formatEnum(note.visibility)}</span>
        <span>{note.author?.name ?? "Concierge"}</span>
      </div>
      <p className="text-sm leading-relaxed">{note.content}</p>
    </LuxuryCard>
  );
}
